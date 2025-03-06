export interface OAuthProvider {
    id: string;
    name: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    callbackUrl: string;
    scopes: string[];
    enabled: boolean;
    isDefault?: boolean;
}

export interface OAuthUserInfo {
    id: string;
    email: string;
    name?: string;
    picture?: string;
    [key: string]: unknown;
}

export interface OAuthCallbackParams {
    code: string;
    state?: string;
    error?: string;
}

export interface OAuthConfig {
    providers: OAuthProvider[];
    defaultProviderId?: string;
}