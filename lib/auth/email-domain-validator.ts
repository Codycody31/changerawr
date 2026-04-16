/**
 * Email domain validation for SSO/SAML providers
 */

export interface DomainRestrictionConfig {
    allowedEmailDomains: string[];
    blockExistingUsers: boolean;
}

export interface DomainValidationResult {
    allowed: boolean;
    isNewUser: boolean;
    reason?: string;
}

/**
 * Extracts the domain from an email address (case-insensitive)
 * @param email - The email address
 * @returns The domain in lowercase, or null if invalid
 */
export function extractEmailDomain(email: string): string | null {
    const match = email.match(/@(.+)$/);
    if (!match) return null;
    return match[1].toLowerCase();
}

/**
 * Checks if an email domain is allowed based on provider configuration
 * @param email - The user's email address
 * @param config - The domain restriction configuration
 * @param userExists - Whether the user already exists in the database
 * @returns Validation result with allowed status and reason
 */
export function validateEmailDomain(
    email: string,
    config: DomainRestrictionConfig,
    userExists: boolean
): DomainValidationResult {
    // If no domain restrictions, allow all
    if (!config.allowedEmailDomains || config.allowedEmailDomains.length === 0) {
        return {
            allowed: true,
            isNewUser: !userExists,
        };
    }

    const domain = extractEmailDomain(email);
    if (!domain) {
        return {
            allowed: false,
            isNewUser: !userExists,
            reason: 'Invalid email format',
        };
    }

    // Check if domain is in allowed list (case-insensitive)
    const normalizedAllowedDomains = config.allowedEmailDomains.map(d => d.toLowerCase());
    const isDomainAllowed = normalizedAllowedDomains.includes(domain);

    if (!isDomainAllowed) {
        return {
            allowed: false,
            isNewUser: !userExists,
            reason: `Email domain '@${domain}' is not allowed for this SSO provider. Allowed domains: ${config.allowedEmailDomains.join(', ')}`,
        };
    }

    // Domain is allowed, now check if we should block existing users
    if (userExists && config.blockExistingUsers) {
        return {
            allowed: false,
            isNewUser: false,
            reason: `This SSO provider is configured to only allow new user registration. The email '${email}' is already registered.`,
        };
    }

    // All checks passed
    return {
        allowed: true,
        isNewUser: !userExists,
    };
}
