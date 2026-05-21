/**
 * Restart Manager
 *
 * Handles graceful restarts with maintenance mode
 */

import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const RESTART_FLAG_PATH = join(process.cwd(), '.restart-pending');

export interface RestartFlag {
  reason: string;
  timestamp: number;
  requestedBy?: string;
}

/**
 * Check if a restart is pending
 */
export async function isRestartPending(): Promise<boolean> {
  return existsSync(RESTART_FLAG_PATH);
}

/**
 * Get restart flag details
 */
export async function getRestartFlag(): Promise<RestartFlag | null> {
  try {
    if (!existsSync(RESTART_FLAG_PATH)) {
      return null;
    }

    const content = await readFile(RESTART_FLAG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Create a restart flag
 */
export async function createRestartFlag(reason: string, requestedBy?: string): Promise<void> {
  const flag: RestartFlag = {
    reason,
    timestamp: Date.now(),
    requestedBy,
  };

  await writeFile(RESTART_FLAG_PATH, JSON.stringify(flag, null, 2), 'utf-8');
}

/**
 * Clear restart flag
 */
export async function clearRestartFlag(): Promise<void> {
  try {
    if (existsSync(RESTART_FLAG_PATH)) {
      await unlink(RESTART_FLAG_PATH);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Trigger a graceful restart
 *
 * In production: Signals process manager to restart
 * In development: Creates flag for manual restart
 */
export async function triggerGracefulRestart(reason: string): Promise<void> {
  await createRestartFlag(reason);

  if (process.env.NODE_ENV === 'production') {
    // Signal to process manager (PM2, Docker, etc.)
    // SIGUSR2 is typically used for graceful reload
    process.kill(process.pid, 'SIGUSR2');
  }

  // In development, the flag will be checked and developer will be notified
}
