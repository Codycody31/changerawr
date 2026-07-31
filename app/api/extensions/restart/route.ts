import { NextRequest, NextResponse } from 'next/server';
import { triggerGracefulRestart } from '@/lib/services/restart-manager';

/**
 * Trigger a graceful restart with maintenance mode
 * Called after extension install/uninstall to reload extensions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'extension-update';

    // Trigger graceful restart
    await triggerGracefulRestart(reason);

    return NextResponse.json({
      success: true,
      message: 'Restart initiated',
      mode: process.env.NODE_ENV === 'production' ? 'automatic' : 'manual',
      instruction: process.env.NODE_ENV === 'development'
        ? 'Please restart your dev server: npm run dev'
        : 'Application will restart automatically',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to trigger restart' },
      { status: 500 }
    );
  }
}
