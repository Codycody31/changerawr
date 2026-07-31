import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/extensions/store/list
 * List all extension stores
 */
export async function GET(request: NextRequest) {
  try {
    const stores = await db.extensionStore.findMany({
      orderBy: { priority: 'desc' },
    });

    return NextResponse.json(stores);
  } catch (error: any) {
    console.error('Failed to fetch stores:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/extensions/store/list?id=xxx
 * Delete an extension store
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a built-in store
    const store = await db.extensionStore.findUnique({
      where: { id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (store.isBuiltIn) {
      return NextResponse.json(
        { error: 'Cannot delete built-in stores' },
        { status: 400 }
      );
    }

    await db.extensionStore.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete store:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete store' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/extensions/store/list
 * Toggle store enabled status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isEnabled } = body;

    if (!id || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'id and isEnabled are required' },
        { status: 400 }
      );
    }

    const store = await db.extensionStore.update({
      where: { id },
      data: { isEnabled },
    });

    return NextResponse.json(store);
  } catch (error: any) {
    console.error('Failed to update store:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update store' },
      { status: 500 }
    );
  }
}
