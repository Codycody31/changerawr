// lib/services/projects/importing/markdown-parser.service.ts

import {
    ParsedChangelog,
    ParsedChangelogEntry,
    ChangelogSection,
    FormatDetectionResult,
    ParsingHints,
    ParseOverrides,
    ImportFormat
} from '@/lib/types/projects/importing';

// ─── Shared regex constants ────────────────────────────────────────────────

const SEMVER = /(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)/;

/** Matches a semver as the WHOLE string (headerText, not full line) */
const SEMVER_EXACT = new RegExp(`^v?${SEMVER.source}$`, 'i');

/** Matches semver at START of headerText, possibly followed by separator + text */
const SEMVER_START = new RegExp(`^v?${SEMVER.source}(?:\\s*[-–—/]\\s*(.*))?$`, 'i');

/** Matches [semver] at start of headerText */
const BRACKET_SEMVER = new RegExp(`^\\[v?${SEMVER.source}\\]`, 'i');

/** Matches [semver] - rest */
const BRACKET_SEMVER_DASH = new RegExp(`^\\[v?${SEMVER.source}\\]\\s*[-–—]\\s*(.+)$`, 'i');

const DATE_PATTERNS = [
    /(\d{4}-\d{2}-\d{2})/,                                                          // ISO
    /(\d{1,2}\/\d{1,2}\/\d{4})/,                                                    // US/EU
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i, // "15 Jan 2024"
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i, // "Jan 15, 2024"
];

const MONTH_ONLY = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const SECTION_LABELS = [
    'added', 'changed', 'deprecated', 'removed', 'fixed', 'security',
    'features', 'bug fixes', 'bugfixes', 'improvements', 'breaking changes',
    'breaking', 'enhancements', 'patches', 'updates', 'new', 'fixes',
    'chores', 'maintenance', 'performance', 'other'
];

const CONVENTIONAL_PREFIXES = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert', 'wip'];
const CONVENTIONAL_RE = new RegExp(`^(?:[-*+]\\s*)?(?:${CONVENTIONAL_PREFIXES.join('|')})(?:\\([^)]+\\))?!?:\\s`, 'i');

// ─── Format Scorer ────────────────────────────────────────────────────────

type ScoreMap = Record<string, number>;

function addScore(scores: ScoreMap, format: string, amount: number) {
    scores[format] = (scores[format] ?? 0) + amount;
}

function topFormat(scores: ScoreMap): [string, number] {
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ['simple', 0];
}

// ─── Main Service ─────────────────────────────────────────────────────────

export class MarkdownParserService {
    // ── Detection ─────────────────────────────────────────────────────────

