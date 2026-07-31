'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ImportResult } from '@/lib/types/projects/importing';

interface ResultStepProps {
    result: ImportResult;
    onDone: () => void;
    onImportMore: () => void;
}

export function ResultStep({ result, onDone, onImportMore }: ResultStepProps) {
    const hasErrors = result.errorCount > 0;
    const hasWarnings = result.warnings.length > 0;
    const isPartial = result.success && hasErrors;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5 py-4"
        >
            {/* Status icon */}
            <div className="flex flex-col items-center gap-3">
                <div
                    className={cn(
                        'p-4 rounded-full',
                        result.success && !isPartial && 'bg-green-100 dark:bg-green-900/20',
                        isPartial && 'bg-yellow-100 dark:bg-yellow-900/20',
                        !result.success && 'bg-destructive/10'
                    )}
                >
                    {result.success && !isPartial && <CheckCircle className="h-10 w-10 text-green-600" />}
                    {isPartial && <AlertTriangle className="h-10 w-10 text-yellow-500" />}
                    {!result.success && <XCircle className="h-10 w-10 text-destructive" />}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold">
                        {result.success && !isPartial && 'Import Successful'}
                        {isPartial && 'Import Partially Successful'}
                        {!result.success && 'Import Failed'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Completed in {(result.processingTime / 1000).toFixed(1)}s
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                    <div className="text-2xl font-bold text-green-600">{result.importedCount}</div>
                    <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div className="rounded-lg border p-3">
                    <div className="text-2xl font-bold text-muted-foreground">{result.skippedCount}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="rounded-lg border p-3">
                    <div className="text-2xl font-bold text-destructive">{result.errorCount}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                </div>
            </div>

            {/* Created entries preview */}
            {result.createdEntries.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                        {result.createdEntries.slice(0, 10).map((e) => (
                            <div key={e.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                <span className="truncate flex-1">{e.title}</span>
                                {e.version && <Badge variant="secondary" className="text-xs shrink-0">v{e.version}</Badge>}
                            </div>
                        ))}
                        {result.createdEntries.length > 10 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                                …and {result.createdEntries.length - 10} more
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {hasWarnings && (
                <Alert variant="warning">
                    <AlertDescription className="text-xs">
                        <strong>{result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}:</strong>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {result.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                            {result.warnings.length > 5 && <li>…and {result.warnings.length - 5} more</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Errors */}
            {hasErrors && (
                <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                        <strong>{result.errorCount} entries failed:</strong>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {result.errors.slice(0, 5).map((e, i) => (
                                <li key={i}>{e.entry.title || '(no title)'}: {e.error}</li>
                            ))}
                            {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={onImportMore} className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Import More
                </Button>
                <Button onClick={onDone} className="flex-1 gap-2">
                    Done
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </motion.div>
    );
}
