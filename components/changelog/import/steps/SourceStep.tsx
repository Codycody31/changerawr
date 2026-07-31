'use client';

import { motion } from 'framer-motion';
import { FileText, Code, Table, Globe, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { MarkdownSource } from '../sources/MarkdownSource';
import { JsonSource } from '../sources/JsonSource';
import { CsvSource } from '../sources/CsvSource';
import { UrlSource } from '../sources/UrlSource';
import { CannySource } from '../sources/CannySource';
import { AdvancedParseOptions } from '../components/AdvancedParseOptions';
import { CannyLogo } from '@/lib/services/projects/uploading/providers/canny/logo';

import type { ImportSource, ValidatedEntry, JsonImportOptions, CsvImportOptions, UrlImportOptions, ParseOverrides } from '@/lib/types/projects/importing';

interface SourceStepProps {
    source: ImportSource;
    onSourceChange: (s: ImportSource) => void;

    markdownContent: string;
    onMarkdownChange: (c: string) => void;
    onMarkdownSubmit: () => void;
    parseOverrides: ParseOverrides;
    onParseOverridesChange: (o: ParseOverrides) => void;
    onReparse: () => void;

    jsonContent: string;
    jsonOptions: Partial<JsonImportOptions>;
    onJsonChange: (c: string) => void;
    onJsonOptionsChange: (o: Partial<JsonImportOptions>) => void;
    onJsonSubmit: () => void;

    csvContent: string;
    csvOptions: Partial<CsvImportOptions>;
    onCsvChange: (c: string) => void;
    onCsvOptionsChange: (o: Partial<CsvImportOptions>) => void;
    onCsvSubmit: () => void;

    urlOptions: Partial<UrlImportOptions>;
    onUrlOptionsChange: (o: Partial<UrlImportOptions>) => void;
    onUrlSubmit: () => void;

    onCannyImport: (entries: ValidatedEntry[]) => void;

    isProcessing: boolean;
    processingStatus: string;
}

const SOURCES: { value: ImportSource; label: string; icon: React.FC<{ className?: string }> }[] = [
    { value: 'markdown', label: 'Markdown', icon: FileText },
    { value: 'json', label: 'JSON', icon: Code },
    { value: 'csv', label: 'CSV', icon: Table },
    { value: 'url', label: 'URL / Feed', icon: Globe },
    { value: 'canny', label: 'Canny', icon: ({ className }) => (
        <CannyLogo size={16} rounded="sm" className={className} />
    )},
];

export function SourceStep({
    source, onSourceChange,
    markdownContent, onMarkdownChange, onMarkdownSubmit,
    parseOverrides, onParseOverridesChange, onReparse,
    jsonContent, jsonOptions, onJsonChange, onJsonOptionsChange, onJsonSubmit,
    csvContent, csvOptions, onCsvChange, onCsvOptionsChange, onCsvSubmit,
    urlOptions, onUrlOptionsChange, onUrlSubmit,
    onCannyImport,
    isProcessing, processingStatus
}: SourceStepProps) {
    if (isProcessing) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
            >
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">{processingStatus || 'Processing...'}</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
        >
            <Tabs value={source} onValueChange={(v) => onSourceChange(v as ImportSource)}>
                <TabsList className="w-full grid grid-cols-5 h-auto">
                    {SOURCES.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger key={value} value={value} className="flex flex-col items-center gap-1 py-2 text-xs">
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="markdown" className="mt-4 space-y-4">
                    <MarkdownSource
                        content={markdownContent}
                        onChange={onMarkdownChange}
                        onSubmit={onMarkdownSubmit}
                        disabled={isProcessing}
                    />
                    {markdownContent.trim() && (
                        <ParseOptionsDisclosure
                            overrides={parseOverrides}
                            onChange={onParseOverridesChange}
                            onReparse={onReparse}
                            disabled={isProcessing}
                        />
                    )}
                </TabsContent>

                <TabsContent value="json" className="mt-4">
                    <JsonSource
                        content={jsonContent}
                        options={jsonOptions}
                        onContentChange={onJsonChange}
                        onOptionsChange={onJsonOptionsChange}
                        onSubmit={onJsonSubmit}
                        disabled={isProcessing}
                    />
                </TabsContent>

                <TabsContent value="csv" className="mt-4">
                    <CsvSource
                        content={csvContent}
                        options={csvOptions}
                        onContentChange={onCsvChange}
                        onOptionsChange={onCsvOptionsChange}
                        onSubmit={onCsvSubmit}
                        disabled={isProcessing}
                    />
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                    <UrlSource
                        options={urlOptions}
                        onOptionsChange={onUrlOptionsChange}
                        onSubmit={onUrlSubmit}
                        disabled={isProcessing}
                    />
                </TabsContent>

                <TabsContent value="canny" className="mt-4">
                    <CannySource
                        onImport={onCannyImport}
                        disabled={isProcessing}
                    />
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}

// ── Thin disclosure that wraps AdvancedParseOptions ───────────────────────

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function ParseOptionsDisclosure({
    overrides,
    onChange,
    onReparse,
    disabled
}: {
    overrides: ParseOverrides;
    onChange: (o: ParseOverrides) => void;
    onReparse: () => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const hasOverrides = !!(
        overrides.primaryHeaderLevel ||
        (overrides.stripPatterns?.length ?? 0) > 0 ||
        overrides.treatAsSingle
    );

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {hasOverrides
                    ? <span className="text-primary font-medium">Parse options (customized)</span>
                    : <span>Having trouble? Adjust parse settings</span>
                }
            </button>
            {open && (
                <div className="mt-3 pl-3 border-l-2 border-muted">
                    <AdvancedParseOptions
                        overrides={overrides}
                        onChange={onChange}
                        onReparse={onReparse}
                        disabled={disabled}
                    />
                </div>
            )}
        </div>
    );
}