    static detectFormat(content: string, extraStripPatterns: RegExp[] = []): FormatDetectionResult {
        const lines = content.split('\n');
        const signals: string[] = [];
        const scores: ScoreMap = {
            keepachangelog: 0,
            github_releases: 0,
            simple_version: 0,
            conventional_commits: 0,
            date_based: 0,
            flat_list: 0,
            simple: 0,
            custom: 0
        };

        // ── Pre-categorise lines ──────────────────────────────────────────
        const byLevel: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        const listLines: string[] = [];
        const contentLines: string[] = [];

        for (const line of lines) {
            const hm = line.match(/^(#{1,6})\s+(.+)$/);
            if (hm) {
                byLevel[hm[1].length].push(this.stripInlineMarkup(hm[2].trim(), extraStripPatterns));
            } else if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
                listLines.push(line);
            } else if (line.trim()) {
                contentLines.push(line);
            }
        }

        const allHeaders = Object.values(byLevel).flat();
        const listRatio = listLines.length / Math.max(lines.length, 1);

        // ── Keep a Changelog ─────────────────────────────────────────────
        if (/keep\s*a\s*changelog/i.test(content)) {
            addScore(scores, 'keepachangelog', 60);
            signals.push('Keep a Changelog header');
        }
        if (/\[unreleased\]/i.test(content)) {
            addScore(scores, 'keepachangelog', 30);
            signals.push('[Unreleased] section');
        }
        // Footer reference links: [1.0.0]: https://...
        const footerLinks = (content.match(/^\[[\d.]+\]:\s*https?:\/\//gm) ?? []).length;
        if (footerLinks > 0) {
            addScore(scores, 'keepachangelog', 40 + footerLinks * 5);
            signals.push(`${footerLinks} KaC footer reference links`);
        }
        // [version] - date header pattern
        const kacVersionHeaders = [...byLevel[1], ...byLevel[2], ...byLevel[3]]
            .filter(h => BRACKET_SEMVER_DASH.test(h) || /^\[unreleased\]/i.test(h));
        if (kacVersionHeaders.length > 0) {
            addScore(scores, 'keepachangelog', kacVersionHeaders.length * 15);
            signals.push(`${kacVersionHeaders.length} [version] - date headers`);
        }
        // Standard KaC section labels at h3
        const kacSections = byLevel[3].filter(h =>
            SECTION_LABELS.slice(0, 6).some(s => h.toLowerCase() === s)
        );
        if (kacSections.length >= 2) {
            addScore(scores, 'keepachangelog', kacSections.length * 10);
            signals.push(`KaC sections: ${kacSections.slice(0, 4).join(', ')}`);
        }

        // ── Simple version (## v1.0.7) ────────────────────────────────────
        for (const level of [1, 2, 3] as const) {
            const versionHeaders = byLevel[level].filter(h => this.headerTextIsVersion(h));
            if (versionHeaders.length > 0) {
                const pts = versionHeaders.length * (level === 2 ? 20 : level === 1 ? 15 : 12);
                addScore(scores, 'simple_version', pts);
                signals.push(`${versionHeaders.length} version headers at h${level}`);
            }
        }

        // ── GitHub Releases ───────────────────────────────────────────────
        if (/github\.com\/[^/\s]+\/[^/\s]+\/(?:compare|releases)/i.test(content)) {
            addScore(scores, 'github_releases', 35);
            signals.push('GitHub compare/releases URL');
        }
        // GitHub's auto-generated "Full Changelog:" footer
        if (/full\s+changelog:/i.test(content)) {
            addScore(scores, 'github_releases', 20);
            signals.push('GitHub "Full Changelog" footer');
        }
        // Stars, PRs, issues — typical GitHub release notation
        if (/#\d{3,}/.test(content)) {
            addScore(scores, 'github_releases', 10);
            signals.push('PR/issue references (#NNN)');
        }

        // ── Conventional commits ─────────────────────────────────────────
        const conventionalLines = lines.filter(l => CONVENTIONAL_RE.test(l));
        if (conventionalLines.length >= 3) {
            addScore(scores, 'conventional_commits', conventionalLines.length * 7);
            signals.push(`${conventionalLines.length} conventional commit lines`);
        }
        if (/BREAKING[\s_]CHANGE:/m.test(content)) {
            addScore(scores, 'conventional_commits', 30);
            signals.push('BREAKING CHANGE marker');
        }
        // Version headers that look like conventional-style grouped changelogs
        const conventionalGroupHeaders = allHeaders.filter(h =>
            /^(feat(?:ures?)?|fix(?:es?)?|refactor|chore|docs|perf|breaking)/i.test(h)
        );
        if (conventionalGroupHeaders.length >= 2) {
            addScore(scores, 'conventional_commits', conventionalGroupHeaders.length * 8);
            signals.push(`Conventional group headers: ${conventionalGroupHeaders.slice(0, 3).join(', ')}`);
        }

        // ── Date based ───────────────────────────────────────────────────
        const dateOnlyHeaders = allHeaders.filter(h => {
            const clean = this.stripInlineMarkup(h);
            return ISO_DATE_ONLY.test(clean) || MONTH_ONLY.test(clean);
        });
        if (dateOnlyHeaders.length >= 2) {
            addScore(scores, 'date_based', dateOnlyHeaders.length * 18);
            signals.push(`${dateOnlyHeaders.length} date-only headers`);
        }

        // ── Flat list ────────────────────────────────────────────────────
        const versionHeaderCount = Object.values(byLevel).flat()
            .filter(h => this.headerTextIsVersion(h)).length;
        if (versionHeaderCount === 0 && listRatio > 0.25 && listLines.length > 3) {
            addScore(scores, 'flat_list', 30 + Math.floor(listLines.length / 2));
            signals.push(`Flat list: ${listLines.length} list items, no version headers`);
        }
        if (allHeaders.length === 0 && listLines.length > 0) {
            addScore(scores, 'flat_list', 40);
            signals.push('No headers at all — pure list');
        }

        // ── Simple fallback ───────────────────────────────────────────────
        if (allHeaders.length === 0 && listLines.length === 0 && contentLines.length > 0) {
            addScore(scores, 'simple', 30);
            signals.push('Prose-only content');
        }

        // ── Resolve ───────────────────────────────────────────────────────
        const [winner, winnerScore] = topFormat(scores);
        const allScores = Object.values(scores);
        const totalScore = allScores.reduce((a, b) => a + b, 0);
        const confidence = totalScore === 0 ? 0.1 : Math.min(winnerScore / totalScore, 0.99);

        const formatMap: Record<string, ImportFormat> = {
            keepachangelog: 'keepachangelog',
            github_releases: 'github_releases',
            simple_version: 'simple_version',
            conventional_commits: 'conventional_commits',
            date_based: 'date_based',
            flat_list: 'flat_list',
            simple: 'simple',
            custom: 'custom'
        };
        const format: ImportFormat = winnerScore < 8 ? 'simple' : (formatMap[winner] ?? 'custom');

        // ── Build hints ───────────────────────────────────────────────────
        const hints = this.buildHints(format, byLevel, listLines, conventionalLines);

        // ── Structure summary ─────────────────────────────────────────────
        const estimatedEntryCount = Math.max(
            versionHeaderCount,
            dateOnlyHeaders.length,
            kacVersionHeaders.length
        );

        return {
            format,
            confidence,
            characteristics: signals,
            structure: {
                hasVersionHeaders: versionHeaderCount > 0 || kacVersionHeaders.length > 0,
                hasDateHeaders: dateOnlyHeaders.length > 0,
                hasTypeHeaders: kacSections.length > 0 || conventionalGroupHeaders.length > 0,
                usesListFormat: listLines.length > 0,
                usesMarkdownSyntax: /[#*`\[\]]/.test(content),
                detectedHeaderLevel: hints.primaryHeaderLevel,
                estimatedEntryCount
            },
            hints
        };
    }

    private static buildHints(
        format: ImportFormat,
        byLevel: Record<number, string[]>,
        listLines: string[],
        conventionalLines: string[]
    ): ParsingHints {
        // Find the heading level that holds THE MOST version headers.
        // Using the first level with *any* version headers is wrong when a changelog
        // has one h1 entry followed by many h2 entries — the h2 level should win.
        let primaryHeaderLevel: 1 | 2 | 3 | null = null;
        let maxVersionCount = 0;
        for (const level of [1, 2, 3] as const) {
            const versionCount = byLevel[level].filter(h => this.headerTextIsVersion(h)).length;
            if (versionCount > maxVersionCount) {
                maxVersionCount = versionCount;
                primaryHeaderLevel = level;
            }
        }

        // Version style
        let versionStyle: ParsingHints['versionStyle'] = 'none';
        const allLevelHeaders = [
            ...byLevel[1], ...byLevel[2], ...byLevel[3]
        ].filter(h => this.headerTextIsVersion(h));

        if (allLevelHeaders.length > 0) {
            const sample = allLevelHeaders[0];
            if (BRACKET_SEMVER_DASH.test(sample)) versionStyle = 'bracket-dash';
            else if (BRACKET_SEMVER.test(sample)) versionStyle = 'bracket-date';
            else if (/^v\d/i.test(sample)) versionStyle = 'v-prefix';
            else if (/^\d+\.\d+/.test(sample)) versionStyle = 'plain-semver';
            else if (/^release/i.test(sample)) versionStyle = 'release-prefix';
        }

        // Sub-sections: any level has section labels at depth+1?
        const sectionLevel = primaryHeaderLevel ? primaryHeaderLevel + 1 : 3;
        const hasSubsections = sectionLevel <= 4 &&
            (byLevel[sectionLevel] ?? []).some(h =>
                SECTION_LABELS.some(s => h.toLowerCase().startsWith(s))
            );

        const treatAsSingle = format === 'flat_list' || format === 'simple';
        const conventionalCommits = format === 'conventional_commits' || conventionalLines.length >= 3;
        const dateBasedGrouping = format === 'date_based';

        return {
            primaryHeaderLevel,
            versionStyle,
            hasSubsections,
            treatAsSingle,
            conventionalCommits,
            dateBasedGrouping
        };
    }

    // ── Parsing ───────────────────────────────────────────────────────────

    static parseChangelog(content: string, overrides?: ParseOverrides): ParsedChangelog {
        // Pre-process: build extra strip patterns from overrides
        const extraPatterns = (overrides?.stripPatterns ?? [])
            .map(s => { try { return new RegExp(s, 'g'); } catch { return null; } })
            .filter((r): r is RegExp => r !== null);

        const detection = this.detectFormat(content, extraPatterns);

        // Apply user overrides on top of detection
        const hints: ParsingHints = {
            ...detection.hints,
            ...(overrides?.primaryHeaderLevel !== undefined
                ? { primaryHeaderLevel: overrides.primaryHeaderLevel as 1 | 2 | 3 | null }
                : {}),
            ...(overrides?.treatAsSingle !== undefined
                ? { treatAsSingle: overrides.treatAsSingle }
                : {})
        };
        const effectiveDetection = { ...detection, hints };

        if (overrides?.forceFormat) {
            effectiveDetection.format = overrides.forceFormat;
        }

        // Choose strategy
        if (hints.treatAsSingle && !hints.primaryHeaderLevel) {
            return this.parseFlatContent(content, effectiveDetection, extraPatterns);
        }
        if (hints.dateBasedGrouping && !hints.primaryHeaderLevel) {
            return this.parseDateBased(content, effectiveDetection, extraPatterns);
        }
        if (hints.conventionalCommits && !hints.primaryHeaderLevel) {
            return this.parseConventionalCommits(content, effectiveDetection, extraPatterns);
        }

        const result = this.parseHeaderBased(content, effectiveDetection, false, extraPatterns);

        if (result.entries.length === 0) {
            const fallbacks = [
                () => this.parseHeaderBased(content, effectiveDetection, true, extraPatterns),
                () => this.parseConventionalCommits(content, effectiveDetection, extraPatterns),
                () => this.parseFlatContent(content, effectiveDetection, extraPatterns)
            ];
            for (const attempt of fallbacks) {
                const fb = attempt();
                if (fb.entries.length > 0) {
                    fb.metadata.parseWarnings.unshift('Used fallback parsing strategy');
                    fb.metadata.originalFormat = effectiveDetection.format;
                    return fb;
                }
            }
        }

        return result;
    }

    // ── Strategy: Header-based ────────────────────────────────────────────

    private static parseHeaderBased(
        content: string,
        detection: FormatDetectionResult,
        relaxed = false,
        extraPatterns: RegExp[] = []
    ): ParsedChangelog {
        const lines = content.split('\n');
        const sections: ChangelogSection[] = [];
        const entries: ParsedChangelogEntry[] = [];
        const parseWarnings: string[] = [];
        const { hints } = detection;

        const versionLevel = hints.primaryHeaderLevel; // primary detected level
        const maxVersionLevel = relaxed ? 4 : (versionLevel ?? 3);

        let currentEntry: Partial<ParsedChangelogEntry> | null = null;
        let contentBuffer: string[] = [];
        let inEntry = false;

        const finaliseCurrentEntry = () => {
            if (currentEntry?.title && inEntry) {
                const processed = this.processContentBuffer(contentBuffer, hints);
                // Include the entry if it has content OR a recognisable version number.
                // Never silently drop a versioned entry even if it has no bullet points.
                if (processed.trim() || currentEntry.version) {
                    currentEntry.content = processed;
                    // Auto-extract section tags from content (Added, Fixed, etc.)
                    const contentTags = this.extractTagsFromContent(contentBuffer.join('\n'));
                    currentEntry.tags = [...new Set([...(currentEntry.tags ?? []), ...contentTags])];
                    entries.push(currentEntry as ParsedChangelogEntry);
                }
            }
            currentEntry = null;
            contentBuffer = [];
            inEntry = false;
        };

        for (const line of lines) {
            // Horizontal rule: section separator — always finalise current entry, never add to content
            if (/^---+\s*$/.test(line.trim())) {
                // Don't finalise here — the next version header will do it.
                // Just skip so --- doesn't appear in entry content.
                continue;
            }

            const hm = line.match(/^(#{1,6})\s+(.+)$/);
            if (hm) {
                const level = hm[1].length;
                const raw = hm[2].trim();
                const headerText = this.stripInlineMarkup(raw, extraPatterns);

                // Version header if:
                //   a) We have a detected level AND this level is ≤ that (mixed h1/h2 allowed)
                //   b) OR no detected level and this level ≤ max and it looks like a version
                const qualifiesAsVersion = this.headerTextIsVersion(headerText);
                const isVersionLevel = qualifiesAsVersion && (
                    versionLevel
                        ? level <= versionLevel          // h1 accepted when primary is h2
                        : level <= maxVersionLevel
                );

                if (isVersionLevel) {
                    finaliseCurrentEntry();

                    const { version, date, cleanTitle } = this.parseHeaderInfo(headerText);
                    currentEntry = {
                        title: cleanTitle,
                        version: version || undefined,
                        publishedAt: date || undefined,
                        content: '',
                        tags: []
                    };
                    inEntry = true;
                    contentBuffer = [];

                    sections.push({ heading: raw, level, content: '', entries: [], rawContent: line });
                    continue;
                }

                // Non-version h1 = document title → skip
                if (level === 1 && !qualifiesAsVersion) {
                    sections.push({ heading: raw, level, content: '', entries: [], rawContent: line });
                    continue;
                }

                // Sub-header inside current entry → buffer it (will become **bold** label)
                if (inEntry && currentEntry) {
                    contentBuffer.push(line);
                } else {
                    sections.push({ heading: raw, level, content: '', entries: [], rawContent: line });
                }
                continue;
            }

            if (inEntry && currentEntry) {
                if (contentBuffer.length === 0 && !line.trim()) continue; // skip leading blank
                contentBuffer.push(line);
            }
        }

        finaliseCurrentEntry();

        if (entries.length === 0) {
            parseWarnings.push('No version headers recognised in this content');
        }

        return this.buildResult(entries, sections, parseWarnings, detection.format);
    }

    // ── Strategy: Flat / single-entry ─────────────────────────────────────

    private static parseFlatContent(content: string, detection: FormatDetectionResult, _extraPatterns: RegExp[] = []): ParsedChangelog {
        const parseWarnings: string[] = ['Content has no version headers — imported as a single entry'];
        const lines = content.split('\n');

        // Try to find a title from the first h1 or h2
        let title = 'Changelog';
        const titleLine = lines.find(l => /^#{1,2}\s+/.test(l));
        if (titleLine) {
            title = titleLine.replace(/^#+\s+/, '').trim();
        }

        // Everything else is content
        const contentLines = lines.filter(l => l !== titleLine);
        const bodyContent = this.processContentBuffer(contentLines, detection.hints);

        if (!bodyContent.trim()) {
            return this.buildResult([], [], ['Content appears empty'], detection.format);
        }

        const entry: ParsedChangelogEntry = {
            title,
            content: bodyContent,
            tags: []
        };

        return this.buildResult([entry], [], parseWarnings, detection.format);
    }

    // ── Strategy: Date-based ──────────────────────────────────────────────

    private static parseDateBased(content: string, detection: FormatDetectionResult, extraPatterns: RegExp[] = []): ParsedChangelog {
        const lines = content.split('\n');
        const entries: ParsedChangelogEntry[] = [];
        const parseWarnings: string[] = [];

        let currentEntry: Partial<ParsedChangelogEntry> | null = null;
        let contentBuffer: string[] = [];

        const finalise = () => {
            if (currentEntry?.title) {
                const processed = this.processContentBuffer(contentBuffer, detection.hints);
                if (processed.trim()) {
                    currentEntry.content = processed;
                    entries.push(currentEntry as ParsedChangelogEntry);
                }
            }
            currentEntry = null;
            contentBuffer = [];
        };

        for (const line of lines) {
            if (/^---+\s*$/.test(line.trim())) continue;
            const hm = line.match(/^(#{1,3})\s+(.+)$/);
            if (hm) {
                const headerText = this.stripInlineMarkup(hm[2].trim(), extraPatterns);
                const date = this.parseDateString(headerText);
                if (date || ISO_DATE_ONLY.test(headerText) || MONTH_ONLY.test(headerText)) {
                    finalise();
                    currentEntry = {
                        title: headerText,
                        publishedAt: date || undefined,
                        content: '',
                        tags: []
                    };
                    contentBuffer = [];
                    continue;
                }
            }

            if (currentEntry) {
                if (contentBuffer.length === 0 && !line.trim()) continue;
                contentBuffer.push(line);
            }
        }

        finalise();

        if (entries.length === 0) {
            parseWarnings.push('Date-based parsing found no entries');
        }

        return this.buildResult(entries, [], parseWarnings, detection.format);
    }

    // ── Strategy: Conventional Commits ────────────────────────────────────

    private static parseConventionalCommits(content: string, detection: FormatDetectionResult, extraPatterns: RegExp[] = []): ParsedChangelog {
        const lines = content.split('\n');
        const entries: ParsedChangelogEntry[] = [];
        const parseWarnings: string[] = [];

        let currentVersion: string | undefined;
        let currentDate: Date | undefined;
        let groups: Record<string, string[]> = {};

        const finalise = () => {
            const allLines = Object.entries(groups)
                .filter(([, items]) => items.length > 0)
                .map(([label, items]) => `**${label}**\n${items.join('\n')}`)
                .join('\n\n');

            if (allLines.trim()) {
                entries.push({
                    title: currentVersion ? `v${currentVersion}` : 'Changes',
                    version: currentVersion,
                    publishedAt: currentDate,
                    content: allLines,
                    tags: []
                });
            }
            groups = {};
            currentDate = undefined;
        };

        for (const line of lines) {
            if (/^---+\s*$/.test(line.trim())) continue;
            const hm = line.match(/^(#{1,3})\s+(.+)$/);
            if (hm) {
                const headerText = this.stripInlineMarkup(hm[2].trim(), extraPatterns);
                if (this.headerTextIsVersion(headerText)) {
                    if (Object.keys(groups).length > 0) finalise();
                    const { version, date } = this.parseHeaderInfo(headerText);
                    currentVersion = version;
                    currentDate = date;
                    continue;
                }
            }

            const cc = line.match(new RegExp(
                `^(?:[-*+]\\s*)?(?:${CONVENTIONAL_PREFIXES.join('|')})(?:\\(([^)]+)\\))?!?:\\s+(.+)$`, 'i'
            ));
            if (cc) {
                const prefix = (line.match(/^(?:[-*+]\s*)?(\w+)/)?.[1] ?? 'other').toLowerCase();
                const label = this.conventionalLabel(prefix);
                if (!groups[label]) groups[label] = [];
                groups[label].push(`- ${cc[cc.length - 1]}`);
                continue;
            }

            // Non-conventional line — keep in current group as "Other"
            if (line.trim() && currentVersion !== undefined) {
                if (!groups['Other']) groups['Other'] = [];
                groups['Other'].push(line);
            }
        }

        if (Object.keys(groups).length > 0) finalise();

        if (entries.length === 0) {
            parseWarnings.push('Conventional commits parsing found no entries');
        }

        return this.buildResult(entries, [], parseWarnings, detection.format);
    }

    // ── Header text analysis ──────────────────────────────────────────────

    /**
     * Returns true if the text (after stripping the ## prefix) looks like a
     * version/release header that should start a new changelog entry.
     */
    static headerTextIsVersion(text: string): boolean {
        const clean = this.stripInlineMarkup(text).trim();

        // Plain semver: v1.0.7, 1.0.7, 1.0 (two-part)
        if (/^v?\d+\.\d+(\.\d+)?(?:-[a-zA-Z0-9.-]+)?(?:\s|$)/i.test(clean)) return true;

        // [version] or [version] - date
        if (/^\[v?\d+/.test(clean)) return true;

        // "Release X.Y.Z" / "Version X.Y.Z"
        if (/^(?:release|version)\s+v?\d+\.\d+/i.test(clean)) return true;

        // "Unreleased" / "Latest" / "Upcoming"
        if (/^(?:unreleased|latest|upcoming|next|current|HEAD)/i.test(clean)) return true;

        // GitHub compare link: [](https://github.com/.../compare/...)
        if (/^\[\]\(https?:\/\/[^)]+\/compare\//i.test(clean)) return true;

        return false;
    }

    // ── Header info extraction ────────────────────────────────────────────

    static parseHeaderInfo(rawHeaderText: string): {
        version?: string;
        date?: Date;
        cleanTitle: string;
    } {
        const headerText = this.stripInlineMarkup(rawHeaderText).trim();
        let version: string | undefined;
        let date: Date | undefined;
        let cleanTitle = headerText;

        // 1. [version] - date  (KaC standard)
        const m1 = headerText.match(BRACKET_SEMVER_DASH);
        if (m1) {
            version = m1[1];
            const rest = m1[2]?.trim() ?? '';
            date = this.parseDateString(rest) ?? undefined;
            cleanTitle = date ? `v${version}` : `v${version}${rest ? ` – ${rest}` : ''}`;
            return { version, date, cleanTitle };
        }

        // 2. [](https://github.com/.../compare/vA...vB) (date)
        const m2 = headerText.match(/^\[\]\(([^)]+)\)\s*\(([^)]+)\)$/);
        if (m2) {
            date = this.parseDateString(m2[2]) ?? undefined;
            const versionFromUrl = m2[1].match(/\/compare\/v?([^.]+\.[^.]+\.[^)]*)\.\.\./)?.[1];
            version = versionFromUrl;
            cleanTitle = date
                ? `Release ${m2[2]}`
                : `Release`;
            return { version, date, cleanTitle };
        }

        // 3. [version] (date) — markdown link-ish format
        const m3 = headerText.match(/^\[([^\]]+)\]\s*\(([^)]+)\)$/);
        if (m3) {
            const possibleVersion = m3[1].replace(/^v/i, '');
            if (/^\d+\.\d+/.test(possibleVersion)) version = possibleVersion;
            date = this.parseDateString(m3[2]) ?? undefined;
            cleanTitle = version ? `v${version}` : m3[1];
            return { version, date, cleanTitle };
        }

        // 4. [version] alone — bracket without date
        const m4 = headerText.match(BRACKET_SEMVER);
        if (m4) {
            version = m4[1];
            cleanTitle = headerText.replace(m4[0], '').replace(/^[\s\-–—]+/, '').trim() || `v${version}`;
            return { version, date, cleanTitle };
        }

        // 5. "Release X.Y.Z" / "Version X.Y.Z ..."
        const m5 = headerText.match(/^(?:release|version)\s+v?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.-]+)?)(.*)/i);
        if (m5) {
            version = m5[1];
            const rest = m5[2]?.trim().replace(/^[-–—]\s*/, '') ?? '';
            date = this.parseDateString(rest) ?? undefined;
            cleanTitle = rest && !date ? `${m5[0].split(/\s+/).slice(0, 2).join(' ')} – ${rest}` : `v${version}`;
            return { version, date, cleanTitle };
        }

        // 6. Plain semver at start: v1.0.7, 1.0.7, v1.0.7 - Title, v1.0.7 – 2024-01-15
        //    Also handles version ranges: v1.1.0 - v1.1.2
        const m6 = headerText.match(SEMVER_START);
        if (m6 && !headerText.startsWith('[')) {
            version = m6[1];
            const rest = m6[2]?.trim() ?? '';
            date = rest ? (this.parseDateString(rest) ?? undefined) : undefined;

            if (rest && !date) {
                // Check if "rest" is itself a semver (version range like v1.1.0 - v1.1.2)
                const restIsVersion = /^v?\d+\.\d+/.test(rest);
                cleanTitle = restIsVersion ? `v${version} – ${rest}` : rest;
            } else {
                cleanTitle = `v${version}`;
            }
            return { version, date, cleanTitle };
        }

        // 7. Unreleased / HEAD / Latest
        if (/^(?:unreleased|latest|upcoming|next|current|HEAD)/i.test(headerText)) {
            cleanTitle = headerText;
            return { version: undefined, date: undefined, cleanTitle };
        }

        // 8. Date-only header
        const dateFromHeader = this.parseDateString(headerText);
        if (dateFromHeader) {
            date = dateFromHeader;
            cleanTitle = headerText;
            return { version: undefined, date, cleanTitle };
        }

        // 9. Fallback: return as-is
        return { version: undefined, date: undefined, cleanTitle: headerText };
    }

    // ── Content processing ────────────────────────────────────────────────

    private static processContentBuffer(lines: string[], hints?: ParsingHints): string {
        if (lines.length === 0) return '';

        const processed: string[] = [];
        let lastWasEmpty = false;
        let inCodeFence = false;

        for (const rawLine of lines) {
            const trimmed = rawLine.trim();

            // Track code fences — never clean content inside them
            if (/^```/.test(trimmed)) {
                inCodeFence = !inCodeFence;
                processed.push(rawLine);
                lastWasEmpty = false;
                continue;
            }

            // Sub-headings inside an entry → bold label (only outside code fences)
            if (!inCodeFence) {
                const subHeader = rawLine.match(/^(#{2,6})\s+(.+)$/);
                if (subHeader) {
                    if (processed.length > 0 && !lastWasEmpty) processed.push('');
                    // Strip color tags from sub-heading text too
                    const subText = this.cleanContentLine(subHeader[2].trim());
                    processed.push(`**${subText}**`);
                    processed.push('');
                    lastWasEmpty = true;
                    continue;
                }
            }

            // Blank line
            if (!trimmed) {
                if (!lastWasEmpty && processed.length > 0) {
                    processed.push('');
                    lastWasEmpty = true;
                }
                continue;
            }

            // Strip HTML comments
            if (/^<!--/.test(trimmed)) continue;

            // Clean color/markup tags from content lines (outside code fences)
            const line = inCodeFence ? rawLine : this.cleanContentLine(rawLine);

            processed.push(line);
            lastWasEmpty = false;
        }

        // Remove trailing blank lines
        while (processed.length > 0 && !processed[processed.length - 1].trim()) {
            processed.pop();
        }

        return processed.join('\n');
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Extract changelog section tags (added, fixed, changed …) from raw entry content.
     * Looks at:
     *  - Sub-headings converted to **bold** by processContentBuffer: **Added**, **Fixed** …
     *  - Sub-headings still in ## form (before processing): ### Added, ### Fixed …
     *  - List item prefixes: "- **Added** thing", "- <cg>**Added**</c> thing"
     *  - Plain text prefixes at the start of a list item: "- Added thing"
     */
    private static extractTagsFromContent(rawContent: string): string[] {
        const tags = new Set<string>();

        for (const line of rawContent.split('\n')) {
            // Strip all inline markup for analysis
            const clean = this.stripInlineMarkup(line).trim();

            // Sub-heading (### Added or **Added** on its own line)
            const subHeader = clean.match(/^(?:#{2,6}\s+)?\*{1,3}([A-Za-z][A-Za-z\s]+?)\*{1,3}\s*$/)
                           ?? clean.match(/^#{2,6}\s+([A-Za-z][A-Za-z\s]+?)\s*$/);
            if (subHeader) {
                const tag = this.normalizeToSectionTag(subHeader[1].trim());
                if (tag) tags.add(tag);
                continue;
            }

            // List item with bold prefix: - **Added** ..., * **Fixed** ...
            const listBold = clean.match(/^\s*[-*+]\s+\*{1,3}([A-Za-z][A-Za-z\s]+?)\*{1,3}\b/);
            if (listBold) {
                const tag = this.normalizeToSectionTag(listBold[1].trim());
                if (tag) tags.add(tag);
                continue;
            }

            // List item with a plain capitalised verb: - Added ..., - Fixed ...
            const listPlain = clean.match(/^\s*[-*+]\s+(Added|Changed|Fixed|Removed|Deprecated|Security|Updated|Improved|Bumped?|Integrated?)\b/i);
            if (listPlain) {
                const tag = this.normalizeToSectionTag(listPlain[1].trim());
                if (tag) tags.add(tag);
            }
        }

        return [...tags];
    }

    private static normalizeToSectionTag(text: string): string | null {
        const t = text.toLowerCase().trim();
        const map: Record<string, string> = {
            'added': 'added',
            'add': 'added',
            'changed': 'changed',
            'change': 'changed',
            'updated': 'changed',
            'update': 'changed',
            'improved': 'changed',
            'improvements': 'changed',
            'deprecated': 'deprecated',
            'removed': 'removed',
            'remove': 'removed',
            'fixed': 'fixed',
            'fix': 'fixed',
            'fixes': 'fixed',
            'bug fixes': 'fixed',
            'bugfix': 'fixed',
            'security': 'security',
            'breaking': 'breaking',
            'breaking changes': 'breaking',
            'integrated': 'added',
            'bumped': 'changed',
            'bump': 'changed',
        };
        return map[t] ?? null;
    }

    /**
     * Clean a single content line by removing color/custom markup tags.
     * Unlike stripInlineMarkup (which is destructive — removes emoji, collapses spaces),
     * this is gentle: it only removes Geode-style color wrappers while preserving
     * all other formatting (bold, italic, links, inline code, etc.).
     *
     * Safe to call on every content line regardless of format because the patterns
     * it removes (<c-xxxxxx>, <cc>, </c>) are never valid HTML.
     */
    private static cleanContentLine(line: string): string {
        return line
            // Geode/custom color open tags: <c-ffffff>, <cc>, <cg>, <cy>, <cl>, <cr>, <cj>, <cf>
            .replace(/<c(?:-[0-9a-fA-F]{3,8}|[a-z])?>/gi, '')
            // Closing color tag: </c>
            .replace(/<\/c>/gi, '');
    }

    /**
     * Strip inline markup from header text so version detection works on the
     * clean text regardless of how it was formatted.
     *
     * Handles:
     * - Geode/GD color tags: <c-ffffff>, <cc>, <cg>, <cy>, <cl>, <cr>, </c>, etc.
     * - Generic HTML tags: <span class="x">, <b>, </strong>, etc.
     * - Leading emoji and whitespace
     * - Extra patterns supplied by the caller (user-defined strip regexes)
     */
    static stripInlineMarkup(text: string, extraPatterns: RegExp[] = []): string {
        let result = text
            // Geode/custom color tags: <c-rrggbb>, <cc>, <cg>, <cy>, <cl>, <cr>, <cj>, <cf>, etc.
            .replace(/<c(?:-[0-9a-fA-F]{3,8}|[a-z])?>/gi, '')
            // Closing color tag: </c>
            .replace(/<\/c>/gi, '')
            // Any remaining HTML-like tags
            .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\/?>/gi, '')
            // Leading/trailing emoji and whitespace
            .replace(/^[\p{Emoji}️‍\s‍]+/u, '')
            .replace(/[\p{Emoji}️‍‍]+$/u, '')
            // Collapse internal whitespace
            .replace(/\s{2,}/g, ' ')
            .trim();

        for (const pattern of extraPatterns) {
            // Reset lastIndex since patterns may be global
            pattern.lastIndex = 0;
            result = result.replace(pattern, '').trim();
        }

        return result;
    }

    private static parseDateString(str: string): Date | null {
        if (!str?.trim()) return null;
        for (const pattern of DATE_PATTERNS) {
            const m = str.match(pattern);
            if (m) {
                const d = new Date(m[1] ?? m[0]);
                if (!isNaN(d.getTime())) return d;
            }
        }
        return null;
    }

    private static conventionalLabel(prefix: string): string {
        const labels: Record<string, string> = {
            feat: 'Features',
            fix: 'Bug Fixes',
            docs: 'Documentation',
            style: 'Style',
            refactor: 'Refactoring',
            test: 'Tests',
            chore: 'Chores',
            perf: 'Performance',
            ci: 'CI/CD',
            build: 'Build',
            revert: 'Reverts',
            wip: 'Work in Progress'
        };
        return labels[prefix.toLowerCase()] ?? 'Other';
    }

    private static buildResult(
        entries: ParsedChangelogEntry[],
        sections: ChangelogSection[],
        parseWarnings: string[],
        format: ImportFormat
    ): ParsedChangelog {
        return {
            sections,
            entries,
            metadata: {
                totalSections: sections.length,
                totalEntries: entries.length,
                hasVersions: entries.some(e => e.version),
                hasDates: entries.some(e => e.publishedAt),
                originalFormat: format,
                parseWarnings
            }
        };
    }

    // ── Public compat helpers (used by ChangelogImportService) ────────────

    static extractTags(text: string): string[] {
        const tags: string[] = [];
        const bracketTags = text.match(/\[([A-Z]{2,})\]/g);
        if (bracketTags) tags.push(...bracketTags.map(t => t.slice(1, -1).toLowerCase()));
        const ccMatch = text.match(new RegExp(`^(${CONVENTIONAL_PREFIXES.join('|')})(?:\\([^)]+\\))?!?:`, 'i'));
        if (ccMatch) tags.push(ccMatch[1].toLowerCase());
        return [...new Set(tags)];
    }
}
