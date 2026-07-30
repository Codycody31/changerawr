import {db} from '@/lib/db';
import {sendNotificationEmail} from "@/lib/services/email/notification";

type RequestStatus = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

// Types
interface ProcessRequestOptions {
    requestId: string;
    status: RequestStatus;
    adminId: string;
    feedback?: string;
    metadata?: {
        timestamp: string;
        processedBy: string;
    };
}

type PrismaTransaction = Omit<typeof db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

// Simplified type that works with our database structure
interface DatabaseChangelogRequest {
    id: string;
    type: string;
    status: string;
    staffId: string | null;
    adminId: string | null;
    projectId: string;
    targetId: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    changelogEntryId: string | null;
    changelogTagId: string | null;
    project: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        allowAutoPublish: boolean;
        requireApproval: boolean;
        defaultTags: string[];
        changelog: {
            id: string;
            projectId: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    };
    ChangelogEntry: {
        id: string;
        title: string;
        content: string;
        version: string | null;
        publishedAt: Date | null;
        scheduledAt: Date | null;
        changelogId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    ChangelogTag: {
        id: string;
        name: string;
        changelogId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    staff: {
        id: string;
        email: string;
        name: string | null;
    } | null;
    customPublishedAt?: string | null;
}

interface RequestContext {
    tx: PrismaTransaction;
    request: DatabaseChangelogRequest;
}

// Base interface for request processors
interface RequestProcessor {
    processRequest(context: RequestContext): Promise<void>;
}

// Request processors
class DeleteProjectProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.projectId) {
            throw new Error('Project ID is required for project deletion');
        }

        // Delete all related requests first
        await tx.changelogRequest.deleteMany({
            where: {projectId: request.projectId}
        });

        // Find and delete changelog entries if they exist
        const projectChangelog = await tx.changelog.findUnique({
            where: {projectId: request.projectId},
            include: {entries: true}
        });

        if (projectChangelog) {
            await tx.changelogEntry.deleteMany({
                where: {changelogId: projectChangelog.id}
            });

            // Delete the changelog
            await tx.changelog.delete({
                where: {id: projectChangelog.id}
            });
        }

        // Finally, delete the project
        await tx.project.delete({
            where: {id: request.projectId}
        });
    }
}

class DeleteTagProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.projectId || !request.targetId) {
            throw new Error('Project ID and target ID are required for tag deletion');
        }

        const project = await tx.project.findUnique({
            where: {id: request.projectId},
            include: {
                changelog: {
                    include: {
                        entries: true
                    }
                }
            }
        });

        if (!project) {
            throw new Error('Project not found');
        }

        // Remove the tag from defaultTags array
        const updatedTags = project.defaultTags.filter(
            tag => tag !== request.targetId
        );

        // Update project with new tags array
        await tx.project.update({
            where: {id: request.projectId},
            data: {
                defaultTags: updatedTags
            }
        });

        // For actual changelog tags (if they exist)
        if (request.ChangelogTag?.id) {
            await this.disconnectAndDeleteTag(tx, request.ChangelogTag.id);
        }
    }

    private async disconnectAndDeleteTag(tx: PrismaTransaction, tagId: string): Promise<void> {
        const entriesWithTag = await tx.changelogEntry.findMany({
            where: {
                tags: {
                    some: {id: tagId}
                }
            }
        });

        for (const entry of entriesWithTag) {
            await tx.changelogEntry.update({
                where: {id: entry.id},
                data: {
                    tags: {
                        disconnect: {id: tagId}
                    }
                }
            });
        }

        await tx.changelogTag.delete({
            where: {id: tagId}
        });
    }
}

class DeleteEntryProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.ChangelogEntry?.id) {
            throw new Error('Changelog entry ID is required for entry deletion');
        }

        await tx.changelogEntry.delete({
            where: {id: request.ChangelogEntry.id}
        });
    }
}

class DeleteAllEntriesProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.project.changelog?.id) {
            throw new Error('Changelog not found for this project');
        }

        await tx.changelogEntry.deleteMany({
            where: {changelogId: request.project.changelog.id}
        });
    }
}

class DeleteAllHistoryProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.project.changelog?.id) {
            throw new Error('Changelog not found for this project');
        }

        await tx.changelogEntryRevision.deleteMany({
            where: {entry: {changelogId: request.project.changelog.id}}
        });
    }
}

class AllowPublishProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.ChangelogEntry?.id) {
            throw new Error('Changelog entry ID is required for publishing');
        }

        // Update the entry's publish status
        // Use custom publishedAt date if provided, otherwise use current date
        const publishedAt = request.customPublishedAt
            ? new Date(request.customPublishedAt)
            : new Date();

        await tx.changelogEntry.update({
            where: {id: request.ChangelogEntry.id},
            data: {
                publishedAt: publishedAt
            }
        });
    }
}

