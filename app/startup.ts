import {JobRunnerService} from '@/lib/services/jobs/job-runner.service';
import {TelemetryService} from '@/lib/services/telemetry/service';
import {ensureSystemUser} from '@/lib/services/core/system-user/service';
import {setupDailySslRenewal} from '@/lib/custom-domains/ssl/setup-renewal-job';
import {initializeExtensions} from '@/lib/services/extensions/initialization.service';
import {spawn, exec} from 'child_process';
import path from 'path';
import {promisify} from 'util';
import {promises as fs} from 'fs';

const execAsync = promisify(exec);

let servicesStarted = false;

interface EnvironmentValidationError extends Error {
    name: 'EnvironmentValidationError';
    missingVariables: string[];
}

function createEnvironmentError(missingVars: string[]): EnvironmentValidationError {
    const error = new Error(
        `FTB (Failure to Boot): Missing required environment variables: ${missingVars.join(', ')}`
    ) as EnvironmentValidationError;
    error.name = 'EnvironmentValidationError';
    error.missingVariables = missingVars;
    return error;
}

function checkRequirements(): void {
    const required = [
        'NEXT_PUBLIC_APP_URL',
        'DATABASE_URL',
        'JWT_ACCESS_SECRET',
        'ANALYTICS_SALT',
        'GITHUB_ENCRYPTION_KEY'
        // 'ENCRYPTION_KEY' - we do not need this actually.
    ];

    const missing: string[] = [];

    for (const v of required) {
        if (!process.env[v]) {
            missing.push(v);
        }
    }

    if (missing.length > 0) {
        throw createEnvironmentError(missing);
    }
}

/**
 * Validate extension directories and regenerate imports if needed
 */
async function validateExtensions(): Promise<void> {
    try {
        const extensionsDir = path.join(process.cwd(), 'extensions');
        const loaderPath = path.join(process.cwd(), 'lib', 'services', 'core', 'markdown', 'extensionLoader.ts');

        // Check if extensions directory exists
        try {
            await fs.access(extensionsDir);
        } catch {
            console.log('⚠️  Extensions directory not found, skipping validation');
            return;
        }

        // Read the extension loader to check for imports
        let loaderContent = '';
        try {
            loaderContent = await fs.readFile(loaderPath, 'utf-8');
        } catch {
            console.log('⚠️  Extension loader not found, skipping validation');
            return;
        }

        // Extract extension paths from imports
        const importRegex = /from ['"]@\/extensions\/([^\/]+)\/([^'"]+)['"]/g;
        const imports = [...loaderContent.matchAll(importRegex)];

        let hasInvalidImports = false;

        // Validate each imported extension
        const invalidExtensions: string[] = [];
        for (const match of imports) {
            const [, author, extensionName] = match;
            const extPath = path.join(extensionsDir, author, extensionName);

            try {
                await fs.access(extPath);
                // Check if index.ts exists
                await fs.access(path.join(extPath, 'index.ts'));
            } catch {
                console.error(`✗ Extension directory missing or invalid: ${author}/${extensionName}`);
                invalidExtensions.push(`${author}/${extensionName}`);
                hasInvalidImports = true;

                // Try to delete the broken extension directory
                try {
                    await fs.rm(extPath, { recursive: true, force: true });
                    console.log(`✓ Removed broken extension directory: ${author}/${extensionName}`);
                } catch (rmErr) {
                    console.warn(`Could not remove ${author}/${extensionName}:`, rmErr);
                }
            }
        }

        // If we have invalid imports, regenerate
        if (hasInvalidImports) {
            console.log('⚠️  Invalid extension imports detected, attempting to regenerate...');
            await regenerateExtensionImports();
        } else {
            console.log('✓ Extension validation passed');
        }
    } catch (error) {
        console.error('Extension validation error:', error);
        // Don't fail the app, just warn
    }
}

/**
 * Trigger extension import regeneration via the builder service
 */
async function regenerateExtensionImports(): Promise<void> {
    try {
        console.log('Calling extension builder service to regenerate imports...');

        const response = await fetch('http://localhost:3010/extensions/generate-imports', {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
            console.log('✓ Extension imports regenerated successfully');
            console.log('⚠️  Please restart the application for changes to take effect');
        } else {
            console.error('✗ Failed to regenerate extensions:', response.status);
        }
    } catch (error: any) {
        console.error('✗ Error regenerating extensions:', error.message);
        console.log('💡 You may need to run: npm run extensions:generate');
    }
}

async function cleanup(): Promise<void> {
    try {
        if (process.platform === 'win32') {
            await execAsync('taskkill /f /im node.exe /fi "WINDOWTITLE eq FTB Error Server*"').catch(() => {});
        } else {
            await execAsync('pkill -f "scripts/ftb/server.js"').catch(() => {});
        }
        console.log('✓ Cleaned up any existing error servers');
    } catch (error) {
        console.log(error);
    }
}

function launchGuide(missing: string[]): void {
    const serverPath = path.join(process.cwd(), 'scripts', 'ftb', 'server.js');

    console.log('\n🚨 LAUNCHING FAILURE TO BOOT ERROR SERVER 🚨');
    console.log('Terminating Next.js server to free port 3000...\n');

    setTimeout(() => {
        const guide = spawn('node', [serverPath, ...missing], {
            stdio: 'inherit',
            cwd: process.cwd(),
            detached: true
        });

        guide.on('error', (err) => {
            console.error('Failed to start error server:', err);
            console.error('Please check that scripts/ftb/server.js exists and is accessible.');
        });

        guide.unref();

        process.exit(1);
    }, 1000);
}

export async function startBackgroundServices(): Promise<void> {
    // Check if services are already started
    if (servicesStarted) {
        return;
    }

    // Prevent multiple simultaneous starts
    servicesStarted = true;

    console.log('Starting background services...');

    try {
        await cleanup();

        const skipCheck = process.env.BUILD_PHASE_SKIP_VALIDATION ||
            process.env.CI_BUILD_MODE ||
            process.env.DOCKER_BUILD === '1';

        if (!skipCheck) {
            checkRequirements();
            console.log('✓ Environment validation passed');
        }

        // Validate extensions before initializing
        await validateExtensions();

        await ensureSystemUser();

        // Initialize markdown extensions
        await initializeExtensions();

        await TelemetryService.initialize();
        console.log('✓ Telemetry service initialized');

        JobRunnerService.start(60000);
        console.log('✓ Job runner started');

        // Setup SSL auto-renewal if SSL is enabled
        if (process.env.NEXT_PUBLIC_SSL_ENABLED === 'true') {
            await setupDailySslRenewal();
            console.log('✓ SSL auto-renewal scheduled');
        }

        const handleShutdown = async (signal: string): Promise<void> => {
            console.log(`Received ${signal}, shutting down gracefully...`);

            JobRunnerService.stop();
            console.log('✓ Job runner stopped');

            await TelemetryService.shutdown();
            console.log('✓ Telemetry service shutdown complete');

            process.exit(0);
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

        console.log('✓ All background services started successfully');
    } catch (error) {
        // Reset the flag if startup fails
        servicesStarted = false;

        if (error instanceof Error && error.name === 'EnvironmentValidationError') {
            const envError = error as EnvironmentValidationError;

            console.error('🚨 FTB Error:', error.message);
            console.error('Starting error server to guide you through setup...\n');

            launchGuide(envError.missingVariables);

            return;
        } else {
            console.error('Failed to start background services:', error);
            throw error;
        }
    }
}