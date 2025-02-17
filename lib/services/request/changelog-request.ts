// lib/services/changelog-request.ts
import { db } from '@/lib/db';
import { RequestDataType } from '@/lib/types/changelog';
import type { Prisma, RequestStatus } from '@prisma/client';

// Types
interface ProcessRequestOptions {
    requestId: string;
    status: RequestStatus;
    adminId: string;
    metadata?: {
        timestamp: string;
        processedBy: string;
    };
}

type PrismaTransaction = Omit<typeof db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

interface RequestContext {
    tx: PrismaTransaction;
    request: Prisma.ChangelogRequestGetPayload<{
        include: {
            project: {
                include: {
                    changelog: true;
                };
            };
            ChangelogEntry: true;
            ChangelogTag: true;
        };
    }>;
}

// Base interface for request processors
interface RequestProcessor {
    processRequest(context: RequestContext): Promise<void>;
}

// Request processors
class DeleteProjectProcessor implements RequestProcessor {
    async processRequest({ tx, request }: RequestContext): Promise<void> {
        if (!request.projectId) {
            throw new Error('Project ID is required for project deletion');
        }

        // Delete all related requests first
        await tx.changelogRequest.deleteMany({
            where: { projectId: request.projectId }
        });

        // Find and delete changelog entries if they exist
        const projectChangelog = await tx.changelog.findUnique({
            where: { projectId: request.projectId },
            include: { entries: true }
        });

        if (projectChangelog) {
            await tx.changelogEntry.deleteMany({
                where: { changelogId: projectChangelog.id }
            });

            // Delete the changelog
            await tx.changelog.delete({
                where: { id: projectChangelog.id }
            });
        }

        // Finally, delete the project
        await tx.project.delete({
            where: { id: request.projectId }
        });
    }
}

class DeleteTagProcessor implements RequestProcessor {
    async processRequest({ tx, request }: RequestContext): Promise<void> {
        if (!request.projectId || !request.targetId) {
            throw new Error('Project ID and target ID are required for tag deletion');
        }

        const project = await tx.project.findUnique({
            where: { id: request.projectId },
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
            where: { id: request.projectId },
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
                    some: { id: tagId }
                }
            }
        });

        for (const entry of entriesWithTag) {
            await tx.changelogEntry.update({
                where: { id: entry.id },
                data: {
                    tags: {
                        disconnect: { id: tagId }
                    }
                }
            });
        }

        await tx.changelogTag.delete({
            where: { id: tagId }
        });
    }
}

class DeleteEntryProcessor implements RequestProcessor {
    async processRequest({ tx, request }: RequestContext): Promise<void> {
        if (!request.ChangelogEntry?.id) {
            throw new Error('Changelog entry ID is required for entry deletion');
        }

        await tx.changelogEntry.delete({
            where: { id: request.ChangelogEntry.id }
        });
    }
}

// Processor registry and factory
class RequestProcessorRegistry {
    private static processors: Record<string, RequestProcessor> = {
        'DELETE_PROJECT': new DeleteProjectProcessor(),
        'DELETE_TAG': new DeleteTagProcessor(),
        'DELETE_ENTRY': new DeleteEntryProcessor()
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

            await this.createAuditLog(tx as PrismaTransaction, updatedRequest, safeOptions);

            return {
                success: true,
                data: updatedRequest,
                metadata: safeOptions.metadata
            };
        });

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

    private async findRequest(tx: PrismaTransaction, requestId: string) {
        const request = await tx.changelogRequest.findUnique({
            where: { id: requestId },
            include: {
                project: {
                    include: {
                        changelog: true
                    }
                },
                ChangelogEntry: true,
                ChangelogTag: true
            }
        });

        if (!request) {
            throw new Error('Request not found');
        }

        return request;
    }

    private async updateRequestStatus(tx: PrismaTransaction, request: RequestDataType, options: ProcessRequestOptions) {
        return tx.changelogRequest.update({
            where: { id: options.requestId },
            data: {
                status: options.status,
                adminId: options.adminId,
                reviewedAt: new Date(options.metadata?.timestamp ?? Date.now())
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
    }

    private async processApprovedRequest(tx: PrismaTransaction, request: RequestDataType) {
        try {
            const processor = RequestProcessorRegistry.getProcessor(request.type);
            await processor.processRequest({ tx, request });
        } catch (error) {
            console.error('Error processing request:', error);
            throw new Error(`Failed to process ${request.type}: ${(error as Error).message}`);
        }
    }

    private async createAuditLog(tx: PrismaTransaction, request: RequestDataType, options: ProcessRequestOptions) {
        await tx.auditLog.create({
            data: {
                action: `REQUEST_${options.status}`,
                userId: options.adminId,
                targetUserId: request.staffId,
                details: {
                    requestId: request.id,
                    status: options.status,
                    processedAt: options.metadata?.timestamp,
                    processedBy: options.metadata?.processedBy,
                    type: request.type,
                    targetId: request.targetId
                }
            }
        });
    }
}

// Export singleton instance
export const changelogRequestService = new ChangelogRequestService();

// Also export types and registry for extensibility
export type {
    ProcessRequestOptions,
    RequestProcessor,
    RequestContext
};

export { RequestProcessorRegistry };