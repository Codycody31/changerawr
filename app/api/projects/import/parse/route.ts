import { NextRequest, NextResponse } from 'next/server';
import { MarkdownParserService } from '@/lib/services/projects/importing/markdown-parser.service';
import { ImportValidationService } from '@/lib/services/projects/importing/validation.service';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function POST(request: NextRequest) {
    try {
        // Validate authentication
        await validateAuthAndGetUser();

        // Parse request body
        const { content, projectId } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Content is required and must be a string' },
                { status: 400 }
            );
        }

        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Validate user has access to project
        // This would typically check project permissions
        // For now, we'll assume they have access as we don't have any sort of access-control that is extensive in place yet

        // Parse the markdown content
        console.log('Parsing markdown content...');
        const parsedChangelog = MarkdownParserService.parseChangelog(content);

        if (parsedChangelog.entries.length === 0) {
            return NextResponse.json(
                { error: 'No valid changelog entries found in the content' },
                { status: 422 }
            );
        }

        // Validate the parsed entries
        console.log('Validating parsed entries...');
        const { validatedEntries, preview } = ImportValidationService.validateEntries(
            parsedChangelog.entries
        );

        // Return the parsed and validated data
        return NextResponse.json({
            success: true,
            parsed: parsedChangelog,
            validatedEntries,
            preview,
            metadata: {
                parseTime: new Date().toISOString(),
                originalFormat: parsedChangelog.metadata.originalFormat,
                totalSections: parsedChangelog.metadata.totalSections
            }
        });

    } catch (error) {
        console.error('Error parsing changelog content:', error);

        return NextResponse.json(
            {
                error: 'Failed to parse changelog content',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}