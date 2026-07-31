/**
 * Extension Management Service
 *
 * Handles extension installation, updates, and uninstallation
 * with automatic app restart for Docker environments
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import AdmZip from 'adm-zip';

const EXTENSIONS_DIR = path.join(process.cwd(), 'extensions');
const JOBS_DIR = path.join(process.cwd(), '.next/cache/extension-jobs');
const isDocker = process.env.DOCKER_BUILD === '1' || !!process.env.DOCKER_CONTAINER;
const isWindows = process.platform === 'win32';

// Ensure jobs directory exists
fs.mkdir(JOBS_DIR, { recursive: true }).catch(() => {});

interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description?: string;
  category?: string;
  icon?: string;
  files?: {
    required?: string[];
    optional?: string[];
    directories?: string[];
  };
}

interface RestartJobProgress {
  phase: 'stopping' | 'regenerating' | 'building' | 'starting' | 'complete' | 'failed';
  progress: number;
  status: string;
  logs: Array<{ message: string; type: 'info' | 'success' | 'error' }>;
  error?: string;
}

// File-based job tracking (survives module hot-reload in dev)
const jobTracker = new Map<string, RestartJobProgress>();

/**
 * Get job file path
 */
function getJobFilePath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

/**
 * Save job to file
 */
async function saveJobToFile(jobId: string, data: RestartJobProgress): Promise<void> {
  try {
    await fs.writeFile(getJobFilePath(jobId), JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.error(`Failed to save job ${jobId} to file:`, err);
  }
}

/**
 * Load job from file
 */
async function loadJobFromFile(jobId: string): Promise<RestartJobProgress | null> {
  try {
    const data = await fs.readFile(getJobFilePath(jobId), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `restart-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Update job progress
 */
function updateJobProgress(jobId: string, update: Partial<RestartJobProgress>) {
  const current = jobTracker.get(jobId) || {
    phase: 'stopping' as const,
    progress: 0,
    status: '',
    logs: [],
  };

  const updated = { ...current, ...update };
  jobTracker.set(jobId, updated);
  console.log(`[Job ${jobId}] Updated progress:`, updated.progress, updated.status);

  // Save to file for persistence across hot-reloads
  saveJobToFile(jobId, updated).catch(err =>
    console.error(`Failed to persist job ${jobId}:`, err)
  );
}

/**
 * Add log entry to job
 */
function addJobLog(jobId: string, message: string, type: 'info' | 'success' | 'error' = 'info') {
  const job = jobTracker.get(jobId);
  if (job) {
    job.logs.push({ message, type });
    jobTracker.set(jobId, job);
  }
}

/**
 * Get job progress (async to support file fallback)
 */
export async function getJobProgress(jobId: string): Promise<RestartJobProgress | null> {
  // Check in-memory first
  let progress = jobTracker.get(jobId) || null;

  // Fallback to file if not in memory (hot-reload case)
  if (!progress) {
    progress = await loadJobFromFile(jobId);
    if (progress) {
      // Cache it back in memory
      jobTracker.set(jobId, progress);
      console.log(`[Job ${jobId}] Loaded from file:`, `${progress.progress}%`);
    }
  }

  console.log(`[Job ${jobId}] Get progress:`, progress ? `${progress.progress}%` : 'NOT FOUND', `(tracker has ${jobTracker.size} jobs)`);
  return progress;
}

/**
 * Validate PNG file signature
 * PNG files start with: 89 50 4E 47 0D 0A 1A 0A
 */
function isValidPNG(buffer: Buffer): boolean {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (buffer.length < 8) return false;
  return buffer.subarray(0, 8).equals(pngSignature);
}

/**
 * Rewrite relative imports to absolute paths
 * Converts: import { Foo } from './Bar'
 * To:       import { Foo } from '@/extensions/author/extension/Bar'
 *
 * Also handles subdirectories:
 * import { X } from './components/Y'
 * -> import { X } from '@/extensions/author/extension/components/Y'
 */
function rewriteRelativeImports(content: string, author: string, extensionName: string): string {
  // Match import statements with relative paths
  // Handles: import { X } from './Y'
  //          import X from './Y'
  //          import * as X from './Y'
  //          import './Y'
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*]+(?:\s+as\s+\w+)?|\*\s+as\s+\w+)\s+from\s+)?['"](\.[^'"]+)['"]/g;

  return content.replace(importRegex, (match, importPath) => {
    // Only rewrite relative imports (starting with ./ or ../)
    if (!importPath.startsWith('.')) {
      return match;
    }

    // Handle different relative path patterns
    let cleanPath = importPath;

    // Remove leading ./
    if (cleanPath.startsWith('./')) {
      cleanPath = cleanPath.substring(2);
    }

    // Handle ../ (going up one directory)
    // For extensions, we typically don't go up, but if we do, just strip it
    // since all extension files should be within the extension directory
    if (cleanPath.startsWith('../')) {
      cleanPath = cleanPath.substring(3);
    }

    // Remove file extensions (.ts, .tsx, .js, .jsx)
    cleanPath = cleanPath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Build absolute path
    const absolutePath = `@/extensions/${author}/${extensionName}/${cleanPath}`;

    // Replace the import path in the original match
    return match.replace(importPath, absolutePath);
  });
}

/**
 * Execute a shell command and return output
 */
async function execCommand(command: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: cwd || process.cwd(),
      shell: isWindows,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Restart the application after extension changes
 * This is the core "hack" that allows Docker restarts via API
 */
export async function restartApplication(jobId: string): Promise<void> {
  try {
    // Phase 1: Regenerate imports
    updateJobProgress(jobId, {
      phase: 'regenerating',
      progress: 50,
      status: 'Regenerating extension imports',
    });
    addJobLog(jobId, 'Regenerating extension imports...', 'info');

    try {
      // Add timeout to prevent hanging
      const generatePromise = execCommand('npm', ['run', 'extensions:generate']);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Extension generation timed out after 30s')), 30000)
      );

      await Promise.race([generatePromise, timeoutPromise]);
      addJobLog(jobId, 'Extension imports regenerated', 'success');
    } catch (generateError: any) {
      console.error('Extension generation failed:', generateError);
      addJobLog(jobId, `Warning: ${generateError.message}`, 'error');
      // Continue anyway - the extension files are already in place
      addJobLog(jobId, 'Continuing with installation...', 'info');
    }

    // Phase 2: Show 100% progress for a moment
    updateJobProgress(jobId, {
      phase: 'regenerating',
      progress: 100,
      status: 'Finalizing installation',
    });
    addJobLog(jobId, 'Extension installed successfully', 'success');

    // Wait a bit at 100% before showing completion screen
    await new Promise(resolve => setTimeout(resolve, 800));

    // Phase 3: Complete
    updateJobProgress(jobId, {
      phase: 'complete',
      progress: 100,
      status: 'Extension installed - restart required',
    });

    // In development, extensions are loaded dynamically
    // No build or restart needed - just reload the page
    if (process.env.NODE_ENV === 'development') {
      addJobLog(jobId, 'Development mode: Reload your browser to see the extension', 'info');
    } else {
      // Production mode - trigger restart
      addJobLog(jobId, 'Initiating application restart...', 'info');

      // Schedule restart after a short delay to allow response to be sent
      setTimeout(() => {
        process.kill(process.pid, 'SIGUSR2');
      }, 2000);
    }

  } catch (error: any) {
    updateJobProgress(jobId, {
      phase: 'failed',
      progress: 0,
      status: 'Installation failed',
      error: error.message,
    });
    addJobLog(jobId, `Error: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Install extension from GitHub URL
 */
export async function installExtension(githubUrl: string, jobId: string): Promise<void> {
  try {
    updateJobProgress(jobId, {
      phase: 'stopping',
      progress: 5,
      status: 'Preparing installation',
    });
    addJobLog(jobId, 'Starting extension installation...', 'info');

    // Parse GitHub URL
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/;
    const match = githubUrl.match(urlPattern);

    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo, subdirectory] = match;
    const repoName = repo.replace(/\.git$/, '');
    const extensionPath = subdirectory || '';

    addJobLog(jobId, `Fetching from ${owner}/${repoName}`, 'info');

    // Fetch extension.json with cache busting
    const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/heads/main`;
    const basePath = extensionPath ? `${rawBaseUrl}/${extensionPath}` : rawBaseUrl;
    const cacheBuster = `?_t=${Date.now()}`;
    const extensionJsonUrl = `${basePath}/extension.json${cacheBuster}`;

    addJobLog(jobId, `Fetching metadata from: ${extensionJsonUrl}`, 'info');

    const metadataResponse = await fetch(extensionJsonUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!metadataResponse.ok) {
      addJobLog(jobId, `Failed to fetch extension.json from ${extensionJsonUrl} (HTTP ${metadataResponse.status})`, 'error');
      throw new Error(`Failed to fetch extension.json (HTTP ${metadataResponse.status})`);
    }

    const manifest: ExtensionManifest = await metadataResponse.json();
    addJobLog(jobId, `Found extension: ${manifest.displayName} v${manifest.version}`, 'success');

    // Create extension directory with author namespace
    const authorDir = path.join(EXTENSIONS_DIR, manifest.author);
    const extDir = path.join(authorDir, manifest.name);

    // Delete existing extension directory if it exists (for updates)
    try {
      await fs.rm(extDir, { recursive: true, force: true });
      addJobLog(jobId, 'Removed old extension files', 'info');
    } catch (err) {
      // Directory might not exist, that's fine
    }

    await fs.mkdir(extDir, { recursive: true });

    // Download extension as zip from GitHub
    updateJobProgress(jobId, {
      phase: 'stopping',
      progress: 15,
      status: 'Downloading extension archive',
    });

    // Use GitHub archive API to download the entire repo as a zip
    // Format: https://github.com/owner/repo/archive/refs/heads/main.zip
    const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/main.zip`;

    addJobLog(jobId, `Downloading zip from: ${zipUrl}`, 'info');

    const zipResponse = await fetch(zipUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!zipResponse.ok) {
      throw new Error(`Failed to download extension zip (HTTP ${zipResponse.status})`);
    }

    // Save zip temporarily
    const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
    const tempZipPath = path.join(JOBS_DIR, `${jobId}.zip`);
    await fs.writeFile(tempZipPath, zipBuffer);

    addJobLog(jobId, 'Extension archive downloaded', 'success');

    // Extract zip
    updateJobProgress(jobId, {
      phase: 'stopping',
      progress: 20,
      status: 'Extracting extension files',
    });

    try {
      const zip = new AdmZip(tempZipPath);
      const zipEntries = zip.getEntries();

      // GitHub zips have a root folder named: repo-branch
      const rootFolder = `${repoName}-main/`;
      const extensionPrefix = extensionPath
        ? `${rootFolder}${extensionPath}/`
        : rootFolder;

      addJobLog(jobId, `Extracting files from: ${extensionPrefix}`, 'info');

      // Determine which files to extract based on manifest
      const requiredFiles = manifest.files?.required || ['index.ts', 'toolbar.tsx', 'extension.json'];
      const optionalFiles = manifest.files?.optional || ['README.md', 'icon.png'];
      const directories = manifest.files?.directories || [];

      const allFiles = [...requiredFiles, ...optionalFiles];

      // Extract required and optional files
      for (const file of allFiles) {
        const entryPath = `${extensionPrefix}${file}`;
        const entry = zipEntries.find(e => e.entryName === entryPath);

        if (entry && !entry.isDirectory) {
          let content = entry.getData();

          // Handle binary files (like PNGs) differently
          if (file.endsWith('.png')) {
            // Validate PNG signature
            if (!isValidPNG(content)) {
              addJobLog(jobId, `Warning: ${file} appears to be corrupted (invalid PNG signature)`, 'error');
              // Skip corrupted PNG files
              continue;
            }
            // Write binary data directly
            await fs.writeFile(path.join(extDir, file), content);
            addJobLog(jobId, `Extracted ${file} (binary)`, 'success');
          } else {
            // Text files: convert to string
            let textContent = content.toString('utf-8');

            // Rewrite relative imports to absolute paths for TypeScript/TSX files
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
              textContent = rewriteRelativeImports(textContent, manifest.author, manifest.name);
            }

            await fs.writeFile(path.join(extDir, file), textContent);
            addJobLog(jobId, `Extracted ${file}`, 'success');
          }
        } else if (requiredFiles.includes(file)) {
          throw new Error(`Required file missing: ${file}`);
        } else {
          addJobLog(jobId, `Skipped optional file: ${file}`, 'info');
        }
      }

      // Extract directories recursively
      for (const dir of directories) {
        const dirPrefix = `${extensionPrefix}${dir}/`;
        const dirEntries = zipEntries.filter(e =>
          e.entryName.startsWith(dirPrefix) && !e.isDirectory
        );

        for (const entry of dirEntries) {
          // Calculate relative path within the extension directory
          const relativePath = entry.entryName.substring(extensionPrefix.length);
          const targetPath = path.join(extDir, relativePath);

          // Ensure parent directory exists
          await fs.mkdir(path.dirname(targetPath), { recursive: true });

          let content = entry.getData();

          // Rewrite relative imports for TypeScript/TSX files
          if (relativePath.endsWith('.ts') || relativePath.endsWith('.tsx')) {
            content = Buffer.from(
              rewriteRelativeImports(content.toString('utf-8'), manifest.author, manifest.name)
            );
          }

          await fs.writeFile(targetPath, content);
        }

        if (dirEntries.length > 0) {
          addJobLog(jobId, `Extracted ${dirEntries.length} files from ${dir}/`, 'success');
        } else {
          addJobLog(jobId, `No files found in ${dir}/`, 'info');
        }
      }

      // Clean up temp zip
      await fs.unlink(tempZipPath).catch(() => {});

      addJobLog(jobId, 'All files extracted successfully', 'success');

    } catch (err: any) {
      // Clean up temp zip on error
      await fs.unlink(tempZipPath).catch(() => {});
      throw new Error(`Failed to extract extension: ${err.message}`);
    }

    // Save to database
    updateJobProgress(jobId, {
      phase: 'stopping',
      progress: 30,
      status: 'Registering extension',
    });

    await db.editorExtension.upsert({
      where: { name: manifest.name },
      update: {
        displayName: manifest.displayName,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        category: manifest.category,
        sourceType: 'STORE',
        sourceUrl: githubUrl,
        isEnabled: true,
      },
      create: {
        name: manifest.name,
        displayName: manifest.displayName,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        category: manifest.category,
        sourceType: 'STORE',
        sourceUrl: githubUrl,
        isBuiltIn: false,
        isEnabled: true,
      },
    });

    addJobLog(jobId, 'Extension registered in database', 'success');

    // Trigger restart process
    await restartApplication(jobId);

  } catch (error: any) {
    updateJobProgress(jobId, {
      phase: 'failed',
      progress: 0,
      status: 'Installation failed',
      error: error.message,
    });
    addJobLog(jobId, `Installation failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Uninstall extension with automatic restart
 */
export async function uninstallExtension(extensionName: string): Promise<string> {
  const jobId = generateJobId();

  // Start job in background
  (async () => {
    try {
      updateJobProgress(jobId, {
        phase: 'stopping',
        progress: 10,
        status: 'Removing extension',
      });
      addJobLog(jobId, `Uninstalling extension: ${extensionName}`, 'info');

      // Check if extension exists
      const extension = await db.editorExtension.findUnique({
        where: { name: extensionName },
      });

      if (!extension) {
        throw new Error(`Extension ${extensionName} not found`);
      }

      if (extension.isBuiltIn) {
        throw new Error('Cannot uninstall built-in extensions');
      }

      // Remove from filesystem
      // Try to find the extension in author subdirectories
      const extDir = extension.author
        ? path.join(EXTENSIONS_DIR, extension.author, extensionName)
        : path.join(EXTENSIONS_DIR, extensionName); // Fallback for legacy paths

      try {
        await fs.rm(extDir, { recursive: true, force: true });
        addJobLog(jobId, 'Extension files removed', 'success');
      } catch (err: any) {
        addJobLog(jobId, `Warning: Could not remove files: ${err.message}`, 'info');
      }

      // Remove from database
      await db.editorExtension.delete({
        where: { name: extensionName },
      });
      addJobLog(jobId, 'Extension removed from database', 'success');

      // Trigger restart (failsafe)
      await restartApplication(jobId);

    } catch (error: any) {
      updateJobProgress(jobId, {
        phase: 'failed',
        progress: 0,
        status: 'Uninstallation failed',
        error: error.message,
      });
      addJobLog(jobId, `Uninstallation failed: ${error.message}`, 'error');
    }
  })();

  return jobId;
}

/**
 * Start installation job (returns job ID immediately)
 */
export function startInstallation(githubUrl: string): string {
  const jobId = generateJobId();
  console.log(`[Job ${jobId}] Starting installation for: ${githubUrl}`);

  // Initialize job tracker immediately so frontend can poll
  updateJobProgress(jobId, {
    phase: 'stopping',
    progress: 0,
    status: 'Starting installation',
    logs: [],
  });

  console.log(`[Job ${jobId}] Job tracker initialized, tracker now has ${jobTracker.size} jobs`);

  // Start installation in background
  installExtension(githubUrl, jobId).catch((err) => {
    console.error('Installation failed:', err);
  });

  return jobId;
}
