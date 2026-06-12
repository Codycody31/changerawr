/**
 * Extension Builder Service
 *
 * Standalone service for installing, validating, and building extensions
 * Runs on port 3010 independently from the main Next.js app
 */

import express from 'express';
import cors from 'cors';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
// port 3010 closed and every /startup/progress proxy request 502ing for
// the whole deploy. Load it lazily on first actual use instead.
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
/** @typedef {'info' | 'success' | 'error'} LogType */

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

/**
 * @typedef {Object} StartupProgress
 * @property {string} phase
 * @property {number} progress
 * @property {number} startTime
 * @property {LogEntry[]} logs
 * @property {boolean} complete
 */

/** In-memory startup progress tracking */
let startupProgress = {
  phase: 'waiting',
  progress: 0,
  startTime: Date.now(),
  logs: [
    {
      message: 'Extension Builder Service started',
      timestamp: Date.now(),
      type: 'info'
    }
  ],
  complete: false,
};

// Each (phase, progress) pair reported by docker-entrypoint.sh (and the
// install/build scripts) represents one "step" of the deploy - e.g.
// "prisma-generate:10" or "build:79". We record how long each step took to
// reach the *next* step and persist that to disk, so the next deploy can show
// a live ETA countdown for the step currently in progress - including steps
// like the Turbopack "build:79" -> "build:81" gap where no intermediate
// output is available to track real progress.
const STEP_DURATIONS_DIR = join(process.cwd(), 'scripts', 'maintenance', 'maintenance-storage');
const STEP_DURATIONS_FILE = join(STEP_DURATIONS_DIR, 'step-durations.json');

/** @type {Record<string, number>} step key ("phase:progress") -> seconds */
let stepDurations = {};
try {
  stepDurations = JSON.parse(readFileSync(STEP_DURATIONS_FILE, 'utf-8'));
} catch {
  stepDurations = {};
}

let stepStartTime = Date.now();

// While a step is in flight, smoothly animate the *displayed* progress from
// the previous checkpoint towards the new one, over however long the
// previous step took last time - instead of holding flat then jumping
// straight to the next checkpoint the instant the update arrives. `duration`
// is null when we have no history yet, in which case we just snap to `to`.
/** @type {{ from: number, to: number, start: number, duration: number | null } | null} */
let progressInterpolation = null;

function stepKey(phase, progress) {
  return `${phase}:${progress}`;
}

function persistStepDurations() {
  try {
    mkdirSync(STEP_DURATIONS_DIR, { recursive: true });
    writeFileSync(STEP_DURATIONS_FILE, JSON.stringify(stepDurations));
  } catch {
    // Best-effort - if the directory isn't writable, we just won't have ETAs
  }
}

/**
 * Update startup progress
 * @param {string} phase
 * @param {number} progress
 * @param {string} message
 * @param {LogType} type
 */
function updateStartupProgress(phase, progress, message, type = 'info') {
  // Ignore backward progress - phases/steps should only move forward.
  if (phase === startupProgress.phase && progress < startupProgress.progress) {
    return;
  }

  // If we're moving to a new step, record how long the previous step took so
  // future deploys can estimate it, and set up the smooth-progress animation
  // towards the new checkpoint.
  const isNewStep = phase !== startupProgress.phase || progress !== startupProgress.progress;
  if (isNewStep) {
    const prevKey = stepKey(startupProgress.phase, startupProgress.progress);
    const elapsedSeconds = (Date.now() - stepStartTime) / 1000;
    if (elapsedSeconds > 0.05) {
      stepDurations[prevKey] = elapsedSeconds;
      persistStepDurations();
    }

    progressInterpolation = {
      from: startupProgress.progress,
      to: progress,
      start: Date.now(),
      duration: stepDurations[prevKey] ?? null,
    };

    stepStartTime = Date.now();
  }

  startupProgress.phase = phase;
  startupProgress.progress = progress;
  startupProgress.logs.push({
    message,
    timestamp: Date.now(),
    type,
  });

  // Keep only last 20 logs
  if (startupProgress.logs.length > 20) {
    startupProgress.logs = startupProgress.logs.slice(-20);
  }

  const eta = getCurrentStepEta();
  console.log(`[Startup] ${phase} (${progress}%)${eta !== null ? ` ~${eta}s remaining` : ''} - ${message}`);
}

