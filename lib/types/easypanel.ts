export interface EasypanelConfig {
    projectId: string;
    serviceId: string;
    panelUrl: string;
    apiKey: string;
}

export interface EasypanelUpdateImagePayload {
    json: {
        projectName: string;
        serviceName: string;
        image: string;
        username?: string;
        password?: string;
    };
}

export interface EasypanelDeployPayload {
    json: {
        projectName: string;
        serviceName: string;
        forceRebuild: boolean;
    };
}

export interface EasypanelApiResponse<T = unknown> {
    result?: {
        data: T;
    };
    error?: {
        message: string;
        code: number;
    };
}

export interface UpdateStatus {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    canAutoUpdate: boolean;
    easypanelConfigured: boolean;
}