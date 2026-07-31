'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ImportStats } from '../components/ImportStats';
import { EntryPreviewCard } from '../components/EntryPreviewCard';
import { DetectionPanel } from '../components/DetectionPanel';
import { AdvancedParseOptions } from '../components/AdvancedParseOptions';
import type { ImportPreview, ValidatedEntry, ImportSource, FormatDetectionResult, ParseOverrides } from '@/lib/types/projects/importing';

const SOURCE_LABELS: Record<ImportSource, string> = {
    markdown: 'Markdown',
    json: 'JSON',
    csv: 'CSV',
    url: 'URL / Feed',
    canny: 'Canny'
};

interface PreviewStepProps {
    preview: ImportPreview;
    validatedEntries: ValidatedEntry[];
    source: ImportSource;
    detection?: FormatDetectionResult;
    parseOverrides: ParseOverrides;
    onParseOverridesChange: (o: ParseOverrides) => void;
    onReparse: () => void;
    onNext: () => void;
    onBack: () => void;
}

export function PreviewStep({ preview, validatedEntries, source, detection, parseOverrides, onParseOverridesChange, onReparse, onNext, onBack }: PreviewStepProps) {
    const [showAll, setShowAll] = useState(false);
    const validEntries = validatedEntries.filter(e => e.isValid);
    const invalidEntries = validatedEntries.filter(e => !e.isValid);
    const displayEntries = showAll ? validatedEntries : validatedEntries.slice(0, 8);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-5"
        >
            {/* Source badge */}
            <div className="flex items-center justify-center">
                <Badge variant="outline" className="gap-1.5">
                    <span className="text-muted-foreground">Source:</span>
                    {SOURCE_LABELS[source]}
                </Badge>
            </div>

            <ImportStats preview={preview} />

            {/* Detection info + re-parse shortcut for text sources */}
            {(detection || source === 'markdown') && (
                <PreviewParseDisclosure
                    detection={detection}
                    source={source}
                    overrides={parseOverrides}
                    onOverridesChange={onParseOverridesChange}
                    onReparse={onReparse}
                />
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
                <Alert variant="warning">
                    <AlertDescription>
                        <strong>{preview.warnings.length} warning{preview.warnings.length !== 1 ? 's' : ''}:</strong>
                        <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                            {preview.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                            {preview.warnings.length > 5 && <li>…and {preview.warnings.length - 5} more</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertDescription>
                        <strong>{preview.errors.length} error{preview.errors.length !== 1 ? 's' : ''}:</strong>
                        <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                            {preview.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                            {preview.errors.length > 5 && <li>…and {preview.errors.length - 5} more</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Duplicate versions */}
            {preview.duplicateVersions.length > 0 && (
                <Alert variant="warning">
                    <AlertDescription className="text-xs">
                        <strong>Version conflicts:</strong>{' '}
                        {preview.duplicateVersions.map(v => <Badge key={v} variant="outline" className="text-xs mr-1">{v}</Badge>)}
                        {' '}— configure how to handle these in the next step.
                    </AlertDescription>
                </Alert>
            )}

            {/* Entry list */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        Entries ({validEntries.length} valid{invalidEntries.length > 0 ? `, ${invalidEntries.length} invalid` : ''})
                    </p>
                    {validatedEntries.length > 8 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => setShowAll(v => !v)}>
                            {showAll ? 'Show less' : `Show all ${validatedEntries.length}`}
                        </Button>
                    )}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {displayEntries.map((entry, i) => (
                        <EntryPreviewCard
                            key={i}
                            entry={entry}
                            sourceLabel={source === 'canny' ? 'Canny' : undefined}
                            index={i}
                        />
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onNext} disabled={preview.validEntries === 0}>
                    Configure Import →
                </Button>
            </div>
        </motion.div>
    );
}

// ── Inline disclosure shown in the preview step ────────────────────────────

import { useState as useStatePreview } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function PreviewParseDisclosure({
    detection,
    source,
    overrides,
    onOverridesChange,
    onReparse
}: {
    detection?: FormatDetectionResult;
    source: ImportSource;
    overrides: ParseOverrides;
    onOverridesChange: (o: ParseOverrides) => void;
    onReparse: () => void;
}) {
    const [open, setOpen] = useStatePreview(false);
    const hasOverrides = !!(
        overrides.primaryHeaderLevel ||
        (overrides.stripPatterns?.length ?? 0) > 0 ||
        overrides.treatAsSingle
    );

    return (
        <div className="space-y-2">
            {detection && <DetectionPanel detection={detection} />}

            {source === 'markdown' && (
                <div>
                    <button
                        type="button"
                        onClick={() => setOpen(v => !v)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {hasOverrides
                            ? <span className="text-primary font-medium">Parse options (customized) — re-parse to apply</span>
                            : <span>Not quite right? Adjust how it&apos;s parsed</span>
                        }
                    </button>
                    {open && (
                        <div className="mt-3 pl-3 border-l-2 border-muted">
                            <AdvancedParseOptions
                                overrides={overrides}
                                onChange={onOverridesChange}
                                onReparse={onReparse}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
