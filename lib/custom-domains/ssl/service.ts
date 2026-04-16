import * as acme from 'acme-client'
import {db} from '@/lib/db'
import {encrypt, decrypt} from '@/lib/custom-domains/ssl/encryption'
import {getAcmeClient} from '@/lib/custom-domains/ssl/acme-account'
import {assertNotInternal} from '@/lib/custom-domains/ssl/ssrf-guard'
import {notifyAgent} from '@/lib/custom-domains/ssl/webhook'
import type {DomainCertificate} from '@prisma/client'

function getOrderByUrl(client: acme.Client, orderUrl: string): Promise<acme.Order> {
    // acme-client#getOrder expects an order-like object ({ url }), not a raw URL string.
    // Passing a string causes `order.url` to be undefined and the lookup to fail.
    return client.getOrder({url: orderUrl} as acme.Order)
}

async function createDns01Order(client: acme.Client, hostname: string) {
    const order = await client.createOrder({
        identifiers: [{type: 'dns', value: hostname}],
    })

    const authorizations = await client.getAuthorizations(order)
    const authz = authorizations[0]
    if (!authz) {
        throw new Error('No ACME authorization found for DNS-01 order')
    }

    const challenge = authz.challenges.find(c => c.type === 'dns-01')
    if (!challenge) {
        throw new Error('DNS-01 challenge not available')
    }

    const dnsTxtValue = await client.getChallengeKeyAuthorization(challenge)
    return {order, dnsTxtValue}
}


function isOrderExpired(order: acme.Order): boolean {
    const expiresAt = (order as { expires?: string | Date }).expires
    if (!expiresAt) return false

    const expiresTime = new Date(expiresAt).getTime()
    if (Number.isNaN(expiresTime)) return false

    return expiresTime <= Date.now()
}

function isUnusableDnsOrder(order: acme.Order): boolean {
    const status = (order as { status?: string }).status
    return status === 'invalid' || isOrderExpired(order)
}


function shouldReplaceOrderAfterLookupFailure(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

    return (
        message.includes('order not found') ||
        message.includes('urn:ietf:params:acme:error:malformed') ||
        message.includes('urn:ietf:params:acme:error:unauthorized') ||
        message.includes('404') ||
        message.includes('expired') ||
        message.includes('invalid')
    )
}

