import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

/**
 * GET /api/integrations/spellchecker/status
 * Returns spellchecker enabled state and user-relevant config.
 * Accessible to any authenticated user (no ADMIN requirement).
 */
export async function GET() {
  try {
    await validateAuthAndGetUser();

    const config = await db.systemConfig.findUnique({
      where: { id: 1 },
      select: {
        languageToolEnabled: true,
        languageToolLanguage: true,
        languageToolAllowUserOverride: true,
      },
    });

    return NextResponse.json({
      enabled: config?.languageToolEnabled ?? false,
      defaultLanguage: config?.languageToolLanguage ?? 'en-US',
      allowUserOverride: config?.languageToolAllowUserOverride ?? false,
    });
  } catch {
    return NextResponse.json({ enabled: false, defaultLanguage: 'en-US', allowUserOverride: false });
  }
}