class AllowScheduleProcessor implements RequestProcessor {
    async processRequest({tx, request}: RequestContext): Promise<void> {
        if (!request.ChangelogEntry?.id) {
            throw new Error('Changelog entry ID is required for scheduling');
        }

        if (!request.targetId) {
            throw new Error('Scheduled time is required for schedule approval');
        }

        const scheduledAt = new Date(request.targetId);

        // Validate the scheduled time is in the future
        if (scheduledAt <= new Date()) {
            throw new Error('Scheduled time must be in the future');
        }

        // Check if entry is already published
        if (request.ChangelogEntry.publishedAt) {
            throw new Error('Cannot schedule an already published entry');
        }

        // Update the entry with the scheduled time
        await tx.changelogEntry.update({
            where: {id: request.ChangelogEntry.id},
            data: {
                scheduledAt: scheduledAt
            }
        });

        // Create the scheduled job - import dynamically to avoid circular dependencies
        try {
            const {ScheduledJobService} = await import('@/lib/services/jobs/scheduled-job.service');
            const {ScheduledJobType} = await import('@/lib/services/jobs/scheduled-job.service');

            await ScheduledJobService.createJob({
                type: ScheduledJobType.PUBLISH_CHANGELOG_ENTRY,
                entityId: request.ChangelogEntry.id,
                scheduledAt: scheduledAt,
            });
        } catch (error) {
            console.error('Failed to create scheduled job:', error);
            // Don't fail the transaction if job creation fails
            // The entry will still be scheduled, but might need manual intervention
        }
    }
}

// Processor registry and factory
class RequestProcessorRegistry {
    private static processors: Record<string, RequestProcessor> = {
        'DELETE_PROJECT': new DeleteProjectProcessor(),
        'DELETE_TAG': new DeleteTagProcessor(),
        'DELETE_ENTRY': new DeleteEntryProcessor(),
        'DELETE_ALL_ENTRIES': new DeleteAllEntriesProcessor(),
        'DELETE_ALL_HISTORY': new DeleteAllHistoryProcessor(),
        'ALLOW_PUBLISH': new AllowPublishProcessor(),
        'ALLOW_SCHEDULE': new AllowScheduleProcessor()
    };

    static getProcessor(type: string): RequestProcessor {
        const processor = this.processors[type];
        if (!processor) {
            throw new Error(`No processor found for request type: ${type}`);
        }
        return processor;
    }

    static registerProcessor(type: string, processor: RequestProcessor): void {
        this.processors[type] = processor;
    }
}

// Main service class
class ChangelogRequestService {
    async processRequest(options: ProcessRequestOptions) {
        const safeOptions = this.normalizeSafeOptions(options);

        const result = await db.$transaction(async (tx) => {
            const existingRequest = await this.findRequest(tx as PrismaTransaction, safeOptions.requestId);
            const updatedRequest = await this.updateRequestStatus(tx as PrismaTransaction, existingRequest, safeOptions);

            if (safeOptions.status === 'APPROVED') {
                await this.processApprovedRequest(tx as PrismaTransaction, existingRequest);
            }
            // CHANGES_REQUESTED and REJECTED: no action, just status update

            await this.createAuditLog(tx as PrismaTransaction, updatedRequest, safeOptions);

            return {
                success: true,
                data: updatedRequest,
                metadata: safeOptions.metadata
            };
        });

        // After transaction completes successfully, send notification
        // Only send if the staff user still exists (not deleted)
        if (result.data.staffId) {
            try {
                // Need to fetch staff with settings included since it's not in the transaction result
                const staffWithSettings = await db.user.findUnique({
                    where: {id: result.data.staffId},
                    include: {settings: true}
                });

                // Only send notification if user exists and has them enabled (or if no preference is set)
                if (staffWithSettings && staffWithSettings.settings?.enableNotifications !== false) {
                    // Fetch admin name for the notification
                    const admin = result.data.adminId
                        ? await db.user.findUnique({
                            where: {id: result.data.adminId},
                            select: {name: true}
                        })
                        : null;

                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                    const dashboardUrl = `${appUrl}/dashboard/projects/${result.data.projectId}`;

                    await sendNotificationEmail({
                        userId: result.data.staffId,
                        status: safeOptions.status,
                        request: {
                            type: result.data.type,
                            projectName: result.data.project?.name || 'Unknown Project',
                            entryTitle: result.data.ChangelogEntry?.title,
                            adminName: admin?.name || 'an administrator',
                            feedback: safeOptions.feedback,
                            entryId: result.data.ChangelogEntry?.id,
                            projectId: result.data.projectId,
                        },
                        dashboardUrl
                    });
                }
            } catch (emailError) {
                // Just log email errors, don't fail the request
                console.error('Failed to send notification email:', emailError);
            }
        } else {
            // Log that notification was skipped due to deleted user
            console.log(`Skipping notification for request ${options.requestId} - staff user was deleted`);
        }

        return result;
    }

    private normalizeSafeOptions(options: ProcessRequestOptions) {
        return {
            ...options,
            metadata: options.metadata || {
                timestamp: new Date().toISOString(),
                processedBy: options.adminId
            }
        };
    }