async function verifyDnsTxtPropagation(hostname: string, expectedValue: string): Promise<void> {
    const {Resolver} = await import('dns').then(m => m.promises)
    const recordName = `_acme-challenge.${hostname}`

    // Check multiple resolvers to reduce false negatives from stale local DNS caches.
    const resolverConfigs = [
        {name: 'system', servers: null as string[] | null},
        {name: 'cloudflare', servers: ['1.1.1.1', '1.0.0.1']},
        {name: 'google', servers: ['8.8.8.8', '8.8.4.4']},
    ]

    const maxAttempts = 4
    let lastError = ''

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const matchedResolvers: string[] = []
        const observedByResolver: string[] = []

        for (const cfg of resolverConfigs) {
            const resolver = new Resolver()
            if (cfg.servers) {
                resolver.setServers(cfg.servers)
            }

            try {
                const txtRecords = await resolver.resolveTxt(recordName)
                const flatRecords = txtRecords.flat()
                observedByResolver.push(`${cfg.name}=[${flatRecords.join(', ')}]`)

                if (flatRecords.includes(expectedValue)) {
                    matchedResolvers.push(cfg.name)
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                observedByResolver.push(`${cfg.name}=<lookup-error:${message}>`)
            }
        }

        console.log(`[ssl/dns01]    DNS attempt ${attempt}/${maxAttempts} observations: ${observedByResolver.join(' | ')}`)

        if (matchedResolvers.length > 0) {
            console.log(`[ssl/dns01] ✅ Self-check passed! TXT record visible via resolver(s): ${matchedResolvers.join(', ')}`)
            return
        }

        lastError = `Expected TXT value not yet visible for ${recordName}`
        if (attempt < maxAttempts) {
            const waitMs = attempt * 3000
            console.log(`[ssl/dns01] ⏳ TXT not visible yet, retrying in ${waitMs}ms...`)
            await new Promise(resolve => setTimeout(resolve, waitMs))
        }
    }

    throw new Error(`DNS TXT record not yet propagated. ${lastError}. Please wait a few minutes and try again.`)
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory per-registered-domain counter. Move to Redis for multi-instance.

const recentIssuances = new Map<string, number[]>()
const MAX_PER_WEEK = 45  // LE hard limit is 50, stay under it
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

function getRegisteredDomain(hostname: string): string {
    // TODO: replace with tldts or publicsuffix.js for accuracy
    return hostname.split('.').slice(-2).join('.')
}

function checkRateLimit(hostname: string): void {
    const root = getRegisteredDomain(hostname)
    const now = Date.now()
    const timestamps = (recentIssuances.get(root) ?? []).filter(
        t => now - t < ONE_WEEK_MS,
    )
    if (timestamps.length >= MAX_PER_WEEK) {
        throw new Error(
            `Too many certificate issuances for ${root} this week (${timestamps.length}/${MAX_PER_WEEK})`,
        )
    }
    timestamps.push(now)
    recentIssuances.set(root, timestamps)
}

// ─── HTTP-01 ──────────────────────────────────────────────────────────────────

// Kicks off HTTP-01 issuance and returns immediately with the cert record ID.
// Completion happens asynchronously — poll /api/acme/status/[certId].
export async function initiateHttp01Certificate(
    domainId: string,
    hostname: string,
): Promise<string> {
    console.log(`[ssl/http01] 🔵 Starting HTTP-01 certificate issuance for ${hostname}`)

    await assertNotInternal(hostname)
    checkRateLimit(hostname)

    console.log(`[ssl/http01] 📡 Requesting certificate order from Let's Encrypt...`)
    const client = await getAcmeClient()

    const order = await client.createOrder({
        identifiers: [{type: 'dns', value: hostname}],
    })
    console.log(`[ssl/http01] ✅ Order created: ${order.url}`)

    const authorizations = await client.getAuthorizations(order)
    const authz = authorizations[0]
    if (!authz) {
        throw new Error('No ACME authorization found for HTTP-01 order')
    }

    const challenge = authz.challenges.find(c => c.type === 'http-01')

    if (!challenge) {
        console.log(`[ssl/http01] ❌ HTTP-01 challenge not available from Let's Encrypt`)
        throw new Error(
            'HTTP-01 challenge not available for this domain. Try DNS-01 instead.',
        )
    }

    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge)
    console.log(`[ssl/http01] 🔑 Challenge token: ${challenge.token}`)
    console.log(`[ssl/http01] 📝 Challenge will be served at: http://${hostname}/.well-known/acme-challenge/${challenge.token}`)

    const [certKeyBuffer, csrBuffer] = await acme.crypto.createCsr({
        altNames: [hostname],
    })

    const cert = await db.domainCertificate.create({
        data: {
            domainId,
            status: 'PENDING_HTTP01',
            challengeType: 'HTTP01',
            privateKeyPem: encrypt(certKeyBuffer.toString()),
            csrPem: csrBuffer.toString(),
            acmeOrderUrl: order.url,
            challengeToken: challenge.token,
            challengeKeyAuth: keyAuthorization,
        },
    })
    console.log(`[ssl/http01] 💾 Certificate record saved to database (ID: ${cert.id})`)
    console.log(`[ssl/http01] ⏳ Waiting for Let's Encrypt to verify the challenge...`)

    void completeHttp01Challenge(cert.id, client, authz, challenge, csrBuffer)
        .catch(err => markFailed(cert.id, err))

    return cert.id
}

