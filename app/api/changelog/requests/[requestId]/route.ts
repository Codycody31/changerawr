import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import type { RequestStatus } from '@/lib/types/changelog';

// Define processors for each request type
const requestProcessors = {
    'DELETE_PROJECT': async (request: any, tx: any) => {
        console.log('[DELETE_PROJECT] Processing project deletion:', {
            projectId: request.projectId
        });

        await tx.project.delete({
            where: { id: request.projectId }
        });

        console.log('[DELETE_PROJECT] Project deleted successfully');
    },
    'DELETE_TAG': async (request: any, tx: any) => {
        console.log('[DELETE_TAG] Processing tag deletion:', {
            projectId: request.projectId,
            targetId: request.targetId
        });

        // Get current project tags
        const project = await tx.project.findUnique({
            where: { id: request.projectId },
            select: { defaultTags: true }
        });

        if (!project) {
            throw new Error('Project not found');
        }

        // Remove the tag from defaultTags
        const updatedTags = project.defaultTags.filter((tag: unknown) => tag !== request.targetId);

        await tx.project.update({
            where: { id: request.projectId },
            data: {
                defaultTags: updatedTags,
                updatedAt: new Date()
            }
        });

        console.log('[DELETE_TAG] Tag deleted successfully');
    }
} as const;

type RequestType = keyof typeof requestProcessors;

export async function PATCH(request: Request, context: { params?: { requestId?: string } }) {
    try {
        console.log('Received PATCH request:', { context });

        // Validate requestId from params
        if (!context.params?.requestId) {
            console.error('Missing requestId in params:', context.params);
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        const { requestId } = await context.params;
        console.log('Processing requestId:', requestId);

        // Validate user has admin permissions
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            console.error('Unauthorized user attempted to process request:', user);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Parse request body
        const body = await request.json().catch((err) => {
            console.error('Failed to parse request body:', err);
            return null;
        });

        if (!body?.status) {
            console.error('Invalid or missing status in request body:', body);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { status } = body as { status: RequestStatus };
        console.log('Request status update:', { requestId, status });

        // Get the change request
        const changeRequest = await db.changelogRequest.findUnique({
            where: { id: requestId },
            include: {
                staff: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!changeRequest) {
            console.error('Change request not found:', requestId);
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (changeRequest.status !== 'PENDING') {
            console.error('Request already processed:', {
                requestId,
                currentStatus: changeRequest.status
            });
            return NextResponse.json(
                { error: 'Request has already been processed' },
                { status: 400 }
            );
        }

        console.log('Processing change request:', {
            id: changeRequest.id,
            type: changeRequest.type,
            projectId: changeRequest.projectId,
            targetId: changeRequest.targetId
        });

        // Process the request within a transaction
        const result = await db.$transaction(async (tx) => {
            // Update the request status
            const updatedRequest = await tx.changelogRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    adminId: user.id,
                    reviewedAt: new Date()
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
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            // If approved, process the request based on its type
            if (status === 'APPROVED') {
                const processor = requestProcessors[changeRequest.type as RequestType];
                if (!processor) {
                    throw new Error(`Unknown request type: ${changeRequest.type}`);
                }

                await processor(changeRequest, tx);
            }

            // Create audit log
            await tx.auditLog.create({
                data: {
                    action: `REQUEST_${status}`,
                    userId: user.id,
                    targetUserId: changeRequest.staffId,
                    details: {
                        requestId: changeRequest.id,
                        requestType: changeRequest.type,
                        projectId: changeRequest.projectId,
                        targetId: changeRequest.staffId,
                        projectName: changeRequest.project.name,
                        staffEmail: changeRequest.staff.email
                    }
                }
            });

            return updatedRequest;
        });

        console.log('Request processed successfully:', {
            id: result.id,
            status: result.status,
            type: result.type
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Unexpected error processing request:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}