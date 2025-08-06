// lib/services/projects/importing/processor.service.ts

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
    ValidatedEntry,
    ImportOptions,
    ImportResult,
    ImportStats
} from '@/lib/types/projects/importing';

interface ImportContext {
    projectId: string;
    changelogId: string;
    userId: string;
    options: ImportOptions;
    stats: ImportStats;
}

type PrismaTransaction = Prisma.TransactionClient;

export class ImportProcessorService {
    /**
     * Process validated entries and import them into the database
     */
    static async processImport(
        projectId: string,
        validatedEntries: ValidatedEntry[],
        options: ImportOptions,
        userId: string
    ): Promise<ImportResult> {
        const startTime = new Date();
        const stats: ImportStats = {
            processed: 0,
            imported: 0,
            skipped: 0,
            errors: 0,
            startTime
        };

        const result: ImportResult = {
            success: false,
            importedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            createdEntries: [],
            warnings: [],
            errors: [],
            processingTime: 0
        };

        try {
            // Get or create changelog for the project
            const changelog = await this.ensureChangelog(projectId);

            const context: ImportContext = {
                projectId,
                changelogId: changelog.id,
                userId,
                options,
                stats
            };

            // Handle different strategies
            if (options.strategy === 'replace') {
                await this.handleReplaceStrategy(context, validatedEntries, result);
            } else {
                await this.handleMergeOrAppendStrategy(context, validatedEntries, result);
            }

            // Update final stats
            stats.endTime = new Date();
            result.processingTime = stats.endTime.getTime() - stats.startTime.getTime();
            result.success = result.errorCount < validatedEntries.length / 2; // Success if less than 50% errors

            return result;

        } catch (error) {
            console.error('Import processing failed:', error);

            result.errors.push({
                entry: validatedEntries[0] || {} as ValidatedEntry,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
            result.errorCount = validatedEntries.length;
            result.processingTime = Date.now() - startTime.getTime();

            return result;
        }
    }

    /**
     * Ensure changelog exists for the project
     */
    private static async ensureChangelog(projectId: string) {
        let changelog = await db.changelog.findFirst({
            where: { projectId }
        });

        if (!changelog) {
            changelog = await db.changelog.create({
                data: { projectId }
            });
        }

        return changelog;
    }

    /**
     * Handle replace strategy - removes existing entries first
     */
    private static async handleReplaceStrategy(
        context: ImportContext,
        validatedEntries: ValidatedEntry[],
        result: ImportResult
    ): Promise<void> {
        // Use transaction for replace strategy
        await db.$transaction(async (tx) => {
            // Remove existing entries if not preserving
            if (!context.options.preserveExistingEntries) {
                await tx.changelogEntry.deleteMany({
                    where: { changelogId: context.changelogId }
                });
                result.warnings.push('All existing entries were replaced');
            }

            // Import new entries
            await this.importEntries(context, validatedEntries, result, tx);
        });
    }

    /**
     * Handle merge or append strategy
     */
    private static async handleMergeOrAppendStrategy(
        context: ImportContext,
        validatedEntries: ValidatedEntry[],
        result: ImportResult
    ): Promise<void> {
        // Get existing entries to check for conflicts
        const existingEntries = await db.changelogEntry.findMany({
            where: { changelogId: context.changelogId },
            select: { version: true, title: true }
        });

        const existingVersions = new Set(
            existingEntries.map(e => e.version).filter(Boolean)
        );

        // Filter entries based on conflict resolution
        const entriesToImport = await this.resolveConflicts(
            validatedEntries,
            existingVersions,
            context.options.conflictResolution,
            result
        );

        // Import the resolved entries
        await this.importEntries(context, entriesToImport, result);
    }

    /**
     * Resolve conflicts between new and existing entries
     */
    private static async resolveConflicts(
        validatedEntries: ValidatedEntry[],
        existingVersions: Set<string | null>,
        conflictResolution: string,
        result: ImportResult
    ): Promise<ValidatedEntry[]> {
        const entriesToImport: ValidatedEntry[] = [];

        for (const entry of validatedEntries) {
            const hasVersionConflict = entry.version && existingVersions.has(entry.version);

            if (hasVersionConflict) {
                switch (conflictResolution) {
                    case 'skip':
                        result.skippedCount++;
                        result.warnings.push(`Skipped entry with duplicate version: ${entry.version}`);
                        break;

                    case 'overwrite':
                        entriesToImport.push(entry);
                        result.warnings.push(`Will overwrite existing entry with version: ${entry.version}`);
                        break;

                    case 'prompt':
                        // In a real implementation, this would prompt the user
                        // For now, we'll default to skip
                        result.skippedCount++;
                        result.warnings.push(`Conflict detected for version ${entry.version} - skipped (would prompt user)`);
                        break;

                    default:
                        entriesToImport.push(entry);
                }
            } else {
                entriesToImport.push(entry);
            }
        }

        return entriesToImport;
    }

    /**
     * Import entries into the database
     */
    private static async importEntries(
        context: ImportContext,
        entries: ValidatedEntry[],
        result: ImportResult,
        tx?: PrismaTransaction
    ): Promise<void> {
        const dbClient = tx || db;

        for (const entry of entries) {
            context.stats.processed++;

            try {
                // Skip invalid entries
                if (!entry.isValid) {
                    context.stats.skipped++;
                    result.skippedCount++;
                    result.errors.push({
                        entry,
                        error: 'Entry failed validation'
                    });
                    continue;
                }

                // Prepare entry data
                const entryData = await this.prepareEntryData(entry, context);

                // Create the changelog entry
                const createdEntry = await dbClient.changelogEntry.create({
                    data: entryData,
                    include: { tags: true }
                });

                // Track success
                context.stats.imported++;
                result.importedCount++;
                result.createdEntries.push({
                    id: createdEntry.id,
                    title: createdEntry.title,
                    version: createdEntry.version || undefined
                });

            } catch (error) {
                context.stats.errors++;
                result.errorCount++;
                result.errors.push({
                    entry,
                    error: error instanceof Error ? error.message : 'Failed to create entry'
                });
                console.error(`Failed to import entry "${entry.title}":`, error);
            }
        }
    }

    /**
     * Prepare entry data for database insertion
     */
    private static async prepareEntryData(entry: ValidatedEntry, context: ImportContext) {
        // Handle date based on options
        let publishedAt: Date | null = null;
        let createdAt: Date = new Date(); // Default to current time

        switch (context.options.dateHandling) {
            case 'preserve':
                if (entry.publishedAt) {
                    publishedAt = context.options.publishImportedEntries ? entry.publishedAt : null;
                    createdAt = entry.publishedAt; // Use the original date as creation date
                }
                break;
            case 'current':
                publishedAt = context.options.publishImportedEntries ? new Date() : null;
                createdAt = new Date();
                break;
            case 'sequence':
                // For sequence, we'd need to calculate based on order
                publishedAt = context.options.publishImportedEntries ? new Date() : null;
                createdAt = new Date();
                break;
        }

        // Prepare tags
        const tagConnections = await this.prepareTags(
            entry.tags || [],
            context.changelogId,
            context.options.defaultTags
        );

        return {
            title: entry.title,
            content: entry.content,
            version: entry.version || null,
            publishedAt,
            createdAt,
            updatedAt: createdAt,
            changelogId: context.changelogId,
            tags: {
                connect: tagConnections
            }
        };
    }

    /**
     * Prepare tags for the entry
     */
    private static async prepareTags(
        entryTags: string[],
        changelogId: string,
        defaultTags: string[]
    ): Promise<Array<{ id: string }>> {
        const allTagNames = [...new Set([...entryTags, ...defaultTags])];
        const tagConnections: Array<{ id: string }> = [];

        for (const tagName of allTagNames) {
            if (!tagName.trim()) continue;

            // Find or create tag
            let tag = await db.changelogTag.findFirst({
                where: {
                    name: tagName.toLowerCase()
                }
            });

            if (!tag) {
                tag = await db.changelogTag.create({
                    data: {
                        name: tagName.toLowerCase()
                    }
                });
            }

            tagConnections.push({ id: tag.id });
        }

        return tagConnections;
    }

    /**
     * Get import statistics for a project
     */
    static async getImportHistory(projectId: string): Promise<{
        totalImports: number;
        lastImportDate?: Date;
        totalEntriesImported: number;
    }> {
        // This would require an import history table in a real implementation
        // For now, we'll return basic stats from changelog entries

        const changelog = await db.changelog.findFirst({
            where: { projectId },
            include: {
                entries: {
                    select: {
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!changelog) {
            return {
                totalImports: 0,
                totalEntriesImported: 0
            };
        }

        return {
            totalImports: 1, // Would be tracked in import history table
            lastImportDate: changelog.entries[0]?.createdAt,
            totalEntriesImported: changelog.entries.length
        };
    }

    /**
     * Validate that user has permission to import
     */
    static async validateImportPermissions(
        userId: string,
        projectId: string
    ): Promise<{ canImport: boolean; reason?: string }> {
        try {
            // Check if user has access to the project
            const project = await db.project.findFirst({
                where: {
                    id: projectId
                }
            });

            if (!project) {
                return {
                    canImport: false,
                    reason: 'Project not found'
                };
            }

            // Check if user is admin (can access any project)
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });

            if (!user) {
                return {
                    canImport: false,
                    reason: 'User not found'
                };
            }

            // Admin can import to any project
            if (user.role === 'ADMIN') {
                return { canImport: true };
            }

            // For now, allow any authenticated user to import
            // This can be extended with project-specific permissions later
            return { canImport: true };

        } catch (error) {
            console.error('Error validating import permissions:', error);
            return {
                canImport: false,
                reason: 'Failed to validate permissions'
            };
        }
    }
}