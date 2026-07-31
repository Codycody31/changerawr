'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Loader2, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RepairExtensionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  githubUrl: string;
  extensionName: string;
  onComplete?: () => void;
  mode?: 'repair' | 'update';
}

export function RepairExtensionDialog({
  isOpen,
  onOpenChange,
  githubUrl,
  extensionName,
  onComplete,
  mode = 'repair',
}: RepairExtensionDialogProps) {
  const [status, setStatus] = useState<'repairing' | 'done' | 'error'>('repairing');
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

    const repair = async () => {
      try {
        setStatus('repairing');
        setProgress(0);
        setLogs([{ message: mode === 'update' ? 'Starting update process...' : 'Starting repair process...', type: 'info' }]);

        // Start installation (repair uses same endpoint)
        const response = await fetch('/api/extensions/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: githubUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || (mode === 'update' ? 'Failed to start update' : 'Failed to start repair'));
        }

        const { jobId } = await response.json();

        const repairStartTime = Date.now();
        let lastProgressUpdate = Date.now();
        let stallCheckCount = 0;
        let retryCount = 0;

        // Poll for progress
        const pollInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`/api/extensions/install/${jobId}/progress`);
            if (!progressResponse.ok) {
              const errorData = await progressResponse.json().catch(() => ({}));
              const timeSinceStart = Date.now() - repairStartTime;

              // Don't fail immediately on 404 - job might not be registered yet
              if (progressResponse.status === 404 && timeSinceStart < 30000) {
                retryCount++;
                if (retryCount % 5 === 0) {
                  console.log(`Job not found yet, will retry... (${retryCount} attempts, ${Math.round(timeSinceStart/1000)}s elapsed)`);
                }
                return;
              }

              console.error('Progress poll failed:', progressResponse.status, errorData);
              clearInterval(pollInterval);
              setError(`Lost connection to repair process (${progressResponse.status})`);
              setStatus('error');
              return;
            }

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

              if (stallCheckCount >= 6) {
                console.warn(`Progress stuck at ${currentProgress}% for 30+ seconds`);

                if (currentProgress >= 50) {
                  console.log('Assuming repair completed successfully');
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
                  clearInterval(pollInterval);
                  setError(mode === 'update' ? 'Update appears to be stuck. Please try again.' : 'Repair appears to be stuck. Please try again.');
                  setStatus('error');
                  return;
                }
              }
            } else if (currentProgress !== progress) {
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
                window.location.reload();
              }, 2000);
            } else if (progressData.status === 'failed') {
              clearInterval(pollInterval);
              setError(progressData.error || 'Repair failed');
              setStatus('error');
            }
          } catch (pollError) {
            console.error('Error polling progress:', pollError);
          }
        }, 1000);

        // Safety timeout (15 minutes for updates, 2 minutes for repairs)
        const timeout = mode === 'update' ? 900000 : 120000; // 15 min or 2 min
        setTimeout(() => {
          if (status === 'repairing') {
            clearInterval(pollInterval);
            setError(mode === 'update' ? 'Update timed out after 15 minutes' : 'Repair timed out after 2 minutes');
            setStatus('error');
          }
        }, timeout);

      } catch (err: any) {
        setError(err.message || (mode === 'update' ? 'Failed to update extension' : 'Failed to repair extension'));
        setStatus('error');
      }
    };

    repair();
  }, [isOpen, githubUrl, onComplete, onOpenChange]);

  const handleClose = () => {
    if (status === 'repairing') {
      return;
    }
    hasStarted.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" disableClose={status === 'repairing'}>
        <VisuallyHidden>
          <DialogTitle>{mode === 'update' ? 'Updating' : 'Repairing'} Extension</DialogTitle>
        </VisuallyHidden>

        <div className="py-6">
          {status === 'repairing' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`w-14 h-14 ${mode === 'update' ? 'bg-blue-100 dark:bg-blue-950/30' : 'bg-orange-100 dark:bg-orange-950/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <AlertCircle className={`h-7 w-7 ${mode === 'update' ? 'text-blue-600' : 'text-orange-600'} animate-pulse`} />
                </div>
                <h3 className="text-lg font-semibold mb-1">{mode === 'update' ? 'Updating' : 'Repairing'} {extensionName}</h3>
                <p className="text-sm text-muted-foreground">{mode === 'update' ? 'Downloading latest version...' : 'Reinstalling extension files...'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{mode === 'update' ? 'Updating extension...' : 'Repairing extension...'}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${mode === 'update' ? 'bg-blue-600' : 'bg-orange-600'} transition-all duration-300`}
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
              <h3 className="text-lg font-semibold mb-1">{mode === 'update' ? 'Update' : 'Repair'} Complete!</h3>
              <p className="text-sm text-muted-foreground">Extension has been {mode === 'update' ? 'updated' : 'repaired'}. App will restart shortly...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">{mode === 'update' ? 'Update' : 'Repair'} Failed</h3>
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
