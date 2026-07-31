import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const enabledExtensions = await db.editorExtension.findMany({
      where: { isEnabled: true },
      select: { name: true }
    });

    const enabledNames = enabledExtensions.map(e => e.name);

    return NextResponse.json({ enabledNames });
  } catch (error) {
    console.error('Error fetching enabled extensions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enabled extensions' },
      { status: 500 }
    );
  }
}
