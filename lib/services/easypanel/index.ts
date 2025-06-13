// lib/services/easypanel.ts (Updated)

import { EasypanelConfig, EasypanelUpdateImagePayload, EasypanelDeployPayload, EasypanelApiResponse } from '@/lib/types/easypanel';
import { generateDockerImage, validateDockerImage } from '@/lib/utils/docker';

export class EasypanelService {
    private config: EasypanelConfig;

    constructor(config: EasypanelConfig) {
        this.config = config;
    }

    /**
     * Check if Easypanel is properly configured
     */
    static isConfigured(): boolean {
        return !!(
            process.env.EASYPANEL_PROJECT_ID &&
            process.env.EASYPANEL_SERVICE_ID &&
            process.env.EASYPANEL_PANEL_URL &&
            process.env.EASYPANEL_API_KEY
        );
    }

    /**
     * Create an instance from environment variables
     */
    static fromEnv(): EasypanelService | null {
        if (!this.isConfigured()) {
            return null;
        }

        return new EasypanelService({
            projectId: process.env.EASYPANEL_PROJECT_ID!,
            serviceId: process.env.EASYPANEL_SERVICE_ID!,
            panelUrl: process.env.EASYPANEL_PANEL_URL!,
            apiKey: process.env.EASYPANEL_API_KEY!,
        });
    }

    /**
     * Make a request to the Easypanel API
     */
    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' = 'POST',
        body?: unknown
    ): Promise<T> {
        const url = `${this.config.panelUrl}/api/trpc/${endpoint}`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Easypanel API request failed: ${response.status} ${response.statusText}`);
        }

        const data: EasypanelApiResponse<T> = await response.json();

        if (data.error) {
            throw new Error(`Easypanel API error: ${data.error.message}`);
        }

        return data.result?.data as T;
    }

    /**
     * Update the Docker image for the service
     */
    async updateImage(newImage: string): Promise<void> {
        // Validate the Docker image format
        const validation = validateDockerImage(newImage);
        if (!validation.valid) {
            throw new Error(`Invalid Docker image format: ${validation.error}`);
        }

        const payload: EasypanelUpdateImagePayload = {
            json: {
                projectName: this.config.projectId,
                serviceName: this.config.serviceId,
                image: newImage,
            },
        };

        console.log(`Updating image to: ${newImage}`);
        await this.makeRequest('services.app.updateSourceImage', 'POST', payload);
    }

    /**
     * Deploy the service with the new image
     */
    async deployService(): Promise<void> {
        const payload: EasypanelDeployPayload = {
            json: {
                projectName: this.config.projectId,
                serviceName: this.config.serviceId,
                forceRebuild: true,
            },
        };

        console.log('Deploying service with force rebuild...');
        await this.makeRequest('services.app.deployService', 'POST', payload);
    }

    /**
     * Perform a complete update: change image and deploy
     */
    async performUpdate(version: string, customImage?: string): Promise<void> {
        console.log(`Starting Easypanel update to version: ${version}`);

        // Generate or use custom Docker image
        const dockerImage = customImage || generateDockerImage(version);

        console.log(`Using Docker image: ${dockerImage}`);

        // Step 1: Update the image
        console.log('Step 1: Updating Docker image...');
        await this.updateImage(dockerImage);

        // Small delay to ensure the image update is processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Deploy the service
        console.log('Step 2: Deploying service...');
        await this.deployService();

        console.log('Easypanel update completed successfully');
    }

    /**
     * Test the connection to Easypanel
     */
    async testConnection(): Promise<boolean> {
        try {
            // Try to make a simple request to verify connectivity
            await this.makeRequest('users.listUsers', 'GET');
            return true;
        } catch (error) {
            console.error('Easypanel connection test failed:', error);
            return false;
        }
    }

    /**
     * Get service information
     */
    async getServiceInfo(): Promise<unknown> {
        return this.makeRequest('services.app.get', 'POST', {
            json: {
                projectName: this.config.projectId,
                serviceName: this.config.serviceId,
            }
        });
    }

    /**
     * Get the configuration for debugging
     */
    getConfig(): { projectId: string; serviceId: string; panelUrl: string; apiKey: string } {
        return {
            projectId: this.config.projectId,
            serviceId: this.config.serviceId,
            panelUrl: this.config.panelUrl,
            apiKey: '[REDACTED]',
        };
    }

    /**
     * Generate recommended Docker image for a version
     */
    static generateRecommendedImage(version: string): string {
        return generateDockerImage(version);
    }
}