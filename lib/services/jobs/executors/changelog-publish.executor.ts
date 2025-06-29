import {db} from '@/lib/db';
import {createAuditLog} from '@/lib/utils/auditLog';
import {sendSchedulePublishedNotification, getScheduleCreatorUserId} from '@/lib/services/email/schedule-notification';

export interface ScheduledJobExecutor {
    execute(entityId: string): Promise<void>;
}

export class ChangelogPublishExecutor implements ScheduledJobExecutor {
    async execute(entityId: string): Promise<void> {
        try {
            // Get the entry with project information
            const entry = await db.changelogEntry.findUnique({
                where: {id: entityId},
                include: {
                    changelog: {
                        include: {
                            project: true,
                        },
                    },
                },
            });

            if (!entry) {
                throw new Error(`Changelog entry not found: ${entityId}`);
            }

            if (entry.publishedAt) {
                console.log(`Changelog entry already published: ${entityId}`);
                return; // Entry already published, nothing to do
            }

            // Get the user who scheduled this entry for notification
            const scheduleCreatorId = await getScheduleCreatorUserId(entityId);

            // Publish the entry
            const updatedEntry = await db.changelogEntry.update({
                where: {id: entityId},
                data: {
                    publishedAt: new Date(),
                    scheduledAt: null, // Clear the schedule since it's now published
                },
            });

            // Log the automatic publication
            await createAuditLog(
                'CHANGELOG_ENTRY_AUTO_PUBLISHED',
                'system',
                scheduleCreatorId || 'system', // Use schedule creator as target if available
                {
                    entryId: updatedEntry.id,
                    entryTitle: updatedEntry.title,
                    entryVersion: updatedEntry.version,
                    projectId: entry.changelog.project.id,
                    projectName: entry.changelog.project.name,
                    scheduledBy: scheduleCreatorId || 'unknown',
                    publishedAt: updatedEntry.publishedAt?.toISOString(),
                    timestamp: new Date().toISOString(),
                }
            );

            // Send notification email to the person who scheduled it
            if (scheduleCreatorId) {
                try {
                    const notificationSent = await sendSchedulePublishedNotification({
                        userId: scheduleCreatorId,
                        entryId: entityId,
                        projectId: entry.changelog.project.id
                    });

                    if (notificationSent) {
                        console.log(`Schedule notification sent to user ${scheduleCreatorId} for entry ${updatedEntry.title}`);
                    } else {
                        console.log(`Schedule notification not sent (user preferences or configuration issue) for entry ${updatedEntry.title}`);
                    }
                } catch (emailError) {
                    // Log email error but don't fail the job
                    console.error('Failed to send schedule notification email:', emailError);

                    await createAuditLog(
                        'SCHEDULE_NOTIFICATION_FAILED',
                        'system',
                        scheduleCreatorId,
                        {
                            entryId: entityId,
                            entryTitle: updatedEntry.title,
                            projectId: entry.changelog.project.id,
                            error: emailError instanceof Error ? emailError.message : 'Unknown error',
                            timestamp: new Date().toISOString(),
                        }
                    );
                }
            } else {
                console.log(`No schedule creator found for entry ${updatedEntry.title}, skipping notification`);
            }

            console.log(`Successfully published scheduled entry: ${updatedEntry.title} (${entityId})`);

        } catch (error) {
            console.error(`Failed to publish scheduled entry ${entityId}:`, error);

            // Log the failure
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_AUTO_PUBLISH_FAILED',
                    'system',
                    'system',
                    {
                        entryId: entityId,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        stack: error instanceof Error ? error.stack : undefined,
                        timestamp: new Date().toISOString(),
                    }
                );
            } catch (auditError) {
                console.error('Failed to log auto-publish failure:', auditError);
            }

            throw error; // Re-throw to mark the job as failed
        }
    }
}

// Export a singleton instance
export const changelogPublishExecutor = new ChangelogPublishExecutor();