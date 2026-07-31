'use client';

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ValidatedEntry } from '@/lib/types/projects/importing';

interface EntryPreviewCardProps {
    entry: ValidatedEntry;
    sourceLabel?: string;
    index?: number;
}

export function EntryPreviewCard({ entry, sourceLabel, index }: EntryPreviewCardProps) {
    const hasWarnings = entry.warnings.length > 0;
    const isInvalid = !entry.isValid;

    return (
        <div
            className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-sm',
                isInvalid && 'border-destructive/40 bg-destructive/5',
                !isInvalid && hasWarnings && 'border-yellow-400/40 bg-yellow-50/5',
                !isInvalid && !hasWarnings && 'border-border'
            )}
        >
            <div className="mt-0.5 flex-shrink-0">
                {isInvalid ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                ) : hasWarnings ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    {index !== undefined && (
                        <span className="text-muted-foreground text-xs">#{index + 1}</span>
                    )}
                    <span className="font-medium truncate">{entry.title || '(no title)'}</span>
                    {entry.version && (
                        <Badge variant="secondary" className="text-xs shrink-0">v{entry.version}</Badge>
                    )}
                    {sourceLabel && (
                        <Badge variant="outline" className="text-xs shrink-0">{sourceLabel}</Badge>
                    )}
                    {entry.publishedAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(entry.publishedAt).toLocaleDateString()}
                        </span>
                    )}
                </div>

                {entry.content && (
                    <p className="text-muted-foreground text-xs line-clamp-2">
                        {entry.content.replace(/[#*`]/g, '').slice(0, 120)}
                        {entry.content.length > 120 && '…'}
                    </p>
                )}

                {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                        {entry.tags.slice(0, 4).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs py-0">{tag}</Badge>
                        ))}
                        {entry.tags.length > 4 && (
                            <Badge variant="outline" className="text-xs py-0">+{entry.tags.length - 4}</Badge>
                        )}
                    </div>
                )}

                {(entry.errors.length > 0 || entry.warnings.length > 0) && (
                    <div className="space-y-0.5">
                        {entry.errors.map((e, i) => (
                            <p key={i} className="text-xs text-destructive">{e.message}</p>
                        ))}
                        {entry.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">{w.message}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