async function completeHttp01Challenge(
    certId: string,
    client: acme.Client,
    authz: acme.Authorization,
    challenge: any,
    csr: Buffer,
): Promise<void> {
    try {
        // Get certificate details for self-check
        const certRecord = await db.domainCertificate.findUnique({
            where: {id: certId},
            include: {domain: true},
        })

        if (!certRecord) {
            throw new Error('Certificate not found')
        }

        const hostname = certRecord.domain.domain
        const token = certRecord.challengeToken
        const expectedKeyAuth = certRecord.challengeKeyAuth

        if (!token || !expectedKeyAuth) {
            throw new Error('Challenge token or key authorization missing')
        }

        // Self-check: verify we can retrieve the challenge via HTTP before telling Let's Encrypt
        console.log(`[ssl/http01] 🔍 Self-checking challenge endpoint...`)
        const challengeUrl = `http://${hostname}/.well-known/acme-challenge/${token}`
        console.log(`[ssl/http01]    URL: ${challengeUrl}`)

        let selfCheckPassed = false
        const maxAttempts = 5
        let attempt = 0

        while (attempt < maxAttempts && !selfCheckPassed) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff: 1s, 2s, 4s, 5s, 5s

            if (attempt > 0) {
                console.log(`[ssl/http01] ⏳ Waiting ${backoffMs}ms before retry (attempt ${attempt + 1}/${maxAttempts})...`)
                await new Promise(resolve => setTimeout(resolve, backoffMs))
            }

            try {
                console.log(`[ssl/http01] 📡 Attempt ${attempt + 1}/${maxAttempts}: Fetching challenge endpoint...`)
                const response = await fetch(challengeUrl, {
                    headers: {'Host': hostname},
                    signal: AbortSignal.timeout(5000),
                })

                console.log(`[ssl/http01]    Response status: ${response.status}`)

                if (response.status === 200) {
                    const body = await response.text()
                    console.log(`[ssl/http01]    Response body length: ${body.length} bytes`)
                    console.log(`[ssl/http01]    Expected: ${expectedKeyAuth.substring(0, 20)}...`)
                    console.log(`[ssl/http01]    Received: ${body.substring(0, 20)}...`)

                    if (body === expectedKeyAuth) {
                        console.log(`[ssl/http01] ✅ Self-check PASSED - challenge is accessible and correct!`)
                        selfCheckPassed = true
                    } else {
                        console.log(`[ssl/http01] ❌ Self-check FAILED - key authorization mismatch`)
                        attempt++
                    }
                } else {
                    console.log(`[ssl/http01] ❌ Self-check FAILED - HTTP ${response.status}`)
                    attempt++
                }
            } catch (error) {
                console.error(`[ssl/http01] ❌ Self-check error:`, error instanceof Error ? error.message : error)
                attempt++
            }
        }

        if (!selfCheckPassed) {
            throw new Error(`Challenge self-check failed after ${maxAttempts} attempts - cannot verify challenge is accessible`)
        }

        console.log(`[ssl/http01] 🚀 Telling Let's Encrypt to verify the challenge...`)
        await client.completeChallenge(challenge)

        console.log(`[ssl/http01] ⏳ Waiting for Let's Encrypt to validate...`)
        await client.waitForValidStatus(challenge)
        console.log(`[ssl/http01] ✅ Challenge validated successfully!`)

        const updatedCert = await db.domainCertificate.findUnique({where: {id: certId}})
        if (!updatedCert?.acmeOrderUrl) {
            console.log(`[ssl/http01] ❌ Order URL missing from database`)
            throw new Error('Order URL missing from DB')
        }

        console.log(`[ssl/http01] 📋 Finalizing order with Certificate Signing Request...`)
        const currentOrder = await getOrderByUrl(client, updatedCert.acmeOrderUrl)

        if (currentOrder.status !== 'valid') {
            await client.finalizeOrder(currentOrder, csr)
        } else {
            console.log('[ssl/http01] ℹ️ Order already valid; skipping finalizeOrder')
        }

        const finalizedOrder = await getOrderByUrl(client, currentOrder.url)

        console.log(`[ssl/http01] 📜 Downloading certificate from Let's Encrypt...`)
        const certificate = await client.getCertificate(finalizedOrder)
        const info = acme.crypto.readCertificateInfo(certificate)

        // ACME getCertificate returns the full chain (leaf + intermediates)
        // Split to get just the leaf cert
        const certs = certificate.split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(Boolean)
        const leafCert = certs[0] || certificate
        const fullChain = certificate

        console.log(`[ssl/http01] ✅ Certificate issued successfully!`)
        console.log(`[ssl/http01]    Leaf cert: ${leafCert.length} bytes`)
        console.log(`[ssl/http01]    Full chain: ${fullChain.length} bytes`)
        console.log(`[ssl/http01]    Expires: ${info.notAfter.toISOString()}`)

        await db.domainCertificate.update({
            where: {id: certId},
            data: {
                status: 'ISSUED',
                certificatePem: leafCert,
                fullChainPem: fullChain,
                issuedAt: new Date(),
                expiresAt: info.notAfter,
                acmeOrderUrl: null,
                challengeToken: null,
                challengeKeyAuth: null,
            },
        })

        const domain = await db.customDomain.update({
            where: {id: updatedCert.domainId},
            data: {sslMode: 'LETS_ENCRYPT'},
        })

        console.log(`[ssl/http01] 📤 Notifying nginx-agent about new certificate...`)
        await notifyAgent({
            event: 'cert.issued',
            domain: domain.domain,
            certId: certId,
        })
        console.log(`[ssl/http01] 🎉 HTTP-01 certificate issuance complete!`)
    } catch (error) {
        console.error(`[ssl/http01] ❌ Certificate issuance failed:`, error)
        if (error instanceof Error) {
            console.error(`[ssl/http01]    Error: ${error.message}`)
            if (error.stack) {
                console.error(`[ssl/http01]    Stack: ${error.stack}`)
            }
        }
        throw error
    }
}

