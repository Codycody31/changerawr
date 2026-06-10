'use client';

import React, {useState, useEffect, useRef} from 'react';
import {renderMarkdown} from '@/lib/services/core/markdown/useCustomExtensions';
import {useDebounce} from "use-debounce";
import {useEmbedEnhancements} from '@/hooks/use-embed-enhancements';

interface RenderMarkdownProps {
    children: string;
    className?: string;
    enableCUM?: boolean;
}

export const RenderMarkdown: React.FC<RenderMarkdownProps> = ({
                                                                  children = '',
                                                                  className = ''
                                                              }) => {
    // Use our new markdown renderer
    const [debouncedContent] = useDebounce(children || '', 300);
    const [renderedHtml, setRenderedHtml] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEmbedEnhancements(containerRef, [renderedHtml]);

    useEffect(() => {
        let cancelled = false;

        const content = debouncedContent || '';
        renderMarkdown(content).then((html) => {
            if (!cancelled) {
                setRenderedHtml(html);
            }
        }).catch((error) => {
            console.error('Failed to render markdown:', error);
            if (!cancelled) {
                setRenderedHtml('<p>Error rendering markdown</p>');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [debouncedContent]);

    return (
        <div
            ref={containerRef}
            className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
            dangerouslySetInnerHTML={{__html: renderedHtml}}
            suppressHydrationWarning
        />
    );
};