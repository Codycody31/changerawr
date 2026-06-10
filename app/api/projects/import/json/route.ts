import { NextRequest, NextResponse } from 'next/server';
import { JsonParserService } from '@/lib/services/projects/importing/parsers/json.parser';
import { ImportValidationService } from '@/lib/services/projects/importing/validation.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import type { JsonImportOptions } from '@/lib/types/projects/importing';

export async function POST(request: NextRequest) {
    try {
        await validateAuthAndGetUser();

        const { content, projectId, options } = await request.json() as {
            content: string;
            projectId: string;
            options?: Partial<JsonImportOptions>;
        };

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required and must be a string' }, { status: 400 });
        }

        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const parsed = JsonParserService.parseJson(content, options);

        if (parsed.entries.length === 0) {
            return NextResponse.json(
                { error: 'No valid entries found in JSON content', warnings: parsed.metadata.parseWarnings },
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
                totalEntries: parsed.metadata.totalEntries
            }
        });
    } catch (error) {
        console.error('Error parsing JSON import:', error);
        return NextResponse.json(
            { error: 'Failed to parse JSON content', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
