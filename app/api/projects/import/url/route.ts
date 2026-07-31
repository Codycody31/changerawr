import { NextRequest, NextResponse } from 'next/server';
import { UrlParserService } from '@/lib/services/projects/importing/parsers/url.parser';
import { ImportValidationService } from '@/lib/services/projects/importing/validation.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import type { UrlImportOptions } from '@/lib/types/projects/importing';

export async function POST(request: NextRequest) {
    try {
        await validateAuthAndGetUser();

        const { projectId, options } = await request.json() as {
            projectId: string;
            options: UrlImportOptions;
        };

        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!options?.url || typeof options.url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Basic URL validation
        try {
            const parsed = new URL(options.url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return NextResponse.json({ error: 'URL must use http or https protocol' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        const parsed = await UrlParserService.fetchAndParse(options);

        if (parsed.entries.length === 0) {
            return NextResponse.json(
                { error: 'No entries found at the provided URL', warnings: parsed.metadata.parseWarnings },
                { status: 422 }
            );
        }

        const { validatedEntries, preview } = ImportValidationService.validateEntries(parsed.entries);

        return NextResponse.json({
            success: true,
            parsed,
            validatedEntries,
            preview,
            metadata: {
                parseTime: new Date().toISOString(),
                originalFormat: parsed.metadata.originalFormat,
                totalEntries: parsed.metadata.totalEntries,
                sourceUrl: options.url
            }
        });
    } catch (error) {
        console.error('Error parsing URL import:', error);
        return NextResponse.json(
            { error: 'Failed to fetch or parse URL', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
