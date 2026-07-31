'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpdateExtensionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  extensionCount: number;
  onComplete?: () => void;
}

export function UpdateExtensionsDialog({
  isOpen,
  onOpenChange,
  extensionCount,
  onComplete,
}: UpdateExtensionsDialogProps) {
  const [status, setStatus] = useState<'updating' | 'done' | 'error'>('updating');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentExtension, setCurrentExtension] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isOpen || hasStarted.current) return;

    hasStarted.current = true;

    const startUpdates = async () => {
      try {
        setStatus('updating');
        setProgress(0);
        setCompletedCount(0);
        setFailedCount(0);
        setCurrentExtension('Preparing updates...');

        // Start update chain
        const response = await fetch('/api/extensions/update-all', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to start updates');
        }

        const { count, chainId } = await response.json();

        if (count === 0) {
          setStatus('done');
          setProgress(100);
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
          return;
        }

        if (!chainId) {
          throw new Error('No chain ID returned');
        }

        // Poll update chain progress
        const pollInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`http://localhost:3010/update-chain/${chainId}/progress`);

            if (!progressResponse.ok) {
              console.error('Failed to fetch chain progress:', progressResponse.status);
              return;
            }

            const chainData = await progressResponse.json();
            const overallProgress = chainData.overallProgress || 0;
            setProgress(overallProgress);

            // Update current extension being processed
            if (chainData.currentExtension) {
              setCurrentExtension(chainData.currentExtension);
            }

            // Update counts
            setCompletedCount(chainData.completedExtensions || 0);
            setFailedCount(chainData.failedExtensions || 0);

            // Check if chain is complete
            if (chainData.status === 'complete') {
              clearInterval(pollInterval);
              setProgress(100);

              // Trigger extension import regeneration
              try {
                await fetch('http://localhost:3010/extensions/generate-imports', {
                  method: 'POST',
                });
              } catch (err) {
                console.error('Failed to regenerate imports:', err);
              }

              setStatus('done');
              if (onComplete) {
                onComplete();
              }

              setTimeout(() => {
                onOpenChange(false);
                window.location.reload();
              }, 2000);
            } else if (chainData.status === 'failed') {
              clearInterval(pollInterval);
              setError('Some extensions failed to update');
              setStatus('error');
            }
          } catch (pollError) {
            console.error('Error polling update progress:', pollError);
          }
        }, 1000);

        // Safety timeout (5 minutes)
        setTimeout(() => {
          if (status === 'updating') {
            clearInterval(pollInterval);
            setError('Update timed out after 5 minutes');
            setStatus('error');
          }
        }, 300000);

      } catch (err: any) {
        setError(err.message || 'Failed to update extensions');
        setStatus('error');
      }
    };

    startUpdates();
  }, [isOpen, onComplete, onOpenChange]);

  const handleClose = () => {
    if (status === 'updating') {
      return;
    }
    hasStarted.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" disableClose={status === 'updating'}>
        <VisuallyHidden>
          <DialogTitle>Updating Extensions</DialogTitle>
        </VisuallyHidden>

        <div className="py-6">
          {status === 'updating' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCcw className="h-7 w-7 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Updating Extensions</h3>
                <p className="text-sm text-muted-foreground">
                  Updating {extensionCount} extension{extensionCount !== 1 ? 's' : ''}...
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{currentExtension}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Completed: {completedCount}</span>
                {failedCount > 0 && <span className="text-red-600">Failed: {failedCount}</span>}
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Updates Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount} extension{completedCount !== 1 ? 's' : ''} updated successfully.
                {failedCount > 0 && ` ${failedCount} failed.`}
                <br />
                App will restart shortly...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Update Failed</h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                    {completedCount > 0 && (
                      <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                        {completedCount} extension{completedCount !== 1 ? 's' : ''} updated successfully before failure.
                      </p>
                    )}
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
