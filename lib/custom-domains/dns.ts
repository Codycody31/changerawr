import dns from 'dns/promises'
import type { DNSVerificationResult } from '@/lib/types/custom-domains'
import { DOMAIN_CONSTANTS } from '@/lib/custom-domains/constants'

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
        // Verify CNAME record
        await verifyCNAME(domain, expectedCnameTarget, result)

        // Verify TXT record for domain ownership
        await verifyTXTRecord(domain, verificationToken, result)

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
    result: DNSVerificationResult
): Promise<void> {
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

export async function checkDomainResolution(domain: string): Promise<boolean> {
    try {
        await dns.lookup(domain)
        return true
    } catch {
        return false
    }
}