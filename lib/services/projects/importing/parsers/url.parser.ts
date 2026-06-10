// lib/services/projects/importing/parsers/url.parser.ts

import { ParsedChangelog, ParsedChangelogEntry, UrlImportOptions } from '@/lib/types/projects/importing';
import { JsonParserService } from './json.parser';

type DetectedUrlFormat = 'rss' | 'atom' | 'github_api' | 'json' | 'unknown';

export class UrlParserService {
    /**
     * Detect the format from a URL string (heuristic, no network call)
     */
    static detectUrlFormat(url: string): DetectedUrlFormat {
        if (/api\.github\.com\/repos\/[^/]+\/[^/]+\/releases/i.test(url)) return 'github_api';
        if (/\.xml$|rss|feed|atom/i.test(url)) return 'rss';
        if (/\.json$|\/releases\.json/i.test(url)) return 'json';
        return 'unknown';
    }

    /**
     * Fetch content from a URL and parse it
     * Must be called server-side (from API route) due to CORS constraints
     */
    static async fetchAndParse(options: UrlImportOptions): Promise<ParsedChangelog> {
        const { url, maxEntries = 50, githubToken } = options;

        const headers: Record<string, string> = {
            'User-Agent': 'Changerawr-Import/1.0',
            Accept: 'application/json, application/rss+xml, application/atom+xml, text/xml, */*'
        };

        if (githubToken) {
            headers['Authorization'] = `Bearer ${githubToken}`;
        }

        let response: Response;
        try {
            response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        } catch (err) {
            return this.emptyResult([`Failed to fetch URL: ${err instanceof Error ? err.message : 'Network error'}`]);
        }

        if (!response.ok) {
            return this.emptyResult([`HTTP ${response.status}: ${response.statusText}`]);
        }

        const contentType = response.headers.get('content-type') ?? '';
        const text = await response.text();

        // Determine format
        const detectedFromUrl = this.detectUrlFormat(url);
        const format = options.format !== 'auto' ? options.format : this.detectFromContentType(contentType, detectedFromUrl, text);

        switch (format) {
            case 'github_api':
                return this.parseGitHubReleases(text, maxEntries);
            case 'rss':
            case 'atom':
                return this.parseXmlFeed(text, maxEntries);
            case 'json':
                return JsonParserService.parseJson(text);
            default:
                // Try JSON first, then XML
                if (text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
                    return JsonParserService.parseJson(text);
                }
                if (text.trimStart().startsWith('<')) {
                    return this.parseXmlFeed(text, maxEntries);
                }
                return this.emptyResult(['Could not detect content format from URL response']);
        }
    }

    private static detectFromContentType(contentType: string, urlHint: DetectedUrlFormat, body: string): 'rss' | 'atom' | 'github_api' | 'json' {
        if (urlHint === 'github_api') return 'github_api';
        if (contentType.includes('json')) return 'json';
        if (contentType.includes('atom')) return 'atom';
        if (contentType.includes('rss') || contentType.includes('xml')) return 'rss';
        // fallback: peek at body
        if (body.includes('<feed') || body.includes('<rss')) return 'rss';
        return 'json';
    }

    /**
     * Parse GitHub Releases API JSON response
     */
    private static parseGitHubReleases(text: string, maxEntries: number): ParsedChangelog {
        const result = JsonParserService.parseJson(text);
        result.entries = result.entries.slice(0, maxEntries);
        result.metadata.totalEntries = result.entries.length;
        result.metadata.originalFormat = 'json_github';
        return result;
    }

    /**
     * Parse RSS/Atom XML feed into changelog entries
     */
    private static parseXmlFeed(xml: string, maxEntries: number): ParsedChangelog {
        const parseWarnings: string[] = [];
        const entries: ParsedChangelogEntry[] = [];

        // Detect feed type
        const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

        // Simple regex-based XML parsing (no DOM in Node.js server context without xmldom)
        const itemPattern = isAtom
            ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi
            : /<item[^>]*>([\s\S]*?)<\/item>/gi;

        const items: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = itemPattern.exec(xml)) !== null) {
            items.push(match[1]);
            if (items.length >= maxEntries) break;
        }

        if (items.length === 0) {
            parseWarnings.push('No items found in feed — ensure the URL points to a valid RSS or Atom feed');
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const title = this.extractXmlText(item, 'title')
                ?? this.extractXmlCdata(item, 'title')
                ?? `Entry ${i + 1}`;

            const content = this.extractXmlCdata(item, 'content:encoded')
                ?? this.extractXmlText(item, 'content')
                ?? this.extractXmlCdata(item, 'description')
                ?? this.extractXmlText(item, 'description')
                ?? this.extractXmlCdata(item, 'summary')
                ?? this.extractXmlText(item, 'summary')
                ?? '';

            const dateRaw = this.extractXmlText(item, 'pubDate')
                ?? this.extractXmlText(item, 'published')
                ?? this.extractXmlText(item, 'updated');
            const publishedAt = dateRaw ? new Date(dateRaw) : undefined;

            // Try to extract version from title or guid
            const version = this.extractVersionFromText(title);

            // Try to extract tags from categories
            const tags: string[] = [];
            const categoryPattern = /<category[^>]*>([^<]*)<\/category>|<category[^>]*term="([^"]*)"[^/]*\/>/gi;
            let catMatch: RegExpExecArray | null;
            while ((catMatch = categoryPattern.exec(item)) !== null) {
                const tag = (catMatch[1] ?? catMatch[2] ?? '').trim().toLowerCase();
                if (tag) tags.push(tag);
            }

            entries.push({
                title: this.decodeXmlEntities(title.trim()),
                content: this.decodeXmlEntities(content.trim()),
                version,
                publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined,
                tags
            });
        }

        return {
            sections: [],
            entries,
            metadata: {
                totalSections: 0,
                totalEntries: entries.length,
                hasVersions: entries.some(e => e.version),
                hasDates: entries.some(e => e.publishedAt),
                originalFormat: isAtom ? 'atom' : 'rss',
                parseWarnings
            }
        };
    }

    private static extractXmlText(xml: string, tag: string): string | undefined {
        const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = xml.match(pattern);
        if (!match) return undefined;
        const text = match[1].trim();
        return text || undefined;
    }

    private static extractXmlCdata(xml: string, tag: string): string | undefined {
        const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s]*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>[\\s]*<\\/${tag}>`, 'i');
        const match = xml.match(pattern);
        if (!match) return undefined;
        const text = match[1].trim();
        return text || undefined;
    }

    private static extractVersionFromText(text: string): string | undefined {
        const match = text.match(/v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)/);
        return match ? match[1] : undefined;
    }

    private static decodeXmlEntities(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
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
                originalFormat: 'rss',
                parseWarnings: warnings
            }
        };
    }
}
