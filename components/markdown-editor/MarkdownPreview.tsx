'use client';

import React, { useEffect, useState, useRef } from 'react';
import { renderMarkdown, MarkdownRenderOptions } from './utils/renderer';

/**
 * Props for the Markdown Preview component
 */
export interface MarkdownPreviewProps {
    /**
     * Markdown content to render
     */
    content: string;

    /**
     * Scrollable container for syncing scroll position
     */
    scrollSync?: boolean;

    /**
     * Additional render options
     */
    renderOptions?: MarkdownRenderOptions;

    /**
     * Additional class names for the preview container
     */
    className?: string;

    /**
     * Whether to show a loading indicator
     */
    isLoading?: boolean;

    /**
     * Whether to show line numbers
     */
    showLineNumbers?: boolean;

    /**
     * Whether to highlight syntax in code blocks
     */
    highlightCode?: boolean;

    /**
     * Callback when clicking a link in the preview
     */
    onLinkClick?: (href: string, event: React.MouseEvent) => void;
}

/**
 * Markdown Preview Component
 * Renders markdown content as HTML with proper sanitization
 */
export default function MarkdownPreview({
                                            content,
                                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                            scrollSync = false,
                                            renderOptions = {},
                                            className = '',
                                            isLoading = false,
                                            showLineNumbers = false,
                                            highlightCode = true,
                                            onLinkClick,
                                        }: MarkdownPreviewProps) {
    // Keep track of rendered HTML
    const [html, setHtml] = useState<string>('');

    // DOMPurify configuration
    const [isDOMPurifyReady, setIsDOMPurifyReady] = useState(false);

    // Refs for scroll syncing
    const previewRef = useRef<HTMLDivElement>(null);

    // Load DOMPurify on client side
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // Load DOMPurify dynamically
        import('dompurify').then((DOMPurify) => {
            // Configure DOMPurify
            DOMPurify.default.setConfig({
                ADD_ATTR: ['target', 'className', 'id'],
                USE_PROFILES: { html: true },
            });

            setIsDOMPurifyReady(true);
        });
    }, []);

    // Render markdown when content changes or when DOMPurify is ready
    useEffect(() => {
        if (!isDOMPurifyReady) return;

        // Import DOMPurify only on client side
        import('dompurify').then((DOMPurify) => {
            // Combine render options
            const options: MarkdownRenderOptions = {
                ...renderOptions,
            };

            // Generate HTML from markdown
            const rawHtml = renderMarkdown(content, options);

            // Sanitize the HTML
            const sanitizedHtml = DOMPurify.default.sanitize(rawHtml);

            // Set the HTML
            setHtml(sanitizedHtml);

            // When code highlighting is enabled, highlight code blocks after rendering
            if (highlightCode) {
                setTimeout(() => {
                    if (typeof window !== 'undefined' && window.Prism) {
                        window.Prism.highlightAllUnder(previewRef.current as HTMLElement);
                    }
                }, 0);
            }
        });
    }, [content, renderOptions, isDOMPurifyReady, highlightCode]);

    // Handle clicks on links
    const handleLinkClick = (e: React.MouseEvent) => {
        // Check if the clicked element is a link
        const target = e.target as HTMLElement;
        const link = target.closest('a');

        if (link && onLinkClick) {
            // Get the href attribute
            const href = link.getAttribute('href');

            // If it's an internal anchor link, let it work normally
            if (href && href.startsWith('#')) {
                return;
            }

            // Otherwise, prevent default and call the callback
            e.preventDefault();
            onLinkClick(href || '', e);
        }
    };

    return (
        <div
            ref={previewRef}
            className={`prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-m-20 ${className}`}
            onClick={onLinkClick ? handleLinkClick : undefined}
        >
            {isLoading ? (
                <div className="flex justify-center items-center p-4 h-full">
                    <div className="animate-pulse rounded-md bg-muted w-full h-[200px]"></div>
                </div>
            ) : (
                <>
                    {showLineNumbers && (
                        <style jsx global>{`
              pre {
                counter-reset: line;
              }
              pre > code > span {
                counter-increment: line;
              }
              pre > code > span:before {
                content: counter(line);
                display: inline-block;
                width: 1.5rem;
                margin-right: 1rem;
                text-align: right;
                color: var(--tw-prose-comments);
                user-select: none;
              }
            `}</style>
                    )}
                    <div
                        dangerouslySetInnerHTML={{ __html: html }}
                        suppressHydrationWarning
                    />
                </>
            )}
        </div>
    );
}

// Needed for Prism.js code highlighting
declare global {
    interface Window {
        Prism?: {
            highlightAll: () => void;
            highlightAllUnder: (element: HTMLElement) => void;
        };
    }
}