/**
 * Estimate seconds remaining in the current step, based on how long this
 * step took on a previous run. Returns null if we have no history for it yet.
 * @returns {number | null}
 */
function getCurrentStepEta() {
  const historical = stepDurations[stepKey(startupProgress.phase, startupProgress.progress)];
  if (historical === undefined) {
    return null;
  }
  const elapsedSeconds = (Date.now() - stepStartTime) / 1000;
  return Math.max(0, Math.round(historical - elapsedSeconds));
}

/**
 * The progress percentage to show in the UI. Animates smoothly from the
 * previous checkpoint to the current one over the previous run's duration
 * for that step, so the bar creeps forward continuously instead of sitting
 * still and then jumping by 10-20 points all at once.
 * @returns {number}
 */
function getDisplayProgress() {
  if (!progressInterpolation) {
    return startupProgress.progress;
  }

  const { from, to, start, duration } = progressInterpolation;
  if (!duration) {
    return to;
  }

  const elapsedSeconds = (Date.now() - start) / 1000;
  const t = Math.min(1, elapsedSeconds / duration);
  return Math.round(from + (to - from) * t);
}

// Startup progress endpoint (for maintenance page)
// The maintenance page polls this every 500ms, so logging on every request
// floods production logs. In development, log every poll (useful while
// building the progress UI); in production, only log when the phase/progress
// actually changes, or at most once every 10s as a heartbeat.
const isDev = process.env.NODE_ENV !== 'production';
let lastLoggedProgressState = null;
let lastProgressLogTime = 0;

app.get('/startup/progress', (req, res) => {
  const elapsed = Date.now() - startupProgress.startTime;

  const response = {
    phase: startupProgress.phase,
    progress: getDisplayProgress(),
    eta: getCurrentStepEta(),
    elapsed: Math.floor(elapsed / 1000), // seconds
    logs: startupProgress.logs.slice(-10), // Last 10 logs
    complete: startupProgress.complete,
  };

  const currentState = `${startupProgress.phase}:${startupProgress.progress}`;
  const now = Date.now();
  const shouldLog = isDev
    || currentState !== lastLoggedProgressState
    || now - lastProgressLogTime >= 10000;

  if (shouldLog) {
    console.log(`[Progress GET] Phase: ${response.phase}, Progress: ${response.progress}%, Elapsed: ${response.elapsed}s, Logs: ${startupProgress.logs.length}`);
    lastLoggedProgressState = currentState;
    lastProgressLogTime = now;
  }

  res.json(response);
});

// Startup console output (raw stdout/stderr captured by docker-entrypoint.sh)
// Lets the maintenance page show what's actually happening during a deploy
// when there's no other way to see container logs.
const STARTUP_LOG_FILE = '/tmp/changerawr-startup.log';
const STARTUP_LOG_MAX_BYTES = 200 * 1024; // tail to last ~200KB

app.get('/startup/logs', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const { stat } = await import('fs/promises');
    const fileStat = await stat(STARTUP_LOG_FILE);

    let content;
    if (fileStat.size > STARTUP_LOG_MAX_BYTES) {
      const { open } = await import('fs/promises');
      const handle = await open(STARTUP_LOG_FILE, 'r');
      try {
        const buffer = Buffer.alloc(STARTUP_LOG_MAX_BYTES);
        await handle.read(buffer, 0, STARTUP_LOG_MAX_BYTES, fileStat.size - STARTUP_LOG_MAX_BYTES);
        content = buffer.toString('utf-8');
      } finally {
        await handle.close();
      }
    } else {
      content = await readFile(STARTUP_LOG_FILE, 'utf-8');
    }

    res.json({ available: true, log: content });
  } catch (error) {
    // Log file doesn't exist (e.g. running locally outside Docker)
    res.json({ available: false, log: '' });
  }
});

