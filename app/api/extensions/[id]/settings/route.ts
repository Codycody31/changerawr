import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/extensions/[id]/settings
 * Get extension settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[Settings API] GET request for extension ID:', id);

    // Accept either a DB cuid or an extension name (for component usage)
    const extension = await db.editorExtension.findFirst({
      where: { OR: [{ id }, { name: id }] },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    console.log('[Settings API] Extension found:', extension ? { id: extension.id, name: extension.name, hasSettings: !!extension.settings } : 'not found');

    if (!extension) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: extension.settings || {},
    });

  } catch (error: any) {
    console.error('[Settings API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get extension settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/extensions/[id]/settings
 * Update extension settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'settings must be an object' },
        { status: 400 }
      );
    }

    // Accept either a DB cuid or an extension name
    const target = await db.editorExtension.findFirst({
      where: { OR: [{ id }, { name: id }] },
      select: { id: true, name: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Extension not found' }, { status: 404 });
    }

    const extension = await db.editorExtension.update({
      where: { id: target.id },
      data: { settings },
    });

    // Clear markdown engine cache so the extension can access new settings
    try {
      const { clearEngineCache } = await import('@/lib/services/core/markdown/useCustomExtensions');
      clearEngineCache();
      console.log(`[Extension Settings] Cleared markdown engine cache for ${extension.name}`);
    } catch (err) {
      console.error('[Extension Settings] Failed to clear engine cache:', err);
    }

    return NextResponse.json(extension);

  } catch (error: any) {
    console.error('Extension settings update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update extension settings' },
      { status: 500 }
    );
  }
}
