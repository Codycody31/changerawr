// Encryption key from environment - should be 32 bytes for AES-256
import crypto from "crypto";

const ENCRYPTION_KEY_HEX = process.env.GITHUB_ENCRYPTION_KEY || 'default-32-byte-key-change-this!!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

// Convert hex key to buffer, or create buffer from string if not hex
function getKeyBuffer(): Buffer {
    try {
        // If it's a hex string (64 characters), convert from hex
        if (ENCRYPTION_KEY_HEX.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY_HEX)) {
            return Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
        }
        // Otherwise, treat as string and pad/truncate to 32 bytes
        const keyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'utf8');
        if (keyBuffer.length === 32) {
            return keyBuffer;
        }
        // Pad or truncate to 32 bytes
        const paddedKey = Buffer.alloc(32);
        keyBuffer.copy(paddedKey, 0, 0, Math.min(keyBuffer.length, 32));
        return paddedKey;
    } catch {
        // Fallback: create a 32-byte buffer from the string
        const keyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'utf8');
        const paddedKey = Buffer.alloc(32);
        keyBuffer.copy(paddedKey, 0, 0, Math.min(keyBuffer.length, 32));
        return paddedKey;
    }
}

// Simple encryption for access tokens
function encryptToken(token: string): string {
    if (!token || token.trim() === '') {
        return '';
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getKeyBuffer();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Token encryption failed:', error);
        throw new Error('Failed to encrypt access token');
    }
}

function decryptToken(encryptedToken: string): string {
    if (!encryptedToken || encryptedToken.trim() === '') {
        return '';
    }

    try {
        const textParts = encryptedToken.split(':');
        if (textParts.length !== 2) {
            throw new Error('Invalid encrypted token format');
        }

        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = textParts[1];
        const key = getKeyBuffer();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Token decryption failed:', error);
        throw new Error('Failed to decrypt access token');
    }
}

export { encryptToken, decryptToken };