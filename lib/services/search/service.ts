import {db} from '@/lib/db';
import {Role, Prisma} from '@prisma/client';

interface SearchUser {
    id: string;
    email: string;
    name: string | null;
    role: Role;
}

interface SearchFilters {
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    hasVersion?: boolean;
    projectIds?: string[];
    publishedOnly?: boolean; // restrict to only published
}

interface ChangelogEntryResult {
    id: string;
    title: string;
    content: string;
    version: string | null;
    publishedAt: Date | null;
    projectId: string;
    projectName: string;
    tags: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
    type: 'entry';
    url: string;
    isPublished: boolean; // Add published status to results
}

interface TagResult {
    id: string;
    name: string;
    color: string | null;
    entryCount: number;
    type: 'tag';
    url: string;
}

type SearchResult = ChangelogEntryResult | TagResult;

interface SearchResponse {
    results: SearchResult[];
    total: number;
    executionTime: number;
}

// Custom type to handle the changelog project filter properly
interface CustomChangelogWhereInput {
    project?: Prisma.ProjectWhereInput;
    projectId?: string | Prisma.StringFilter<"Changelog">;
    id?: string | Prisma.StringFilter<"Changelog">;
    createdAt?: Date | Prisma.DateTimeFilter<"Changelog">;
    updatedAt?: Date | Prisma.DateTimeFilter<"Changelog">;
    AND?: Prisma.ChangelogWhereInput | Prisma.ChangelogWhereInput[];
    OR?: Prisma.ChangelogWhereInput[];
    NOT?: Prisma.ChangelogWhereInput | Prisma.ChangelogWhereInput[];
    entries?: Prisma.ChangelogEntryListRelationFilter;
}

interface CustomChangelogEntryWhereInput extends Omit<Prisma.ChangelogEntryWhereInput, 'changelog'> {
    changelog?: CustomChangelogWhereInput;
}

export class ChangelogSearchService {
    async searchAll(
        user: SearchUser,
        query: string,
        filters?: SearchFilters,
        limit: number = 20,
        offset: number = 0
    ): Promise<SearchResponse> {
        const startTime = performance.now();

        if (!query?.trim() || query.trim().length < 2) {
            return {
                results: [],
                total: 0,
                executionTime: Math.round(performance.now() - startTime)
            };
        }

        try {
            const [entryResults, tagResults] = await Promise.all([
                this.searchEntries(user, query, filters, Math.min(limit, 15), offset),
                this.searchTags(user, query, Math.min(10, limit))
            ]);

            const allResults = [...entryResults, ...tagResults];

            return {
                results: allResults,
                total: allResults.length,
                executionTime: Math.round(performance.now() - startTime)
            };
        } catch (error) {
            console.error('Search error:', error);
            return {
                results: [],
                total: 0,
                executionTime: Math.round(performance.now() - startTime)
            };
        }
    }

