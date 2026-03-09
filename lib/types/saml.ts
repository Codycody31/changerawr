export interface SAMLProvider {
    id: string;
    name: string;
    entityId: string;
    ssoUrl: string;
    certificate: string;
    spEntityId?: string | null;
    nameIdFormat: string;
    emailAttribute: string;
    nameAttribute: string;
    enabled: boolean;
    isDefault: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface SAMLConnection {
    id: string;
    providerId: string;
    provider: Pick<SAMLProvider, 'id' | 'name' | 'enabled' | 'isDefault'>;
    userId: string;
    nameId: string;
    sessionIndex?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SAMLUserInfo {
    nameId: string;
    email: string;
    name?: string;
    sessionIndex?: string;
}

export interface SAMLCallbackParams {
    samlResponse: string;
    relayState?: string;
}

export type SAMLProviderUpdateData = {
    name?: string;
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    spEntityId?: string | null;
    nameIdFormat?: string;
    emailAttribute?: string;
    nameAttribute?: string;
    enabled?: boolean;
    isDefault?: boolean;
};
