import {ScheduledJobService} from "@/lib/services/jobs/scheduled-job.service";
import {createAuditLog} from "@/lib/utils/auditLog";

export class JobRunnerService {
    private static isRunning = false;
    private static intervalId: NodeJS.Timeout | null = null;

    /**
     * Start the job runner with specified interval
     * @param intervalMs - How often to check for due jobs (default: 60 seconds)
     */
    static start(intervalMs: number = 60000): void {
        if (this.isRunning) {
            console.log('Job runner is already running');
            return;
        }

        console.log(`Starting job runner with ${intervalMs}ms interval`);
        this.isRunning = true;

        // Run immediately on start
        this.runJobs();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.runJobs();
        }, intervalMs);
    }

    /**
     * Stop the job runner
     */
    static stop(): void {
        if (!this.isRunning) {
            console.log('Job runner is not running');
            return;
        }

        console.log('Stopping job runner');
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Run all due jobs
     */
    private static async runJobs(): Promise<void> {
        try {
            const dueJobs = await ScheduledJobService.getDueJobs();

            if (dueJobs.length === 0) {
                return;
            }

            console.log(`Found ${dueJobs.length} due jobs to execute`);

            // Execute jobs in parallel but with concurrency limit
            const concurrencyLimit = 5;
            const jobBatches = this.chunkArray(dueJobs, concurrencyLimit);

            for (const batch of jobBatches) {
                const promises = batch.map(async (job) => {
                    try {
                        const success = await ScheduledJobService.executeJob(job.id);

                        if (success) {
                            console.log(`Successfully executed job ${job.id} (${job.type})`);

                            await createAuditLog(
                                'SCHEDULED_JOB_EXECUTED',
                                'system',
                                'system',
                                {
                                    jobId: job.id,
                                    jobType: job.type,
                                    entityId: job.entityId,
                                    originalScheduledAt: job.scheduledAt.toISOString(),
                                    executedAt: new Date().toISOString(),
                                    retryCount: job.retryCount,
                                }
                            );
                        } else {
                            console.error(`Failed to execute job ${job.id} (${job.type})`);
                        }
                    } catch (error) {
                        console.error(`Error executing job ${job.id}:`, error);
                    }
                });

                await Promise.allSettled(promises);
            }
        } catch (error) {
            console.error('Error in job runner:', error);
        }
    }

    /**
     * Utility to chunk array into smaller arrays
     */
    private static chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Clean up old completed/failed jobs
     */
    static async cleanup(olderThanDays: number = 30): Promise<number> {
        try {
            const count = await ScheduledJobService.cleanupOldJobs(olderThanDays);

            if (count > 0) {
                console.log(`Cleaned up ${count} old scheduled jobs`);

                await createAuditLog(
                    'SCHEDULED_JOBS_CLEANUP',
                    'system',
                    'system',
                    {
                        deletedCount: count,
                        olderThanDays,
                        timestamp: new Date().toISOString(),
                    }
                );
            }

            return count;
        } catch (error) {
            console.error('Error cleaning up old jobs:', error);
            return 0;
        }
    }

    /**
     * Get status of the job runner
     */
    static getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
        return {
            isRunning: this.isRunning,
            intervalId: this.intervalId,
        };
    }
}