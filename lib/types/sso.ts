export interface OAuthProvider {
    id: string;
    name: string;
    enabled: boolean;
    isDefault: boolean;
    clientId?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    callbackUrl?: string;
    scopes?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface OAuthConnection {
    id: string;
    providerId: string;
    provider: OAuthProvider;
    providerUserId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserConnectionsResponse {
    connections: OAuthConnection[];
    allProviders: OAuthProvider[];
}

export type ConnectionStatus = 'connected' | 'expired' | 'disabled';

export interface SsoConnectionsData {
    connections: OAuthConnection[];
    allProviders: OAuthProvider[];
}

// For API responses
export interface ConnectionApiResponse {
    success: boolean;
    data?: UserConnectionsResponse;
    error?: string;
}

// Provider status helpers
export interface ProviderStatusInfo {
    status: ConnectionStatus;
    message: string;
    actionRequired?: boolean;
}

// Connection analytics
export interface ConnectionAnalytics {
    totalConnections: number;
    activeConnections: number;
    expiredConnections: number;
    disabledProviderConnections: number;
    mostRecentConnection?: OAuthConnection;
    oldestConnection?: OAuthConnection;
}