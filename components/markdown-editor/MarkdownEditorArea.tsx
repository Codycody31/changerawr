'use client';

import React, { useRef, useEffect, forwardRef } from 'react';

/**
 * Editor area props
 */
export interface MarkdownEditorAreaProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (
        selectionStart: number,
        selectionEnd: number,
        selectedText: string
    ) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    resizable?: boolean;
    minRows?: number;
    maxRows?: number;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    onBold?: (text: string) => void;
    onItalic?: (text: string) => void;
    onLink?: (text: string) => void;
    onCode?: (text: string) => void;
    onQuote?: (text: string) => void;
    onBulletList?: (text: string) => void;
    onNumberedList?: (text: string) => void;
    onHeading?: (text: string, level: number) => void;
}

/**
 * Simple and reliable Markdown editor text area component
 */
const MarkdownEditorArea = forwardRef<HTMLTextAreaElement, MarkdownEditorAreaProps>(
    ({
         value,
         onChange,
         onSelect,
         onKeyDown,
         placeholder = 'Start writing...',
         resizable = false,
         minRows = 5,
         className = '',
         disabled = false,
         autoFocus = false,
     }, ref) => {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        // Handle ref forwarding
        useEffect(() => {
            if (!ref) return;

            if (typeof ref === 'function') {
                ref(internalRef.current);
            } else {
                ref.current = internalRef.current;
            }
        }, [ref]);

        // Handle text change
        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
        };

        // Handle selection changes
        const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const selectedText = value.substring(start, end);

            if (onSelect) {
                onSelect(start, end, selectedText);
            }
        };

        // Apply styles
        const textareaStyle: React.CSSProperties = {
            resize: resizable ? 'vertical' : 'none',
            overflow: 'auto',
            lineHeight: '1.5',
            minHeight: resizable ? '100px' : undefined,
            maxHeight: resizable ? '800px' : undefined,
            height: resizable ? 'auto' : undefined,
            width: '100%',
            tabSize: 2,
        };

        return (
            <textarea
                ref={internalRef}
                value={value}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                rows={minRows}
                style={textareaStyle}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full p-4 font-mono text-sm border-0 bg-background focus-visible:ring-0 focus-visible:outline-none focus:border-0 ${className}`}
                spellCheck="false"
            />
        );
    }
);

// Display name for React DevTools
MarkdownEditorArea.displayName = 'MarkdownEditorArea';

export default MarkdownEditorArea;