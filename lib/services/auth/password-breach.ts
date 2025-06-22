import crypto from 'crypto';

interface PasswordBreachResult {
    isBreached: boolean;
    breachCount: number;
}

/**
 * Check if a password has been compromised in known data breaches
 * Uses HaveIBeenPwned's Pwned Passwords API v3 (k-anonymity model)
 * @param password The password to check
 * @returns Promise with breach status and count
 */
export async function checkPasswordBreach(password: string): Promise<PasswordBreachResult> {
    try {
        // Hash the password with SHA-1
        const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

        // Take the first 5 characters for k-anonymity
        const hashPrefix = sha1Hash.substring(0, 5);
        const hashSuffix = sha1Hash.substring(5);

        // Query HaveIBeenPwned API
        const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Changerawr-App',
            },
        });

        if (!response.ok) {
            // If their API is down, don't block login but log the error
            console.error('Failed to check password breach:', response.status);
            return {isBreached: false, breachCount: 0};
        }

        const responseText = await response.text();

        // Parse response to find our hash suffix
        const lines = responseText.split('\n');
        for (const line of lines) {
            const [suffix, count] = line.trim().split(':');
            if (suffix === hashSuffix) {
                return {
                    isBreached: true,
                    breachCount: parseInt(count, 10)
                };
            }
        }

        // Hash was not found in breaches
        return {isBreached: false, breachCount: 0};

    } catch (error) {
        // If anything fails, don't block login but log the error
        console.error('Error checking password breach:', error);
        return {isBreached: false, breachCount: 0};
    }
}