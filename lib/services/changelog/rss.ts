import type { ChangelogEntry } from '@prisma/client'

export interface RssFeedConfig {
    feedTitle?: string | null
    feedDescription?: string | null
    includeTags: boolean
    includeVersion: boolean
    tagFilter: string[]
    itemTemplate?: string | null
}

export const DEFAULT_RSS_FEED_CONFIG: RssFeedConfig = {
    feedTitle: null,
    feedDescription: null,
    includeTags: false,
    includeVersion: true,
    tagFilter: [],
    itemTemplate: null,
}

export const RSS_TEMPLATE_VARIABLES: { key: string; label: string; description: string }[] = [
    { key: 'title', label: '{{title}}', description: 'Entry title' },
    { key: 'content', label: '{{content}}', description: 'Full entry content (HTML)' },
    { key: 'excerpt', label: '{{excerpt}}', description: 'Short excerpt, if available' },
    { key: 'version', label: '{{version}}', description: 'Version label, if set' },
    { key: 'date', label: '{{date}}', description: 'Publish date' },
    { key: 'url', label: '{{url}}', description: 'Link to the full entry' },
    { key: 'tags', label: '{{tags}}', description: 'Comma-separated tag names' },
    { key: 'id', label: '{{id}}', description: 'Entry ID' },
]

/**
 * Parses a possibly-untrusted/partial value (e.g. from the database JSON column)
 * into a fully-populated RssFeedConfig, falling back to defaults for anything missing.
 */
export function parseRssFeedConfig(raw: unknown): RssFeedConfig {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_RSS_FEED_CONFIG }
    }

    const obj = raw as Record<string, unknown>

    return {
        feedTitle: typeof obj.feedTitle === 'string' ? obj.feedTitle : null,
        feedDescription: typeof obj.feedDescription === 'string' ? obj.feedDescription : null,
        includeTags: typeof obj.includeTags === 'boolean' ? obj.includeTags : DEFAULT_RSS_FEED_CONFIG.includeTags,
        includeVersion: typeof obj.includeVersion === 'boolean' ? obj.includeVersion : DEFAULT_RSS_FEED_CONFIG.includeVersion,
        tagFilter: Array.isArray(obj.tagFilter)
            ? obj.tagFilter.filter((tag): tag is string => typeof tag === 'string')
            : [],
        itemTemplate: typeof obj.itemTemplate === 'string' ? obj.itemTemplate : null,
    }
}

/**
 * Replaces `{{variable}}` placeholders in a feed item template with the provided values.
 * Unknown variables are replaced with an empty string.
 */
export function renderItemTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => vars[key] ?? '')
}

type RSSEntry = ChangelogEntry & { tags?: { name: string }[] }

interface RSSFeedOptions {
    title: string
    description: string
    link: string
    language?: string
    copyright?: string
    ttl?: number
    useExcerpt?: boolean
    feedConfig?: RssFeedConfig
}

export function generateRSSFeed(entries: RSSEntry[], options: RSSFeedOptions): string {
    const {
        title,
        description,
        link,
        language = 'en-US',
        copyright = `Copyright ${new Date().getFullYear()}`,
        ttl = 60,
        useExcerpt = false,
        feedConfig = DEFAULT_RSS_FEED_CONFIG
    } = options

    const feedTitle = feedConfig.feedTitle?.trim() ? feedConfig.feedTitle : title
    const feedDescription = feedConfig.feedDescription?.trim() ? feedConfig.feedDescription : description

    const items = entries
        .map(entry => {
            const pubDate = entry.publishedAt
                ? new Date(entry.publishedAt).toUTCString()
                : new Date(entry.createdAt).toUTCString()

            const tagNames = entry.tags?.map(tag => tag.name) ?? []

            const body = feedConfig.itemTemplate?.trim()
                ? renderItemTemplate(feedConfig.itemTemplate, {
                    title: entry.title,
                    content: entry.content,
                    excerpt: entry.excerpt ?? '',
                    version: entry.version ?? '',
                    date: pubDate,
                    url: `${link}/${entry.id}`,
                    tags: tagNames.join(', '),
                    id: entry.id
                })
                : (useExcerpt && entry.excerpt ? entry.excerpt : entry.content)

            const categories = feedConfig.includeTags
                ? tagNames.map(name => `<category><![CDATA[${name}]]></category>`).join('\n            ')
                : ''

            return `
        <item>
          <title><![CDATA[${entry.title}]]></title>
          <description><![CDATA[${body}]]></description>
          <link>${link}/${entry.id}</link>
          <guid isPermaLink="false">${entry.id}</guid>
          <pubDate>${pubDate}</pubDate>
          ${feedConfig.includeVersion && entry.version ? `<version>${entry.version}</version>` : ''}
          ${categories}
        </item>
      `.trim()
        })
        .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${feedTitle}]]></title>
    <description><![CDATA[${feedDescription}]]></description>
    <link>${link}</link>
    <language>${language}</language>
    <ttl>${ttl}</ttl>
    <copyright>${copyright}</copyright>
    <atom:link href="${link}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`.trim()
}