// ─── DNS-01 ───────────────────────────────────────────────────────────────────

export interface Dns01ChallengeInfo {
    certId: string
    txtName: string   // _acme-challenge.{hostname}
    txtValue: string  // base64url(SHA-256(keyAuth)) — the TXT record value
}

// Returns the TXT record the user must create.
// After they add it, call completeDns01Certificate(certId).
export async function initiateDns01Certificate(
    domainId: string,
    hostname: string,
): Promise<Dns01ChallengeInfo> {
    console.log(`[ssl/dns01] 🔵 Starting DNS-01 certificate issuance for ${hostname}`)

    await assertNotInternal(hostname)
    checkRateLimit(hostname)

    console.log(`[ssl/dns01] 📡 Requesting certificate order from Let's Encrypt...`)
    const client = await getAcmeClient()

    const {order, dnsTxtValue} = await createDns01Order(client, hostname)
    console.log(`[ssl/dns01] ✅ Order created: ${order.url}`)
    console.log(`[ssl/dns01] 📝 TXT record required:`)
    console.log(`[ssl/dns01]    Name: _acme-challenge.${hostname}`)
    console.log(`[ssl/dns01]    Value: ${dnsTxtValue}`)

    const [certKeyBuffer, csrBuffer] = await acme.crypto.createCsr({
        altNames: [hostname],
    })

    const cert = await db.domainCertificate.create({
        data: {
            domainId,
            status: 'PENDING_DNS01',
            challengeType: 'DNS01',
            privateKeyPem: encrypt(certKeyBuffer.toString()),
            csrPem: csrBuffer.toString(),
            acmeOrderUrl: order.url,
            dnsTxtValue,
        },
    })
    console.log(`[ssl/dns01] 💾 Certificate record saved to database (ID: ${cert.id})`)
    console.log(`[ssl/dns01] ⏸️  Waiting for user to add DNS TXT record...`)

    return {
        certId: cert.id,
        txtName: `_acme-challenge.${hostname}`,
        txtValue: dnsTxtValue,
    }
}

