import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { testConnection } from '@/lib/services/languagetool/service';
import { encryptToken, decryptToken } from '@/lib/utils/encryption';

export async function GET() {
  try {
    const user = await validateAuthAndGetUser();

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = await db.systemConfig.findUnique({
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

    // Decrypt API key for display (if exists)
    let apiKeyToReturn: string | null = null;
    if (config?.languageToolApiKey) {
      try {
        apiKeyToReturn = decryptToken(config.languageToolApiKey);
      } catch (error) {
        console.error('[LanguageTool Settings] Failed to decrypt API key:', error);
        // Return null if decryption fails
        apiKeyToReturn = null;
      }
    }

    return NextResponse.json(config ? {
      languageToolEnabled: config.languageToolEnabled,
      languageToolApiUrl: config.languageToolApiUrl || 'https://api.languagetool.org/v2',
      languageToolApiKey: apiKeyToReturn || '',
      languageToolUsername: config.languageToolUsername || '',
      languageToolLanguage: config.languageToolLanguage || 'en-US',
      languageToolAllowUserOverride: config.languageToolAllowUserOverride ?? true,
    } : {
      languageToolEnabled: false,
      languageToolApiUrl: 'https://api.languagetool.org/v2',
      languageToolApiKey: '',
      languageToolUsername: '',
      languageToolLanguage: 'en-US',
      languageToolAllowUserOverride: true,
    });
  } catch (error) {
    console.error('[LanguageTool Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      languageToolEnabled,
      languageToolApiUrl,
      languageToolApiKey,
      languageToolUsername,
      languageToolLanguage,
      languageToolAllowUserOverride
    } = body;

    // Encrypt API key before saving (if provided and not empty)
    let encryptedApiKey: string | null = null;
    if (languageToolApiKey && languageToolApiKey.trim() !== '') {
      try {
        encryptedApiKey = encryptToken(languageToolApiKey);
      } catch (error) {
        console.error('[LanguageTool Settings] Failed to encrypt API key:', error);
        return NextResponse.json(
          { error: 'Failed to encrypt API key' },
          { status: 500 }
        );
      }
    }

    const updated = await db.systemConfig.upsert({
      where: { id: 1 },
      update: {
        languageToolEnabled,
        languageToolApiUrl,
        languageToolApiKey: encryptedApiKey,
        languageToolUsername: languageToolUsername || null,
        languageToolLanguage,
        languageToolAllowUserOverride: languageToolAllowUserOverride ?? true,
      },
      create: {
        id: 1,
        languageToolEnabled,
        languageToolApiUrl,
        languageToolApiKey: encryptedApiKey,
        languageToolUsername: languageToolUsername || null,
        languageToolLanguage,
        languageToolAllowUserOverride: languageToolAllowUserOverride ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        languageToolEnabled: updated.languageToolEnabled,
        languageToolApiUrl: updated.languageToolApiUrl,
        languageToolApiKey: updated.languageToolApiKey,
        languageToolLanguage: updated.languageToolLanguage,
      },
    });
  } catch (error) {
    console.error('[LanguageTool Settings] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await validateAuthAndGetUser();

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await testConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[LanguageTool Test] POST error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
