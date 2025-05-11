import { useState, useCallback, useRef } from 'react';

export type PreviewMode = 'edit' | 'preview' | 'split';

export interface MarkdownEditorState {
    content: string;
    selectionStart: number;
    selectionEnd: number;
    selectedText: string;
    cursorPosition: number;
    previewMode: PreviewMode;
    wordCount: number;
    charCount: number;
}

export interface MarkdownEditorOptions {
    initialValue?: string;
    autosaveKey?: string;
    autosaveInterval?: number;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
}

/**
 * Simplified hook for managing markdown editor state
 * Removed potential sources of infinite updates
 */
export function useMarkdownState(options: MarkdownEditorOptions = {}) {
    const {
        initialValue = '',
        autosaveKey,
        onChange,
        onSave,
    } = options;

    // Get initial content from localStorage if available
    const getInitialContent = () => {
        if (autosaveKey && typeof window !== 'undefined') {
            return localStorage.getItem(autosaveKey) || initialValue;
        }
        return initialValue;
    };

    // Basic state - only the essentials
    const [content, setContent] = useState(getInitialContent());
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('edit');

    // Refs
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const selectionRef = useRef({
        start: 0,
        end: 0,
        text: ''
    });

    // Simplified content update with minimal dependencies
    const updateContent = useCallback((newContent: string) => {
        setContent(newContent);
        if (onChange) {
            onChange(newContent);
        }
    }, [onChange]);

    // Basic change handler that just updates content
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (e && e.target) {
            updateContent(e.target.value);
        }
    }, [updateContent]);

    // Selection handler that uses refs to avoid state updates
    const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        if (e && e.currentTarget) {
            const target = e.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            // Update ref without state updates
            selectionRef.current = {
                start,
                end,
                text: content.substring(start, end)
            };

            // Only update state if we need to
            if (start !== selectionStart) {
                setSelectionStart(start);
            }
            if (end !== selectionEnd) {
                setSelectionEnd(end);
            }
        }
    }, [content, selectionStart, selectionEnd]);

    // Insert text at cursor position
    const insertText = useCallback((text: string) => {
        if (!textAreaRef.current) return;

        const { start, end } = selectionRef.current;
        const newContent = content.substring(0, start) + text + content.substring(end);

        updateContent(newContent);

        // Update cursor position after text insert
        const newPosition = start + text.length;

        // Request animation frame to ensure DOM is updated
        window.requestAnimationFrame(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();
                textAreaRef.current.setSelectionRange(newPosition, newPosition);

                // Update selection state
                selectionRef.current = {
                    start: newPosition,
                    end: newPosition,
                    text: ''
                };

                setSelectionStart(newPosition);
                setSelectionEnd(newPosition);
            }
        });
    }, [content, updateContent]);

    // Wrap selected text with prefix and suffix
    const wrapText = useCallback((prefix: string, suffix: string = '') => {
        if (!textAreaRef.current) return;

        const { start, end, text } = selectionRef.current;

        const newContent =
            content.substring(0, start) +
            prefix +
            text +
            suffix +
            content.substring(end);

        updateContent(newContent);

        // Calculate new selection range
        const newSelectionStart = start + prefix.length;
        const newSelectionEnd = newSelectionStart + text.length;

        // Focus and select the wrapped text
        window.requestAnimationFrame(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();
                textAreaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd);

                // Update selection state
                selectionRef.current = {
                    start: newSelectionStart,
                    end: newSelectionEnd,
                    text
                };

                setSelectionStart(newSelectionStart);
                setSelectionEnd(newSelectionEnd);
            }
        });
    }, [content, updateContent]);

    // Simple save function
    const save = useCallback(() => {
        // Save to localStorage if autosaveKey provided
        if (autosaveKey && typeof window !== 'undefined') {
            localStorage.setItem(autosaveKey, content);
        }

        // Call onSave callback if provided
        if (onSave) {
            onSave(content);
        }
    }, [autosaveKey, content, onSave]);

    // Calculate word and character count
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    // Cursor position (same as selection end)
    const cursorPosition = selectionEnd;

    // Selected text (derived from content and selection)
    const selectedText = content.substring(selectionStart, selectionEnd);

    return {
        state: {
            content,
            selectionStart,
            selectionEnd,
            selectedText,
            cursorPosition,
            previewMode,
            wordCount,
            charCount
        },
        actions: {
            setContent: updateContent,
            setPreviewMode,
            handleChange,
            handleSelect,
            insertText,
            wrapText,
            save,
            undo: () => {}, // Placeholder
            redo: () => {}  // Placeholder
        },
        refs: {
            textAreaRef,
            selectionRef
        },
        canUndo: false,
        canRedo: false
    };
}

export default useMarkdownState;