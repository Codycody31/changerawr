import { NextRequest, NextResponse } from 'next/server';
import { checkText, getLanguageToolConfig } from '@/lib/services/languagetool/service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await validateAuthAndGetUser();
    const config = await getLanguageToolConfig();
    return NextResponse.json({ enabled: config !== null });
  } catch {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();

    const body = await request.json();
    const { text, language, level } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const userSettings = await db.settings.findUnique({
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

    const result = await checkText(text, language, {
      ...userSettings,
      languageToolLevel: level || userSettings?.languageToolLevel,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
