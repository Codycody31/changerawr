'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader2, ExternalLink, Github } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ExtensionMetadata {
  name: string;
  displayName: string;
  version: string;
  author?: string;
  description?: string;
  category?: string;
  githubUrl?: string;
}

interface InstallExtensionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall?: (githubUrl: string) => Promise<ExtensionMetadata>;
  prefilledUrl?: string;
  autoInstall?: boolean; // Skip preview, go straight to installing
}

type InstallStep = 'input' | 'preview' | 'installing' | 'done' | 'error';

export function InstallExtensionDialog({
  isOpen,
  onOpenChange,
  onInstall,
  prefilledUrl = '',
  autoInstall = false,
}: InstallExtensionDialogProps) {
  const [url, setUrl] = useState(prefilledUrl);
  const [step, setStep] = useState<InstallStep>('input');
  const [extension, setExtension] = useState<ExtensionMetadata | null>(null);
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');
  const [installLogs, setInstallLogs] = useState<Array<{ message: string; type: string }>>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setUrl('');
    setStep('input');
    setExtension(null);
    setError('');
    setIsFetching(false);
    setIsInstalling(false);
    setInstallProgress(0);
    setInstallStatus('');
    setInstallLogs([]);
  };

  // Auto-install effect when dialog opens with autoInstall flag
  useEffect(() => {
    console.log('[InstallDialog] Effect triggered:', { isOpen, autoInstall, prefilledUrl });
    if (isOpen && autoInstall && prefilledUrl) {
      console.log('[InstallDialog] Starting auto-install for:', prefilledUrl);
      setUrl(prefilledUrl);
      // Fetch metadata then immediately install
      (async () => {
        try {
          setIsFetching(true);
          const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/;
          const match = prefilledUrl.match(urlPattern);

          if (!match) {
            throw new Error('Invalid GitHub URL format');
          }

          const [, owner, repo, subdirectory] = match;
          const repoName = repo.replace(/\.git$/, '');
          const extensionPath = subdirectory || '';
          const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/heads/main`;
          const basePath = extensionPath ? `${rawBaseUrl}/${extensionPath}` : rawBaseUrl;
          const extensionJsonUrl = `${basePath}/extension.json`;

          const metadataResponse = await fetch(extensionJsonUrl);
          if (!metadataResponse.ok) {
            throw new Error('Failed to fetch extension.json from repository');
          }

          const metadata = await metadataResponse.json();
          let version = metadata.version;
          if (version.startsWith('v') || version.startsWith('V')) {
            version = version.substring(1);
          }

          const meta: ExtensionMetadata = {
            name: metadata.name,
            displayName: metadata.displayName,
            version: version,
            author: metadata.author,
            description: metadata.description || 'No description available',
            category: metadata.category || 'blocks',
            githubUrl: prefilledUrl,
          };

          setExtension(meta);
          setIsFetching(false);

          // Immediately start installation
          setIsInstalling(true);
          setStep('installing');

          const installResponse = await fetch('/api/extensions/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: prefilledUrl }),
          });

          if (!installResponse.ok) {
            const errorData = await installResponse.json();
            throw new Error(errorData.error || 'Failed to start installation');
          }

          const { jobId } = await installResponse.json();

          // Poll for progress
          const pollInterval = setInterval(async () => {
            try {
              const progressResponse = await fetch(`/api/extensions/install/${jobId}/progress`);
              if (!progressResponse.ok) {
                clearInterval(pollInterval);
                return;
              }

              const progressData = await progressResponse.json();
              setInstallStatus(progressData.status);
              setInstallProgress(progressData.progress || 0);

              if (progressData.logs) {
                setInstallLogs(progressData.logs);
              }

              if (progressData.status === 'completed') {
                clearInterval(pollInterval);
                setStep('done');
                setIsInstalling(false);
                if (onInstall) {
                  await onInstall(prefilledUrl);
                }
              } else if (progressData.status === 'failed') {
                clearInterval(pollInterval);
                setError(progressData.error || 'Installation failed');
                setStep('error');
                setIsInstalling(false);
              }
            } catch (pollError) {
              console.error('Error polling progress:', pollError);
            }
          }, 1000);

        } catch (err: any) {
          setError(err.message || 'Failed to install extension');
          setStep('error');
          setIsFetching(false);
          setIsInstalling(false);
        }
      })();
    }
  }, [isOpen, autoInstall, prefilledUrl, onInstall]);

  const fetchMetadata = async () => {
    if (!url.trim()) return;

    setIsFetching(true);
    setError('');

    try {
      // Parse GitHub URL to fetch metadata
      // Support both formats:
      // - github.com/owner/repo (single extension)
      // - github.com/owner/repo/tree/main/path/to/extension (monorepo with subdirectories)
      const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/;
      const match = url.match(urlPattern);

      if (!match) {
        throw new Error('Invalid GitHub URL format');
      }

      const [, owner, repo, subdirectory] = match;
      const repoName = repo.replace(/\.git$/, '');
      const extensionPath = subdirectory || '';

      // Fetch extension.json from raw.githubusercontent.com
      const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/heads/main`;
      const basePath = extensionPath ? `${rawBaseUrl}/${extensionPath}` : rawBaseUrl;
      const extensionJsonUrl = `${basePath}/extension.json`;

      const metadataResponse = await fetch(extensionJsonUrl);

      if (!metadataResponse.ok) {
        throw new Error('Failed to fetch extension.json from repository');
      }

      const metadata = await metadataResponse.json();

      if (!metadata.name || !metadata.displayName || !metadata.version || !metadata.author) {
        throw new Error('Invalid extension.json: missing required fields');
      }

      // Fix version tag (remove duplicate 'v' if present)
      let version = metadata.version;
      if (version.startsWith('v') || version.startsWith('V')) {
        version = version.substring(1);
      }

      const meta: ExtensionMetadata = {
        name: metadata.name,
        displayName: metadata.displayName,
        version: version,
        author: metadata.author,
        description: metadata.description || 'No description available',
        category: metadata.category || 'blocks',
        githubUrl: url,
      };

      setExtension(meta);
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch extension');
      setStep('error');
    } finally {
      setIsFetching(false);
    }
  };

  const installExtension = async () => {
    if (!extension) return;

    setIsInstalling(true);
    setStep('installing');

    try {
      // Start installation
      const installResponse = await fetch('/api/extensions/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!installResponse.ok) {
        const errorData = await installResponse.json();
        throw new Error(errorData.error || 'Failed to start installation');
      }

      const { jobId } = await installResponse.json();

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/extensions/install/${jobId}/progress`);

          if (!progressResponse.ok) {
            clearInterval(pollInterval);
            throw new Error('Failed to get installation progress');
          }

          const job = await progressResponse.json();

          // Update progress in real-time
          setInstallProgress(job.progress || 0);
          setInstallStatus(job.status || '');
          if (job.logs && job.logs.length > 0) {
            setInstallLogs(job.logs);
          }

          if (job.status === 'complete') {
            clearInterval(pollInterval);

            if (onInstall) {
              await onInstall(url);
            }

            setStep('done');

            // Give user a moment to see success, then offer restart
            setTimeout(() => {
              // Don't auto-reload - let them click the restart button
            }, 1000);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(job.error || 'Installation failed');
          }
        } catch (e: any) {
          clearInterval(pollInterval);
          setError(e.message || 'Installation failed');
          setStep('error');
          setIsInstalling(false);
        }
      }, 500);
    } catch (e: any) {
      setError(e.message || 'Installation failed');
      setStep('error');
      setIsInstalling(false);
    }
  };

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (installLogs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [installLogs]);

  const canClose = !isFetching && !isInstalling;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!canClose) return;
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg" disableClose={!canClose}>
        <VisuallyHidden>
          <DialogTitle>Install Extension</DialogTitle>
        </VisuallyHidden>

        {step === 'input' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Install Extension</h2>
              <p className="text-sm text-muted-foreground mt-1">From GitHub repository</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Repository URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/Changerawr/extension-store/tree/main/editor/spoiler"
                onKeyDown={(e) => e.key === 'Enter' && !isFetching && fetchMetadata()}
                className="h-11"
                disabled={isFetching}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isFetching}>
                Cancel
              </Button>
              <Button onClick={fetchMetadata} disabled={!url.trim() || isFetching}>
                {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isFetching ? 'Fetching...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && extension && (
          <div className="space-y-5">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-xl font-semibold pr-16">{extension.displayName}</h2>
                <div className="absolute top-6 right-16 px-2.5 py-1 bg-muted rounded text-xs font-mono">
                  v{extension.version}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{extension.description}</p>

              <div className="flex items-center gap-3 text-sm mt-3">
                <div className="flex items-center gap-1.5">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{extension.author}</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="capitalize text-muted-foreground">{extension.category}</span>
              </div>
            </div>

            <div className="border-t border-b py-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{extension.name}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <a
                  href={extension.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-100">
                  <strong>Warning:</strong> Only install from trusted sources. Extensions run custom code.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('input')} disabled={isInstalling}>
                Back
              </Button>
              <Button onClick={installExtension} disabled={isInstalling}>
                {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
            </div>
          </div>
        )}

        {step === 'installing' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Installing {extension?.displayName}</h2>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we install the extension</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{installStatus.replace('-', ' ')}</span>
                <span className="font-medium">{installProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            </div>

            {/* Installation logs */}
            {installLogs.length > 0 && (
              <div className="border rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
                <div className="p-3 space-y-1.5">
                  {installLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-mono">
                      <span className={
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'error' ? 'text-red-600' :
                        'text-muted-foreground'
                      }>
                        {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : '•'}
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'done' && extension && (
          <div className="py-8 text-center space-y-6">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold">Installed Successfully!</div>
              <p className="text-sm text-muted-foreground mt-1">
                {extension.displayName} has been installed
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-4 text-left">
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Next Step:</strong> Restart the app to load the extension
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Later
              </Button>
              <Button onClick={async () => {
                try {
                  // Trigger restart
                  await fetch('/api/extensions/restart', { method: 'POST' });

                  // Show restarting message
                  setInstallStatus('Restarting app...');

                  // In dev mode, just show message
                  if (process.env.NODE_ENV === 'development') {
                    alert('Development mode: Please manually restart your dev server:\n\nnpm run dev');
                  } else {
                    // In production, reload after a delay
                    setTimeout(() => {
                      window.location.reload();
                    }, 3000);
                  }
                } catch (err) {
                  console.error('Restart failed:', err);
                  alert('Please manually restart the app');
                }
              }}>
                Restart Now
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 dark:text-red-100">{error}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep('input')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
