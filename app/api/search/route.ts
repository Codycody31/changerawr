// app/api/search/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {verifyAccessToken} from '@/lib/auth/tokens';
import {db} from '@/lib/db';
import {z} from 'zod';
import {searchService} from "@/lib/services/search/service";

// Feature flag for tags
const ENABLE_TAGS = false;

// Request validation schema
const searchSchema = z.object({
    query: z.string().min(1).max(200),
    filters: z.object({
        tags: z.array(z.string()).optional(),
        dateRange: z.object({
            start: z.string().datetime(),
            end: z.string().datetime()
        }).optional(),
        hasVersion: z.boolean().optional(),
        projectIds: z.array(z.string()).optional()
    }).optional(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0),
    types: z.array(z.string()).optional()
});

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
    // Try to get access token from cookies first
    let accessToken = request.cookies.get('accessToken')?.value;

    // If not in cookies, check Authorization header
    if (!accessToken) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        }
    }

    if (!accessToken) {
        return null;
    }

    try {
        // Verify the token and get user ID
        const userId = await verifyAccessToken(accessToken);
        if (!userId) {
            return null;
        }

        // Fetch full user data from database
        return await db.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                // Add any other fields you need for access control
            }
        });
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validation = searchSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid request parameters',
                    details: validation.error.errors
                },
                {status: 400}
            );
        }

        const {query, limit, offset} = validation.data;
        let {filters} = validation.data;

        // Remove tags from filters if tags are disabled
        if (!ENABLE_TAGS && filters?.tags) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {tags, ...filtersWithoutTags} = filters;
            filters = filtersWithoutTags;
        }

        // Convert date strings to Date objects if provided
        const processedFilters = filters ? {
            ...filters,
            dateRange: filters.dateRange ? {
                start: new Date(filters.dateRange.start),
                end: new Date(filters.dateRange.end)
            } : undefined
        } : undefined;

        // Perform search
        const searchResults = await searchService.searchAll(
            user,
            query,
            processedFilters,
            limit,
            offset
        );

        // Filter out any tag results if tags are disabled
        if (!ENABLE_TAGS && searchResults.results) {
            searchResults.results = searchResults.results.filter(
                (result) => result.type !== 'tag'
            );
        }

        // Log search for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Search performed: "${query}" by user ${user.id} (${user.role}), found ${searchResults.total} results in ${searchResults.executionTime}ms`);
        }

        return NextResponse.json({
            success: true,
            ...searchResults,
            query
        });

    } catch (error) {
        console.error('Search API error:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development'
                    ? (error as Error).message
                    : 'Search failed'
            },
            {status: 500}
        );
    }
}

// Optional: GET endpoint for simple searches (useful for testing)
export async function GET(request: NextRequest) {
    const {searchParams} = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json(
            {error: 'Query parameter "q" is required'},
            {status: 400}
        );
    }

    // Get authenticated user
    const user = await getUserFromRequest(request);
    if (!user) {
        return NextResponse.json(
            {error: 'Authentication required'},
            {status: 401}
        );
    }

    try {
        // Perform search with default parameters
        const searchResults = await searchService.searchAll(
            user,
            query,
            undefined, // No filters
            10,         // Default limit
            0           // No offset
        );

        // Filter out tag results if tags are disabled
        if (!ENABLE_TAGS && searchResults.results) {
            searchResults.results = searchResults.results.filter(
                (result) => result.type !== 'tag'
            );
        }

        return NextResponse.json({
            success: true,
            ...searchResults,
            query
        });

    } catch (error) {
        console.error('Search GET error:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development'
                    ? (error as Error).message
                    : 'Search failed'
            },
            {status: 500}
        );
    }
}