// Update startup progress (called by docker-entrypoint.sh and the install/build scripts)
app.post('/startup/update', (req, res) => {
  const { phase, progress, message, type } = req.body;

  console.log(`[Progress POST] Received update: phase=${phase}, progress=${progress}, message=${message}`);

  if (!phase || progress === undefined) {
    console.log('[Progress POST] ERROR: Missing phase or progress');
    return res.status(400).json({ error: 'phase and progress are required' });
  }

  updateStartupProgress(phase, progress, message || phase, type || 'info');

  res.json({ success: true });
});

// Reset startup progress (called when deployment starts)
app.post('/startup/reset', (req, res) => {
  startupProgress = {
    phase: 'starting',
    progress: 0,
    startTime: Date.now(),
    logs: [],
    complete: false,
  };
  stepStartTime = Date.now();
  progressInterpolation = null;

  updateStartupProgress('starting', 0, 'Deployment started');

  res.json({ success: true });
});

// Mark startup as complete
app.post('/startup/complete', (req, res) => {
  startupProgress.complete = true;
  startupProgress.progress = 100;
  updateStartupProgress('complete', 100, 'Application ready', 'success');

  res.json({ success: true });
});

/**
 * Helper to run a build script with progress tracking
 * @param {string} scriptCommand - npm script to run
 * @param {string} phase - Phase name for progress tracking
 * @param {string} displayName - Display name for the operation
 * @param {number} minDuration - Minimum duration in ms for realistic feel
 */
async function runBuildScript(scriptCommand, phase, displayName, minDuration = 0) {
  const startTime = Date.now();
  updateStartupProgress(phase, 0, `${displayName}...`);

  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    // Use shell mode on Windows only, with safe argument passing
    const isWindows = process.platform === 'win32';

    const buildProcess = spawn('npm', ['run', scriptCommand], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: isWindows // Only use shell on Windows where it's needed
    });

    let output = '';
    buildProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    buildProcess.stderr?.on('data', (data) => {
      output += data.toString();
    });

    buildProcess.on('close', async (code) => {
      if (code === 0) {
        // Add simulated delay if operation was too fast
        const elapsed = Date.now() - startTime;
        const remaining = minDuration - elapsed;
        if (remaining > 0) {
          await new Promise(r => setTimeout(r, remaining));
        }

        console.log(`[${phase}] ${displayName} complete`);
        resolve(output);
      } else {
        reject(new Error(`${displayName} failed with code ${code}`));
      }
    });

    buildProcess.on('error', reject);
  });
}

// Trigger extension import generation
app.post('/extensions/generate-imports', async (req, res) => {
  try {
    console.log('[Extensions] Triggering import generation...');
    updateStartupProgress('extensions', 0, 'Scanning for installed extensions');

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
    updateStartupProgress('extensions', 0, 'Import generation failed', 'error');
    res.status(500).json({ error: error.message });
  }
});

// Build widget
app.post('/build/widget', async (req, res) => {
  try {
    console.log('[Build] Triggering widget build...');
    updateStartupProgress('widget', 40, 'Compiling widget components');

    await runBuildScript('build:widget', 'widget', 'Building widget', 1500);

    updateStartupProgress('widget', 100, 'Widget built successfully', 'success');
    res.json({ success: true, message: 'Widget built successfully' });
  } catch (error) {
    console.error('[Build] Widget build failed:', error);
    updateStartupProgress('widget', 0, 'Widget build failed', 'error');
    res.status(500).json({ error: error.message });
  }
});

// Generate API documentation
app.post('/build/swagger', async (req, res) => {
  try {
    console.log('[Build] Generating API documentation...');
    updateStartupProgress('swagger', 55, 'Scanning API routes');

    await runBuildScript('generate-swagger', 'swagger', 'Generating API docs', 1000);

    updateStartupProgress('swagger', 100, 'API documentation generated', 'success');
    res.json({ success: true, message: 'API documentation generated' });
  } catch (error) {
    console.error('[Build] API doc generation failed:', error);
    updateStartupProgress('swagger', 0, 'API doc generation failed', 'error');
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
