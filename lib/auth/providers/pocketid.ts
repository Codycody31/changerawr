import {db} from '@/lib/db';

export interface PocketIDProviderConfig {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
}

export async function setupPocketIDProvider(config: PocketIDProviderConfig) {
    const {baseUrl, clientId, clientSecret} = config;

    // Normalize base URL (remove trailing slash)
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;

    // Get app URL for callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // First, check if a PocketID provider already exists
    const existingProvider = await db.oAuthProvider.findFirst({
        where: {
            name: 'PocketID'
        }
    });

    // Create callback URL using the provider name
    const callbackUrl = `${appUrl}/api/auth/oauth/callback/pocketid`;

    if (existingProvider) {
        // Update existing provider
        return db.oAuthProvider.update({
            where: {
                id: existingProvider.id
            },
            data: {
                clientId,
                clientSecret,
                authorizationUrl: `${normalizedBaseUrl}/authorize`,
                tokenUrl: `${normalizedBaseUrl}/api/oidc/token`,
                userInfoUrl: `${normalizedBaseUrl}/api/oidc/userinfo`,
                callbackUrl,
                enabled: true
            }
        });
    } else {
        // Create new provider
        return db.oAuthProvider.create({
            data: {
                name: 'PocketID',
                clientId,
                clientSecret,
                authorizationUrl: `${normalizedBaseUrl}/authorize`,
                tokenUrl: `${normalizedBaseUrl}/api/oidc/token`,
                userInfoUrl: `${normalizedBaseUrl}/api/oidc/userinfo`,
                callbackUrl,
                scopes: ['openid', 'profile', 'email'],
                enabled: true,
                isDefault: true
            }
        });
    }
}