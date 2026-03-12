/**
 * Claim validation for SSO/SAML providers
 * Allows dynamic validation of user claims/attributes from OAuth/SAML responses
 */

export interface ClaimRule {
    claimName: string;
    requiredValue: string;
    caseSensitive?: boolean;
}

export interface ClaimValidationResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Validates user claims against required claim rules
 * @param userClaims - Claims from OAuth userInfo or SAML assertion
 * @param requiredClaims - JSON object containing claim rules (e.g., { "organizations": "my-org", "role": "admin" })
 * @returns Validation result with allowed status and reason
 */
export function validateClaims(
    userClaims: Record<string, any>,
    requiredClaims: Record<string, string> | null | undefined
): ClaimValidationResult {
    // If no required claims, allow all
    if (!requiredClaims || Object.keys(requiredClaims).length === 0) {
        return {
            allowed: true,
        };
    }

    // Check each required claim
    for (const [claimName, requiredValue] of Object.entries(requiredClaims)) {
        if (!requiredValue) continue; // Skip empty values

        const userClaimValue = userClaims[claimName];

        // Claim is missing
        if (userClaimValue === undefined || userClaimValue === null) {
            return {
                allowed: false,
                reason: `Missing required claim '${claimName}'. This SSO provider requires specific attributes that were not provided by your identity provider.`,
            };
        }

        // Handle array claims (e.g., groups, organizations)
        if (Array.isArray(userClaimValue)) {
            const hasMatch = userClaimValue.some(val =>
                String(val).toLowerCase() === String(requiredValue).toLowerCase()
            );

            if (!hasMatch) {
                return {
                    allowed: false,
                    reason: `Claim '${claimName}' must contain '${requiredValue}', but got [${userClaimValue.join(', ')}]. Please contact your administrator if you believe you should have access.`,
                };
            }
        } else {
            // Handle string/number claims (case-insensitive comparison)
            const userValueStr = String(userClaimValue).toLowerCase();
            const requiredValueStr = String(requiredValue).toLowerCase();

            if (userValueStr !== requiredValueStr) {
                return {
                    allowed: false,
                    reason: `Claim '${claimName}' must be '${requiredValue}', but got '${userClaimValue}'. Please contact your administrator if you believe you should have access.`,
                };
            }
        }
    }

    // All claims validated successfully
    return {
        allowed: true,
    };
}

/**
 * Helper to safely parse required claims from JSON
 */
export function parseRequiredClaims(requiredClaimsJson: any): Record<string, string> | null {
    if (!requiredClaimsJson) return null;

    try {
        if (typeof requiredClaimsJson === 'string') {
            const parsed = JSON.parse(requiredClaimsJson);
            return typeof parsed === 'object' ? parsed : null;
        }

        if (typeof requiredClaimsJson === 'object') {
            return requiredClaimsJson;
        }

        return null;
    } catch (error) {
        console.error('Failed to parse required claims:', error);
        return null;
    }
}
