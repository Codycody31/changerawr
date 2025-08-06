'use client';

import {useState, useCallback} from 'react';
import {Upload, FileText, CheckCircle, Loader2, Code} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Progress} from '@/components/ui/progress';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {useToast} from '@/hooks/use-toast';

import {
    ImportPreview,
    ImportOptions,
    ImportResult,
    ParsedChangelog,
    ValidatedEntry
} from '@/lib/types/projects/importing';

import {CannyImportStep} from './integrations/CannyImportStep';

interface ChangelogImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    onImportComplete: (result: ImportResult) => void;
}

type ImportStep = 'source' | 'preview' | 'configure' | 'importing';
type ImportSource = 'markdown' | 'canny';

export function ChangelogImportModal({
                                         open,
                                         onOpenChange,
                                         projectId,
                                         onImportComplete
                                     }: ChangelogImportModalProps) {
    const {toast} = useToast();

    // State management
    const [currentStep, setCurrentStep] = useState<ImportStep>('source');
    const [importSource, setImportSource] = useState<ImportSource>('markdown');

    // Markdown import state
    const [markdownContent, setMarkdownContent] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [parsedChangelog, setParsedChangelog] = useState<ParsedChangelog | null>(null);

    // Common state
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [validatedEntries, setValidatedEntries] = useState<ValidatedEntry[]>([]);
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        strategy: 'merge',
        preserveExistingEntries: true,
        autoGenerateVersions: false,
        defaultTags: [],
        publishImportedEntries: false,
        dateHandling: 'preserve',
        conflictResolution: 'skip'
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');

    // File upload handler for markdown
    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
            toast({
                title: 'Invalid file type',
                description: 'Please upload a Markdown (.md) or text (.txt) file.',
                variant: 'destructive'
            });
            return;
        }

        try {
            const content = await file.text();
            setMarkdownContent(content);
            await processMarkdown(content);
        } catch {
            toast({
                title: 'Error reading file',
                description: 'Failed to read the uploaded file.',
                variant: 'destructive'
            });
        }
    }, [toast]);

    // Process markdown content
    const processMarkdown = async (content: string) => {
        setIsProcessing(true);
        setImportStatus('Analyzing content structure...');

        try {
            // Simulate processing time for user feedback
            await new Promise(resolve => setTimeout(resolve, 800));

            setImportStatus('Parsing changelog entries...');
            await new Promise(resolve => setTimeout(resolve, 600));

            const response = await fetch('/api/projects/import/parse', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({content, projectId})
            });

            if (!response.ok) throw new Error('Failed to parse markdown');

            setImportStatus('Validating entries...');
            await new Promise(resolve => setTimeout(resolve, 400));

            const data = await response.json();
            setParsedChangelog(data.parsed);
            setPreview(data.preview);
            setValidatedEntries(data.validatedEntries);
            setCurrentStep('preview');

        } catch {
            toast({
                title: 'Parsing failed',
                description: 'Failed to parse the changelog content.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
            setImportStatus('');
        }
    };

    // Handle manual text input for markdown
    const handleTextSubmit = () => {
        if (!markdownContent.trim()) {
            toast({
                title: 'No content',
                description: 'Please enter some changelog content.',
                variant: 'destructive'
            });
            return;
        }
        processMarkdown(markdownContent);
    };

    // Handle Canny import
    const handleCannyImport = async (entries: ValidatedEntry[]) => {
        try {
            // Simulate validation for Canny entries
            setIsProcessing(true);
            setImportStatus('Processing Canny entries...');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create mock preview for Canny entries
            const cannyPreview: ImportPreview = {
                totalEntries: entries.length,
                validEntries: entries.length,
                invalidEntries: 0,
                duplicateVersions: [],
                missingTitles: 0,
                missingContent: 0,
                suggestedMappings: {versions: {}, tags: {}},
                warnings: [],
                errors: []
            };

            setValidatedEntries(entries);
            setPreview(cannyPreview);
            setCurrentStep('preview');

        } catch {
            toast({
                title: 'Processing failed',
                description: 'Failed to process Canny entries.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
            setImportStatus('');
        }
    };

    // Perform the import
    const performImport = async () => {
        setIsProcessing(true);
        setCurrentStep('importing');
        setImportProgress(0);
        setImportStatus('Preparing import...');

        try {
            // Check import progress
            const updateProgress = (progress: number, status: string) => {
                setImportProgress(progress);
                setImportStatus(status);
            };

            updateProgress(10, 'Validating entries...');
            await new Promise(resolve => setTimeout(resolve, 500));

            updateProgress(25, 'Checking for conflicts...');
            await new Promise(resolve => setTimeout(resolve, 400));

            updateProgress(40, 'Processing entries...');
            await new Promise(resolve => setTimeout(resolve, 600));

            const response = await fetch('/api/projects/import/process', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    projectId,
                    entries: validatedEntries.filter(e => e.isValid),
                    options: importOptions
                })
            });

            if (!response.ok) throw new Error('Import failed');

            updateProgress(70, 'Creating entries...');
            await new Promise(resolve => setTimeout(resolve, 500));

            const result: ImportResult = await response.json();

            updateProgress(90, 'Finalizing import...');
            await new Promise(resolve => setTimeout(resolve, 400));

            updateProgress(100, 'Import completed!');
            await new Promise(resolve => setTimeout(resolve, 300));

            onImportComplete(result);

            if (result.success) {
                toast({
                    title: 'Import successful',
                    description: `Imported ${result.importedCount} entries successfully.`
                });
            } else {
                toast({
                    title: 'Import completed with errors',
                    description: `${result.importedCount} imported, ${result.errorCount} failed.`,
                    variant: 'destructive'
                });
            }

        } catch {
            toast({
                title: 'Import failed',
                description: 'Failed to import the changelog entries.',
                variant: 'destructive'
            });
            setCurrentStep('configure');
        } finally {
            setIsProcessing(false);
            setImportProgress(0);
            setImportStatus('');
        }
    };

    // Reset modal state
    const resetModal = () => {
        setCurrentStep('source');
        setImportSource('markdown');
        setMarkdownContent('');
        setParsedChangelog(null);
        setPreview(null);
        setValidatedEntries([]);
        setImportProgress(0);
        setImportStatus('');
    };

    return (
        <Dialog open={open} onOpenChange={(open) => {
            onOpenChange(open);
            if (!open) resetModal();
        }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Existing Changelog</DialogTitle>
                    <DialogDescription>
                        Import your existing changelog data from various sources
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {currentStep === 'source' && (
                            <SourceSelectionStep
                                importSource={importSource}
                                onSourceChange={setImportSource}
                                markdownContent={markdownContent}
                                onMarkdownChange={setMarkdownContent}
                                onFileUpload={handleFileUpload}
                                onTextSubmit={handleTextSubmit}
                                onCannyImport={handleCannyImport}
                                isProcessing={isProcessing}
                                processingStatus={importStatus}
                            />
                        )}

                        {currentStep === 'preview' && preview && (
                            <PreviewStep
                                preview={preview}
                                validatedEntries={validatedEntries}
                                importSource={importSource}
                                onNext={() => setCurrentStep('configure')}
                                onBack={() => setCurrentStep('source')}
                            />
                        )}

                        {currentStep === 'configure' && (
                            <ConfigureStep
                                options={importOptions}
                                onOptionsChange={setImportOptions}
                                preview={preview}
                                onImport={performImport}
                                onBack={() => setCurrentStep('preview')}
                            />
                        )}

                        {currentStep === 'importing' && (
                            <ImportingStep
                                progress={importProgress}
                                status={importStatus}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SourceSelectionStep({
                                 importSource,
                                 onSourceChange,
                                 markdownContent,
                                 onMarkdownChange,
                                 onFileUpload,
                                 onTextSubmit,
                                 onCannyImport,
                                 isProcessing,
                                 processingStatus
                             }: {
    importSource: ImportSource;
    onSourceChange: (source: ImportSource) => void;
    markdownContent: string;
    onMarkdownChange: (content: string) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onTextSubmit: () => void;
    onCannyImport: (entries: ValidatedEntry[]) => void;
    isProcessing: boolean;
    processingStatus: string;
}) {
    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            className="space-y-6"
        >
            {isProcessing && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary"/>
                        <span className="text-sm font-medium">{processingStatus}</span>
                    </div>
                </div>
            )}

            {!isProcessing && (
                <>
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold">Choose Import Source</h3>
                        <p className="text-muted-foreground">
                            Select where you want to import your changelog data from
                        </p>
                    </div>

                    <Tabs value={importSource} onValueChange={(value) => onSourceChange(value as ImportSource)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="markdown" className="flex items-center gap-2">
                                <FileText className="h-4 w-4"/>
                                Markdown / Files
                            </TabsTrigger>
                            <TabsTrigger value="canny" className="flex items-center gap-2">
                                Canny
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="markdown" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* File Upload */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Upload className="h-5 w-5"/>
                                            Upload File
                                        </CardTitle>
                                        <CardDescription>
                                            Upload your existing CHANGELOG.md or similar file
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                            <input
                                                type="file"
                                                accept=".md,.txt"
                                                onChange={onFileUpload}
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label htmlFor="file-upload" className="cursor-pointer">
                                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground"/>
                                                <p className="text-sm font-medium">Click to upload</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Supports .md and .txt files
                                                </p>
                                            </label>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Manual Input */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5"/>
                                            Paste Content
                                        </CardTitle>
                                        <CardDescription>
                                            Paste your changelog content directly
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <Textarea
                                                placeholder="Paste your changelog markdown here..."
                                                value={markdownContent}
                                                onChange={(e) => onMarkdownChange(e.target.value)}
                                                className="min-h-[150px] font-mono text-sm"
                                            />
                                            <Button
                                                onClick={onTextSubmit}
                                                disabled={!markdownContent.trim()}
                                                className="w-full"
                                            >
                                                Parse Content
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Format Help */}
                            <Alert>
                                <AlertDescription>
                                    <strong>Supported formats:</strong> Keep a Changelog, GitHub Releases,
                                    or any markdown with version headers. The parser will automatically
                                    detect the format and extract entries.
                                </AlertDescription>
                            </Alert>
                        </TabsContent>

                        <TabsContent value="canny">
                            <CannyImportStep
                                onImport={onCannyImport}
                                isProcessing={isProcessing}
                            />
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </motion.div>
    );
}

function PreviewStep({
                         preview,
                         validatedEntries,
                         importSource,
                         onNext,
                         onBack
                     }: {
    preview: ImportPreview;
    validatedEntries: ValidatedEntry[];
    importSource: ImportSource;
    onNext: () => void;
    onBack: () => void;
}) {
    const validEntries = validatedEntries.filter(e => e.isValid);

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            className="space-y-6"
        >
            {/* Source Badge */}
            <div className="flex items-center justify-center">
                <Badge variant="outline" className="flex items-center gap-2">
                    {importSource === 'markdown' ? (
                        <FileText className="h-3 w-3"/>
                    ) : (
                        <Code className="h-3 w-3"/>
                    )}
                    {importSource === 'markdown' ? 'Markdown Import' : 'Canny Import'}
                </Badge>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{preview.validEntries}</div>
                        <div className="text-sm text-muted-foreground">Valid Entries</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{preview.invalidEntries}</div>
                        <div className="text-sm text-muted-foreground">Invalid Entries</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{preview.duplicateVersions.length}</div>
                        <div className="text-sm text-muted-foreground">Conflicts</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{preview.totalEntries}</div>
                        <div className="text-sm text-muted-foreground">Total Found</div>
                    </CardContent>
                </Card>
            </div>

            {/* Warnings and Errors */}
            {(preview.warnings.length > 0 || preview.errors.length > 0) && (
                <div className="space-y-2">
                    {preview.warnings.length > 0 && (
                        <Alert variant="warning">
                            <AlertDescription>
                                <strong>Warnings ({preview.warnings.length}):</strong>
                                <ul className="mt-1 list-disc list-inside text-sm">
                                    {preview.warnings.slice(0, 3).map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                    {preview.warnings.length > 3 && (
                                        <li>...and {preview.warnings.length - 3} more</li>
                                    )}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {preview.errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                <strong>Errors ({preview.errors.length}):</strong>
                                <ul className="mt-1 list-disc list-inside text-sm">
                                    {preview.errors.slice(0, 3).map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                    {preview.errors.length > 3 && (
                                        <li>...and {preview.errors.length - 3} more</li>
                                    )}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Entry Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Preview Entries</CardTitle>
                    <CardDescription>
                        First few entries that will be imported
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {validEntries.slice(0, 5).map((entry, i) => (
                            <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0"/>
                                        <span className="font-medium truncate">{entry.title}</span>
                                        {entry.version && (
                                            <Badge variant="secondary" className="text-xs">
                                                {entry.version}
                                            </Badge>
                                        )}
                                        {importSource === 'canny' && (
                                            <Badge variant="outline" className="text-xs">
                                                Canny
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {entry.content}
                                    </p>
                                    {entry.tags && entry.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {entry.tags.slice(0, 3).map((tag, tagIndex) => (
                                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {entry.tags.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{entry.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {validEntries.length > 5 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                                ...and {validEntries.length - 5} more entries
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Back to Source
                </Button>
                <Button
                    onClick={onNext}
                    disabled={preview.validEntries === 0}
                >
                    Configure Import
                </Button>
            </div>
        </motion.div>
    );
}

function ConfigureStep({
                           options,
                           onOptionsChange,
                           preview,
                           onImport,
                           onBack
                       }: {
    options: ImportOptions;
    onOptionsChange: (options: ImportOptions) => void;
    preview: ImportPreview | null;
    onImport: () => void;
    onBack: () => void;
}) {
    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Import Strategy */}
                <Card>
                    <CardHeader>
                        <CardTitle>Import Strategy</CardTitle>
                        <CardDescription>
                            How should we handle existing entries?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <RadioGroup
                            value={options.strategy}
                            onValueChange={(value: 'merge' | 'replace' | 'append') =>
                                onOptionsChange({...options, strategy: value})
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="merge" id="merge"/>
                                <Label htmlFor="merge">Merge with existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="append" id="append"/>
                                <Label htmlFor="append">Add to existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="replace" id="replace"/>
                                <Label htmlFor="replace">Replace all existing</Label>
                            </div>
                        </RadioGroup>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="preserve-existing"
                                checked={options.preserveExistingEntries}
                                onCheckedChange={(checked) =>
                                    onOptionsChange({...options, preserveExistingEntries: !!checked})
                                }
                            />
                            <Label htmlFor="preserve-existing" className="text-sm">
                                Preserve existing entries
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Conflict Resolution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Conflict Resolution</CardTitle>
                        <CardDescription>
                            What to do when versions conflict?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <RadioGroup
                            value={options.conflictResolution}
                            onValueChange={(value: 'skip' | 'overwrite' | 'prompt') =>
                                onOptionsChange({...options, conflictResolution: value})
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="skip" id="skip"/>
                                <Label htmlFor="skip">Skip conflicting entries</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="overwrite" id="overwrite"/>
                                <Label htmlFor="overwrite">Overwrite existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="prompt" id="prompt"/>
                                <Label htmlFor="prompt">Prompt for each conflict</Label>
                            </div>
                        </RadioGroup>

                        {preview?.duplicateVersions && preview.duplicateVersions.length > 0 && (
                            <Alert variant="warning">
                                <AlertDescription>
                                    <strong>Conflicts detected:</strong> {preview.duplicateVersions.join(', ')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Publishing Options */}
                <Card>
                    <CardHeader>
                        <CardTitle>Publishing Options</CardTitle>
                        <CardDescription>
                            Control how entries are published
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="publish-imported"
                                checked={options.publishImportedEntries}
                                onCheckedChange={(checked) =>
                                    onOptionsChange({...options, publishImportedEntries: !!checked})
                                }
                            />
                            <Label htmlFor="publish-imported" className="text-sm">
                                Publish imported entries immediately
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Date Handling</Label>
                            <RadioGroup
                                value={options.dateHandling}
                                onValueChange={(value: 'preserve' | 'current' | 'sequence') =>
                                    onOptionsChange({...options, dateHandling: value})
                                }
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="preserve" id="preserve"/>
                                    <Label htmlFor="preserve" className="text-sm">Preserve original dates</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="current" id="current"/>
                                    <Label htmlFor="current" className="text-sm">Use current date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sequence" id="sequence"/>
                                    <Label htmlFor="sequence" className="text-sm">Sequential dates</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>

                {/* Version Options */}
                <Card>
                    <CardHeader>
                        <CardTitle>Version Options</CardTitle>
                        <CardDescription>
                            Handle version numbering
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="auto-generate-versions"
                                checked={options.autoGenerateVersions}
                                onCheckedChange={(checked) =>
                                    onOptionsChange({...options, autoGenerateVersions: !!checked})
                                }
                            />
                            <Label htmlFor="auto-generate-versions" className="text-sm">
                                Auto-generate missing versions
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="default-tags" className="text-sm font-medium">
                                Default Tags (comma-separated)
                            </Label>
                            <Textarea
                                id="default-tags"
                                placeholder="enhancement, imported"
                                value={options.defaultTags.join(', ')}
                                onChange={(e) =>
                                    onOptionsChange({
                                        ...options,
                                        defaultTags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                                    })
                                }
                                className="h-20"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary */}
            {preview && (
                <Card>
                    <CardHeader>
                        <CardTitle>Import Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    {preview.validEntries}
                                </div>
                                <div className="text-sm text-muted-foreground">Will be imported</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-yellow-600">
                                    {preview.duplicateVersions.length}
                                </div>
                                <div className="text-sm text-muted-foreground">Conflicts</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">
                                    {preview.invalidEntries}
                                </div>
                                <div className="text-sm text-muted-foreground">Will be skipped</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {options.defaultTags.length}
                                </div>
                                <div className="text-sm text-muted-foreground">Default tags</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Back to Preview
                </Button>
                <Button
                    onClick={onImport}
                    disabled={!preview || preview.validEntries === 0}
                >
                    Start Import
                </Button>
            </div>
        </motion.div>
    );
}

function ImportingStep({
                           progress,
                           status
                       }: {
    progress: number;
    status: string;
}) {
    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            className="flex flex-col items-center justify-center py-12 space-y-6"
        >
            <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary"/>
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary/20"></div>
            </div>

            <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold">Importing Changelog Entries</h3>
                <p className="text-muted-foreground max-w-md">
                    {status}
                </p>
            </div>

            <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-3"/>
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
            </div>
        </motion.div>
    );
}