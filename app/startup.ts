import {JobRunnerService} from '@/lib/services/jobs/job-runner.service';
import {TelemetryService} from '@/lib/services/telemetry/service';

let servicesStarted = false;

export async function startBackgroundServices() {
    if (servicesStarted) {
        console.log('Background services already started');
        return;
    }

    console.log('Starting background services...');

    try {
        // Initialize telemetry system
        await TelemetryService.initialize();
        console.log('✓ Telemetry service initialized');

        // Start job runner (this will handle telemetry jobs and existing jobs)
        JobRunnerService.start(60000); // Check every minute
        console.log('✓ Job runner started');

        // Handle graceful shutdown
        const handleShutdown = async (signal: string) => {
            console.log(`Received ${signal}, shutting down gracefully...`);

            // Stop job runner
            JobRunnerService.stop();
            console.log('✓ Job runner stopped');

            // Handle telemetry shutdown
            await TelemetryService.shutdown();
            console.log('✓ Telemetry service shutdown complete');

            process.exit(0);
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

        servicesStarted = true;
        console.log('✓ All background services started successfully');
    } catch (error) {
        console.error('Failed to start background services:', error);
    }
}