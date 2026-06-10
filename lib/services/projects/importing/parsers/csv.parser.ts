// lib/services/projects/importing/parsers/csv.parser.ts

import { ParsedChangelog, ParsedChangelogEntry, CsvImportOptions } from '@/lib/types/projects/importing';

const DEFAULT_OPTIONS: CsvImportOptions = {
    delimiter: ',',
    hasHeader: true,
    versionColumn: 'version',
    titleColumn: 'title',
    contentColumn: 'content',
    dateColumn: 'date',
    tagsColumn: 'tags',
    tagSeparator: ';'
};

export class CsvParserService {
    /**
     * Detect if content looks like CSV
     */
    static detectCsv(content: string): { isCsv: boolean; delimiter: string } {
        const firstLine = content.split('\n')[0] ?? '';
        for (const delim of [',', ';', '\t', '|']) {
            if (firstLine.split(delim).length >= 2) {
                return { isCsv: true, delimiter: delim };
            }
        }
        return { isCsv: false, delimiter: ',' };
    }

    /**
     * Parse CSV content into changelog entries
     */
    static parseCsv(content: string, options: Partial<CsvImportOptions> = {}): ParsedChangelog {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const parseWarnings: string[] = [];
        const entries: ParsedChangelogEntry[] = [];

        const lines = this.splitLines(content);
        if (lines.length === 0) {
            return this.emptyResult(['CSV content is empty']);
        }

        let headers: string[] = [];
        let dataStartIndex = 0;

        if (opts.hasHeader) {
            headers = this.parseLine(lines[0], opts.delimiter).map(h => h.toLowerCase().trim());
            dataStartIndex = 1;
        } else {
            // No header: use positional mapping
            headers = this.generatePositionalHeaders(opts);
        }

        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseLine(line, opts.delimiter);
            if (cols.length === 0) continue;

            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = (cols[idx] ?? '').trim();
            });

            const entry = this.rowToEntry(row, opts, i, parseWarnings);
            if (entry) entries.push(entry);
        }

        return {
            sections: [],
            entries,
            metadata: {
                totalSections: 0,
                totalEntries: entries.length,
                hasVersions: entries.some(e => e.version),
                hasDates: entries.some(e => e.publishedAt),
                originalFormat: 'csv',
                parseWarnings
            }
        };
    }

    private static rowToEntry(
        row: Record<string, string>,
        opts: CsvImportOptions,
        lineIndex: number,
        warnings: string[]
    ): ParsedChangelogEntry | null {
        const title = row[opts.titleColumn.toLowerCase()]
            ?? row['name']
            ?? row['heading'];

        if (!title?.trim()) {
            warnings.push(`Row ${lineIndex + 1} has no title — skipped`);
            return null;
        }

        const content = row[opts.contentColumn.toLowerCase()]
            ?? row['body']
            ?? row['description']
            ?? '';

        const versionRaw = row[opts.versionColumn.toLowerCase()] ?? row['tag'];
        const version = versionRaw ? versionRaw.replace(/^v/, '') : undefined;

        const dateRaw = row[opts.dateColumn.toLowerCase()]
            ?? row['published_at']
            ?? row['released_at'];
        const publishedAt = dateRaw ? this.parseDate(dateRaw) : undefined;

        const tagsRaw = row[opts.tagsColumn.toLowerCase()] ?? '';
        const tags = tagsRaw
            ? tagsRaw.split(opts.tagSeparator).map(t => t.trim().toLowerCase()).filter(Boolean)
            : [];

        return {
            title: title.trim(),
            content: content.trim(),
            version: version || undefined,
            publishedAt,
            tags
        };
    }

    /**
     * Parse a single CSV line, handling quoted fields
     */
    private static parseLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const ch = line[i];

            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                    continue;
                }
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
            i++;
        }

        result.push(current);
        return result;
    }

    private static splitLines(content: string): string[] {
        return content.split(/\r?\n/);
    }

    private static generatePositionalHeaders(opts: CsvImportOptions): string[] {
        return [
            opts.titleColumn,
            opts.versionColumn,
            opts.dateColumn,
            opts.contentColumn,
            opts.tagsColumn
        ].map(h => h.toLowerCase());
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
                originalFormat: 'csv',
                parseWarnings: warnings
            }
        };
    }
}
