import dns from 'dns/promises'
import type {DNSVerificationResult} from '@/lib/types/custom-domains'
import {DOMAIN_CONSTANTS} from './constants'

export async function verifyDNSRecords(
    domain: string,
    expectedCnameTarget: string,
    verificationToken: string
): Promise<DNSVerificationResult> {
    const result: DNSVerificationResult = {
        cnameValid: false,
        txtValid: false,
        errors: []
    }

    try {
        // First, try standard DNS verification
        await verifyCNAME(domain, expectedCnameTarget, result)
        await verifyTXTRecord(domain, verificationToken, result, false) // set to true if testing UI locally,
        // we aren't able to get TXT records.

        // If CNAME verification failed, try HTTP fallback
        if (!result.cnameValid) {
            console.log(`CNAME verification failed for ${domain}, attempting HTTP fallback...`)
            const httpVerification = await verifyDomainViaHTTP(domain, verificationToken)

            if (httpVerification.success) {
                result.cnameValid = true
                // Remove CNAME-related errors since HTTP verification succeeded
                result.errors = result.errors?.filter(error => !error.includes('CNAME')) || []
                console.log(`HTTP fallback verification successful for ${domain}`)
            } else {
                result.errors?.push('HTTP fallback verification failed - domain may not be pointing to our servers')
            }
        }

    } catch (error) {
        result.errors?.push(`DNS verification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
}

async function verifyCNAME(
    domain: string,
    expectedTarget: string,
    result: DNSVerificationResult
): Promise<void> {
    try {
        const cnameRecords = await dns.resolveCname(domain)
        result.cnameTarget = cnameRecords[0]

        result.cnameValid = cnameRecords.some(record =>
            record === expectedTarget || record.endsWith(expectedTarget)
        )

        if (!result.cnameValid) {
            result.errors?.push(
                `CNAME record should point to ${expectedTarget}, found ${cnameRecords.join(', ')}`
            )
        }
    } catch (error) {
        result.errors?.push(
            `CNAME verification failed: ${error instanceof Error ? error.message : 'No CNAME record found'}`
        )
    }
}

async function verifyTXTRecord(
    domain: string,
    verificationToken: string,
    result: DNSVerificationResult,
    debug = false
): Promise<void> {
    if (debug) {
        result.txtRecord = `${DOMAIN_CONSTANTS.VERIFICATION_PREFIX}=${verificationToken}`
        result.txtValid = true
        return
    }

    try {
        const verificationDomain = `${DOMAIN_CONSTANTS.VERIFICATION_SUBDOMAIN}.${domain}`
        const txtRecords = await dns.resolveTxt(verificationDomain)
        const flatRecords = txtRecords.flat()

        result.txtRecord = flatRecords.find(record =>
            record.includes(DOMAIN_CONSTANTS.VERIFICATION_PREFIX)
        )

        result.txtValid = flatRecords.some(record => record.includes(verificationToken))

        if (!result.txtValid) {
            result.errors?.push(
                `TXT record ${verificationDomain} should contain ${verificationToken}`
            )
        }
    } catch (error) {
        result.errors?.push(
            `TXT verification failed: ${error instanceof Error ? error.message : 'No TXT record found'}`
        )
    }
}


async function verifyDomainViaHTTP(
    domain: string,
    verificationToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Make HTTP request to the domain's verification endpoint
        const verificationUrl = `https://${domain}/api/changelog/verify-domain?domain=${encodeURIComponent(domain)}&token=${encodeURIComponent(verificationToken)}`

        console.log(`Attempting HTTP verification: ${verificationUrl}`)

        const response = await fetch(verificationUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'ChangeRawr-Domain-Verification/1.0',
            },
            // Set a reasonable timeout
            signal: AbortSignal.timeout(10000) // 10 seconds
        })

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP verification failed: ${response.status} ${response.statusText}`
            }
        }

        const data = await response.json()

        if (data.success && data.verified) {
            return {success: true}
        } else {
            return {
                success: false,
                error: data.error || 'HTTP verification endpoint returned unsuccessful response'
            }
        }

    } catch (error) {
        return {
            success: false,
            error: `HTTP verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    }
}

export async function checkDomainResolution(domain: string): Promise<boolean> {
    try {
        await dns.lookup(domain)
        return true
    } catch {
        return false
    }
}