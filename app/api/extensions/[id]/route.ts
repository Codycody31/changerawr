import { NextRequest, NextResponse } from 'next/server';
import { uninstallExtension, getJobProgress } from '@/lib/services/extensions/management.service';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isEnabled } = body;

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'isEnabled must be a boolean' },
        { status: 400 }
      );
    }

    // Update extension enabled status
    const extension = await db.editorExtension.update({
      where: { id },
      data: { isEnabled },
    });

    // Clear markdown engine cache so disabled extensions are unloaded
    // and enabled extensions are loaded
    try {
      const { clearEngineCache } = await import('@/lib/services/core/markdown/useCustomExtensions');
      clearEngineCache();
      console.log(`[Extension Toggle] Cleared markdown engine cache for ${extension.name}`);
    } catch (err) {
      console.error('[Extension Toggle] Failed to clear engine cache:', err);
    }

    return NextResponse.json(extension);

  } catch (error: any) {
    console.error('Extension update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update extension' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Extension ID is required' },
        { status: 400 }
      );
    }

    // Look up extension to get its name
    const extension = await db.editorExtension.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!extension) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }

    // Start uninstallation job (runs in background with automatic restart)
    const jobId = await uninstallExtension(extension.name);

    return NextResponse.json({
      jobId,
      message: 'Uninstallation started',
    });

  } catch (error: any) {
    console.error('Extension uninstallation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to uninstall extension' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;

    // Check if this is a job ID for progress tracking
    const progressData: any = await getJobProgress(id);

    if (progressData) {
      return NextResponse.json({
        progress: progressData.progress,
        status: progressData.phase === 'complete' ? 'complete' : progressData.phase === 'failed' ? 'failed' : 'in-progress',
        logs: progressData.logs,
        error: progressData.error,
      });
    }

    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    );
  }
}
