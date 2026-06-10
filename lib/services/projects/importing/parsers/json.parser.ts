// lib/services/projects/importing/parsers/json.parser.ts

import { ParsedChangelog, ParsedChangelogEntry, JsonImportOptions } from '@/lib/types/projects/importing';

const DEFAULT_OPTIONS: JsonImportOptions = {
    versionField: 'version',
    titleField: 'title',
    contentField: 'content',
    dateField: 'date',
    tagsField: 'tags',
    tagSeparator: ','
};

// GitHub Releases API response shape
interface GitHubRelease {
    name?: string;
    tag_name?: string;
    published_at?: string;
    created_at?: string;
    body?: string;
    prerelease?: boolean;
    draft?: boolean;
}

// Generic JSON entry shape
type JsonEntry = Record<string, unknown>;

export class JsonParserService {
    /**
     * Detect whether string is JSON and which schema it looks like
     */
    static detectJsonFormat(content: string): { isJson: boolean; isGitHubReleases: boolean } {
        try {
            const parsed = JSON.parse(content);
            const arr = Array.isArray(parsed) ? parsed : parsed.data ?? parsed.entries ?? parsed.releases ?? null;
            if (!Array.isArray(arr) || arr.length === 0) return { isJson: true, isGitHubReleases: false };
            const first = arr[0] as Record<string, unknown>;
            const isGitHubReleases = 'tag_name' in first && 'body' in first;
            return { isJson: true, isGitHubReleases };
        } catch {
            return { isJson: false, isGitHubReleases: false };
        }
    }

    /**
     * Parse a JSON string (generic array or object) into changelog entries
     */
    static parseJson(content: string, options: Partial<JsonImportOptions> = {}): ParsedChangelog {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const parseWarnings: string[] = [];
        const entries: ParsedChangelogEntry[] = [];

        let raw: unknown;
        try {
            raw = JSON.parse(content);
        } catch {
            return this.emptyResult(['Invalid JSON: could not parse content']);
        }

        // Support top-level arrays or wrapped objects
        let items: JsonEntry[];
        if (Array.isArray(raw)) {
            items = raw as JsonEntry[];
        } else if (raw && typeof raw === 'object') {
            const obj = raw as Record<string, unknown>;
            const wrapped = obj.data ?? obj.entries ?? obj.releases ?? obj.items ?? obj.changelog;
            if (Array.isArray(wrapped)) {
                items = wrapped as JsonEntry[];
            } else {
                return this.emptyResult(['JSON must be an array or contain a top-level array in data/entries/releases/items/changelog']);
            }
        } else {
            return this.emptyResult(['JSON must be an object or array']);
        }

        // Detect GitHub Releases format
        const isGitHub = items.length > 0 && 'tag_name' in (items[0] as object);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || typeof item !== 'object') {
                parseWarnings.push(`Item at index ${i} is not an object — skipped`);
                continue;
            }

            try {
                const entry = isGitHub
                    ? this.convertGitHubRelease(item as unknown as GitHubRelease, i)
                    : this.convertGenericItem(item, opts, i, parseWarnings);

                if (entry) entries.push(entry);
            } catch (err) {
                parseWarnings.push(`Failed to parse item ${i}: ${err instanceof Error ? err.message : 'unknown error'}`);
            }
        }

        return {
            sections: [],
            entries,
            metadata: {
                totalSections: 0,
                totalEntries: entries.length,
                hasVersions: entries.some(e => e.version),
                hasDates: entries.some(e => e.publishedAt),
                originalFormat: isGitHub ? 'json_github' : 'json',
                parseWarnings
            }
        };
    }

    private static convertGitHubRelease(release: GitHubRelease, index: number): ParsedChangelogEntry | null {
        if (release.draft) return null;

        const tagName = release.tag_name ?? '';
        const version = tagName.replace(/^v/, '');
        const title = release.name?.trim() || (version ? `Version ${version}` : `Release ${index + 1}`);
        const content = release.body?.trim() || '';
        const dateStr = release.published_at ?? release.created_at;
        const publishedAt = dateStr ? new Date(dateStr) : undefined;
        const tags = release.prerelease ? ['prerelease'] : [];

        return { title, content, version: version || undefined, publishedAt, tags };
    }

    private static convertGenericItem(
        item: JsonEntry,
        opts: JsonImportOptions,
        index: number,
        warnings: string[]
    ): ParsedChangelogEntry | null {
        const title = this.extractString(item, opts.titleField)
            ?? this.extractString(item, 'name')
            ?? this.extractString(item, 'heading');

        if (!title) {
            warnings.push(`Item at index ${index} has no title field (tried: ${opts.titleField}, name, heading) — skipped`);
            return null;
        }

        const content = this.extractString(item, opts.contentField)
            ?? this.extractString(item, 'body')
            ?? this.extractString(item, 'description')
            ?? this.extractString(item, 'changes')
            ?? '';

        const versionRaw = this.extractString(item, opts.versionField)
            ?? this.extractString(item, 'tag_name');
        const version = versionRaw ? versionRaw.replace(/^v/, '') : undefined;

        const dateRaw = this.extractString(item, opts.dateField)
            ?? this.extractString(item, 'published_at')
            ?? this.extractString(item, 'created_at')
            ?? this.extractString(item, 'released_at');
        const publishedAt = dateRaw ? this.parseDate(dateRaw) : undefined;

        const tags = this.extractTags(item, opts.tagsField, opts.tagSeparator);

        return { title, content, version, publishedAt, tags };
    }

    private static extractString(obj: JsonEntry, key: string): string | undefined {
        const val = obj[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (typeof val === 'number') return String(val);
        return undefined;
    }

    private static extractTags(obj: JsonEntry, field: string, separator: string): string[] {
        const val = obj[field];
        if (Array.isArray(val)) return val.filter(t => typeof t === 'string').map(t => (t as string).trim().toLowerCase());
        if (typeof val === 'string' && val.trim()) {
            return val.split(separator).map(t => t.trim().toLowerCase()).filter(Boolean);
        }
        return [];
    }

    private static parseDate(str: string): Date | undefined {
        const d = new Date(str);
        return isNaN(d.getTime()) ? undefined : d;
    }

    private static emptyResult(warnings: string[]): ParsedChangelog {
        return {
            sections: [],
            entries: [],
            metadata: {
                totalSections: 0,
                totalEntries: 0,
                hasVersions: false,
                hasDates: false,
                originalFormat: 'json',
                parseWarnings: warnings
            }
        };
    }
}
