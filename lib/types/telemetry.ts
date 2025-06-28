export type TelemetryState = 'prompt' | 'enabled' | 'disabled';

export interface TelemetryConfig {
    allowTelemetry: TelemetryState;
    instanceId?: string;
}

export interface TelemetryData {
    instanceId: string;
    version: string;
    status: string;
    environment: string;
    timestamp: string;
}

export interface TelemetryResponse {
    success: boolean;
    instanceId?: string;
    message?: string;
}

export interface TelemetryStats {
    success: boolean;
    stats: {
        totalInstances: number;
        activeInstances: number;
        recentInstances: number;
        lastUpdate: string | null;
        versions: Array<{
            version: string;
            count: number;
        }>;
        environments: Array<{
            environment: string;
            count: number;
        }>;
    };
}