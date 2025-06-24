import {BLOCKED_DOMAINS, DOMAIN_ERRORS} from '@/lib/custom-domains/constants'
import {getAppDomain, isDevelopment} from '@/lib/custom-domains/utils'

export interface ValidationResult {
    valid: boolean
    error?: string
}

export function validateDomain(domain: string): ValidationResult {
    const cleanDomain = domain.toLowerCase().trim()

    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/

    if (!domainRegex.test(cleanDomain)) {
        return {valid: false, error: DOMAIN_ERRORS.INVALID_FORMAT}
    }

    // Check against blocked domains
    if (BLOCKED_DOMAINS.includes(cleanDomain as typeof BLOCKED_DOMAINS[number])) {
        return {valid: false, error: DOMAIN_ERRORS.BLOCKED_DOMAIN}
    }

    // Prevent using our app domain
    try {
        const appDomain = getAppDomain()
        if (cleanDomain === appDomain || cleanDomain.endsWith(`.${appDomain}`)) {
            return {valid: false, error: DOMAIN_ERRORS.APP_DOMAIN_CONFLICT}
        }
    } catch (error) {
        // If we can't get app domain, skip this check
        console.warn('Could not validate against app domain:', error)
    }

    // Additional checks for development/localhost patterns (unless we're in development)
    if (!isDevelopment() && (cleanDomain.includes('localhost') || cleanDomain.includes('127.0.0.1'))) {
        return {valid: false, error: DOMAIN_ERRORS.BLOCKED_DOMAIN}
    }

    return {valid: true}
}

export function validateProjectId(projectId: string): boolean {
    // Assuming CUID format: starts with 'c' followed by 24 alphanumeric characters (not entirely sure)
    const cuidRegex = /^c[a-z0-9]{24}$/
    return cuidRegex.test(projectId)
}

export function generateVerificationToken(): string {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `changerawr-domain-verification-${randomPart}-${timestamp}`
}