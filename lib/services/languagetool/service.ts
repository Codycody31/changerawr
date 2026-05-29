import { db } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/utils/encryption';

export interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface LanguageToolResponse {
  matches: LanguageToolMatch[];
  language: {
    name: string;
    code: string;
  };
}

export interface LanguageToolConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey?: string | null;
  username?: string | null;
  language: string;
  level?: string | null;
  motherTongue?: string | null;
}

export interface UserLanguageToolSettings {
  languageToolLanguage?: string | null;
  languageToolLevel?: string | null;
  languageToolMotherTongue?: string | null;
  languageToolApiUrl?: string | null;
  languageToolUsername?: string | null;
  languageToolApiKey?: string | null;
}

/**
 * Get LanguageTool configuration from system config
 * Optionally merge with user settings
 */
export async function getLanguageToolConfig(
  userSettings?: UserLanguageToolSettings | null
): Promise<LanguageToolConfig | null> {
  const systemConfig = await db.systemConfig.findUnique({
    where: { id: 1 },
    select: {
      languageToolEnabled: true,
      languageToolApiUrl: true,
      languageToolApiKey: true,
      languageToolUsername: true,
      languageToolLanguage: true,
      languageToolAllowUserOverride: true,
    },
  });

  if (!systemConfig || !systemConfig.languageToolEnabled) {
    return null;
  }

  // Decrypt system API key if it exists
  let decryptedSystemApiKey: string | null = null;
  if (systemConfig.languageToolApiKey) {
    try {
      decryptedSystemApiKey = decryptToken(systemConfig.languageToolApiKey);
    } catch (error) {
      console.error('[LanguageTool] Failed to decrypt system API key:', error);
      // If decryption fails, assume it's already decrypted (for backwards compatibility)
      decryptedSystemApiKey = systemConfig.languageToolApiKey;
    }
  }

  // Decrypt user API key if it exists and overrides are allowed
  let decryptedUserApiKey: string | null = null;
  if (
    systemConfig.languageToolAllowUserOverride &&
    userSettings?.languageToolApiKey
  ) {
    try {
      decryptedUserApiKey = decryptToken(userSettings.languageToolApiKey);
    } catch (error) {
      console.error('[LanguageTool] Failed to decrypt user API key:', error);
      decryptedUserApiKey = userSettings.languageToolApiKey;
    }
  }

  // Determine final values, prioritizing user settings if allowed
  const allowOverride = systemConfig.languageToolAllowUserOverride;
  const apiUrl =
    allowOverride && userSettings?.languageToolApiUrl
      ? userSettings.languageToolApiUrl
      : systemConfig.languageToolApiUrl || 'https://api.languagetool.org/v2';

  const apiKey =
    allowOverride && decryptedUserApiKey
      ? decryptedUserApiKey
      : decryptedSystemApiKey;

  const username =
    allowOverride && userSettings?.languageToolUsername
      ? userSettings.languageToolUsername
      : systemConfig.languageToolUsername;

  const language =
    userSettings?.languageToolLanguage ||
    systemConfig.languageToolLanguage ||
    'en-US';

  return {
    enabled: systemConfig.languageToolEnabled,
    apiUrl,
    apiKey,
    username,
    language,
    level: userSettings?.languageToolLevel || 'default',
    motherTongue: userSettings?.languageToolMotherTongue,
  };
}

/**
 * Check text for spelling and grammar errors using LanguageTool API
 */
export async function checkText(
  text: string,
  language?: string,
  userSettings?: UserLanguageToolSettings | null
): Promise<LanguageToolResponse> {
  const config = await getLanguageToolConfig(userSettings);

  if (!config) {
    throw new Error('LanguageTool is not enabled');
  }

  const url = new URL(`${config.apiUrl}/check`);

  const formData = new URLSearchParams();
  formData.append('text', text);
  formData.append('language', language || config.language);

  // Add API key if configured
  if (config.apiKey) {
    formData.append('apiKey', config.apiKey);
  }

  // Add username for premium if configured
  if (config.username) {
    formData.append('username', config.username);
  }

  // Add level (default or picky)
  if (config.level && config.level !== 'default') {
    formData.append('level', config.level);
  }

  // Add mother tongue for better suggestions
  if (config.motherTongue) {
    formData.append('motherTongue', config.motherTongue);
  }

  // Add additional parameters for better checking
  formData.append('enabledOnly', 'false');

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LanguageTool API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data as LanguageToolResponse;
  } catch (error) {
    console.error('[LanguageTool] API request failed:', error);
    throw error;
  }
}

/**
 * Test the LanguageTool connection with current config
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  languageDetected?: string;
}> {
  try {
    const config = await getLanguageToolConfig();

    if (!config) {
      return {
        success: false,
        message: 'LanguageTool is not enabled in system configuration',
      };
    }

    // Test with a simple sentence
    const testText = 'This is a test sentence to verify the LanguageTool API connection.';
    const result = await checkText(testText);

    return {
      success: true,
      message: 'Successfully connected to LanguageTool API',
      languageDetected: result.language.name,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to connect: ${errorMessage}`,
    };
  }
}

/**
 * Get available languages from LanguageTool
 */
export async function getAvailableLanguages(): Promise<Array<{ name: string; code: string; longCode: string }>> {
  const config = await getLanguageToolConfig();

  if (!config) {
    throw new Error('LanguageTool is not enabled');
  }

  const url = new URL(`${config.apiUrl}/languages`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    const data = await response.json();
    return data as Array<{ name: string; code: string; longCode: string }>;
  } catch (error) {
    console.error('[LanguageTool] Failed to fetch languages:', error);
    throw error;
  }
}
