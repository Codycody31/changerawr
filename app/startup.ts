import {JobRunnerService} from "@/lib/services/jobs/job-runner.service";

export function startBackgroundServices(): void {
    // Only start in production or when explicitly enabled
    const shouldStartJobRunner =
        process.env.NODE_ENV === 'production' ||
        process.env.ENABLE_JOB_RUNNER === 'true';

    if (shouldStartJobRunner) {
        // Start job runner with 1-minute intervals
        JobRunnerService.start(60000);

        // Set up cleanup to run daily at 2 AM
        const now = new Date();
        const tomorrow2AM = new Date(now);
        tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
        tomorrow2AM.setHours(2, 0, 0, 0);

        const msUntil2AM = tomorrow2AM.getTime() - now.getTime();

        setTimeout(() => {
            JobRunnerService.cleanup(30); // Clean up jobs older than 30 days

            // Set up daily cleanup
            setInterval(() => {
                JobRunnerService.cleanup(30);
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, msUntil2AM);

        console.log('Background services started');
    }
}