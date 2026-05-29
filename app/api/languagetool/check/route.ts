import { NextRequest, NextResponse } from 'next/server';
import { checkText, getLanguageToolConfig } from '@/lib/services/languagetool/service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Verify user is authenticated
    await validateAuthAndGetUser();

    // Check if LanguageTool is enabled
    const config = await getLanguageToolConfig();

    return NextResponse.json({
      enabled: config !== null,
    });
  } catch (error) {
    console.error('[LanguageTool API] Error checking status:', error);
    return NextResponse.json(
      { enabled: false },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await validateAuthAndGetUser();

    const body = await request.json();
    const { text, language, level } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get user settings for LanguageTool
    const userSettings = await db.settings.findUnique({
      where: { userId: user.id },
      select: {
        languageToolLanguage: true,
        languageToolLevel: true,
        languageToolMotherTongue: true,
        languageToolApiUrl: true,
        languageToolUsername: true,
        languageToolApiKey: true,
      }
    });

    // Check text using LanguageTool (user settings merged with provided params)
    const result = await checkText(
      text,
      language,
      {
        ...userSettings,
        // Override user's saved level if provided in request
        languageToolLevel: level || userSettings?.languageToolLevel,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[LanguageTool API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
