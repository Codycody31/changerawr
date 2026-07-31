import { NextRequest, NextResponse } from 'next/server';
import { startInstallation } from '@/lib/services/extensions/management.service';

export async function POST(request: NextRequest) {
  try {
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
