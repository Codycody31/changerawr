import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Extension name is required' },
        { status: 400 }
      );
    }

    // Get extension from database to verify it's linked
    const extension = await db.editorExtension.findUnique({
      where: { name },
    });

    if (!extension) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }

    if (!extension.isLinked) {
      return NextResponse.json(
        { error: 'Extension is not linked (use uninstall instead)' },
        { status: 400 }
      );
    }

    // Remove symlink
    const symlinkPath = path.join(process.cwd(), 'extensions', 'changerawr', name);
    try {
      await fs.rm(symlinkPath, { recursive: true, force: true });
    } catch (error: any) {
      console.warn('Failed to remove symlink:', error.message);
    }

    // Remove from database
    try {
      await db.editorExtension.delete({
        where: { name },
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to remove from database: ${error.message}` },
        { status: 500 }
      );
    }

    // Trigger extension regeneration script
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npm run extensions:generate', {
        cwd: process.cwd(),
      });
    } catch (error: any) {
      console.warn('Failed to regenerate extensions:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: `Extension '${name}' unlinked successfully. Restart dev server to see changes.`,
      needsRestart: true
    });

  } catch (error: any) {
    console.error('Extension unlink error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlink extension' },
      { status: 500 }
    );
  }
}
