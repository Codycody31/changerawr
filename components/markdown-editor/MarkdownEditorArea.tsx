'use client';

import React, { useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bold,
    Italic,
    Link,
    Code,
    Quote,
    List,
    ListOrdered,
    Heading2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    // Format functions
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
 * Selection toolbar action definition
 */
interface SelectionAction {
    icon: React.ReactNode;
    label: string;
    action: (text: string) => void;
    shortcut?: string;
}

/**
 * Calculate row height based on line height
 */
function calculateRowHeight(element: HTMLTextAreaElement): number {
    const computedStyle = window.getComputedStyle(element);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    return isNaN(lineHeight) ? 20 : lineHeight; // Default to 20px if we can't determine line height
}

/**
 * Get text coordinates for selection
 * Returns null if unable to determine position
 */
function getTextCoordinates(
    textarea: HTMLTextAreaElement,
    selectionStart: number,
    selectionEnd: number
): { top: number; left: number; height: number; width: number } | null {
    if (!textarea) return null;

    try {
        // Simple method: use textarea's getBoundingClientRect
        const rect = textarea.getBoundingClientRect();
        const textareaStyle = window.getComputedStyle(textarea);
        const lineHeight = parseInt(textareaStyle.lineHeight) || 20;

        // Count newlines to determine vertical position
        const textBeforeSelection = textarea.value.substring(0, selectionStart);
        const lines = textBeforeSelection.split('\n').length;

        // Calculate top position based on line number
        const scrollTop = textarea.scrollTop;
        const paddingTop = parseInt(textareaStyle.paddingTop) || 0;

        return {
            top: paddingTop + (lines - 1) * lineHeight - scrollTop,
            left: 20, // Simplified position
            height: lineHeight,
            width: 100 // Simplified width
        };
    } catch (error) {
        console.error('Error getting text coordinates:', error);
        return null;
    }
}

/**
 * Markdown editor text area component
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
         maxRows = 20,
         className = '',
         disabled = false,
         autoFocus = false,
         onBold,
         onItalic,
         onLink,
         onCode,
         onQuote,
         onBulletList,
         onNumberedList,
         onHeading,
     }, ref) => {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        // No direct state updates in ref callback to avoid infinite loop
        const setTextAreaRef = useCallback((node: HTMLTextAreaElement | null) => {
            internalRef.current = node;

            // Handle ref forwarding
            if (typeof ref === 'function') {
                ref(node);
            } else if (ref) {
                (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }
        }, [ref]);

        // State for managing rows
        const [rows, setRows] = useState(minRows);

        // State for selection
        const [selectionState, setSelectionState] = useState({
            start: 0,
            end: 0,
            text: '',
            isSelecting: false,
            position: { top: 0, left: 0, height: 0, width: 0 },
        });

        // For tracking selection changes without rerendering
        const selectionTracker = useRef({
            start: 0,
            end: 0,
            text: '',
        });

        // Define selection actions
        const selectionActions: SelectionAction[] = React.useMemo(() => [
            {
                icon: <Bold size={14} />,
                label: 'Bold',
                action: (text) => onBold?.(text),
                shortcut: 'Ctrl+B',
            },
            {
                icon: <Italic size={14} />,
                label: 'Italic',
                action: (text) => onItalic?.(text),
                shortcut: 'Ctrl+I',
            },
            {
                icon: <Link size={14} />,
                label: 'Link',
                action: (text) => onLink?.(text),
                shortcut: 'Ctrl+K',
            },
            {
                icon: <Code size={14} />,
                label: 'Code',
                action: (text) => onCode?.(text),
            },
            {
                icon: <Quote size={14} />,
                label: 'Quote',
                action: (text) => onQuote?.(text),
            },
            {
                icon: <List size={14} />,
                label: 'Bullet List',
                action: (text) => onBulletList?.(text),
            },
            {
                icon: <ListOrdered size={14} />,
                label: 'Numbered List',
                action: (text) => onNumberedList?.(text),
            },
            {
                icon: <Heading2 size={14} />,
                label: 'Heading',
                action: (text) => onHeading?.(text, 2),
            },
        ], [onBold, onItalic, onLink, onCode, onQuote, onBulletList, onNumberedList, onHeading]);

        // Placeholder function for when handlers are not provided
        const noop = (text: string) => {
            console.warn('No handler provided for this action', text);
        };

        // Estimate number of rows based on content
        const estimateRows = useCallback((text: string): number => {
            const lines = text.split('\n').length;
            return Math.max(minRows, Math.min(maxRows, lines));
        }, [minRows, maxRows]);

        // Update rows when value changes
        useEffect(() => {
            const estimatedRows = estimateRows(value);
            setRows(estimatedRows);
        }, [value, estimateRows]);

        // Handle text changes with debouncing to avoid rapid state updates
        const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = e.target.value;
            onChange(newValue);

            // Track current selection without state updates
            const target = e.target as HTMLTextAreaElement;
            selectionTracker.current = {
                start: target.selectionStart,
                end: target.selectionEnd,
                text: newValue.substring(target.selectionStart, target.selectionEnd),
            };
        }, [onChange]);

        // Handle selection outside of the main render cycle
        const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const selectedText = value.substring(start, end);

            // Update the selection tracker ref without state updates
            selectionTracker.current = {
                start,
                end,
                text: selectedText,
            };

            // Call external handler if provided
            if (onSelect) {
                onSelect(start, end, selectedText);
            }

            // Only update state if we have a real selection to show toolbar
            if (start !== end && selectedText.trim() !== '') {
                // Get position calculation outside render cycle
                requestAnimationFrame(() => {
                    if (!internalRef.current) return;

                    const position = getTextCoordinates(internalRef.current, start, end);

                    if (position) {
                        setSelectionState({
                            start,
                            end,
                            text: selectedText,
                            isSelecting: true,
                            position,
                        });
                    }
                });
            }
        }, [value, onSelect]);

        // Handle clicking outside to dismiss toolbar
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (
                    selectionState.isSelecting &&
                    internalRef.current &&
                    !internalRef.current.contains(e.target as Node)
                ) {
                    setSelectionState(prev => ({
                        ...prev,
                        isSelecting: false,
                    }));
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [selectionState.isSelecting]);

        // Handle selection toolbar actions
        const handleSelectionAction = useCallback((action: SelectionAction) => {
            if (selectionState.isSelecting && selectionState.text) {
                // Call the action with the selected text
                action.action(selectionState.text);

                // Hide the toolbar after action
                setSelectionState(prev => ({
                    ...prev,
                    isSelecting: false,
                }));

                // Re-focus on textarea
                if (internalRef.current) {
                    internalRef.current.focus();
                }
            }
        }, [selectionState]);

        // Apply styles
        const textareaStyle: React.CSSProperties = {
            resize: resizable ? 'vertical' : 'none',
            overflowY: resizable ? 'auto' : 'auto',
            minHeight: resizable ? '100px' : undefined,
            maxHeight: resizable ? '800px' : undefined,
            height: resizable ? 'auto' : undefined,
            // Style to improve writing experience
            lineHeight: 1.5,
            tabSize: 2,
        };

        // Mouse up event to check for selections
        const handleMouseUp = useCallback(() => {
            if (!internalRef.current) return;

            const { start, end, text } = selectionTracker.current;

            // Only show toolbar for non-empty selections
            if (start !== end && text && text.trim() !== '') {
                const position = getTextCoordinates(internalRef.current, start, end);

                if (position) {
                    // Use requestAnimationFrame to avoid rapid state updates
                    requestAnimationFrame(() => {
                        setSelectionState({
                            start,
                            end,
                            text,
                            isSelecting: true,
                            position,
                        });
                    });
                }
            }
        }, []);

        // Key up event to detect selections made with keyboard
        const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Only track selection keys
            if (
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'Home' ||
                e.key === 'End' ||
                (e.shiftKey && e.key === 'Tab')
            ) {
                handleMouseUp();
            }

            // Hide selection on Escape
            if (e.key === 'Escape' && selectionState.isSelecting) {
                setSelectionState(prev => ({
                    ...prev,
                    isSelecting: false,
                }));
            }
        }, [handleMouseUp, selectionState.isSelecting]);

        return (
            <div className={`relative ${className}`}>
        <textarea
            ref={setTextAreaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onSelect={handleSelect}
            onMouseUp={handleMouseUp}
            onKeyUp={handleKeyUp}
            placeholder={placeholder}
            rows={rows}
            style={textareaStyle}
            disabled={disabled}
            autoFocus={autoFocus}
            className="w-full p-4 font-mono text-sm border-0 bg-background focus-visible:ring-0 focus-visible:outline-none focus:border-0"
            spellCheck="false"
        />

                {/* Selection toolbar */}
                <AnimatePresence>
                    {selectionState.isSelecting && selectionState.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bg-popover border shadow-md rounded-md p-1 flex items-center gap-1 z-50"
                            style={{
                                top: Math.max(0, selectionState.position.top - 40), // Ensure toolbar doesn't go off-screen
                                left: selectionState.position.left,
                            }}
                        >
                            {selectionActions.map((action, index) => (
                                <TooltipProvider key={index}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => handleSelectionAction(action)}
                                                type="button" // Explicitly set type to avoid form submission
                                            >
                                                {action.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center" alignOffset={0}>
                                            <div className="flex justify-between gap-2">
                                                <span>{action.label}</span>
                                                {action.shortcut && (
                                                    <span className="text-muted-foreground">{action.shortcut}</span>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

// Display name for React DevTools
MarkdownEditorArea.displayName = 'MarkdownEditorArea';

export default MarkdownEditorArea;