import {NextRequest, NextResponse} from 'next/server';
import {ImportProcessorService} from '@/lib/services/projects/importing/processor.service';
import {ImportValidationService} from '@/lib/services/projects/importing/validation.service';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {createAuditLog} from '@/lib/utils/auditLog';
import {
    ValidatedEntry,
    ImportOptions,
    ImportResult
} from '@/lib/types/projects/importing';

interface AuthenticatedUser {
    id: string;
    email: string;
    name?: string;
    role: string;
}

export async function POST(request: NextRequest) {
    const startTime = new Date();
    let user: AuthenticatedUser | null = null;
    let projectId: string = '';

    try {
        // Validate authentication
        user = await validateAuthAndGetUser() as AuthenticatedUser;

        // Parse request body
        const {projectId: reqProjectId, entries, options} = await request.json();
        projectId = reqProjectId;

        // Validate required fields
        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json(
                {error: 'Project ID is required'},
                {status: 400}
            );
        }

        if (!Array.isArray(entries) || entries.length === 0) {
            return NextResponse.json(
                {error: 'Entries array is required and must not be empty'},
                {status: 400}
            );
        }

        // Validate import options
        const optionValidation = ImportValidationService.validateImportOptions(options);
        if (!optionValidation.isValid) {
            return NextResponse.json(
                {
                    error: 'Invalid import options',
                    details: optionValidation.errors
                },
                {status: 400}
            );
        }

        // Validate user permissions
        const permissionCheck = await ImportProcessorService.validateImportPermissions(
            user.id,
            projectId
        );

        if (!permissionCheck.canImport) {
            return NextResponse.json(
                {error: permissionCheck.reason || 'Insufficient permissions'},
                {status: 403}
            );
        }

        // Type the entries and options properly
        const validatedEntries: ValidatedEntry[] = entries;
        const importOptions: ImportOptions = {
            strategy: options.strategy || 'merge',
            preserveExistingEntries: options.preserveExistingEntries ?? true,
            autoGenerateVersions: options.autoGenerateVersions ?? false,
            defaultTags: options.defaultTags || [],
            publishImportedEntries: options.publishImportedEntries ?? false,
            dateHandling: options.dateHandling || 'preserve',
            conflictResolution: options.conflictResolution || 'skip'
        };

        // Log the import attempt
        await createAuditLog(
            'CHANGELOG_IMPORT_STARTED',
            user.id,
            user.id,
            {
                projectId,
                entryCount: validatedEntries.length,
                strategy: importOptions.strategy,
                conflictResolution: importOptions.conflictResolution,
                timestamp: startTime.toISOString()
            }
        );

        // Process the import
        console.log(`Starting import for project ${projectId} with ${validatedEntries.length} entries...`);

        const result: ImportResult = await ImportProcessorService.processImport(
            projectId,
            validatedEntries,
            importOptions,
            user.id
        );

        // Log the import completion
        await createAuditLog(
            result.success ? 'CHANGELOG_IMPORT_SUCCESS' : 'CHANGELOG_IMPORT_PARTIAL',
            user.id,
            user.id,
            {
                projectId,
                importedCount: result.importedCount,
                skippedCount: result.skippedCount,
                errorCount: result.errorCount,
                processingTime: result.processingTime,
                success: result.success,
                timestamp: new Date().toISOString()
            }
        );

        // Return the result
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error processing changelog import:', error);

        // Log the error
        if (user && projectId) {
            try {
                await createAuditLog(
                    'CHANGELOG_IMPORT_ERROR',
                    user.id,
                    user.id,
                    {
                        projectId,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        processingTime: Date.now() - startTime.getTime(),
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError);
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process import',
                details: error instanceof Error ? error.message : 'Unknown error occurred',
                importedCount: 0,
                skippedCount: 0,
                errorCount: 0,
                createdEntries: [],
                warnings: [],
                errors: [],
                processingTime: Date.now() - startTime.getTime()
            },
            {status: 500}
        );
    }
}

// GET endpoint to check import history/stats
export async function GET(request: NextRequest) {
    try {
        const user = await validateAuthAndGetUser();
        const {searchParams} = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                {error: 'Project ID is required'},
                {status: 400}
            );
        }

        // Validate permissions
        const permissionCheck = await ImportProcessorService.validateImportPermissions(
            user.id,
            projectId
        );

        if (!permissionCheck.canImport) {
            return NextResponse.json(
                {error: permissionCheck.reason || 'Insufficient permissions'},
                {status: 403}
            );
        }

        // Get import history
        const history = await ImportProcessorService.getImportHistory(projectId);

        return NextResponse.json({
            success: true,
            history
        });

    } catch (error) {
        console.error('Error fetching import history:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch import history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            {status: 500}
        );
    }
}