// Called after the user has added the DNS TXT record.
export async function completeDns01Certificate(certId: string): Promise<void> {
    try {
        console.log(`[ssl/dns01] 🔄 Attempting to complete DNS-01 verification for cert ${certId}`)

        const cert = await db.domainCertificate.findUnique({
            where: {id: certId},
            include: {domain: true},
        })

        if (!cert) {
            console.log(`[ssl/dns01] ❌ Certificate record not found in database`)
            throw new Error('Certificate record not found')
        }
        if (cert.status !== 'PENDING_DNS01') {
            console.log(`[ssl/dns01] ❌ Certificate in unexpected state: ${cert.status} (expected PENDING_DNS01)`)
            throw new Error(`Certificate is in unexpected state: ${cert.status}`)
        }
        if (!cert.acmeOrderUrl) {
            console.log(`[ssl/dns01] ❌ Missing ACME order URL`)
            throw new Error('Missing ACME order URL - certificate may need to be re-issued')
        }

        const client = await getAcmeClient()
        const hostname = cert.domain.domain

        console.log(`[ssl/dns01] 🔍 Restoring existing ACME order from: ${cert.acmeOrderUrl}`)

        let order
        try {
            order = await getOrderByUrl(client, cert.acmeOrderUrl)
            console.log(`[ssl/dns01] ✅ Order retrieved successfully, status: ${order.status}`)
        } catch (error) {
            console.error(`[ssl/dns01] ❌ Failed to retrieve ACME order:`, error)
            console.log(`[ssl/dns01]    Order URL: ${cert.acmeOrderUrl}`)

            if (!shouldReplaceOrderAfterLookupFailure(error)) {
                throw new Error('Unable to retrieve ACME order due to a transient upstream error. Please wait a moment and verify again.')
            }

            console.log(`[ssl/dns01]    Attempting to create a fresh DNS-01 order for seamless retry...`)

            const {
                order: replacementOrder,
                dnsTxtValue: replacementDnsTxtValue
            } = await createDns01Order(client, hostname)

            await db.domainCertificate.update({
                where: {id: certId},
                data: {
                    acmeOrderUrl: replacementOrder.url,
                    dnsTxtValue: replacementDnsTxtValue,
                    lastError: 'Previous ACME order expired or became invalid. Please update the TXT record to the new value and verify again.',
                },
            })

            throw new Error('ACME order expired or became invalid. A new order has been created with a new TXT value. Update your DNS TXT record from the latest instructions and verify again.')
        }

        if (isUnusableDnsOrder(order)) {
            console.log(`[ssl/dns01] ⚠️ Existing order is unusable (status=${order.status}); creating replacement order...`)
            const {
                order: replacementOrder,
                dnsTxtValue: replacementDnsTxtValue
            } = await createDns01Order(client, hostname)

            await db.domainCertificate.update({
                where: {id: certId},
                data: {
                    acmeOrderUrl: replacementOrder.url,
                    dnsTxtValue: replacementDnsTxtValue,
                    lastError: 'ACME order was no longer usable. Please update the TXT record to the new value and verify again.',
                },
            })

            throw new Error('ACME order is no longer usable. A new order has been created with a new TXT value. Update your DNS TXT record from the latest instructions and verify again.')
        }

        const authorizations = await client.getAuthorizations(order)
        const authz = authorizations[0]
        if (!authz) {
            throw new Error('No ACME authorization found while completing DNS-01 order')
        }

        const challenge = authz.challenges.find(c => c.type === 'dns-01')

        if (!challenge) {
            console.log(`[ssl/dns01] ❌ DNS-01 challenge not found in order`)
            throw new Error('DNS-01 challenge not found')
        }

        // Self-check: verify the DNS TXT record exists before telling Let's Encrypt to check
        console.log(`[ssl/dns01] 🔍 Self-check: verifying DNS TXT record is propagated...`)
        console.log(`[ssl/dns01]    Looking for: _acme-challenge.${hostname} = ${cert.dnsTxtValue}`)

        if (!cert.dnsTxtValue) {
            throw new Error('DNS TXT challenge value is missing from certificate record')
        }

        try {
            await verifyDnsTxtPropagation(hostname, cert.dnsTxtValue)
        } catch (dnsError) {
            const message = dnsError instanceof Error ? dnsError.message : String(dnsError)
            console.error(`[ssl/dns01] ❌ DNS self-check failed: ${message}`)
            throw new Error(message)
        }

        const challengeStatus = (challenge as { status?: string }).status
        if (challengeStatus === 'invalid') {
            console.log('[ssl/dns01] ❌ Existing DNS challenge is invalid; creating replacement order...')
            const {
                order: replacementOrder,
                dnsTxtValue: replacementDnsTxtValue
            } = await createDns01Order(client, hostname)

            await db.domainCertificate.update({
                where: {id: certId},
                data: {
                    acmeOrderUrl: replacementOrder.url,
                    dnsTxtValue: replacementDnsTxtValue,
                    lastError: 'ACME DNS challenge became invalid. Please update the TXT record to the new value and verify again.',
                },
            })

            throw new Error('ACME DNS challenge is invalid. A new order has been created with a new TXT value. Update your DNS TXT record from the latest instructions and verify again.')
        }

        if (challengeStatus === 'valid') {
            console.log('[ssl/dns01] ✅ DNS challenge already valid; skipping challenge completion step')
        } else {
            console.log(`[ssl/dns01] 🚀 Telling Let's Encrypt to verify DNS TXT record...`)
            await client.completeChallenge(challenge)

            console.log(`[ssl/dns01] ⏳ Waiting for Let's Encrypt to validate DNS record...`)
            try {
                await client.waitForValidStatus(challenge)
                console.log(`[ssl/dns01] ✅ DNS challenge validated successfully!`)
            } catch (validationError) {
                console.error(`[ssl/dns01] ❌ DNS validation failed:`, validationError)
                if (validationError instanceof Error) {
                    console.error(`[ssl/dns01]    Error message: ${validationError.message}`)
                    console.error(`[ssl/dns01]    Error name: ${validationError.name}`)
                }
                // Re-throw with more context about DNS validation
                throw new Error(`DNS validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`)
            }
        }

        const csr = Buffer.from(cert.csrPem)
        console.log(`[ssl/dns01] 📋 Finalizing order with Certificate Signing Request...`)
        if (order.status !== 'valid') {
            await client.finalizeOrder(order, csr)
        } else {
            console.log('[ssl/dns01] ℹ️ Order already valid; skipping finalizeOrder')
        }

        const finalizedOrder = await getOrderByUrl(client, order.url)

        console.log(`[ssl/dns01] 📜 Downloading certificate from Let's Encrypt...`)
        const certificate = await client.getCertificate(finalizedOrder)
        const info = acme.crypto.readCertificateInfo(certificate)

        // ACME getCertificate returns the full chain (leaf + intermediates)
        // Split to get just the leaf cert
        const certs = certificate.split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(Boolean)
        const leafCert = certs[0] || certificate
        const fullChain = certificate

        console.log(`[ssl/dns01] ✅ Certificate issued successfully!`)
        console.log(`[ssl/dns01]    Leaf cert: ${leafCert.length} bytes`)
        console.log(`[ssl/dns01]    Full chain: ${fullChain.length} bytes`)
        console.log(`[ssl/dns01]    Expires: ${info.notAfter.toISOString()}`)

        await db.domainCertificate.update({
            where: {id: certId},
            data: {
                status: 'ISSUED',
                certificatePem: leafCert,
                fullChainPem: fullChain,
                issuedAt: new Date(),
                expiresAt: info.notAfter,
                acmeOrderUrl: null,
                dnsTxtValue: null,
            },
        })

        const domain = await db.customDomain.update({
            where: {id: cert.domainId},
            data: {sslMode: 'LETS_ENCRYPT'},
        })

        console.log(`[ssl/dns01] 📤 Notifying nginx-agent about new certificate...`)
        await notifyAgent({
            event: 'cert.issued',
            domain: domain.domain,
            certId: certId,
        })
        console.log(`[ssl/dns01] 🎉 DNS-01 certificate issuance complete!`)
    } catch (error) {
        console.error(`[ssl/dns01] ❌ Certificate issuance failed:`, error)
        if (error instanceof Error) {
            console.error(`[ssl/dns01]    Error: ${error.message}`)
            if (error.stack) {
                console.error(`[ssl/dns01]    Stack: ${error.stack}`)
            }
        }
        throw error
    }
}

