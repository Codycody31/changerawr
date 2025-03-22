import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
    try {
        const result: { version: string }[] = await db.$queryRaw`SELECT version();`;
        const databaseVersion = result[0]?.version ? result[0].version.split(' ')[1].replace(',', '') : 'Unknown';
        return NextResponse.json({
            status: 'success',
            databaseVersion,
        });
    } catch (error) {
        console.error('Error fetching database version:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to retrieve database version' },
            { status: 500 }
        );
    }
}