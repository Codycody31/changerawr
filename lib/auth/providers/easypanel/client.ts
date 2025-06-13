// lib/services/auth/providers/easypanel/client.ts
import { z } from 'zod';

// Response schemas for validation
const ClientResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        id: z.string(),
        name: z.string(),
        secret: z.string().optional(),
        redirectUris: z.array(z.string()),
        allowedScopes: z.array(z.string()),
        createdAt: z.string(),
        persistent: z.boolean()
    }).optional(),
    client: z.object({
        id: z.string(),
        name: z.string(),
        secret: z.string().optional(),
        redirectUris: z.array(z.string()),
        allowedScopes: z.array(z.string()),
        createdAt: z.string(),
        persistent: z.boolean()
    }).optional(),
    error: z.string().optional(),
    details: z.string().optional()
});

const ClientsListResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.object({
        id: z.string(),
        name: z.string(),
        redirectUris: z.array(z.string()),
        allowedScopes: z.array(z.string()),
        createdAt: z.string(),
        persistent: z.boolean()
    })).optional(),
    count: z.number().optional(),
    error: z.string().optional(),
    details: z.string().optional()
});

export interface CreateClientRequest {
    name: string;
    redirectUris: string[];
    allowedScopes: string[];
    persistent?: boolean;
}

export interface UpdateClientRequest {
    name?: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    persistent?: boolean;
}

export interface EasypanelClient {
    id: string;
    name: string;
    secret?: string;
    redirectUris: string[];
    allowedScopes: string[];
    createdAt: string;
    persistent: boolean;
}

export class EasypanelApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public details?: string
    ) {
        super(message);
        this.name = 'EasypanelApiError';
    }
}

export class EasypanelApiClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
    }

    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const requestOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                ...options.headers,
            },
        };

        console.log('🦖 Making request to:', url);
        console.log('🦖 Request method:', options.method || 'GET');
        console.log('🦖 Request headers:', {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'not set'
        });

        if (options.body) {
            console.log('🦖 Request body:', options.body);
        }

        const response = await fetch(url, requestOptions);

        console.log('🦖 Response status:', response.status);
        console.log('🦖 Response ok:', response.ok);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let responseText = '';

            try {
                responseText = await response.text();
                console.log('🦖 Error response body:', responseText);

                const errorData = JSON.parse(responseText);
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
                if (errorData.details) {
                    errorMessage += ` - ${errorData.details}`;
                }
            } catch (parseError) {
                console.log('🦖 Could not parse error response as JSON:', parseError);
                if (responseText) {
                    errorMessage += ` - ${responseText}`;
                }
            }

            throw new EasypanelApiError(errorMessage, response.status);
        }

        const responseText = await response.text();
        console.log('🦖 Response body:', responseText);

        try {
            const data = JSON.parse(responseText);
            return data as T;
        } catch (parseError) {
            console.error('🦖 Failed to parse response JSON:', parseError);
            throw new EasypanelApiError('Invalid JSON response from server', 500);
        }
    }

    /**
     * Test connection to the OAuth server
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await this.makeRequest<typeof ClientsListResponseSchema._type>(
                '/api/clients'
            );

            const parsed = ClientsListResponseSchema.safeParse(response);
            if (!parsed.success) {
                return {
                    success: false,
                    error: 'Invalid response format from OAuth server'
                };
            }

            if (!parsed.data.success) {
                return {
                    success: false,
                    error: parsed.data.error || 'API returned failure status'
                };
            }

            return { success: true };
        } catch (error) {
            if (error instanceof EasypanelApiError) {
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * List all OAuth clients
     */
    async listClients(): Promise<EasypanelClient[]> {
        const response = await this.makeRequest<typeof ClientsListResponseSchema._type>(
            '/api/clients'
        );

        const parsed = ClientsListResponseSchema.parse(response);

        if (!parsed.success || !parsed.data) {
            throw new EasypanelApiError(
                parsed.error || 'Failed to list clients',
                400,
                parsed.details
            );
        }

        return parsed.data;
    }

    /**
     * Create a new OAuth client
     */
    async createClient(clientData: CreateClientRequest): Promise<EasypanelClient> {
        const response = await this.makeRequest<typeof ClientResponseSchema._type>(
            '/api/clients',
            {
                method: 'POST',
                body: JSON.stringify(clientData),
            }
        );

        console.log('🦖 Parsing createClient response:', response);

        const parsed = ClientResponseSchema.parse(response);

        if (!parsed.success) {
            throw new EasypanelApiError(
                parsed.error || 'Failed to create client',
                400,
                parsed.details
            );
        }

        // The response has the client data in the "client" field, not "data"
        const clientData_response = parsed.client || parsed.data;

        if (!clientData_response) {
            throw new EasypanelApiError(
                'No client data in response',
                400,
                'Server returned success but no client data'
            );
        }

        console.log('🦖 Successfully parsed client data:', clientData_response);

        return clientData_response;
    }

    /**
     * Get a specific client by ID
     */
    async getClient(clientId: string): Promise<EasypanelClient> {
        const response = await this.makeRequest<typeof ClientResponseSchema._type>(
            `/api/clients/${clientId}`
        );

        const parsed = ClientResponseSchema.parse(response);

        if (!parsed.success || !parsed.data) {
            throw new EasypanelApiError(
                parsed.error || 'Failed to get client',
                404,
                parsed.details
            );
        }

        return parsed.data;
    }

    /**
     * Update an existing client
     */
    async updateClient(clientId: string, updates: UpdateClientRequest): Promise<EasypanelClient> {
        const response = await this.makeRequest<typeof ClientResponseSchema._type>(
            `/api/clients/${clientId}`,
            {
                method: 'PUT',
                body: JSON.stringify(updates),
            }
        );

        const parsed = ClientResponseSchema.parse(response);

        if (!parsed.success || !parsed.data) {
            throw new EasypanelApiError(
                parsed.error || 'Failed to update client',
                400,
                parsed.details
            );
        }

        return parsed.data;
    }

    /**
     * Delete a client
     */
    async deleteClient(clientId: string): Promise<void> {
        await this.makeRequest(
            `/api/clients/${clientId}`,
            {
                method: 'DELETE',
            }
        );
    }

    /**
     * Regenerate client secret
     */
    async regenerateSecret(clientId: string): Promise<{ newSecret: string }> {
        const response = await this.makeRequest<{
            success: boolean;
            data?: { newSecret: string };
            error?: string;
        }>(
            `/api/clients/${clientId}/regenerate-secret`,
            {
                method: 'POST',
            }
        );

        if (!response.success || !response.data) {
            throw new EasypanelApiError(
                response.error || 'Failed to regenerate secret',
                400
            );
        }

        return response.data;
    }
}

/**
 * Create an API client instance from environment variables
 */
export function createEasypanelApiClient(): EasypanelApiClient | null {
    const baseUrl = process.env.CHR_EPOA2_SERV_URL;
    const apiKey = process.env.CHR_EPOA2_SERV_API_KEY;

    if (!baseUrl || !apiKey) {
        return null;
    }

    return new EasypanelApiClient(baseUrl, apiKey);
}

/**
 * Check if automatic OAuth setup is available
 */
export function isAutoOAuthAvailable(): boolean {
    return !!(process.env.CHR_EPOA2_SERV_URL && process.env.CHR_EPOA2_SERV_API_KEY);
}