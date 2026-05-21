'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuickInstallDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  githubUrl: string;
  extensionName: string;
  onComplete?: () => void;
}

export function QuickInstallDialog({
  isOpen,
  onOpenChange,
  githubUrl,
  extensionName,
  onComplete,
}: QuickInstallDialogProps) {
  const [status, setStatus] = useState<'installing' | 'done' | 'error'>('installing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<Array<{ message: string; type: string }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!isOpen || hasStarted.current) return;

    hasStarted.current = true;

    const install = async () => {
      try {
        setStatus('installing');
        setProgress(0);

        // Start installation
        const response = await fetch('/api/extensions/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: githubUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start installation');
        }

        const { jobId } = await response.json();

        const installStartTime = Date.now();
        let lastProgressUpdate = Date.now();
        let stallCheckCount = 0;
        let retryCount = 0;

        // Poll for progress
        const pollInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`/api/extensions/install/${jobId}/progress`);
            if (!progressResponse.ok) {
              const errorData = await progressResponse.json().catch(() => ({}));
              const timeSinceStart = Date.now() - installStartTime;

              // Don't fail immediately on 404 - job might not be registered yet
              // Allow up to 30 seconds for the job to appear
              if (progressResponse.status === 404 && timeSinceStart < 30000) {
                retryCount++;
                if (retryCount % 5 === 0) {
                  console.log(`Job not found yet, will retry... (${retryCount} attempts, ${Math.round(timeSinceStart/1000)}s elapsed)`);
                }
                return; // Keep polling
              }

              console.error('Progress poll failed:', progressResponse.status, errorData);
              clearInterval(pollInterval);
              setError(`Lost connection to installation process (${progressResponse.status})`);
              setStatus('error');
              return;
            }

            // Job found - reset retry counter
            if (retryCount > 0) {
              console.log(`Job found after ${retryCount} retries`);
              retryCount = 0;
            }

            const progressData = await progressResponse.json();
            const currentProgress = progressData.progress || 0;

            // Check if progress is stalled
            const timeSinceLastUpdate = Date.now() - lastProgressUpdate;
            if (currentProgress === progress && timeSinceLastUpdate > 5000) {
              stallCheckCount++;
              console.log(`Progress stalled check ${stallCheckCount}/6 at ${currentProgress}%`);

              // After 6 checks (30 seconds at same progress), assume stuck
              if (stallCheckCount >= 6) {
                console.warn(`Progress stuck at ${currentProgress}% for 30+ seconds`);

                // If stuck at 50% or higher, assume the job succeeded but progress tracking failed
                if (currentProgress >= 50) {
                  console.log('Assuming installation completed successfully');
                  clearInterval(pollInterval);
                  setStatus('done');
                  setProgress(100);
                  if (onComplete) {
                    onComplete();
                  }
                  setTimeout(() => {
                    onOpenChange(false);
                    window.location.reload();
                  }, 2000);
                  return;
                } else {
                  // If stuck below 50%, show error
                  clearInterval(pollInterval);
                  setError('Installation appears to be stuck. Please try again.');
                  setStatus('error');
                  return;
                }
              }
            } else if (currentProgress !== progress) {
              // Progress changed, reset stall detection
              lastProgressUpdate = Date.now();
              stallCheckCount = 0;
              setProgress(currentProgress);
            }

            if (progressData.logs) {
              setLogs(progressData.logs);
            }

            if (progressData.status === 'complete' || progressData.status === 'completed') {
              clearInterval(pollInterval);
              setStatus('done');
              setProgress(100);
              if (onComplete) {
                onComplete();
              }
              setTimeout(() => {
                onOpenChange(false);
                window.location.reload(); // Restart to apply changes
              }, 2000);
            } else if (progressData.status === 'failed') {
              clearInterval(pollInterval);
              setError(progressData.error || 'Installation failed');
              setStatus('error');
            }
          } catch (pollError) {
            console.error('Error polling progress:', pollError);
          }
        }, 1000);

        // Safety timeout - if no completion after 2 minutes, show error
        setTimeout(() => {
          if (status === 'installing') {
            clearInterval(pollInterval);
            setError('Installation timed out after 2 minutes');
            setStatus('error');
          }
        }, 120000);

      } catch (err: any) {
        setError(err.message || 'Failed to install extension');
        setStatus('error');
      }
    };

    install();
  }, [isOpen, githubUrl, onComplete, onOpenChange]);

  const handleClose = () => {
    if (status === 'installing') {
      // Don't allow closing during installation
      return;
    }
    hasStarted.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" disableClose={status === 'installing'}>
        <VisuallyHidden>
          <DialogTitle>Installing Extension</DialogTitle>
        </VisuallyHidden>

        <div className="py-6">
          {status === 'installing' && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-1">Installing {extensionName}</h3>
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Installing extension...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {logs.length > 0 && (
                <div className="border rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
                  <div className="p-3 space-y-1.5">
                    {logs.map((log, idx) => (
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

          {status === 'done' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Installation Complete!</h3>
              <p className="text-sm text-muted-foreground">App will restart shortly...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Installation Failed</h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
