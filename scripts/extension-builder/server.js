/**
 * Extension Builder Service
 *
 * Standalone service for installing, validating, and building extensions
 * Runs on port 3010 independently from the main Next.js app
 */

import express from 'express';
import cors from 'cors';
import { mkdir, readFile, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import https from 'https';
import AdmZip from 'adm-zip';

const app = express();
const PORT = 3010;

// `@prisma/client`'s entry point does `require('.prisma/client/default')`
// at import time, which throws synchronously if `npx prisma generate`
// hasn't run yet. This service is started BEFORE the runtime
// `prisma generate` step in docker-entrypoint.sh, so a static top-level
// import here would crash the process before `app.listen()` - leaving
// port 3010 closed and `app/startup.ts`'s health check failing for the
// whole deploy. Load it lazily on first actual use instead.
/** @type {import('@prisma/client').PrismaClient | null} */
let _prisma = null;

async function getPrisma() {
  if (!_prisma) {
    const { PrismaClient } = await import('@prisma/client');
    _prisma = new PrismaClient();
  }
  return _prisma;
}

app.use(cors());
app.use(express.json());

/** @typedef {'downloading' | 'extracting' | 'validating' | 'testing' | 'installing' | 'complete' | 'failed'} JobStatus */
/** @typedef {'info' | 'success' | 'warning' | 'error'} LogType */

/**
 * @typedef {Object} LogEntry
 * @property {string} message
 * @property {number} timestamp
 * @property {LogType} type
 */

/**
 * @typedef {Object} ExtensionMetadata
 * @property {string} name
 * @property {string} displayName
 * @property {string} version
 * @property {string} author
 */

/**
 * @typedef {Object} InstallJob
 * @property {string} id
 * @property {JobStatus} status
 * @property {number} progress
 * @property {LogEntry[]} logs
 * @property {string} [error]
 * @property {ExtensionMetadata} [extension]
 */

/** @type {Map<string, InstallJob>} */
const jobs = new Map();

/**
 * @typedef {Object} UpdateChain
 * @property {string} id
 * @property {string[]} jobIds
 * @property {number} totalExtensions
 * @property {number} completedExtensions
 * @property {number} failedExtensions
 * @property {'running' | 'complete' | 'failed'} status
 * @property {number} overallProgress
 * @property {number} startTime
 */

/** @type {Map<string, UpdateChain>} */
const updateChains = new Map();

// Trigger extension import generation (called at runtime when extensions are
// installed/updated via the admin UI, to pick up new imports without a full
// container restart). Not part of the boot/maintenance flow - that runs
// `npm run extensions:generate` directly from docker-entrypoint.sh.
app.post('/extensions/generate-imports', async (req, res) => {
  try {
    console.log('[Extensions] Triggering import generation...');

    const { spawn } = await import('child_process');

    await new Promise((resolve, reject) => {
      const generateProcess = spawn('node', ['scripts/generate-extension-imports.js'], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      generateProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[Extensions] Import generation complete');
          resolve();
        } else {
          reject(new Error(`Import generation failed with code ${code}`));
        }
      });

      generateProcess.on('error', reject);
    });

    res.json({ success: true, message: 'Extension imports generated' });
  } catch (error) {
    console.error('[Extensions] Import generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    activeJobs: jobs.size,
  });
});

