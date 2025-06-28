import {db} from '@/lib/db';
import {TelemetryState} from '@prisma/client';
import {TelemetryConfig, TelemetryData, TelemetryResponse, TelemetryStats} from '@/lib/types/telemetry';
import {appInfo, getVersionString} from '@/lib/app-info';

export class TelemetryService {
    private static readonly TELEMETRY_URL = 'https://dl.supers0ft.us/changerawr/telemetry';
    private static readonly REGISTER_URL = 'https://dl.supers0ft.us/changerawr/telemetry/register';
    private static readonly DEACTIVATE_URL = 'https://dl.supers0ft.us/changerawr/telemetry/deactivate';
    private static readonly STATS_URL = 'https://dl.supers0ft.us/changerawr/telemetry/stats';
    private static readonly SEND_TELEMETRY_URL = 'https://dl.supers0ft.us/changerawr/telemetry/send';
    private static readonly DEFAULT_CONFIG_ID = 1;

    /**
     * Get telemetry configuration
     */
    static async getTelemetryConfig(): Promise<TelemetryConfig> {
        const config = await db.systemConfig.findFirst({
            where: {id: this.DEFAULT_CONFIG_ID}
        });

        if (!config) {
            const newConfig = await db.systemConfig.create({
                data: {
                    id: this.DEFAULT_CONFIG_ID,
                    allowTelemetry: TelemetryState.PROMPT,
                }
            });

            return {
                allowTelemetry: this.mapTelemetryState(newConfig.allowTelemetry),
                instanceId: newConfig.telemetryInstanceId || undefined,
            };
        }

        return {
            allowTelemetry: this.mapTelemetryState(config.allowTelemetry),
            instanceId: config.telemetryInstanceId || undefined,
        };
    }

