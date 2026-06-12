// components/markdown-editor/MarkdownPreview.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { renderMarkdown, renderMarkdownStreamed } from '@/lib/services/core/markdown/useCustomExtensions';
import { useEmbedEnhancements } from '@/hooks/use-embed-enhancements';
import { useCodeCopyButtons } from '@/lib/services/core/markdown/extensions/syntax-highlight/useCodeCopyButtons';

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
                                                                    content,
                                                                    className = ''
                                                                }) => {
    const [html, setHtml] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEmbedEnhancements(containerRef, [html]);
    const copyButtonPortals = useCodeCopyButtons(containerRef, [html]);

    useEffect(() => {
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

        const renderContent = async () => {
            if (wordCount > 10000) {
                try {
                    const rendered = await renderMarkdownStreamed(content);
                    setHtml(rendered);
                } catch (error) {
                    console.error('Streaming render failed:', error);
                    const fallbackHtml = await renderMarkdown(content);
                    setHtml(fallbackHtml);
                }
            } else {
                const rendered = await renderMarkdown(content);
                setHtml(rendered);
            }
        };

        renderContent();
    }, [content]);

    return (
        <>
            <div
                ref={containerRef}
                className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
                dangerouslySetInnerHTML={{ __html: html }}
                suppressHydrationWarning
            />
            {copyButtonPortals}
        </>
    );
};