import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/utils/encryption';

/**
 * GET /api/user/settings/languagetool
 * Get user's LanguageTool preferences
 */
export async function GET() {
  try {
    const user = await validateAuthAndGetUser();

    const settings = await db.settings.findUnique({
      where: { userId: user.id },
      select: {
        languageToolLanguage: true,
        languageToolLevel: true,
        languageToolMotherTongue: true,
        languageToolApiUrl: true,
        languageToolUsername: true,
        languageToolApiKey: true,
      },
    });

    // Decrypt API key for display (if exists)
    let apiKeyToReturn: string | null = null;
    if (settings?.languageToolApiKey) {
      try {
        apiKeyToReturn = decryptToken(settings.languageToolApiKey);
      } catch (error) {
        console.error('[User LanguageTool Settings] Failed to decrypt API key:', error);
        apiKeyToReturn = null;
      }
    }

    return NextResponse.json({
      languageToolLanguage: settings?.languageToolLanguage || null,
      languageToolLevel: settings?.languageToolLevel || 'default',
      languageToolMotherTongue: settings?.languageToolMotherTongue || null,
      languageToolApiUrl: settings?.languageToolApiUrl || '',
      languageToolUsername: settings?.languageToolUsername || '',
      languageToolApiKey: apiKeyToReturn || '',
    });
  } catch (error) {
    console.error('[User LanguageTool Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/settings/languagetool
 * Update user's LanguageTool preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();

    const body = await request.json();
    const {
      languageToolLanguage,
      languageToolLevel,
      languageToolMotherTongue,
      languageToolApiUrl,
      languageToolUsername,
      languageToolApiKey,
    } = body;

    // Check if user overrides are allowed
    const systemConfig = await db.systemConfig.findUnique({
      where: { id: 1 },
      select: { languageToolAllowUserOverride: true },
    });

    // Encrypt API key before saving (if provided and not empty)
    let encryptedApiKey: string | null = null;
    if (
      systemConfig?.languageToolAllowUserOverride &&
      languageToolApiKey &&
      languageToolApiKey.trim() !== ''
    ) {
      try {
        encryptedApiKey = encryptToken(languageToolApiKey);
      } catch (error) {
        console.error('[User LanguageTool Settings] Failed to encrypt API key:', error);
        return NextResponse.json(
          { error: 'Failed to encrypt API key' },
          { status: 500 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      languageToolLanguage: languageToolLanguage || null,
      languageToolLevel: languageToolLevel || 'default',
      languageToolMotherTongue: languageToolMotherTongue || null,
    };

    // Only allow API override fields if admin permits
    if (systemConfig?.languageToolAllowUserOverride) {
      updateData.languageToolApiUrl = languageToolApiUrl || null;
      updateData.languageToolUsername = languageToolUsername || null;
      updateData.languageToolApiKey = encryptedApiKey;
    }

    const settings = await db.settings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        languageToolLanguage: settings.languageToolLanguage,
        languageToolLevel: settings.languageToolLevel,
        languageToolMotherTongue: settings.languageToolMotherTongue,
        languageToolApiUrl: settings.languageToolApiUrl,
        languageToolUsername: settings.languageToolUsername,
      },
    });
  } catch (error) {
    console.error('[User LanguageTool Settings] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
