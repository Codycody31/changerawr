import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    type VerifiedRegistrationResponse,
    type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

const rpName = 'Changerawr';
const rpID = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'localhost';
const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function generateRegistrationOptionsForUser(
    userId: string,
    userName: string,
    userEmail: string,
    excludeCredentials: { id: string; transports?: string[] }[] = []
): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return generateRegistrationOptions({
        rpName,
        rpID,
        userID: userId,
        userName: userEmail,
        userDisplayName: userName || userEmail,
        attestationType: 'none',
        excludeCredentials: excludeCredentials.map(cred => ({
            id: Buffer.from(cred.id, 'base64url'),
            type: 'public-key',
            transports: cred.transports as AuthenticatorTransport[],
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    });
}

export async function verifyRegistration(
    response: RegistrationResponseJSON,
    expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
    return verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
    });
}

export async function generateAuthenticationOptionsForUser(
    allowCredentials: { id: string; transports?: string[] }[] = []
): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return generateAuthenticationOptions({
        rpID,
        allowCredentials: allowCredentials.map(cred => ({
            id: Buffer.from(cred.id, 'base64url'),
            type: 'public-key',
            transports: cred.transports as AuthenticatorTransport[],
        })),
        userVerification: 'preferred',
    });
}

export async function verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    authenticatorPublicKey: string,
    authenticatorCounter: number
): Promise<VerifiedAuthenticationResponse> {
    return verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
            credentialPublicKey: Buffer.from(authenticatorPublicKey, 'base64'),
            credentialID: Buffer.from(response.id, 'base64url'),
            counter: authenticatorCounter,
        },
    });
}