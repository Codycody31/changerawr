import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const EXTENSIONS_DIR = path.join(process.cwd(), 'extensions');

/**
 * GET /api/extensions/[id]/icon
 * Serve the icon.png file for an extension
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[Icon API] Request for extension ID:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Extension ID is required' },
        { status: 400 }
      );
    }

    // Get extension from database to find its directory
    const extension = await db.editorExtension.findUnique({
      where: { id },
    });

    console.log('[Icon API] Extension from DB:', extension ? { id: extension.id, name: extension.name, author: extension.author } : 'not found');

    if (!extension) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }

    // Try author/name path first, then fallback to legacy name-only path
    const extDirWithAuthor = extension.author
      ? path.join(EXTENSIONS_DIR, extension.author, extension.name)
      : null;
    const extDirLegacy = path.join(EXTENSIONS_DIR, extension.name);

    console.log('[Icon API] Searching for icon in:', { extDirWithAuthor, extDirLegacy });

    // Try to find icon.png in the extension directory
    let iconPath: string | null = null;

    if (extDirWithAuthor) {
      const iconPathWithAuthor = path.join(extDirWithAuthor, 'icon.png');
      console.log('[Icon API] Trying author path:', iconPathWithAuthor);
      try {
        await fs.access(iconPathWithAuthor);
        iconPath = iconPathWithAuthor;
        console.log('[Icon API] Found icon at author path');
      } catch (err) {
        console.log('[Icon API] Icon not found at author path, trying legacy');
        // Try legacy path
        const iconPathLegacy = path.join(extDirLegacy, 'icon.png');
        console.log('[Icon API] Trying legacy path:', iconPathLegacy);
        try {
          await fs.access(iconPathLegacy);
          iconPath = iconPathLegacy;
          console.log('[Icon API] Found icon at legacy path');
        } catch (err2) {
          console.log('[Icon API] Icon not found at legacy path either');
        }
      }
    } else {
      const iconPathLegacy = path.join(extDirLegacy, 'icon.png');
      console.log('[Icon API] Trying legacy path (no author):', iconPathLegacy);
      try {
        await fs.access(iconPathLegacy);
        iconPath = iconPathLegacy;
        console.log('[Icon API] Found icon at legacy path');
      } catch (err) {
        console.log('[Icon API] Icon not found at legacy path');
      }
    }

    if (!iconPath) {
      console.log('[Icon API] No icon path found, returning 404');
      return NextResponse.json(
        { error: 'Icon not found' },
        { status: 404 }
      );
    }

    console.log('[Icon API] Reading icon from:', iconPath);
    // Read the icon file as a buffer
    const iconBuffer = await fs.readFile(iconPath);
    console.log('[Icon API] Icon read successfully, size:', iconBuffer.length);

    // Return the image with proper content type using Response (not NextResponse)
    // This ensures binary data isn't corrupted by Next.js transformations
    return new Response(iconBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': iconBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Failed to serve extension icon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to serve extension icon' },
      { status: 500 }
    );
  }
}
