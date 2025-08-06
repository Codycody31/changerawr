import {NextRequest, NextResponse} from 'next/server';
import {CannyService} from '@/lib/services/projects/importing/integrations/canny.service';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {CannyImportOptions} from '@/lib/types/projects/importing/canny';

export async function POST(request: NextRequest) {
    try {
        // Validate authentication
        await validateAuthAndGetUser();

        const body = await request.json();

        console.log('Canny fetch request body:', body);

        const options: CannyImportOptions = {
            apiKey: body.apiKey,
            includeLabels: body.includeLabels ?? true,
            includePostTags: body.includePostTags ?? false,
            statusFilter: body.statusFilter ?? 'published',
            maxEntries: body.maxEntries ?? 50
        };

        // Validate options
        if (!options.apiKey) {
            return NextResponse.json(
                {success: false, error: 'API key is required'},
                {status: 400}
            );
        }

        if (options.maxEntries > 500) {
            return NextResponse.json(
                {success: false, error: 'Maximum entries cannot exceed 500'},
                {status: 400}
            );
        }

        console.log('Fetching entries from Canny with options:', options);

        // Fetch entries from Canny
        const {entries, error} = await CannyService.fetchEntries(options);

        if (error) {
            console.error('Canny fetch error:', error);
            return NextResponse.json(
                {success: false, error},
                {status: 400}
            );
        }

        console.log('Raw Canny entries:', entries.length);

        // Convert to validated entries
        const convertedEntries = CannyService.convertEntries(entries, options);

        console.log('Converted entries:', convertedEntries.length);
        console.log('Sample converted entry:', convertedEntries[0]);

        return NextResponse.json({
            success: true,
            entries: convertedEntries,
            count: convertedEntries.length
        });

    } catch (error) {
        console.error('Canny fetch error:', error);
        return NextResponse.json(
            {success: false, error: 'Failed to fetch from Canny'},
            {status: 500}
        );
    }
}