    private async searchEntries(
        user: SearchUser,
        query: string,
        filters?: SearchFilters,
        limit: number = 15,
        offset: number = 0
    ): Promise<ChangelogEntryResult[]> {
        const searchQuery = this.buildSearchQuery(query);
        const whereConditions = this.buildEntryWhereConditions(user, filters);

        // Enhanced search conditions - now searches across title, content, and version
        const searchConditions = {
            ...whereConditions,
            OR: [
                {title: {search: searchQuery}},
                {content: {search: searchQuery}},
                {version: {search: searchQuery}},
                // Also search for contains (case-insensitive) for better partial matching
                {title: {contains: query.trim(), mode: 'insensitive' as const}},
                {content: {contains: query.trim(), mode: 'insensitive' as const}},
                {version: {contains: query.trim(), mode: 'insensitive' as const}}
            ]
        } as Prisma.ChangelogEntryWhereInput;

        const entries = await db.changelogEntry.findMany({
            where: searchConditions,
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true,
                        color: true
                    }
                },
                changelog: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                // Prioritize published entries, then by date
                {publishedAt: {sort: 'desc', nulls: 'last'}},
                {createdAt: 'desc'}
            ],
            take: limit,
            skip: offset
        });

        return entries.map(entry => ({
            id: entry.id,
            title: entry.title,
            content: this.truncateContent(entry.content, 150),
            version: entry.version,
            publishedAt: entry.publishedAt,
            projectId: entry.changelog.project.id,
            projectName: entry.changelog.project.name,
            tags: entry.tags,
            type: 'entry' as const,
            url: `/dashboard/projects/${entry.changelog.project.id}/changelog/${entry.id}`,
            isPublished: entry.publishedAt !== null
        }));
    }

    private async searchTags(
        user: SearchUser,
        query: string,
        limit: number = 10
    ): Promise<TagResult[]> {
        const searchQuery = this.buildSearchQuery(query);

        // Enhanced tag search with both full-text and contains matching
        const tags = await db.changelogTag.findMany({
            where: {
                OR: [
                    {name: {search: searchQuery}},
                    {name: {contains: query.trim(), mode: 'insensitive'}}
                ]
            },
            include: {
                entries: {
                    where: this.buildEntryWhereConditions(user) as Prisma.ChangelogEntryWhereInput,
                    select: {id: true}
                }
            },
            take: limit
        });

        return tags
            .filter(tag => tag.entries.length > 0)
            .map(tag => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
                entryCount: tag.entries.length,
                type: 'tag' as const,
                url: `/dashboard/tags/${tag.id}`
            }));
    }

    private buildSearchQuery(query: string): string {
        // Enhanced search query building with better term handling
        return query
            .trim()
            .split(/\s+/)
            .filter(term => term.length > 0)
            .map(term => {
                // Handle special characters and ensure proper escaping
                const cleanTerm = term.replace(/[^\w\s]/g, '');
                return cleanTerm.length > 0 ? `${cleanTerm}:*` : '';
            })
            .filter(term => term.length > 0)
            .join(' & ');
    }

    private buildEntryWhereConditions(user: SearchUser, filters?: SearchFilters): CustomChangelogEntryWhereInput {
        const baseConditions: CustomChangelogEntryWhereInput = {};

        // Role-based access control
        switch (user.role) {
            case Role.ADMIN:
                // Admin sees everything - no additional restrictions
                break;

            case Role.STAFF:
                // Staff sees only public projects for now
                baseConditions.changelog = {
                    project: {isPublic: true}
                };
                break;

            case Role.VIEWER:
            default:
                // Viewers see only public projects ( JIC ltr implementation )
                baseConditions.changelog = {
                    project: {isPublic: true}
                };
                break;
        }

        // Apply filters
        if (!filters) {
            return baseConditions;
        }

        const conditions = {...baseConditions};

        // Only filter by published status if explicitly requested
        if (filters.publishedOnly === true) {
            conditions.publishedAt = {not: null};
        }

        if (filters.tags?.length) {
            conditions.tags = {
                some: {id: {in: filters.tags}}
            };
        }

        if (filters.dateRange) {
            // Search in both publishedAt and createdAt for unpublished entries
            conditions.OR = [
                {
                    publishedAt: {
                        not: null,
                        gte: filters.dateRange.start,
                        lte: filters.dateRange.end
                    }
                },
                {
                    publishedAt: null,
                    createdAt: {
                        gte: filters.dateRange.start,
                        lte: filters.dateRange.end
                    }
                }
            ];
        }

        if (filters.hasVersion !== undefined) {
            conditions.version = filters.hasVersion
                ? {not: null}
                : null;
        }

        if (filters.projectIds?.length) {
            const existingProject = conditions.changelog?.project || {};
            conditions.changelog = {
                ...conditions.changelog,
                project: {
                    ...existingProject,
                    id: {in: filters.projectIds}
                }
            };
        }

        return conditions;
    }

    private truncateContent(content: string, maxLength: number): string {
        if (content.length <= maxLength) {
            return content;
        }

        const truncated = content.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }

        return truncated + '...';
    }

    // Helper method to search only published entries if needed
    async searchPublishedOnly(
        user: SearchUser,
        query: string,
        filters?: Omit<SearchFilters, 'publishedOnly'>,
        limit: number = 20,
        offset: number = 0
    ): Promise<SearchResponse> {
        return this.searchAll(user, query, {...filters, publishedOnly: true}, limit, offset);
    }
}

export const searchService = new ChangelogSearchService();