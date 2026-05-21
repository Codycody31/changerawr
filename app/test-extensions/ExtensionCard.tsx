'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExtensionMetadata {
  name: string;
  displayName: string;
  version: string;
  author?: string;
  description?: string;
  isBuiltIn?: boolean;
}

interface ExtensionCardProps {
  extension: {
    metadata: ExtensionMetadata;
  };
  onUninstall?: () => void;
}

export function ExtensionCard({ extension, onUninstall }: ExtensionCardProps) {
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUninstall = async () => {
    if (extension.metadata.isBuiltIn) return;

    setIsUninstalling(true);
    setError(null);

    try {
      const extensionId = `${extension.metadata.author}/${extension.metadata.name}`;
      const response = await fetch(`/api/extensions/${extensionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to uninstall extension');
      }

      setShowUninstallDialog(false);

      // Notify parent
      if (onUninstall) {
        onUninstall();
      }

      // Reload page to refresh extension list
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to uninstall extension');
      setIsUninstalling(false);
    }
  };

  return (
    <>
      <div className="p-4 border rounded bg-card">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{extension.metadata.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {extension.metadata.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="text-xs">
              {extension.metadata.isBuiltIn ? (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                  Built-in
                </span>
              ) : (
                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded">
                  External
                </span>
              )}
            </div>
            {!extension.metadata.isBuiltIn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUninstallDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          v{extension.metadata.version} • {extension.metadata.author || 'Unknown'}
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      <AlertDialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Extension?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uninstall <strong>{extension.metadata.displayName}</strong>?
              <br />
              This will remove the extension files and reload the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUninstalling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={isUninstalling}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isUninstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUninstalling ? 'Uninstalling...' : 'Uninstall'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
