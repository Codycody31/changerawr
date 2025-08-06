// lib/services/projects/importing/markdown-parser.service.ts

import {
    ParsedChangelog,
    ParsedChangelogEntry,
    ChangelogSection,
    FormatDetectionResult,
    ImportFormat
} from '@/lib/types/projects/importing';

export class MarkdownParserService {
    private static readonly VERSION_PATTERNS = [
        /^#+\s*(?:\[?v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\]?)/i,
        /^#+\s*(?:version\s+)?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)/i,
        /^#+\s*(?:release\s+)?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)/i,
        /^\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\]/i, // [1.0.3] format
    ];

    private static readonly DATE_PATTERNS = [
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{2}\/\d{2}\/\d{4})/,
        /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
    ];

    private static readonly SECTION_MARKERS = [
        'added', 'changed', 'deprecated', 'removed', 'fixed', 'security',
        'features', 'bug fixes', 'improvements', 'breaking changes',
        'enhancements', 'patches', 'updates', 'new', 'fixes'
    ];

    /**
     * Detect the format of the changelog
     */
    static detectFormat(content: string): FormatDetectionResult {
        const lines = content.split('\n');
        const characteristics: string[] = [];
        let confidence = 0;

        // Check for Keep a Changelog format
        const hasKeepAChangelogHeader = /keep\s*a\s*changelog/i.test(content);
        const hasUnreleasedSection = /unreleased/i.test(content);
        const hasVersionLinks = /\[[\d.]+\]:\s*http/i.test(content);

        if (hasKeepAChangelogHeader || (hasUnreleasedSection && hasVersionLinks)) {
            characteristics.push('Keep a Changelog format detected');
            confidence += 0.4;
        }

        // Check for GitHub Releases format
        const hasReleaseHeaders = lines.some(line =>
            /^#+\s*(?:release|v?\d+\.\d+\.\d+)/i.test(line)
        );

        if (hasReleaseHeaders) {
            characteristics.push('GitHub Releases format detected');
            confidence += 0.3;
        }

        // Check for structured sections
        const hasSectionHeaders = lines.some(line =>
            this.SECTION_MARKERS.some(marker =>
                new RegExp(`^#+\\s*${marker}`, 'i').test(line)
            )
        );

        if (hasSectionHeaders) {
            characteristics.push('Structured sections found');
            confidence += 0.2;
        }

        // Analyze structure
        const structure = {
            hasVersionHeaders: lines.some(line =>
                this.VERSION_PATTERNS.some(pattern => pattern.test(line))
            ),
            hasDateHeaders: lines.some(line =>
                this.DATE_PATTERNS.some(pattern => pattern.test(line))
            ),
            hasTypeHeaders: hasSectionHeaders,
            usesListFormat: /^\s*[-*+]\s/.test(content),
            usesMarkdownSyntax: /[#*`\[\]]/.test(content)
        };

        // Determine format based on characteristics
        let format: ImportFormat = 'simple';

        if (hasKeepAChangelogHeader || (hasUnreleasedSection && hasVersionLinks)) {
            format = 'keepachangelog';
            confidence += 0.2;
        } else if (hasReleaseHeaders && structure.hasVersionHeaders) {
            format = 'github_releases';
            confidence += 0.15;
        } else if (structure.usesMarkdownSyntax && structure.hasVersionHeaders) {
            format = 'custom';
            confidence += 0.1;
        }

        return {
            format,
            confidence: Math.min(confidence, 1),
            characteristics,
            structure
        };
    }

    /**
     * Parse markdown changelog content
     */
    static parseChangelog(content: string): ParsedChangelog {
        const lines = content.split('\n');
        const sections: ChangelogSection[] = [];
        const entries: ParsedChangelogEntry[] = [];
        const parseWarnings: string[] = [];

        let currentEntry: Partial<ParsedChangelogEntry> | null = null;
        let contentBuffer: string[] = [];
        let inVersionSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip the main title (# Changelog)
            if (trimmedLine.startsWith('# ') && (trimmedLine.toLowerCase().includes('changelog') || i === 0)) {
                continue;
            }

            // Check for version headers (## [version] - date or ## [](link) (date))
            const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
            if (headerMatch && headerMatch[1].length <= 2) { // Only h1 and h2 headers
                // Save previous entry if exists
                if (currentEntry && currentEntry.title && inVersionSection) {
                    const processedContent = this.processContentBuffer(contentBuffer);
                    if (processedContent.trim()) {
                        currentEntry.content = processedContent;
                        entries.push(currentEntry as ParsedChangelogEntry);
                    }
                    currentEntry = null;
                    contentBuffer = [];
                }

                const level = headerMatch[1].length;
                const headerText = headerMatch[2].trim();

                // Parse header info
                const { version, date, cleanTitle } = this.parseHeaderInfo(headerText);

                // Only create entry for version headers (not subsections)
                if (this.looksLikeVersionHeader(headerText)) {
                    currentEntry = {
                        title: cleanTitle,
                        version: version || undefined,
                        publishedAt: date || undefined,
                        content: '',
                        tags: []
                    };
                    inVersionSection = true;
                    contentBuffer = [];
                } else {
                    inVersionSection = false;
                }

                // Create section for all headers
                const currentSection: ChangelogSection = {
                    heading: headerText,
                    level,
                    content: '',
                    entries: [],
                    rawContent: line
                };
                sections.push(currentSection);
                continue;
            }

            // If we're in a version section, collect all content
            if (inVersionSection && currentEntry) {
                // Skip empty lines at the start
                if (contentBuffer.length === 0 && !trimmedLine) {
                    continue;
                }
                contentBuffer.push(line);
            }
        }

        // Finalize last entry
        if (currentEntry && currentEntry.title && inVersionSection) {
            const processedContent = this.processContentBuffer(contentBuffer);
            if (processedContent.trim()) {
                currentEntry.content = processedContent;
                entries.push(currentEntry as ParsedChangelogEntry);
            }
        }

        // Filter entries and add warnings
        if (entries.length === 0) {
            parseWarnings.push('No valid changelog entries found');
        }

        // Analyze metadata
        const hasVersions = entries.some(e => e.version);
        const hasDates = entries.some(e => e.publishedAt);

        const formatDetection = this.detectFormat(content);

        return {
            sections,
            entries,
            metadata: {
                totalSections: sections.length,
                totalEntries: entries.length,
                hasVersions,
                hasDates,
                originalFormat: formatDetection.format,
                parseWarnings
            }
        };
    }

    /**
     * Parse header information to extract version, date, and clean title
     */
    private static parseHeaderInfo(headerText: string): {
        version?: string;
        date?: Date;
        cleanTitle: string;
    } {
        let version: string | undefined;
        let date: Date | undefined;
        let cleanTitle = headerText;

        // Handle [version] - date format (CLI generated) - MOST SPECIFIC FIRST
        const cliVersionMatch = headerText.match(/^\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\]\s*-\s*(.+)$/);
        if (cliVersionMatch) {
            version = cliVersionMatch[1]; // Extract exact version like "1.0.3"
            const dateStr = cliVersionMatch[2];
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                date = parsedDate;
            }
            cleanTitle = `Version ${version} - ${dateStr}`;
            return { version, date, cleanTitle };
        }

        // Handle GitHub-style links: [](https://github.com/repo/compare/v1.6.1...v) (2025-07-09)
        const githubLinkMatch = headerText.match(/^\[\]\([^)]*\/compare\/[^)]*\)\s*\(([^)]+)\)$/);
        if (githubLinkMatch) {
            const dateStr = githubLinkMatch[1];
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                date = parsedDate;
            }

            // Try to extract version from the compare URL
            const urlMatch = headerText.match(/\/compare\/v?([^.]+\.[^.]+\.[^)]*)\.\.\./);
            if (urlMatch) {
                version = urlMatch[1];
            }

            cleanTitle = `Release ${dateStr}`;
            return { version, date, cleanTitle };
        }

        // Handle [version] (date) format
        const versionDateMatch = headerText.match(/^\[([^\]]+)\]\s*\(([^)]+)\)$/);
        if (versionDateMatch) {
            version = versionDateMatch[1];
            const dateStr = versionDateMatch[2];
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                date = parsedDate;
            }
            cleanTitle = `${version} - ${dateStr}`;
            return { version, date, cleanTitle };
        }

        // Extract version from standard patterns - BUT CHECK CLI PATTERN FIRST
        // Look for [version] at the start of the header text
        const bracketVersionMatch = headerText.match(/^\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\]/);
        if (bracketVersionMatch) {
            version = bracketVersionMatch[1];
            cleanTitle = headerText.replace(bracketVersionMatch[0], '').trim();
            // Remove leading dash if present
            cleanTitle = cleanTitle.replace(/^-\s*/, '').trim();
        } else {
            // Fall back to other version patterns
            for (const pattern of this.VERSION_PATTERNS) {
                const match = headerText.match(pattern);
                if (match) {
                    version = match[1];
                    cleanTitle = headerText.replace(pattern, '').trim();
                    break;
                }
            }
        }

        // Extract date from standard patterns if not already found
        if (!date) {
            for (const pattern of this.DATE_PATTERNS) {
                const match = headerText.match(pattern);
                if (match) {
                    const parsedDate = new Date(match[1]);
                    if (!isNaN(parsedDate.getTime())) {
                        date = parsedDate;
                        cleanTitle = cleanTitle.replace(pattern, '').trim();
                    }
                    break;
                }
            }
        }

        // Clean up title
        cleanTitle = cleanTitle
            .replace(/^\[|\]$/g, '') // Remove brackets
            .replace(/^-\s*/, '') // Remove leading dash
            .replace(/^\(\s*|\s*\)$/g, '') // Remove parentheses
            .trim();

        // If title is empty, generate one
        if (!cleanTitle) {
            if (version) {
                cleanTitle = `Version ${version}`;
            } else if (date) {
                cleanTitle = `Release ${date.toISOString().split('T')[0]}`;
            } else {
                cleanTitle = 'Release';
            }
        }

        return { version, date, cleanTitle };
    }

    /**
     * Parse list item to extract version and clean title
     */
    private static parseListItemInfo(itemText: string): {
        version?: string;
        cleanTitle: string;
    } {
        let version: string | undefined;
        let cleanTitle = itemText;

        // Check if list item starts with version
        const versionMatch = itemText.match(/^(?:v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)):?\s*(.+)$/);
        if (versionMatch) {
            version = versionMatch[1];
            cleanTitle = versionMatch[2];
        }

        return { version, cleanTitle };
    }

    /**
     * Extract tags from text using common patterns
     */
    private static extractTags(text: string): string[] {
        const tags: string[] = [];

        // Look for bracketed tags like [FEATURE], [BUG], etc.
        const bracketTags = text.match(/\[([A-Z]+)\]/g);
        if (bracketTags) {
            tags.push(...bracketTags.map(tag => tag.slice(1, -1).toLowerCase()));
        }

        // Look for prefixed tags like "feat:", "fix:", etc.
        const prefixMatch = text.match(/^(feat|fix|docs|style|refactor|test|chore|perf)(?:\([^)]+\))?:\s*/i);
        if (prefixMatch) {
            tags.push(prefixMatch[1].toLowerCase());
        }

        return tags;
    }

    /**
     * Process content buffer into formatted markdown content
     */
    private static processContentBuffer(contentBuffer: string[]): string {
        if (contentBuffer.length === 0) return '';

        const processedLines: string[] = [];
        let currentSection = '';

        for (let i = 0; i < contentBuffer.length; i++) {
            const line = contentBuffer[i];
            const trimmedLine = line.trim();

            // Handle subsection headers (### Features, ### Bug Fixes, etc.)
            const subHeaderMatch = line.match(/^(#{3,6})\s+(.+)$/);
            if (subHeaderMatch) {
                const subHeaderText = subHeaderMatch[2].trim();
                if (currentSection) {
                    processedLines.push(''); // Add spacing before new section
                }
                processedLines.push(`**${subHeaderText}**`);
                processedLines.push('');
                currentSection = subHeaderText;
                continue;
            }

            // Handle list items - preserve original formatting
            const listItemMatch = line.match(/^\s*[-*+]\s+(.+)$/);
            if (listItemMatch) {
                processedLines.push(line);
                continue;
            }

            // Handle regular content
            if (trimmedLine || processedLines.length > 0) {
                processedLines.push(line);
            }
        }

        // Clean up trailing empty lines
        while (processedLines.length > 0 && !processedLines[processedLines.length - 1].trim()) {
            processedLines.pop();
        }

        return processedLines.join('\n');
    }

    /**
     * Check if header looks like a version header
     */
    private static looksLikeVersionHeader(headerText: string): boolean {
        // Check for version patterns
        if (this.VERSION_PATTERNS.some(pattern => pattern.test(headerText))) {
            return true;
        }

        // Check for [version] - date format (CLI generated)
        if (/^\[\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\]\s*-\s*/.test(headerText)) {
            return true;
        }

        // Check for GitHub-style empty link with date: [](link) (date)
        if (/^\[\]\([^)]+\)\s*\([^)]+\)$/.test(headerText)) {
            return true;
        }

        // Check for [version] (date) format
        if (/^\[[^\]]+\]\s*\([^)]+\)$/.test(headerText)) {
            return true;
        }

        // Check for unreleased/latest
        if (/^(unreleased|latest|current)/i.test(headerText)) {
            return true;
        }

        return false;
    }

    /**
     * Finalize an entry by processing accumulated content
     */
    private static finalizeEntry(
        entry: Partial<ParsedChangelogEntry>,
        contentBuffer: string[],
        entries: ParsedChangelogEntry[]
    ): void {
        const content = this.processContentBuffer(contentBuffer);

        if (entry.title && content.trim()) {
            entries.push({
                title: entry.title,
                content: content,
                version: entry.version,
                publishedAt: entry.publishedAt,
                tags: entry.tags || [],
                metadata: {
                    originalIndex: entries.length,
                    hasContent: Boolean(content.trim()),
                    estimatedReadingTime: Math.ceil(content.split(' ').length / 200)
                }
            });
        }
    }
}