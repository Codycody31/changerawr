'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FolderOpen, FileArchive, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UploadExtensionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload?: (file: File) => Promise<void>;
  onLocalPath?: (path: string) => Promise<void>;
}

type UploadStep = 'select' | 'uploading' | 'done' | 'error';

export function UploadExtensionDialog({
  isOpen,
  onOpenChange,
  onUpload,
  onLocalPath,
}: UploadExtensionDialogProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const reset = () => {
    setSelectedFile(null);
    setLocalPath('');
    setStep('select');
    setError('');
    setIsDragging(false);
    setUploadProgress(0);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(f => f.name.endsWith('.zip'));

    if (zipFile) {
      setSelectedFile(zipFile);
    } else {
      setError('Please drop a .zip file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a .zip file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStep('uploading');
    setError('');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      if (onUpload) {
        await onUpload(selectedFile);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setStep('done');

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload extension');
      setStep('error');
    }
  };

  const handleLocalPath = async () => {
    if (!localPath.trim()) return;

    setStep('uploading');
    setError('');

    try {
      if (onLocalPath) {
        await onLocalPath(localPath);
      }

      setStep('done');

      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to link extension');
      setStep('error');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-lg">
        <VisuallyHidden>
          <DialogTitle>Upload Extension</DialogTitle>
          <DialogDescription>Upload a .zip file or link to a local directory</DialogDescription>
        </VisuallyHidden>

        {step === 'select' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Upload Extension</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a .zip archive or link to a local directory
              </p>
            </div>

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <FileArchive className="h-4 w-4 mr-2" />
                  Upload .zip
                </TabsTrigger>
                <TabsTrigger value="local">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Local Path
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload" className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                    ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}
                  `}
                >
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Drop your .zip file here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </div>
                      <Input
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Browse Files
                      </Button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 dark:text-amber-100">
                      <strong>Note:</strong> The .zip must contain an extension.json file and valid extension code.
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={!selectedFile}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </TabsContent>

              {/* Local Path Tab */}
              <TabsContent value="local" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="local-path">Local Directory Path</Label>
                  <Input
                    id="local-path"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder="/path/to/extension or C:\path\to\extension"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Absolute path to the extension directory on your filesystem
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Dev Mode:</strong> Changes in the linked directory will be hot-reloaded.
                    Perfect for extension development.
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLocalPath} disabled={!localPath.trim()}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Link Directory
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">
                {selectedFile ? 'Uploading Extension...' : 'Linking Extension...'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we process your extension
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Success!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Extension has been {selectedFile ? 'uploaded' : 'linked'} successfully
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Upload Failed</h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep('select')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
