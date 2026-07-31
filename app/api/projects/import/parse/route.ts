import { NextRequest, NextResponse } from 'next/server';
import { MarkdownParserService } from '@/lib/services/projects/importing/markdown-parser.service';
import { ImportValidationService } from '@/lib/services/projects/importing/validation.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import type { ParseOverrides } from '@/lib/types/projects/importing';

export async function POST(request: NextRequest) {
    try {
        await validateAuthAndGetUser();

        const { content, projectId, overrides } = await request.json() as {
            content: string;
            projectId: string;
            overrides?: ParseOverrides;
        };

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required and must be a string' }, { status: 400 });
        }
        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        // Run detection separately so we can return it regardless of parse outcome
        const detection = MarkdownParserService.detectFormat(content);

        // Parse with optional overrides
        const parsedChangelog = MarkdownParserService.parseChangelog(content, overrides);

        if (parsedChangelog.entries.length === 0) {
            // Return detection even on failure so the UI can show it
            return NextResponse.json(
                {
                    error: 'No valid changelog entries found in the content',
                    detection,
                    parseWarnings: parsedChangelog.metadata.parseWarnings
                },
                { status: 422 }
            );
        }

        const { validatedEntries, preview } = ImportValidationService.validateEntries(parsedChangelog.entries);

        return NextResponse.json({
            success: true,
            parsed: parsedChangelog,
            validatedEntries,
            preview,
            detection,
            parseWarnings: parsedChangelog.metadata.parseWarnings,
            metadata: {
                parseTime: new Date().toISOString(),
                originalFormat: parsedChangelog.metadata.originalFormat,
                totalSections: parsedChangelog.metadata.totalSections,
                entryCount: parsedChangelog.entries.length
            }
        });

    } catch (error) {
        console.error('Error parsing changelog content:', error);
        return NextResponse.json(
            { error: 'Failed to parse changelog content', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
