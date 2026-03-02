import * as acme from 'acme-client'
import {db} from '@/lib/db'
import {encrypt, decrypt} from '@/lib/custom-domains/ssl/encryption'

const isAcmeStagingEnabled = () => (
    process.env.ACME_STAGING === 'true' || process.env.ACME_SANDBOX_MODE === 'true'
)

const getDirectoryUrl = () => {
    return isAcmeStagingEnabled()
        ? acme.directory.letsencrypt.staging
        : acme.directory.letsencrypt.production
}

const getAccountId = (directoryUrl: string) => {
    return directoryUrl === acme.directory.letsencrypt.staging
        ? 'global-staging'
        : 'global-production'
}

// Creates and persists the global ACME account on first call,
// loads it from DB on every subsequent call.
export async function getAcmeClient(): Promise<acme.Client> {
    const directoryUrl = getDirectoryUrl()
    const accountId = getAccountId(directoryUrl)
    const existing = await db.acmeAccount.findUnique({where: {id: accountId}})

    if (existing) {
        const accountKey = Buffer.from(decrypt(existing.accountKeyPem))
        return new acme.Client({
            directoryUrl,
            accountKey,
            accountUrl: existing.accountUrl,
        })
    }

    // ECDSA P-256 — smaller and faster than RSA
    const accountKey = await acme.crypto.createPrivateEcdsaKey()
    const client = new acme.Client({directoryUrl, accountKey})

    const email = process.env.ACME_EMAIL
    if (!email) {
        throw new Error('ACME_EMAIL is required for certificate issuance')
    }

    await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
    })

    const accountUrl = client.getAccountUrl()

    await db.acmeAccount.create({
        data: {
            id: accountId,
            accountKeyPem: encrypt(accountKey.toString()),
            accountUrl,
            email,
        },
    })

    return client
}

export {isAcmeStagingEnabled}