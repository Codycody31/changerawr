import { NextRequest, NextResponse } from 'next/server';
import { CannyService } from '@/lib/services/projects/importing/integrations/canny.service';

export async function POST(request: NextRequest) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json(
                { valid: false, error: 'API key is required' },
                { status: 400 }
            );
        }

        const result = await CannyService.validateApiKey(apiKey);
        return NextResponse.json(result);

    } catch (error) {
        console.error('Canny validation error:', error);
        return NextResponse.json(
            { valid: false, error: 'Validation failed' },
            { status: 500 }
        );
    }
}