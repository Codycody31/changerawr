import { NextResponse } from 'next/server';
import { getAvailableLanguages } from '@/lib/services/languagetool/service';

const CACHE_DURATION = 24 * 60 * 60 * 1000;
let cachedLanguages: Array<{ name: string; code: string; longCode: string }> | null = null;
let cacheTimestamp = 0;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedLanguages && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({ languages: cachedLanguages, cached: true });
    }

    const languages = await getAvailableLanguages();
    cachedLanguages = languages;
    cacheTimestamp = now;

    return NextResponse.json({ languages, cached: false });
  } catch (error) {
    if (cachedLanguages) {
      return NextResponse.json({ languages: cachedLanguages, cached: true, stale: true });
    }
    return NextResponse.json(
      { error: 'Failed to fetch languages', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
