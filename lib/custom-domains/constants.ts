export const DOMAIN_CONSTANTS = {
    VERIFICATION_SUBDOMAIN: '_chrverify',
    VERIFICATION_PREFIX: 'changerawr-domain-verification',
    MAX_DOMAINS_PER_PROJECT: 5,
    DNS_PROPAGATION_TIMEOUT: 48 * 60 * 60 * 1000, // 48 hours in ms
} as const

export const BLOCKED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'example.com',
    'test.com',
    'invalid.com',
] as const

export const DOMAIN_ERRORS = {
    INVALID_FORMAT: 'Invalid domain format',
    ALREADY_EXISTS: 'Domain is already configured',
    PROJECT_NOT_FOUND: 'Project not found',
    DOMAIN_NOT_FOUND: 'Domain configuration not found',
    MAX_DOMAINS_EXCEEDED: 'Maximum domains per project exceeded',
    BLOCKED_DOMAIN: 'This domain cannot be used',
    APP_DOMAIN_CONFLICT: 'Cannot use the application domain',
    DNS_VERIFICATION_FAILED: 'DNS verification failed',
    UNAUTHORIZED: 'Unauthorized to manage this domain',
} as const