import { SAML } from '@node-saml/node-saml';
import { db } from '@/lib/db';
import { generateTokens } from '@/lib/auth/tokens';
import { Role } from '@prisma/client';
import { SAMLUserInfo } from '@/lib/types/saml';
import { validateEmailDomain } from '@/lib/auth/email-domain-validator';

function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function buildSAMLInstance(provider: {
    ssoUrl: string;
    certificate: string;
    spEntityId?: string | null;
    nameIdFormat: string;
    name: string;
}) {
    const appUrl = getAppUrl();
    const providerSlug = provider.name.toLowerCase().replace(/\s+/g, '-');

    // Normalize certificate: strip PEM headers if present, then re-wrap
    let cert = provider.certificate.trim();
    cert = cert
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');

    return new SAML({
        callbackUrl: `${appUrl}/api/auth/saml/callback/${providerSlug}`,
        entryPoint: provider.ssoUrl,
        issuer: provider.spEntityId || `${appUrl}/api/auth/saml/metadata/${providerSlug}`,
        idpCert: cert,
        identifierFormat: provider.nameIdFormat,
        wantAssertionsSigned: false,
        wantAuthnResponseSigned: true,
    });
}

export async function getSAMLProviders(includeDisabled = false) {
    return db.sAMLProvider.findMany({
        where: includeDisabled ? {} : { enabled: true },
        orderBy: { name: 'asc' },
    });
}

export async function getSAMLLoginUrl(providerName: string, relayState?: string): Promise<string> {
    const provider = await db.sAMLProvider.findFirst({
        where: {
            name: { equals: providerName, mode: 'insensitive' },
            enabled: true,
        },
    });

    if (!provider) {
        throw new Error(`SAML provider not found: ${providerName}`);
    }

    const saml = buildSAMLInstance(provider);
    const url = await saml.getAuthorizeUrlAsync(relayState || '', undefined, {});
    return url;
}

export async function validateSAMLResponse(
    providerName: string,
    samlResponse: string,
): Promise<SAMLUserInfo> {
    const provider = await db.sAMLProvider.findFirst({
        where: {
            name: { equals: providerName, mode: 'insensitive' },
            enabled: true,
        },
    });

    if (!provider) {
        throw new Error(`SAML provider not found: ${providerName}`);
    }

    const saml = buildSAMLInstance(provider);

    const { profile } = await saml.validatePostResponseAsync({
        SAMLResponse: samlResponse,
    });

    if (!profile) {
        throw new Error('No profile returned from SAML assertion');
    }

    // Extract email using configured attribute or fallbacks
    const rawProfile = profile as Record<string, unknown>;
    const email =
        (rawProfile[provider.emailAttribute] as string) ||
        (rawProfile['email'] as string) ||
        (rawProfile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ||
        (rawProfile['nameID'] as string);

    if (!email) {
        throw new Error('Could not extract email from SAML assertion');
    }

    // Extract name using configured attribute or fallbacks
    const name =
        (rawProfile[provider.nameAttribute] as string) ||
        (rawProfile['name'] as string) ||
        (rawProfile['displayName'] as string) ||
        (rawProfile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string) ||
        undefined;

    return {
        nameId: profile.nameID || email,
        email,
        name,
        sessionIndex: profile.sessionIndex || undefined,
    };
}

export async function handleSAMLCallback(providerName: string, samlResponse: string) {
    const provider = await db.sAMLProvider.findFirst({
        where: {
            name: { equals: providerName, mode: 'insensitive' },
            enabled: true,
        },
    });

    if (!provider) {
        throw new Error(`SAML provider not found: ${providerName}`);
    }

    const userInfo = await validateSAMLResponse(providerName, samlResponse);

    if (!userInfo.email) {
        throw new Error('Email is required from SAML provider');
    }

    // Look for existing SAML connection by nameId
    const existingConnection = await db.sAMLConnection.findFirst({
        where: {
            providerId: provider.id,
            nameId: userInfo.nameId,
        },
        include: { user: true },
    });

    if (existingConnection) {
        // Update session index if changed
        await db.sAMLConnection.update({
            where: { id: existingConnection.id },
            data: {
                sessionIndex: userInfo.sessionIndex || null,
                updatedAt: new Date(),
            },
        });

        await db.user.update({
            where: { id: existingConnection.user.id },
            data: { lastLoginAt: new Date() },
        });

        const tokens = await generateTokens(existingConnection.user.id);
        return { user: existingConnection.user, ...tokens };
    }

    // Find or create user by email
    let user = await db.user.findUnique({ where: { email: userInfo.email } });

    // Validate email domain restrictions
    const validation = validateEmailDomain(
        userInfo.email,
        {
            allowedEmailDomains: provider.allowedEmailDomains,
            blockExistingUsers: provider.blockExistingUsers,
        },
        !!user
    );

    if (!validation.allowed) {
        throw new Error(validation.reason || 'Email domain not allowed for this SSO provider');
    }

    if (!user) {
        user = await db.user.create({
            data: {
                email: userInfo.email,
                name: userInfo.name || null,
                password: '',
                role: Role.STAFF,
                lastLoginAt: new Date(),
            },
        });

        await db.settings.create({
            data: { userId: user.id, theme: 'light' },
        });
    } else {
        await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
    }

    // Create or update SAML connection
    await db.sAMLConnection.upsert({
        where: {
            providerId_userId: {
                providerId: provider.id,
                userId: user.id,
            },
        },
        create: {
            providerId: provider.id,
            userId: user.id,
            nameId: userInfo.nameId,
            sessionIndex: userInfo.sessionIndex || null,
        },
        update: {
            nameId: userInfo.nameId,
            sessionIndex: userInfo.sessionIndex || null,
            updatedAt: new Date(),
        },
    });

    const tokens = await generateTokens(user.id);
    return { user, ...tokens };
}

export async function getSAMLMetadata(providerName: string): Promise<string> {
    const provider = await db.sAMLProvider.findFirst({
        where: {
            name: { equals: providerName, mode: 'insensitive' },
        },
    });

    if (!provider) {
        throw new Error(`SAML provider not found: ${providerName}`);
    }

    const saml = buildSAMLInstance(provider);
    return saml.generateServiceProviderMetadata(null, null);
}