// ─── Cert bundle retrieval ────────────────────────────────────────────────────

export interface CertBundle {
    privateKey: string  // decrypted PEM
    certificate: string  // PEM
    fullChain: string  // PEM
    expiresAt: Date
}

export async function getActiveCertBundle(
    hostname: string,
): Promise<CertBundle | null> {
    const domain = await db.customDomain.findUnique({
        where: {domain: hostname},
    })

    if (!domain || domain.sslMode !== 'LETS_ENCRYPT') return null

    const cert = await db.domainCertificate.findFirst({
        where: {
            domainId: domain.id,
            status: 'ISSUED',
            certificatePem: {not: null},
        },
        orderBy: {issuedAt: 'desc'},
    })

    if (!cert?.certificatePem || !cert.fullChainPem || !cert.expiresAt) {
        return null
    }

    return {
        privateKey: decrypt(cert.privateKeyPem),
        certificate: cert.certificatePem,
        fullChain: cert.fullChainPem,
        expiresAt: cert.expiresAt,
    }
}

// ─── Renewal ──────────────────────────────────────────────────────────────────

export async function renewCertificate(cert: DomainCertificate & {
    domain: { domain: string; id: string }
}): Promise<void> {
    const hostname = cert.domain.domain

    if (cert.challengeType === 'HTTP01') {
        const newCertId = await initiateHttp01Certificate(cert.domainId, hostname)

        // Note: notifyAgent will be called when the new certificate is issued
        // in the completeHttp01Challenge function
    } else {
        // DNS-01 can't renew automatically — notify the user instead
        // TODO: send notification email to domain owner
        await db.domainCertificate.update({
            where: {id: cert.id},
            data: {
                lastError: 'DNS-01 certificate requires manual renewal via domain settings.',
            },
        })
    }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function markFailed(certId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)
    await db.domainCertificate.update({
        where: {id: certId},
        data: {
            status: 'FAILED',
            lastError: message,
            renewalAttempts: {increment: 1},
        },
    }).catch(() => {
    })
}