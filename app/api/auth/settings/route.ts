import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        const settings = await db.settings.findUnique({
            where: { userId: user.id },
        });

        if (!settings) {
            // Create default settings if they don't exist
            const defaultSettings = await db.settings.create({
                data: {
                    userId: user.id,
                    theme: 'light',
                },
            });
            return NextResponse.json(defaultSettings);
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        const data = await request.json();

        // Validate the request data
        const validUpdates: { theme?: string; name?: string } = {};
        if (data.theme && ['light', 'dark'].includes(data.theme)) {
            validUpdates.theme = data.theme;
        }
        if (data.name !== undefined) {
            // Update user name
            await db.user.update({
                where: { id: user.id },
                data: { name: data.name },
            });
        }

        if (Object.keys(validUpdates).length > 0) {
            // Update settings
            const settings = await db.settings.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    ...validUpdates,
                },
                update: validUpdates,
            });

            return NextResponse.json(settings);
        }

        return NextResponse.json(
            { error: 'No valid updates provided' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Failed to update settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}