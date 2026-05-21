import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Update all extensions that have updates available
 * Uses the extension builder service for multi-chain updates
 */
export async function POST(request: NextRequest) {
  try {
    // Get all extensions that need updates
    const extensions = await db.editorExtension.findMany({
      where: {
        isBuiltIn: false,
        sourceType: 'STORE',
      },
    });

    // Fetch store data to check for updates
    const storeResponse = await fetch('https://raw.githubusercontent.com/changerawr/extension-store/main/extensions.json', {
      cache: 'no-store',
    });

    if (!storeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch store data' },
        { status: 500 }
      );
    }

    const storeData = await storeResponse.json();
    const storeExtensions = storeData.extensions || [];

    // Filter extensions that have updates
    const extensionsToUpdate = extensions.filter(ext => {
      const storeExt = storeExtensions.find((se: any) => se.name === ext.name);
      return storeExt && storeExt.version !== ext.version;
    });

    if (extensionsToUpdate.length === 0) {
      return NextResponse.json({
        message: 'No updates available',
        count: 0,
        extensions: [],
      });
    }

    // Prepare URLs for update chain
    const urls = extensionsToUpdate
      .filter(ext => ext.sourceUrl)
      .map(ext => ext.sourceUrl);

    // Start update chain via extension builder service
    const builderResponse = await fetch('http://localhost:3010/update-chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    if (!builderResponse.ok) {
      throw new Error('Failed to start update chain');
    }

    const chainData = await builderResponse.json();

    return NextResponse.json({
      message: `Started updates for ${extensionsToUpdate.length} extension(s)`,
      count: extensionsToUpdate.length,
      extensions: extensionsToUpdate.map(e => ({ name: e.name, displayName: e.displayName })),
      chainId: chainData.chainId,
      jobIds: chainData.jobIds,
    });

  } catch (error: any) {
    console.error('Update all error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start updates' },
      { status: 500 }
    );
  }
}
