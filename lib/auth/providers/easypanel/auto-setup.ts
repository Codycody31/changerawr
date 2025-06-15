// lib/services/auth/providers/easypanel/auto-setup.ts
import { nanoid } from 'nanoid';
import {
    EasypanelApiError,
    createEasypanelApiClient,
    isAutoOAuthAvailable
} from './client';
import { setupEasypanelProvider } from '@/lib/auth/providers/easypanel';

export interface AutoSetupResult {
    success: boolean;
    client?: {
        id: string;
        name: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    error?: string;
    details?: string;
}

export interface AutoSetupOptions {
    appName?: string;
    persistent?: boolean;
}

/**
 * Automatically create and configure OAuth client with the remote server
 */
export async function performAutoOAuthSetup(
    options: AutoSetupOptions = {}
): Promise<AutoSetupResult> {
    // console.log('🦖 performAutoOAuthSetup called with options:', options);

    // Check if auto setup is available
    if (!isAutoOAuthAvailable()) {
        // console.log('🦖 Auto setup not available - missing env vars');
        return {
            success: false,
            error: 'Auto OAuth setup not available',
            details: 'Missing CHR_EPOA2_SERV_URL or CHR_EPOA2_SERV_API_KEY environment variables'
        };
    }

    // console.log('🦖 Environment variables check passed');
    // console.log('🦖 Server URL:', process.env.CHR_EPOA2_SERV_URL);
    // console.log('🦖 API Key:', process.env.CHR_EPOA2_SERV_API_KEY ? 'SET' : 'NOT SET');

    const apiClient = createEasypanelApiClient();
    if (!apiClient) {
        console.log('🦖 Failed to create API client');
        return {
            success: false,
            error: 'Failed to create API client',
            details: 'Could not initialize OAuth server API client'
        };
    }

    try {
        // Step 1: Test connection to OAuth server
        // console.log('🦖 Testing connection to OAuth server...');
        const connectionTest = await apiClient.testConnection();
        if (!connectionTest.success) {
            // console.log('🦖 Connection test failed:', connectionTest.error);
            return {
                success: false,
                error: 'Connection to OAuth server failed',
                details: connectionTest.error
            };
        }
        console.log('🦖 Connection test successful');

        // Step 2: Generate client configuration
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const clientName = options.appName || `Changerawr-${nanoid(8)}`;

        // Fixed redirect URI for Easypanel provider - cannot be changed
        const redirectUri = `${appUrl}/api/auth/oauth/callback/easypanel`;

        // Required scopes for OAuth authentication
        const allowedScopes = ['openid', 'profile', 'email'];

        const clientData = {
            name: clientName,
            redirectUris: [redirectUri],
            allowedScopes,
            persistent: options.persistent ?? true
        };

        console.log('🦖 Creating OAuth client with data:', clientData);

        // Step 3: Create OAuth client on remote server
        const createdClient = await apiClient.createClient(clientData);

        console.log('🦖 Client created successfully:', {
            id: createdClient.id,
            name: createdClient.name,
            hasSecret: !!createdClient.secret
        });

        if (!createdClient.secret) {
            // console.log('🦖 No client secret in response');
            return {
                success: false,
                error: 'Client created but no secret returned',
                details: 'The OAuth server did not return a client secret'
            };
        }

        // Step 4: Configure local OAuth provider using our existing setup function
        try {
            const serverUrl = process.env.CHR_EPOA2_SERV_URL;
            if (!serverUrl) {
                throw new Error('CHR_EPOA2_SERV_URL not configured');
            }

            // console.log('🦖 Setting up local OAuth provider...');
            await setupEasypanelProvider({
                baseUrl: serverUrl,
                clientId: createdClient.id,
                clientSecret: createdClient.secret
            });

            // console.log('🦖 Local OAuth provider setup complete');

            return {
                success: true,
                client: {
                    id: createdClient.id,
                    name: createdClient.name,
                    clientId: createdClient.id,
                    clientSecret: createdClient.secret,
                    redirectUri: redirectUri
                }
            };

        } catch (setupError) {
            console.error('🦖 Local setup failed:', setupError);
            // If local setup fails, try to clean up the remote client
            try {
                console.log('🦖 Attempting to cleanup remote client...');
                await apiClient.deleteClient(createdClient.id);
                console.log('🦖 Remote client cleanup successful');
            } catch (cleanupError) {
                console.warn('🦖 Failed to cleanup remote client after setup failure:', cleanupError);
            }

            return {
                success: false,
                error: 'Failed to configure local OAuth provider',
                details: setupError instanceof Error ? setupError.message : 'Unknown setup error'
            };
        }

    } catch (error) {
        console.error('🦖 Auto setup error:', error);

        if (error instanceof EasypanelApiError) {
            return {
                success: false,
                error: `OAuth server error: ${error.message}`,
                details: error.details
            };
        }

        return {
            success: false,
            error: 'Unexpected error during auto setup',
            details: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Verify that auto setup configuration is working
 */
export async function verifyAutoSetupConfiguration(): Promise<{
    available: boolean;
    connected: boolean;
    error?: string;
}> {
    const available = isAutoOAuthAvailable();

    if (!available) {
        return {
            available: false,
            connected: false,
            error: 'Environment variables not configured'
        };
    }

    const apiClient = createEasypanelApiClient();
    if (!apiClient) {
        return {
            available: true,
            connected: false,
            error: 'Failed to create API client'
        };
    }

    const connectionTest = await apiClient.testConnection();

    return {
        available: true,
        connected: connectionTest.success,
        error: connectionTest.error
    };
}

/**
 * Get OAuth server information for display purposes
 */
export function getOAuthServerInfo(): {
    serverUrl?: string;
    hasApiKey: boolean;
    isConfigured: boolean;
} {
    const serverUrl = process.env.CHR_EPOA2_SERV_URL;
    const hasApiKey = !!process.env.CHR_EPOA2_SERV_API_KEY;
    const isConfigured = isAutoOAuthAvailable();

    return {
        serverUrl,
        hasApiKey,
        isConfigured
    };
}