    /**
     * Reactivate an existing instance
     */
    static async reactivateInstance(instanceId: string): Promise<void> {
        console.log('Reactivating existing instance:', instanceId);

        const reactivationData: TelemetryData = {
            instanceId,
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        try {
            await this.sendTelemetry(reactivationData);
            console.log('Instance reactivated successfully:', instanceId);
        } catch (error) {
            console.error('Failed to reactivate instance:', error);
            throw error;
        }
    }

    /**
     * Update telemetry configuration
     */
    static async updateTelemetryConfig(config: TelemetryConfig): Promise<void> {
        const currentConfig = await this.getTelemetryConfig();

        await db.systemConfig.upsert({
            where: { id: this.DEFAULT_CONFIG_ID },
            create: {
                id: this.DEFAULT_CONFIG_ID,
                allowTelemetry: this.mapToDbTelemetryState(config.allowTelemetry),
                telemetryInstanceId: config.instanceId,
            },
            update: {
                allowTelemetry: this.mapToDbTelemetryState(config.allowTelemetry),
                telemetryInstanceId: config.instanceId,
            }
        });

        // Handle job scheduling and reactivation based on telemetry state
        if (config.allowTelemetry === 'enabled') {
            // If we have an instance ID and we're going from disabled to enabled, reactivate
            if (config.instanceId && currentConfig.allowTelemetry === 'disabled') {
                console.log('Reactivating previously disabled instance');
                try {
                    await this.reactivateInstance(config.instanceId);
                } catch (error) {
                    console.warn('Failed to reactivate instance, but continuing with scheduling:', error);
                }
            }

            await this.scheduleTelemetryJob();
        } else {
            await this.cancelTelemetryJobs();
        }
    }

    /**
     * Register instance with telemetry server and send initial telemetry
     */
    static async registerInstance(): Promise<string> {
        const registrationData = {
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        console.log('Registering new instance with telemetry server...');
        console.log('Registration data:', registrationData);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(this.REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify(registrationData),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log('Registration response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Registration HTTP error response:', errorText);
                throw new Error(`Registration HTTP ${response.status}: ${errorText}`);
            }

            const responseText = await response.text();
            console.log('Registration raw response text:', responseText);

            let parsedResponse: TelemetryResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Registration JSON parse error:', parseError);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
            }

            if (!parsedResponse.success || !parsedResponse.instanceId) {
                throw new Error(`Registration failed: ${parsedResponse || 'No instance ID returned'}`);
            }

            const instanceId = parsedResponse.instanceId;
            console.log('Instance registered successfully:', instanceId);

            // Send initial telemetry data immediately after registration
            console.log('Sending initial telemetry data...');
            try {
                const initialTelemetryData: TelemetryData = {
                    instanceId,
                    version: getVersionString(),
                    status: appInfo.status,
                    environment: appInfo.environment,
                    timestamp: new Date().toISOString(),
                };

                await this.sendTelemetry(initialTelemetryData);
                console.log('Initial telemetry sent successfully');
            } catch (telemetryError) {
                console.warn('Failed to send initial telemetry (registration still successful):', telemetryError);
                // Don't throw here - registration was successful, telemetry can be retried later
            }

            return instanceId;

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.error('Registration request timed out');
                    throw new Error('Registration request timed out after 30 seconds');
                }
                console.error('Registration error:', error.message);
                throw error;
            }
            console.error('Unknown registration error:', error);
            throw new Error('Unknown error occurred during registration');
        }
    }

    /**
     * Send telemetry data to server
     */
    static async sendTelemetry(data: TelemetryData): Promise<TelemetryResponse> {
        console.log('Sending telemetry to:', this.SEND_TELEMETRY_URL);
        console.log('Payload:', JSON.stringify(data, null, 2));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(this.SEND_TELEMETRY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify(data),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Non-JSON response received:', responseText);
                throw new Error(`Expected JSON response, got: ${contentType}. Response: ${responseText}`);
            }

            const responseText = await response.text();
            console.log('Raw response text:', responseText);

            if (!responseText || responseText.trim() === '') {
                throw new Error('Empty response from telemetry server');
            }

            let parsedResponse: TelemetryResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text was:', responseText);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
            }

            console.log('Parsed response:', parsedResponse);

            if (!parsedResponse.success) {
                throw new Error(`Server error: ${parsedResponse || 'Unknown error'}`);
            }

            return parsedResponse;

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.error('Telemetry request timed out');
                    throw new Error('Telemetry request timed out after 30 seconds');
                }
                console.error('Telemetry send error:', error.message);
                throw error;
            }
            console.error('Unknown telemetry error:', error);
            throw new Error('Unknown error occurred while sending telemetry');
        }
    }

    /**
     * Send telemetry now (used by job executor)
     */
    static async sendTelemetryNow(): Promise<void> {
        const config = await this.getTelemetryConfig();

        if (config.allowTelemetry !== 'enabled' || !config.instanceId) {
            console.log('Telemetry not enabled or no instance ID, skipping send');
            return;
        }

        const data: TelemetryData = {
            instanceId: config.instanceId,
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        console.log('Sending scheduled telemetry for instance:', config.instanceId);
        await this.sendTelemetry(data);
        console.log('Scheduled telemetry sent successfully');
    }

    /**
     * Deactivate instance
     */
    static async deactivateInstance(instanceId: string): Promise<void> {
        console.log('Deactivating instance:', instanceId);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(this.DEACTIVATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify({instanceId}),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                console.log('Instance deactivated successfully:', result);
            } else {
                console.warn('Failed to deactivate instance:', response.status, await response.text());
            }
        } catch (error) {
            console.warn('Failed to deactivate instance:', error);
            // Don't throw - deactivation failures shouldn't break the app
        }
    }

    /**
     * Get telemetry statistics
     */
    static async getTelemetryStats(): Promise<TelemetryStats> {
        console.log('Fetching telemetry statistics...');

        try {
            const response = await fetch(this.STATS_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const stats = await response.json();
            console.log('Retrieved telemetry stats:', stats);
            return stats;
        } catch (error) {
            console.error('Failed to fetch telemetry stats:', error);
            throw error;
        }
    }

    /**
     * Schedule telemetry job (every hour)
     */
    private static async scheduleTelemetryJob(): Promise<void> {
        // Dynamically import to avoid circular dependencies
        const {ScheduledJobService, ScheduledJobType} = await import('@/lib/services/jobs/scheduled-job.service');

        // Cancel existing jobs first
        await this.cancelTelemetryJobs();

        // Schedule next telemetry send
        const nextRun = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const jobId = await ScheduledJobService.createJob({
            type: ScheduledJobType.TELEMETRY_SEND,
            entityId: 'telemetry-system', // Use a string that won't conflict with foreign keys
            scheduledAt: nextRun,
            maxRetries: 3,
        });

        console.log(`Scheduled telemetry job ${jobId} for:`, nextRun.toISOString());
    }

    /**
     * Cancel all telemetry jobs
     */
    private static async cancelTelemetryJobs(): Promise<void> {
        // Dynamically import to avoid circular dependencies
        const {ScheduledJobType} = await import('@/lib/services/jobs/scheduled-job.service');

        // Find and cancel pending telemetry jobs
        const pendingJobs = await db.scheduledJob.findMany({
            where: {
                type: ScheduledJobType.TELEMETRY_SEND,
                entityId: 'telemetry-system', // Match the same entityId we use for creation
                status: 'PENDING'
            }
        });

        for (const job of pendingJobs) {
            await db.scheduledJob.update({
                where: {id: job.id},
                data: {status: 'CANCELLED'}
            });
        }

        console.log(`Cancelled ${pendingJobs.length} pending telemetry jobs`);
    }

    /**
     * Initialize telemetry (call on app startup)
     */
    static async initialize(): Promise<void> {
        console.log('Initializing telemetry service...');

        try {
            const config = await this.getTelemetryConfig();
            console.log('Current telemetry config:', config);

            if (config.allowTelemetry === 'enabled') {
                if (config.instanceId) {
                    console.log('Telemetry enabled for instance:', config.instanceId);
                    await this.scheduleTelemetryJob();
                } else {
                    console.log('Telemetry enabled but no instance ID - will prompt for registration');
                }
            } else {
                console.log('Telemetry disabled or in prompt mode');
            }
        } catch (error) {
            console.error('Failed to initialize telemetry:', error);
            // Don't throw - telemetry failures shouldn't break app startup
        }
    }

    /**
     * Handle app shutdown
     */
    static async shutdown(): Promise<void> {
        console.log('Shutting down telemetry service...');

        try {
            const config = await this.getTelemetryConfig();

            if (config.allowTelemetry === 'enabled' && config.instanceId) {
                console.log('Deactivating instance on shutdown:', config.instanceId);
                await this.deactivateInstance(config.instanceId);
            }
        } catch (error) {
            console.error('Error during telemetry shutdown:', error);
            // Don't throw - shutdown errors shouldn't prevent app termination
        }
    }

    /**
     * Test telemetry connection (for debugging)
     */
    static async testConnection(): Promise<void> {
        console.log('Testing telemetry connection...');

        try {
            // First test if the server is responding
            const healthResponse = await fetch(this.TELEMETRY_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
            });

            console.log('Health check response:', healthResponse.status);

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('Server health data:', healthData);
            }

            // Then test actual telemetry submission
            const testData: TelemetryData = {
                instanceId: 'test-' + Date.now(),
                version: getVersionString(),
                status: appInfo.status,
                environment: 'test',
                timestamp: new Date().toISOString(),
            };

            console.log('Testing telemetry submission...');
            const result = await this.sendTelemetry(testData);
            console.log('Test submission result:', result);

            // Test deactivation
            if (result.instanceId) {
                console.log('Testing instance deactivation...');
                await this.deactivateInstance(result.instanceId);
            }

            console.log('Telemetry connection test completed successfully');
        } catch (error) {
            console.error('Telemetry connection test failed:', error);
            throw error;
        }
    }

    /**
     * Map Prisma enum to our type
     */
    private static mapTelemetryState(state: TelemetryState): TelemetryConfig['allowTelemetry'] {
        switch (state) {
            case TelemetryState.PROMPT:
                return 'prompt';
            case TelemetryState.ENABLED:
                return 'enabled';
            case TelemetryState.DISABLED:
                return 'disabled';
            default:
                return 'prompt';
        }
    }

    /**
     * Map our type to Prisma enum
     */
    private static mapToDbTelemetryState(state: TelemetryConfig['allowTelemetry']): TelemetryState {
        switch (state) {
            case 'prompt':
                return TelemetryState.PROMPT;
            case 'enabled':
                return TelemetryState.ENABLED;
            case 'disabled':
                return TelemetryState.DISABLED;
            default:
                return TelemetryState.PROMPT;
        }
    }
}