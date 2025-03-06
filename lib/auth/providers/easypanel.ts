import { db } from '@/lib/db';

export interface EasypanelProviderConfig {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
}

export async function setupEasypanelProvider(config: EasypanelProviderConfig) {
    const { baseUrl, clientId, clientSecret } = config;

    // Normalize base URL (remove trailing slash)
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;

    // Get app URL for callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // First, check if an Easypanel provider already exists
    const existingProvider = await db.oAuthProvider.findFirst({
        where: {
            name: 'Easypanel'
        }
    });

    // Create callback URL using the provider name
    const callbackUrl = `${appUrl}/api/auth/oauth/callback/easypanel`;

    if (existingProvider) {
        // Update existing provider
        return await db.oAuthProvider.update({
            where: {
                id: existingProvider.id
            },
            data: {
                clientId,
                clientSecret,
                authorizationUrl: `${normalizedBaseUrl}/oauth/authorize`,
                tokenUrl: `${normalizedBaseUrl}/oauth/token`,
                userInfoUrl: `${normalizedBaseUrl}/oauth/userinfo`,
                callbackUrl,
                enabled: true
            }
        });
    } else {
        // Create new provider
        return await db.oAuthProvider.create({
            data: {
                name: 'Easypanel',
                clientId,
                clientSecret,
                authorizationUrl: `${normalizedBaseUrl}/oauth/authorize`,
                tokenUrl: `${normalizedBaseUrl}/oauth/token`,
                userInfoUrl: `${normalizedBaseUrl}/oauth/userinfo`,
                callbackUrl,
                scopes: ['openid', 'profile', 'email'],
                enabled: true,
                isDefault: true
            }
        });
    }
}