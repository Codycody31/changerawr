import {ScheduledJobExecutor} from '@/lib/services/jobs/scheduled-job.service';

export class TelemetrySendExecutor implements ScheduledJobExecutor {
    async execute(entityId: string): Promise<void> {
        // entityId is the system config ID for telemetry jobs
        try {
            // Dynamically import to avoid circular dependencies
            const { TelemetryService } = await import('@/lib/services/telemetry/service');
            await TelemetryService.sendTelemetryNow();
        } catch (error) {
            // Let the job system handle retries
            throw new Error(`Telemetry send failed: ${error instanceof Error ? error.message + entityId : 'Unknown error'}`);
        }
    }
}