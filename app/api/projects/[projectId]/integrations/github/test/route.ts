import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {z} from 'zod';
import {createGitHubClient} from '@/lib/services/github/client';

const testSchema = z.object({
    repositoryUrl: z.string().url('Invalid repository URL'),
    accessToken: z.string().min(1, 'Access token is required'),
});

/**
 * @method POST
 * @description Test GitHub connection with provided credentials
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {projectId} = await context.params;

        const body = await request.json();
        // console.log('Test request body:', {
        //     hasRepositoryUrl: !!body.repositoryUrl,
        //     hasAccessToken: !!body.accessToken,
        //     repositoryUrl: body.repositoryUrl,
        //     projectId: projectId
        // });

        const validatedData = testSchema.parse(body);

        // Create GitHub client
        const githubClient = createGitHubClient({
            accessToken: validatedData.accessToken,
            repositoryUrl: validatedData.repositoryUrl,
        });

        // console.log('Testing GitHub connection...');
        // console.log('Repository URL:', validatedData.repositoryUrl);
        // console.log('Token starts with:', validatedData.accessToken.substring(0, 8) + '...');

        try {
            // Test 1: Check user authentication
            // console.log('Step 1: Testing user authentication');
            const user = await githubClient.getUser();
            // console.log('Authenticated as:', user.login);

            // Test 2: Check repository access
            // console.log('Step 2: Testing repository access');
            const repo = await githubClient.testConnection(validatedData.repositoryUrl);
            // console.log('Repository accessed:', repo.full_name);

            // Test 3: Try to fetch a few commits
            // console.log('Step 3: Testing commit access');
            const commits = await githubClient.getCommits(validatedData.repositoryUrl, {per_page: 5});
            // console.log('Fetched commits:', commits.length);

            return NextResponse.json({
                success: true,
                user: {
                    login: user.login,
                    id: user.id
                },
                repository: {
                    name: repo.name,
                    full_name: repo.full_name,
                    private: repo.private,
                    default_branch: repo.default_branch
                },
                commitsCount: commits.length,
                message: 'GitHub connection successful'
            });

        } catch (githubError) {
            console.error('GitHub API Error:', githubError);

            let errorMessage = 'GitHub connection failed';
            let statusCode = 400;

            if (githubError instanceof Error) {
                if (githubError.message.includes('Bad credentials')) {
                    errorMessage = 'Invalid access token. Please check your GitHub personal access token.';
                    statusCode = 401;
                } else if (githubError.message.includes('Not Found')) {
                    errorMessage = 'Repository not found or access denied. Check the repository URL and token permissions.';
                    statusCode = 404;
                } else if (githubError.message.includes('rate limit')) {
                    errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
                    statusCode = 429;
                } else {
                    errorMessage = githubError.message;
                }
            }

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                    details: githubError instanceof Error ? githubError.message : 'Unknown error'
                },
                {status: statusCode}
            );
        }

    } catch (error) {
        console.error('Test route error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
                },
                {status: 400}
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to test GitHub connection',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            {status: 500}
        );
    }
}