    private async findRequest(tx: PrismaTransaction, requestId: string): Promise<DatabaseChangelogRequest> {
        const request = await tx.changelogRequest.findUnique({
            where: {id: requestId},
            include: {
                project: {
                    include: {
                        changelog: true
                    }
                },
                ChangelogEntry: true,
                ChangelogTag: true,
                staff: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        });

        if (!request) {
            throw new Error('Request not found');
        }

        // Extract custom publishedAt from metadata if present
        const metadata = (request as unknown as {metadata?: {customPublishedAt?: string} | null}).metadata;
        const customPublishedAt = metadata?.customPublishedAt || null;

        return {
            ...request,
            customPublishedAt
        } as DatabaseChangelogRequest;
    }

    private async updateRequestStatus(
        tx: PrismaTransaction,
        request: DatabaseChangelogRequest,
        options: ProcessRequestOptions
    ): Promise<DatabaseChangelogRequest> {
        // Build metadata — preserve existing, layer in new fields
        const existingMeta = (request as unknown as { metadata?: Record<string, unknown> }).metadata || {};
        const newMeta: Record<string, unknown> = {
            ...existingMeta,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: options.adminId,
        };
        if (options.feedback !== undefined) newMeta.feedback = options.feedback;

        const updatedRequest = await tx.changelogRequest.update({
            where: {id: options.requestId},
            data: {
                status: options.status,
                adminId: options.adminId,
                reviewedAt: new Date(options.metadata?.timestamp ?? Date.now()),
                metadata: newMeta,
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                project: {
                    include: {
                        changelog: true
                    }
                },
                ChangelogTag: true,
                ChangelogEntry: true
            }
        });

        return updatedRequest as DatabaseChangelogRequest;
    }

    private async processApprovedRequest(tx: PrismaTransaction, request: DatabaseChangelogRequest) {
        try {
            const processor = RequestProcessorRegistry.getProcessor(request.type);
            await processor.processRequest({tx, request});
        } catch (error) {
            console.error('Error processing request:', error);
            throw new Error(`Failed to process ${request.type}: ${(error as Error).message}`);
        }
    }

    private async createAuditLog(
        tx: PrismaTransaction,
        request: DatabaseChangelogRequest,
        options: ProcessRequestOptions
    ) {
        await tx.auditLog.create({
            data: {
                action: `REQUEST_${options.status}`,
                userId: options.adminId,
                targetUserId: request.staffId, // This can now be null, which is fine
                details: {
                    requestId: request.id,
                    status: options.status,
                    processedAt: options.metadata?.timestamp,
                    processedBy: options.metadata?.processedBy,
                    type: request.type,
                    targetId: request.targetId,
                    // Include preserved staff info if the user was deleted
                    staffInfo: request.staff ? {
                        id: request.staff.id,
                        name: request.staff.name,
                        email: request.staff.email
                    } : {
                        note: 'Staff user was deleted'
                    }
                }
            }
        });
    }
}

// Export singleton instance
export const changelogRequestService = new ChangelogRequestService();

// ─── createOrReopenRequest ────────────────────────────────────────────────────
// When staff resubmits after CHANGES_REQUESTED, we reopen the existing request
// rather than creating a new orphan. The old feedback is archived in metadata so
// the admin can see the full history.

interface CreateOrReopenParams {
    type: string;
    staffId: string;
    projectId: string;
    changelogEntryId?: string | null;
    changelogTagId?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
}

export async function createOrReopenRequest(params: CreateOrReopenParams) {
    const { type, staffId, projectId, changelogEntryId, changelogTagId, targetId, metadata } = params;

    // Look for a CHANGES_REQUESTED request of the same type targeting the same resource
    const existing = await db.changelogRequest.findFirst({
        where: {
            type,
            status: 'CHANGES_REQUESTED',
            projectId,
            ...(changelogEntryId ? { changelogEntryId } : {}),
            ...(changelogTagId ? { changelogTagId } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });

    if (existing) {
        // Reopen with a distinct status so admins can see this was previously reviewed
        const prev = (existing.metadata ?? {}) as Record<string, unknown>;
        const updatedMeta: Record<string, unknown> = {
            ...prev,
            resubmittedAt: new Date().toISOString(),
            previousFeedback: prev.feedback ?? null,
            feedback: null,
            changesAddressed: true,
        };
        if (metadata) Object.assign(updatedMeta, metadata);

        return db.changelogRequest.update({
            where: { id: existing.id },
            data: {
                status: 'CHANGES_REQUESTED_PENDING',
                staffId,
                adminId: null,
                reviewedAt: null,
                targetId: targetId ?? existing.targetId,
                metadata: updatedMeta,
            },
        });
    }

    // No existing CHANGES_REQUESTED — create a fresh request
    return db.changelogRequest.create({
        data: {
            type,
            staffId,
            projectId,
            changelogEntryId: changelogEntryId ?? undefined,
            changelogTagId: changelogTagId ?? undefined,
            targetId: targetId ?? undefined,
            status: 'PENDING',
            ...(metadata ? { metadata } : {}),
        },
    });
}

// Also export types and registry for extensibility
export type {
    ProcessRequestOptions,
    RequestProcessor,
    RequestContext,
    DatabaseChangelogRequest
};

export {RequestProcessorRegistry};