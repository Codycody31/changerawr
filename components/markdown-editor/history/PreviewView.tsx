'use client';

import React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {MarkdownPreview} from '@/components/markdown-editor/MarkdownPreview';
import {cn} from '@/lib/utils';

/** Renders a snapshot's content as it would appear in the published changelog. */
export function PreviewView({content, className}: { content: string; className?: string }) {
    if (!content.trim()) {
        return (
            <div className={cn('flex h-32 items-center justify-center text-sm text-muted-foreground', className)}>
                Empty
            </div>
        );
    }

    return (
        <ScrollArea className={cn('h-[50vh] rounded-md border bg-muted/20', className)}>
            <div className="p-3">
                <MarkdownPreview content={content} className="prose-sm"/>
            </div>
        </ScrollArea>
    );
}
