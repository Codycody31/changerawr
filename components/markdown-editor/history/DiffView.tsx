'use client';

import React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';

export interface DiffHunk {
    value: string;
    added?: boolean;
    removed?: boolean;
}

interface DiffLine {
    text: string;
    added: boolean;
    removed: boolean;
}

function toLines(diff: DiffHunk[]): DiffLine[] {
    const lines: DiffLine[] = [];

    for (const hunk of diff) {
        const hunkLines = hunk.value.split('\n');

        // Drop the trailing empty string produced by a final newline.
        if (hunkLines[hunkLines.length - 1] === '') {
            hunkLines.pop();
        }

        for (const text of hunkLines) {
            lines.push({text, added: !!hunk.added, removed: !!hunk.removed});
        }
    }

    return lines;
}

/**
 * Renders a git-style line-by-line diff (added lines green, removed lines red,
 * unchanged lines muted) inside a scrollable monospace block.
 */
export function DiffView({diff, className}: { diff: DiffHunk[]; className?: string }) {
    const lines = React.useMemo(() => toLines(diff), [diff]);

    if (lines.length === 0) {
        return (
            <div className={cn('flex h-32 items-center justify-center text-sm text-muted-foreground', className)}>
                No changes
            </div>
        );
    }

    return (
        <ScrollArea className={cn('h-[50vh] rounded-md border bg-muted/20', className)}>
            <div className="font-mono text-xs">
                {lines.map((line, index) => (
                    <div
                        key={index}
                        className={cn(
                            'flex gap-3 px-3 py-0.5 whitespace-pre-wrap break-words',
                            line.added && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                            line.removed && 'bg-red-500/10 text-red-700 dark:text-red-400',
                            !line.added && !line.removed && 'text-muted-foreground'
                        )}
                    >
                        <span className="select-none shrink-0 w-3 text-center opacity-60">
                            {line.added ? '+' : line.removed ? '-' : ''}
                        </span>
                        <span className="flex-1">{line.text || ' '}</span>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
