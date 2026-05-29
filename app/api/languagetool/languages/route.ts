import { NextResponse } from 'next/server';
import { getAvailableLanguages } from '@/lib/services/languagetool/service';

// Cache for 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;
let cachedLanguages: Array<{ name: string; code: string; longCode: string }> | null = null;
let cacheTimestamp = 0;

/**
 * GET /api/languagetool/languages
 * Fetch available languages from LanguageTool API
 * Cached for 24 hours to reduce API calls
 */
export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedLanguages && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({
        languages: cachedLanguages,
        cached: true,
        cacheAge: Math.floor((now - cacheTimestamp) / 1000),
      });
    }

    // Fetch fresh data from LanguageTool API
    const languages = await getAvailableLanguages();

    // Update cache
    cachedLanguages = languages;
    cacheTimestamp = now;

    return NextResponse.json({
      languages,
      cached: false,
    });
  } catch (error) {
    console.error('[LanguageTool Languages API] Error:', error);

    // If we have cached data, return it even if expired
    if (cachedLanguages) {
      return NextResponse.json({
        languages: cachedLanguages,
        cached: true,
        stale: true,
        error: 'Failed to fetch fresh data, using cached version',
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch languages from LanguageTool API',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
