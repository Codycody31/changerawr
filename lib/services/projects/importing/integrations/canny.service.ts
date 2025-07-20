// lib/services/projects/importing/integrations/canny.service.ts

import {
    CannyEntry,
    CannyApiResponse,
    CannyImportOptions
} from '@/lib/types/projects/importing/canny';
import { ValidatedEntry } from '@/lib/types/projects/importing';

export class CannyService {
    private static readonly API_URL = 'https://canny.io/api/v1/entries/list';

    /**
     * Validate API key by making a test request
     */
    static async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const formData = new FormData();
            formData.append('apiKey', apiKey);
            formData.append('limit', '1');

            const response = await fetch(this.API_URL, {
                method: 'POST',
                body: formData
            });

            if (response.status === 401 || response.status === 403) {
                return { valid: false, error: 'Invalid API key or insufficient permissions' };
            }

            if (!response.ok) {
                return { valid: false, error: `API error: ${response.status}` };
            }

            return { valid: true };
        } catch {
            return { valid: false, error: 'Network error' };
        }
    }

    /**
     * Fetch all entries from Canny
     */
    static async fetchEntries(options: CannyImportOptions): Promise<{
        entries: CannyEntry[];
        error?: string;
    }> {
        const allEntries: CannyEntry[] = [];
        let skip = 0;
        const limit = 50;

        try {
            while (allEntries.length < options.maxEntries) {
                const formData = new FormData();
                formData.append('apiKey', options.apiKey);
                formData.append('limit', limit.toString());
                formData.append('skip', skip.toString());
                formData.append('sort', 'created');

                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    return { entries: [], error: `API request failed: ${response.status}` };
                }

                const data: CannyApiResponse = await response.json();

                // Filter by status
                const filteredEntries = options.statusFilter === 'all'
                    ? data.entries
                    : data.entries.filter(entry => entry.status === options.statusFilter);

                allEntries.push(...filteredEntries);

                if (!data.hasMore || filteredEntries.length === 0) {
                    break;
                }

                skip += limit;

                // Safety check
                if (skip > 1000) {
                    break;
                }
            }

            // Limit to max entries
            const limitedEntries = allEntries.slice(0, options.maxEntries);

            return { entries: limitedEntries };
        } catch (error) {
            return {
                entries: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Convert Canny entries to ValidatedEntry format
     */
    static convertEntries(entries: CannyEntry[], options: CannyImportOptions): ValidatedEntry[] {
        return entries.map(entry => {
            // Build content - ensure we have some content
            let content = '';

            if (entry.markdownDetails && entry.markdownDetails.trim()) {
                content = entry.markdownDetails.trim();
            } else if (entry.plaintextDetails && entry.plaintextDetails.trim()) {
                content = entry.plaintextDetails.trim();
            } else {
                content = 'No content provided.';
            }

            // Add related posts if any
            if (entry.posts && Array.isArray(entry.posts) && entry.posts.length > 0) {
                content += '\n\n**Related Feature Requests:**\n';
                entry.posts.forEach(post => {
                    if (post && post.title && post.url) {
                        const status = post.status || 'unknown';
                        content += `- [${post.title}](${post.url}) - ${status}\n`;
                    }
                });
            }

            // Collect tags
            const tags: string[] = [];

            // Add entry types
            if (entry.types && Array.isArray(entry.types)) {
                tags.push(...entry.types.filter(type => type && typeof type === 'string'));
            }

            // Add labels if enabled
            if (options.includeLabels && entry.labels && Array.isArray(entry.labels)) {
                entry.labels.forEach(label => {
                    if (label && label.name && typeof label.name === 'string') {
                        tags.push(label.name.toLowerCase().trim());
                    }
                });
            }

            // Add post tags if enabled
            if (options.includePostTags && entry.posts && Array.isArray(entry.posts)) {
                entry.posts.forEach(post => {
                    if (post && post.tags && Array.isArray(post.tags)) {
                        post.tags.forEach(tag => {
                            if (tag && tag.name && typeof tag.name === 'string') {
                                tags.push(tag.name.toLowerCase().trim());
                            }
                        });
                    }
                });
            }

            // Remove duplicates and empty tags
            const uniqueTags = [...new Set(tags.filter(tag => tag && tag.trim().length > 0))];

            // Create the validated entry
            const validatedEntry: ValidatedEntry = {
                title: entry.title || 'Untitled Entry',
                content: content,
                version: undefined,
                publishedAt: entry.publishedAt ? new Date(entry.publishedAt) : undefined,
                tags: uniqueTags,
                isValid: true,
                errors: [],
                warnings: [],
                suggestedFixes: {},
                metadata: {
                    source: 'canny',
                    cannyId: entry.id,
                    cannyUrl: entry.url,
                    likes: (entry.reactions && typeof entry.reactions.like === 'number') ? entry.reactions.like : 0,
                    postCount: (entry.posts && Array.isArray(entry.posts)) ? entry.posts.length : 0,
                    status: entry.status || 'unknown',
                    importedAt: new Date().toISOString()
                }
            };

            return validatedEntry;
        });
    }
}