/**
 * Extension Settings Encryption
 *
 * Encrypts sensitive extension settings (API keys, tokens) before storing in database
 * Uses AES-256-GCM encryption with a per-installation encryption key
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get or generate the encryption key
 * Stored in environment variable EXTENSION_SETTINGS_KEY
 * If not set, generates a new one (should be set in production)
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.EXTENSION_SETTINGS_KEY;

  if (keyEnv) {
    return Buffer.from(keyEnv, 'hex');
  }

  // In development, generate a temporary key (won't persist across restarts)
  console.warn('[Settings Encryption] No EXTENSION_SETTINGS_KEY set, using temporary key');
  const tempKey = crypto.randomBytes(32);
  process.env.EXTENSION_SETTINGS_KEY = tempKey.toString('hex');
  return tempKey;
}

/**
 * Encrypt a sensitive value
 *
 * @param value - Plain text value to encrypt
 * @returns Encrypted value with format: salt:iv:authTag:encryptedData (all hex encoded)
 */
export function encryptSetting(value: string): string {
  try {
    // Generate a random salt for key derivation
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive a key using PBKDF2
    const masterKey = getEncryptionKey();
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

    // Generate a random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the value
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine salt:iv:authTag:encryptedData
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Settings Encryption] Encryption failed:', error);
    throw new Error('Failed to encrypt setting');
  }
}

/**
 * Decrypt a sensitive value
 *
 * @param encryptedValue - Encrypted value with format: salt:iv:authTag:encryptedData
 * @returns Decrypted plain text value
 */
export function decryptSetting(encryptedValue: string): string {
  try {
    // Split the encrypted value
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted value format');
    }

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    // Derive the key using the same salt
    const masterKey = getEncryptionKey();
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the value
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Settings Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt setting');
  }
}

/**
 * Check if a value is encrypted
 *
 * @param value - Value to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  // Check if it matches our encryption format: salt:iv:authTag:encryptedData
  const parts = value.split(':');
  if (parts.length !== 4) return false;

  // Check if all parts are valid hex strings
  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every(part => hexPattern.test(part));
}

/**
 * Encrypt sensitive fields in extension settings
 *
 * @param settings - Extension settings object
 * @param sensitiveFields - Array of field names to encrypt (e.g., ['apiKey', 'accessToken'])
 * @returns Settings object with encrypted sensitive fields
 */
export function encryptSettings(
  settings: Record<string, any>,
  sensitiveFields: string[]
): Record<string, any> {
  const encrypted = { ...settings };

  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      // Only encrypt if not already encrypted
      if (!isEncrypted(encrypted[field])) {
        encrypted[field] = encryptSetting(encrypted[field]);
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in extension settings
 *
 * @param settings - Extension settings object with encrypted fields
 * @param sensitiveFields - Array of field names to decrypt (e.g., ['apiKey', 'accessToken'])
 * @returns Settings object with decrypted sensitive fields
 */
export function decryptSettings(
  settings: Record<string, any>,
  sensitiveFields: string[]
): Record<string, any> {
  const decrypted = { ...settings };

  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      // Only decrypt if it's encrypted
      if (isEncrypted(decrypted[field])) {
        try {
          decrypted[field] = decryptSetting(decrypted[field]);
        } catch (error) {
          console.error(`[Settings Encryption] Failed to decrypt field: ${field}`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
  }

  return decrypted;
}

/**
 * Generate a new encryption key (for initial setup)
 *
 * @returns Hex-encoded encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
