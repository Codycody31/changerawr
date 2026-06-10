'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import { SourceStep } from './steps/SourceStep';
import { PreviewStep } from './steps/PreviewStep';
import { ConfigureStep } from './steps/ConfigureStep';
import { ImportingStep } from './steps/ImportingStep';
import { ResultStep } from './steps/ResultStep';

import type {
    ImportSource,
    ImportPreview,
    ImportOptions,
    ImportResult,
    ValidatedEntry,
    JsonImportOptions,
    CsvImportOptions,
    UrlImportOptions,
    FormatDetectionResult,
    ParseOverrides,
} from '@/lib/types/projects/importing';

type ImportStep = 'source' | 'preview' | 'configure' | 'importing' | 'result';

const DEFAULT_OPTIONS: ImportOptions = {
    strategy: 'merge',
    preserveExistingEntries: true,
    autoGenerateVersions: false,
    defaultTags: [],
    publishImportedEntries: false,
    dateHandling: 'preserve',
    conflictResolution: 'skip'
};

interface ImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    onImportComplete: (result: ImportResult) => void;
}

export function ImportModal({ open, onOpenChange, projectId, onImportComplete }: ImportModalProps) {
    const { toast } = useToast();

    const [step, setStep] = useState<ImportStep>('source');
    const [source, setSource] = useState<ImportSource>('markdown');

    // Source inputs
    const [markdownContent, setMarkdownContent] = useState('');
    const [jsonContent, setJsonContent] = useState('');
    const [jsonOptions, setJsonOptions] = useState<Partial<JsonImportOptions>>({});
    const [csvContent, setCsvContent] = useState('');
    const [csvOptions, setCsvOptions] = useState<Partial<CsvImportOptions>>({});
    const [urlOptions, setUrlOptions] = useState<Partial<UrlImportOptions>>({ format: 'auto', maxEntries: 50 });

    // Shared state
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [validatedEntries, setValidatedEntries] = useState<ValidatedEntry[]>([]);
    const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_OPTIONS);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [detection, setDetection] = useState<FormatDetectionResult | null>(null);
    const [parseOverrides, setParseOverrides] = useState<ParseOverrides>({});

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('');

    const handleParseResult = useCallback((data: { validatedEntries: ValidatedEntry[]; preview: ImportPreview; detection?: FormatDetectionResult }) => {
        setValidatedEntries(data.validatedEntries);
        setPreview(data.preview);
        if (data.detection) setDetection(data.detection);
        setStep('preview');
    }, []);

    const parseSource = useCallback(async (endpoint: string, body: unknown) => {
        setIsProcessing(true);
        setProcessingStatus('Parsing content…');
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Parse failed');
            handleParseResult(data);
        } catch (err) {
            toast({
                title: 'Parsing failed',
                description: err instanceof Error ? err.message : 'Failed to parse content.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    }, [handleParseResult, toast]);

    const handleMarkdownSubmit = useCallback((overrides?: ParseOverrides) => {
        parseSource('/api/projects/import/parse', {
            content: markdownContent,
            projectId,
            overrides: overrides ?? parseOverrides
        });
    }, [markdownContent, projectId, parseSource, parseOverrides]);

    const handleJsonSubmit = useCallback(() => {
        parseSource('/api/projects/import/json', { content: jsonContent, projectId, options: jsonOptions });
    }, [jsonContent, jsonOptions, projectId, parseSource]);

    const handleCsvSubmit = useCallback(() => {
        parseSource('/api/projects/import/csv', { content: csvContent, projectId, options: csvOptions });
    }, [csvContent, csvOptions, projectId, parseSource]);

    const handleUrlSubmit = useCallback(() => {
        parseSource('/api/projects/import/url', { projectId, options: urlOptions });
    }, [urlOptions, projectId, parseSource]);

    const handleCannyImport = useCallback((entries: ValidatedEntry[]) => {
        const cannyPreview: ImportPreview = {
            totalEntries: entries.length,
            validEntries: entries.length,
            invalidEntries: 0,
            duplicateVersions: [],
            missingTitles: 0,
            missingContent: 0,
            suggestedMappings: { versions: {}, tags: {} },
            warnings: [],
            errors: []
        };
        setValidatedEntries(entries);
        setPreview(cannyPreview);
        setStep('preview');
    }, []);

    const performImport = useCallback(async () => {
        setStep('importing');
        setImportProgress(0);
        setProcessingStatus('Preparing import…');

        const tick = (p: number, s: string) => { setImportProgress(p); setProcessingStatus(s); };

        try {
            tick(15, 'Validating entries…');
            await delay(300);
            tick(35, 'Checking conflicts…');
            await delay(300);
            tick(55, 'Creating entries…');

            const res = await fetch('/api/projects/import/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    entries: validatedEntries.filter(e => e.isValid),
                    options: importOptions
                })
            });

            const result: ImportResult = await res.json();
            if (!res.ok) throw new Error((result as unknown as { error?: string }).error || 'Import failed');

            tick(90, 'Finalizing…');
            await delay(300);
            tick(100, 'Done!');
            await delay(200);

            setImportResult(result);
            setStep('result');
            onImportComplete(result);

        } catch (err) {
            toast({
                title: 'Import failed',
                description: err instanceof Error ? err.message : 'An unexpected error occurred.',
                variant: 'destructive'
            });
            setStep('configure');
        } finally {
            setImportProgress(0);
            setProcessingStatus('');
        }
    }, [projectId, validatedEntries, importOptions, onImportComplete, toast]);

    const reset = useCallback(() => {
        setStep('source');
        setSource('markdown');
        setMarkdownContent('');
        setJsonContent('');
        setJsonOptions({});
        setCsvContent('');
        setCsvOptions({});
        setUrlOptions({ format: 'auto', maxEntries: 50 });
        setPreview(null);
        setValidatedEntries([]);
        setImportOptions(DEFAULT_OPTIONS);
        setImportResult(null);
        setDetection(null);
        setParseOverrides({});
        setImportProgress(0);
        setProcessingStatus('');
    }, []);

    const STEP_TITLES: Record<ImportStep, string> = {
        source: 'Import Changelog',
        preview: 'Preview Entries',
        configure: 'Configure Import',
        importing: 'Importing…',
        result: 'Import Complete'
    };

    const STEP_DESCS: Record<ImportStep, string> = {
        source: 'Choose a source and provide your changelog data',
        preview: 'Review what will be imported before proceeding',
        configure: 'Set import strategy and options',
        importing: 'Please wait while entries are being imported',
        result: 'Your changelog entries have been processed'
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
                    <DialogDescription>{STEP_DESCS[step]}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-1">
                    <AnimatePresence mode="wait">
                        {step === 'source' && (
                            <SourceStep
                                key="source"
                                source={source}
                                onSourceChange={setSource}
                                markdownContent={markdownContent}
                                onMarkdownChange={setMarkdownContent}
                                onMarkdownSubmit={() => handleMarkdownSubmit()}
                                parseOverrides={parseOverrides}
                                onParseOverridesChange={setParseOverrides}
                                onReparse={() => handleMarkdownSubmit()}
                                jsonContent={jsonContent}
                                jsonOptions={jsonOptions}
                                onJsonChange={setJsonContent}
                                onJsonOptionsChange={setJsonOptions}
                                onJsonSubmit={handleJsonSubmit}
                                csvContent={csvContent}
                                csvOptions={csvOptions}
                                onCsvChange={setCsvContent}
                                onCsvOptionsChange={setCsvOptions}
                                onCsvSubmit={handleCsvSubmit}
                                urlOptions={urlOptions}
                                onUrlOptionsChange={setUrlOptions}
                                onUrlSubmit={handleUrlSubmit}
                                onCannyImport={handleCannyImport}
                                isProcessing={isProcessing}
                                processingStatus={processingStatus}
                            />
                        )}

                        {step === 'preview' && preview && (
                            <PreviewStep
                                key="preview"
                                preview={preview}
                                validatedEntries={validatedEntries}
                                source={source}
                                detection={detection ?? undefined}
                                parseOverrides={parseOverrides}
                                onParseOverridesChange={setParseOverrides}
                                onReparse={() => { setStep('source'); }}
                                onNext={() => setStep('configure')}
                                onBack={() => setStep('source')}
                            />
                        )}

                        {step === 'configure' && (
                            <ConfigureStep
                                key="configure"
                                options={importOptions}
                                onChange={setImportOptions}
                                preview={preview}
                                onImport={performImport}
                                onBack={() => setStep('preview')}
                            />
                        )}

                        {step === 'importing' && (
                            <ImportingStep
                                key="importing"
                                progress={importProgress}
                                status={processingStatus}
                            />
                        )}

                        {step === 'result' && importResult && (
                            <ResultStep
                                key="result"
                                result={importResult}
                                onDone={() => onOpenChange(false)}
                                onImportMore={reset}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}
