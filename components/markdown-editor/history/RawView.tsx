'use client';

import React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';

/** Renders a snapshot's raw markdown source, unstyled and uncolored. */
export function RawView({content, className}: { content: string; className?: string }) {
    if (!content.trim()) {
        return (
            <div className={cn('flex h-32 items-center justify-center text-sm text-muted-foreground', className)}>
                Empty
            </div>
        );
    }

    return (
        <ScrollArea className={cn('h-[50vh] rounded-md border bg-muted/20', className)}>
            <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs">{content}</pre>
        </ScrollArea>
    );
}
