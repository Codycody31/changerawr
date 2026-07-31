'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationComplete, setRegenerationComplete] = useState(false);

  // Check if this is an extension import error
  const isExtensionImportError =
    error.message?.includes('Cannot find module') ||
    error.message?.includes('@/extensions') ||
    error.message?.includes('extensionLoader');

  useEffect(() => {
    console.error('Application error:', error);

    // Auto-regenerate extensions if it's an import error
    if (isExtensionImportError && !isRegenerating && !regenerationComplete) {
      handleRegenerateExtensions();
    }
  }, [error, isExtensionImportError]);

  const handleRegenerateExtensions = async () => {
    setIsRegenerating(true);

    try {
      // Call the extension builder service to regenerate imports
      const response = await fetch('http://localhost:3010/extensions/generate-imports', {
        method: 'POST',
      });

      if (response.ok) {
        setRegenerationComplete(true);
        // Give it a moment then reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setIsRegenerating(false);
        console.error('Failed to regenerate extensions');
      }
    } catch (err) {
      setIsRegenerating(false);
      console.error('Error regenerating extensions:', err);
    }
  };

  if (isExtensionImportError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Extension Import Error</h1>
            <p className="text-muted-foreground mb-4">
              {isRegenerating
                ? 'Regenerating extension imports...'
                : regenerationComplete
                ? 'Extensions regenerated successfully!'
                : 'An extension import error was detected.'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>

          {isRegenerating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Regenerating extension imports...</span>
            </div>
          )}

          {regenerationComplete && (
            <div className="text-center">
              <p className="text-sm text-green-600 dark:text-green-400">
                Reloading application...
              </p>
            </div>
          )}

          {!isRegenerating && !regenerationComplete && (
            <div className="flex gap-3">
              <Button
                onClick={handleRegenerateExtensions}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Extensions
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This usually happens when extension files are missing or corrupted.
              <br />
              Regenerating will rebuild the extension imports.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Generic error page for non-extension errors
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong!</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-mono text-muted-foreground break-all">
            {error.message}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={reset} className="flex-1" variant="default">
            Try again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex-1"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