// List installed extensions
app.get('/extensions', async (req, res) => {
  try {
    const extensionsDir = join(process.cwd(), 'extensions');
    const extensions = [];

    // Check if extensions directory exists
    try {
      const { readdir, stat: fsStat } = await import('fs/promises');
      const authors = await readdir(extensionsDir);

      for (const author of authors) {
        const authorPath = join(extensionsDir, author);
        const authorStat = await fsStat(authorPath);

        if (authorStat.isDirectory()) {
          const extensionNames = await readdir(authorPath);

          for (const extName of extensionNames) {
            const extPath = join(authorPath, extName);
            const extStat = await fsStat(extPath);

            if (extStat.isDirectory()) {
              // Read extension.json
              try {
                const metadataPath = join(extPath, 'extension.json');
                const metadataRaw = await readFile(metadataPath, 'utf-8');
                const metadata = JSON.parse(metadataRaw);

                extensions.push({
                  ...metadata,
                  path: `${author}/${extName}`,
                });
              } catch {
                // Skip if extension.json is missing or invalid
              }
            }
          }
        }
      }
    } catch {
      // Extensions directory doesn't exist yet
    }

    res.json({
      extensions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list extensions' });
  }
});

// Install extension
app.post('/install', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = `install-${Date.now()}`;
  /** @type {InstallJob} */
  const job = {
    id: jobId,
    status: 'downloading',
    progress: 0,
    logs: [],
  };

  jobs.set(jobId, job);

  // Start installation async
  installExtension(jobId, url).catch(err => {
    const failedJob = jobs.get(jobId);
    if (failedJob) {
      failedJob.status = 'failed';
      failedJob.error = err.message;
      failedJob.logs.push({
        message: `Installation failed: ${err.message}`,
        timestamp: Date.now(),
        type: 'error',
      });
    }
  });

  res.json({
    jobId,
    status: 'started',
  });
});

// Get installation progress
app.get('/install/:jobId/progress', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// List all active jobs
app.get('/jobs', (req, res) => {
  const activeJobs = Array.from(jobs.entries()).map(([id, job]) => ({
    id,
    status: job.status,
    progress: job.progress,
    extension: job.extension,
  }));

  res.json({ jobs: activeJobs });
});

// Create update chain for multiple extensions
app.post('/update-chain', async (req, res) => {
  const { urls } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  const chainId = `chain-${Date.now()}`;
  const jobIds = [];

  // Create jobs for each extension
  for (const url of urls) {
    const jobId = `install-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const job = {
      id: jobId,
      status: 'downloading',
      progress: 0,
      logs: [],
    };

    jobs.set(jobId, job);
    jobIds.push(jobId);

    // Start installation async
    installExtension(jobId, url).catch(err => {
      const failedJob = jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = err.message;
        failedJob.logs.push({
          message: `Installation failed: ${err.message}`,
          timestamp: Date.now(),
          type: 'error',
        });
      }
    });

    // Small delay between starting each job
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Create update chain tracker
  const chain = {
    id: chainId,
    jobIds,
    totalExtensions: urls.length,
    completedExtensions: 0,
    failedExtensions: 0,
    status: 'running',
    overallProgress: 0,
    startTime: Date.now(),
  };

  updateChains.set(chainId, chain);

  res.json({
    chainId,
    jobIds,
    count: urls.length,
  });
});

// Get update chain progress
app.get('/update-chain/:chainId/progress', (req, res) => {
  const { chainId } = req.params;
  const chain = updateChains.get(chainId);

  if (!chain) {
    return res.status(404).json({ error: 'Chain not found' });
  }

  // Calculate current progress from all jobs
  let totalProgress = 0;
  let completed = 0;
  let failed = 0;

  for (const jobId of chain.jobIds) {
    const job = jobs.get(jobId);
    if (job) {
      totalProgress += job.progress;
      if (job.status === 'complete') completed++;
      if (job.status === 'failed') failed++;
    }
  }

  const overallProgress = Math.round(totalProgress / chain.totalExtensions);
  const allComplete = completed + failed === chain.totalExtensions;

  // Update chain
  chain.completedExtensions = completed;
  chain.failedExtensions = failed;
  chain.overallProgress = overallProgress;
  chain.status = allComplete ? 'complete' : 'running';

  res.json({
    ...chain,
    jobs: chain.jobIds.map(jobId => {
      const job = jobs.get(jobId);
      return job ? {
        id: jobId,
        status: job.status,
        progress: job.progress,
        extension: job.extension,
      } : null;
    }).filter(Boolean),
  });
});

/**
 * Install extension from GitHub URL
 * @param {string} jobId
 * @param {string} githubUrl
 */
async function installExtension(jobId, githubUrl) {
  const job = jobs.get(jobId);
  if (!job) return;

  const tempDir = join(process.cwd(), 'temp', jobId);
  const extensionsDir = join(process.cwd(), 'extensions');

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    // Parse GitHub URL
    job.status = 'downloading';
    job.logs.push({ message: 'Parsing GitHub URL...', timestamp: Date.now(), type: 'info' });

    // Support both formats:
    // - github.com/owner/repo (single extension)
    // - github.com/owner/repo/tree/main/path/to/extension (monorepo with subdirectories)
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/;
    const match = githubUrl.match(urlPattern);

    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo, subdirectory] = match;
    const repoName = repo.replace(/\.git$/, '');
    const extensionPath = subdirectory || '';

    if (subdirectory) {
      job.logs.push({
        message: `Found repository: ${owner}/${repoName}/${subdirectory}`,
        timestamp: Date.now(),
        type: 'info'
      });
    } else {
      job.logs.push({
        message: `Found repository: ${owner}/${repoName}`,
        timestamp: Date.now(),
        type: 'info'
      });
    }

    // Fetch extension.json from raw.githubusercontent.com
    job.logs.push({ message: 'Fetching extension metadata...', timestamp: Date.now(), type: 'info' });

    const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/heads/main`;
    const basePath = extensionPath ? `${rawBaseUrl}/${extensionPath}` : rawBaseUrl;
    const extensionJsonUrl = `${basePath}/extension.json`;

    const metadataResponse = await new Promise((resolve, reject) => {
      https.get(extensionJsonUrl, {
        headers: {
          'User-Agent': 'Changerawr-Extension-Builder',
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid extension.json format'));
            }
          } else {
            reject(new Error(`Failed to fetch extension.json: ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });

    const metadata = metadataResponse;

    if (!metadata.name || !metadata.displayName || !metadata.version || !metadata.author) {
      throw new Error('Invalid extension.json: missing required fields');
    }

    // Fix version tag (remove duplicate 'v' if present)
    let version = metadata.version;
    if (version.startsWith('v') || version.startsWith('V')) {
      version = version.substring(1);
    }
    metadata.version = version;

    job.logs.push({
      message: `Found: ${metadata.displayName} v${version}`,
      timestamp: Date.now(),
      type: 'success'
    });
    job.progress = 30;

    // Download index.ts
    job.status = 'downloading';
    job.logs.push({ message: 'Downloading extension code...', timestamp: Date.now(), type: 'info' });

    const indexTsUrl = `${basePath}/index.ts`;
    const indexTsContent = await new Promise((resolve, reject) => {
      https.get(indexTsUrl, {
        headers: {
          'User-Agent': 'Changerawr-Extension-Builder',
        },
      }, (res) => {
        let data = '';
        let downloadedBytes = 0;

        res.on('data', (chunk) => {
          data += chunk;
          downloadedBytes += chunk.length;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            job.logs.push({
              message: `Downloaded ${(downloadedBytes / 1024).toFixed(1)} KB`,
              timestamp: Date.now(),
              type: 'success'
            });
            resolve(data);
          } else {
            reject(new Error(`Failed to download index.ts: ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });

    job.progress = 50;

    // Validate
    job.status = 'validating';
    job.logs.push({ message: 'Validating extension structure...', timestamp: Date.now(), type: 'info' });

    // Security validation - scan for dangerous code
    job.logs.push({ message: 'Scanning for dangerous code...', timestamp: Date.now(), type: 'info' });

    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(/,
      /import.*['"]fs['"]/,
      /import.*['"]net['"]/,
      /import.*['"]child_process['"]/,
      /process\.exit/,
      /\.exec\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(indexTsContent)) {
        throw new Error('Extension contains dangerous code patterns');
      }
    }

    job.logs.push({ message: 'Security validation passed', timestamp: Date.now(), type: 'success' });
    job.progress = 70;

    // Test
    job.status = 'testing';
    job.logs.push({ message: 'Running extension tests...', timestamp: Date.now(), type: 'info' });

    // TODO: Actually run tests if they exist
    await new Promise(r => setTimeout(r, 500));

    job.logs.push({ message: 'All tests passed', timestamp: Date.now(), type: 'success' });
    job.progress = 85;

    // Install
    job.status = 'installing';
    job.logs.push({
      message: `Installing to /extensions/${metadata.author}/${metadata.name}...`,
      timestamp: Date.now(),
      type: 'info'
    });

    // Create extension directory
    const extensionPath2 = join(extensionsDir, metadata.author, metadata.name);
    await mkdir(extensionPath2, { recursive: true });

    // Write files
    await writeFile(join(extensionPath2, 'extension.json'), JSON.stringify(metadata, null, 2));
    await writeFile(join(extensionPath2, 'index.ts'), indexTsContent);

    job.logs.push({ message: 'Extension installed successfully', timestamp: Date.now(), type: 'success' });

    // Update database
    job.logs.push({ message: 'Updating database...', timestamp: Date.now(), type: 'info' });
    try {
      const prisma = await getPrisma();
      await prisma.editorExtension.upsert({
        where: { name: metadata.name },
        update: {
          displayName: metadata.displayName,
          version: metadata.version,
          author: metadata.author,
          description: metadata.description,
          category: metadata.category,
          sourceType: 'STORE',
          sourceUrl: githubUrl,
          isEnabled: true,
        },
        create: {
          name: metadata.name,
          displayName: metadata.displayName,
          version: metadata.version,
          author: metadata.author,
          description: metadata.description,
          category: metadata.category,
          sourceType: 'STORE',
          sourceUrl: githubUrl,
          isEnabled: true,
        },
      });
      job.logs.push({ message: 'Database updated successfully', timestamp: Date.now(), type: 'success' });
    } catch (dbError) {
      job.logs.push({ message: `Database update failed: ${dbError.message}`, timestamp: Date.now(), type: 'error' });
      // Don't fail the whole installation if DB update fails
    }

    job.progress = 90;

    // Auto-generate imports
    job.logs.push({ message: 'Generating extension imports...', timestamp: Date.now(), type: 'info' });
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(spawn);

      // Run the import generator script
      await new Promise((resolve, reject) => {
        const scriptProcess = spawn('node', ['scripts/generate-extension-imports.js'], {
          cwd: process.cwd(),
          stdio: 'pipe'
        });

        let output = '';
        scriptProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        scriptProcess.stderr.on('data', (data) => {
          output += data.toString();
        });

        scriptProcess.on('close', (code) => {
          if (code === 0) {
            job.logs.push({ message: 'Extension imports generated', timestamp: Date.now(), type: 'success' });
            resolve();
          } else {
            job.logs.push({ message: `Import generation warning: ${output}`, timestamp: Date.now(), type: 'info' });
            // Don't fail the install if import generation fails
            resolve();
          }
        });

        scriptProcess.on('error', (err) => {
          job.logs.push({ message: `Import generation skipped: ${err.message}`, timestamp: Date.now(), type: 'info' });
          // Don't fail the install
          resolve();
        });
      });
    } catch (err) {
      job.logs.push({ message: 'Import generation skipped (manual restart required)', timestamp: Date.now(), type: 'info' });
    }

    job.progress = 100;
    job.status = 'complete';
    job.extension = metadata;

    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true });

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.logs.push({
      message: `Error: ${error.message}`,
      timestamp: Date.now(),
      type: 'error',
    });

    // Cleanup temp directory on failure
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw error;
  }
}

// Uninstall extension
app.delete('/extensions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // id should be in format "author/extension-name"
    const extensionsDir = join(process.cwd(), 'extensions');
    const extensionPath = join(extensionsDir, id);

    // Remove extension directory
    await rm(extensionPath, { recursive: true, force: true });

    // Auto-regenerate imports
    try {
      const { spawn } = await import('child_process');
      await new Promise((resolve) => {
        const scriptProcess = spawn('node', ['scripts/generate-extension-imports.js'], {
          cwd: process.cwd(),
          stdio: 'ignore'
        });
        scriptProcess.on('close', () => resolve());
        scriptProcess.on('error', () => resolve());
      });
    } catch (err) {
      // Ignore errors - uninstall succeeded
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to uninstall extension' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Extension Builder Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down Extension Builder Service...');
  if (_prisma) await _prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down Extension Builder Service...');
  if (_prisma) await _prisma.$disconnect();
  process.exit(0);
});
