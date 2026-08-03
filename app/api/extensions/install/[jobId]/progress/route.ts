import { NextRequest, NextResponse } from 'next/server';
import { getJobProgress } from '@/lib/services/extensions/management.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { jobId } = await params;

    const progress = await getJobProgress(jobId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Convert to format expected by frontend
    return NextResponse.json({
      progress: progress.progress,
      status: progress.phase === 'complete' ? 'complete' : progress.phase === 'failed' ? 'failed' : 'in-progress',
      logs: progress.logs,
      error: progress.error,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get installation progress' },
      { status: 500 }
    );
  }
}
