import {NextResponse} from "next/server";
import {z} from "zod";
import {validateAuthAndGetUser} from "@/lib/utils/changelog";
import {db} from "@/lib/db";
import {ScheduledJobService, ScheduledJobType} from "@/lib/services/jobs/scheduled-job.service";
import {createAuditLog} from "@/lib/utils/auditLog";
import {Role} from "@prisma/client";

const scheduleSchema = z.object({
    scheduledAt: z.string().datetime().optional(),
    action: z.enum(["schedule", "unschedule"]),
});

interface ScheduleRequestBody {
    scheduledAt?: string;
    action: "schedule" | "unschedule";
}

/**
 * Schedule or unschedule a changelog entry for automatic publishing
 * @method POST
 * @description Schedules a changelog entry to be automatically published at a specified time. Only admins and staff with appropriate permissions can schedule entries.
 * @body {
 *   "type": "object",
 *   "required": ["action"],
 *   "properties": {
 *     "action": {
 *       "type": "string",
 *       "enum": ["schedule", "unschedule"],
 *       "description": "Action to perform - schedule for future publishing or unschedule to cancel"
 *     },
 *     "scheduledAt": {
 *       "type": "string",
 *       "format": "date-time",
 *       "description": "ISO datetime string for when to publish (required when action is 'schedule')"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" },
 *     "entry": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "title": { "type": "string" },
 *         "scheduledAt": { "type": "string", "format": "date-time" },
 *         "publishedAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "jobId": { "type": "string", "description": "ID of the scheduled job (when scheduling)" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 403 Forbidden - User lacks permission to schedule entries
 * @error 404 Not Found - Changelog entry not found
 * @error 409 Conflict - Entry already published or scheduling conflict
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {projectId, entryId} = await context.params;
        const body = await request.json() as ScheduleRequestBody;

        // Validate request body with custom validation for schedule action
        const validatedData = scheduleSchema.parse(body);
        const {action, scheduledAt} = validatedData;

        // Additional validation: scheduledAt is required for schedule action
        if (action === "schedule" && !scheduledAt) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: [
                        {
                            message: 'scheduledAt is required when action is "schedule"',
                            path: 'scheduledAt',
                        }
                    ],
                },
                {status: 400}
            );
        }

        // Verify entry exists and user has permission
        const entry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    project: {
                        id: projectId,
                    },
                },
            },
            include: {
                changelog: {
                    include: {
                        project: true,
                    },
                },
                scheduledJobs: {
                    where: {
                        status: "PENDING",
                        type: ScheduledJobType.PUBLISH_CHANGELOG_ENTRY,
                    },
                },
            },
        });

        if (!entry) {
            await createAuditLog(
                'CHANGELOG_SCHEDULE_ENTRY_NOT_FOUND',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    action,
                    timestamp: new Date().toISOString(),
                }
            );

            return NextResponse.json(
                {error: 'Entry not found or does not belong to this project'},
                {status: 404}
            );
        }

        const project = entry.changelog.project;

        // Check permissions - same logic as publishing
        const canSchedule =
            user.role === Role.ADMIN ||
            (user.role === Role.STAFF && (!project.requireApproval || project.allowAutoPublish));

        if (!canSchedule) {
            await createAuditLog(
                'CHANGELOG_SCHEDULE_PERMISSION_DENIED',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    action,
                    userRole: user.role,
                    projectRequiresApproval: project.requireApproval,
                    projectAllowsAutoPublish: project.allowAutoPublish,
                    timestamp: new Date().toISOString(),
                }
            );

            return NextResponse.json(
                {error: 'Not authorized to schedule entries for this project'},
                {status: 403}
            );
        }

        if (action === "schedule") {
            // Validate scheduling constraints
            if (entry.publishedAt) {
                return NextResponse.json(
                    {error: 'Cannot schedule an already published entry'},
                    {status: 409}
                );
            }

            const scheduleDate = new Date(scheduledAt!);
            const now = new Date();

            if (scheduleDate <= now) {
                return NextResponse.json(
                    {error: 'Scheduled time must be in the future'},
                    {status: 400}
                );
            }

            // For updating existing schedules, cancel old jobs first
            if (entry.scheduledJobs.length > 0) {
                for (const job of entry.scheduledJobs) {
                    await ScheduledJobService.cancelJob(job.id, user.id);
                }
            }

            // Update entry with new scheduled time
            const updatedEntry = await db.changelogEntry.update({
                where: {id: entryId},
                data: {scheduledAt: scheduleDate},
            });

            // Create new scheduled job
            const jobId = await ScheduledJobService.createJob({
                type: ScheduledJobType.PUBLISH_CHANGELOG_ENTRY,
                entityId: entryId,
                scheduledAt: scheduleDate,
            });

            await createAuditLog(
                entry.scheduledAt ? 'CHANGELOG_ENTRY_RESCHEDULED' : 'CHANGELOG_ENTRY_SCHEDULED',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    entryTitle: entry.title,
                    previousScheduledAt: entry.scheduledAt?.toISOString(),
                    newScheduledAt: scheduleDate.toISOString(),
                    jobId,
                    userRole: user.role,
                    timestamp: new Date().toISOString(),
                }
            );

            return NextResponse.json({
                success: true,
                message: entry.scheduledAt ? 'Entry rescheduled successfully' : 'Entry scheduled for publishing',
                entry: {
                    id: updatedEntry.id,
                    title: updatedEntry.title,
                    scheduledAt: updatedEntry.scheduledAt?.toISOString(),
                    publishedAt: updatedEntry.publishedAt?.toISOString(),
                },
                jobId,
            });
        } else if (action === "unschedule") {
            if (!entry.scheduledAt) {
                return NextResponse.json(
                    {error: 'Entry is not scheduled'},
                    {status: 400}
                );
            }

            // Cancel any pending scheduled jobs
            for (const job of entry.scheduledJobs) {
                await ScheduledJobService.cancelJob(job.id, user.id);
            }

            // Update entry to remove scheduled time
            const updatedEntry = await db.changelogEntry.update({
                where: {id: entryId},
                data: {scheduledAt: null},
            });

            await createAuditLog(
                'CHANGELOG_ENTRY_UNSCHEDULED',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    entryTitle: entry.title,
                    previousScheduledAt: entry.scheduledAt?.toISOString(),
                    userRole: user.role,
                    timestamp: new Date().toISOString(),
                }
            );

            return NextResponse.json({
                success: true,
                message: 'Entry unscheduled',
                entry: {
                    id: updatedEntry.id,
                    title: updatedEntry.title,
                    scheduledAt: null,
                    publishedAt: updatedEntry.publishedAt?.toISOString(),
                },
            });
        }

        return NextResponse.json(
            {error: 'Invalid action'},
            {status: 400}
        );
    } catch (error) {
        console.error('Error scheduling changelog entry:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map((err) => ({
                        message: err.message,
                        path: err.path.join('.'),
                    })),
                },
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}

/**
 * Get scheduled jobs for a changelog entry
 * @method GET
 * @description Retrieves information about scheduled jobs for a specific changelog entry
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "entry": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "title": { "type": "string" },
 *         "scheduledAt": { "type": "string", "format": "date-time" },
 *         "publishedAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "jobs": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "type": { "type": "string" },
 *           "scheduledAt": { "type": "string", "format": "date-time" },
 *           "status": { "type": "string" },
 *           "errorMessage": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId, entryId} = await context.params;

        const entry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    project: {
                        id: projectId,
                    },
                },
            },
            select: {
                id: true,
                title: true,
                scheduledAt: true,
                publishedAt: true,
            },
        });

        if (!entry) {
            return NextResponse.json(
                {error: 'Entry not found'},
                {status: 404}
            );
        }

        const jobs = await ScheduledJobService.getJobsForEntity(entryId);

        return NextResponse.json({
            entry: {
                id: entry.id,
                title: entry.title,
                scheduledAt: entry.scheduledAt?.toISOString(),
                publishedAt: entry.publishedAt?.toISOString(),
            },
            jobs: jobs.map(job => ({
                id: job.id,
                type: job.type,
                scheduledAt: job.scheduledAt.toISOString(),
                status: job.status,
                errorMessage: job.errorMessage,
            })),
        });
    } catch (error) {
        console.error('Error getting scheduled jobs:', error);
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}