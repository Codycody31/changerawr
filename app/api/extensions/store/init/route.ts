import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

/**
 * POST /api/extensions/store/init
 * Initialize default extension stores
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if stores already exist
    const existingStores = await db.extensionStore.findMany();

    if (existingStores.length > 0) {
      return NextResponse.json({
        message: 'Stores already initialized',
        count: existingStores.length,
      });
    }

    // Create default store
    const defaultStore = await db.extensionStore.create({
      data: {
        name: 'changerawr-official',
        displayName: 'Changerawr Official Store',
        url: 'https://github.com/Changerawr/extension-store/raw/refs/heads/main/extensions.json',
        isBuiltIn: true,
        isEnabled: true,
        priority: 100, // Highest priority
      },
    });

    return NextResponse.json({
      message: 'Default store initialized',
      store: defaultStore,
    });

  } catch (error: any) {
    console.error('Failed to initialize stores:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize stores' },
      { status: 500 }
    );
  }
}
