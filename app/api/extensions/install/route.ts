import { NextRequest, NextResponse } from 'next/server';
import { startInstallation } from '@/lib/services/extensions/management.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'GitHub URL is required' },
        { status: 400 }
      );
    }

    // Start installation job (runs in background)
    const jobId = startInstallation(url);

    return NextResponse.json({ jobId });

  } catch (error: any) {
    console.error('Extension installation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start installation' },
      { status: 500 }
    );
  }
}
