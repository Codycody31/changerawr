import { useState, useCallback, useRef, useEffect } from 'react';

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
 * Hook for managing markdown editor state
 */
export function useMarkdownState(options: MarkdownEditorOptions = {}) {
    const {
        initialValue = '',
        autosaveKey,
        autosaveInterval = 5000,
        onChange,
        onSave,
    } = options;

    // Initialize with saved content if available
    const initialContent = autosaveKey
        ? localStorage.getItem(autosaveKey) || initialValue
        : initialValue;

    // Main state
    const [content, setContent] = useState(initialContent);
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('edit');

    // Store current selection info in a ref to avoid losing it during renders
    const selectionRef = useRef({
        start: 0,
        end: 0,
        text: ''
    });

    // Derived state
    const selectedText = content.substring(selectionStart, selectionEnd);
    const cursorPosition = selectionEnd;

    // Metrics
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);

    // History tracking
    const [history, setHistory] = useState<string[]>([initialContent]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Autosave functionality
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Text area ref
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    // Update metrics whenever content changes
    useEffect(() => {
        // Count words
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        setWordCount(words);

        // Count characters
        setCharCount(content.length);

        // Trigger onChange callback
        onChange?.(content);

    }, [content, onChange]);

    // Set up autosave
    useEffect(() => {
        if (autosaveKey) {
            // Clear any existing autosave timer
            if (autosaveTimerRef.current) {
                clearInterval(autosaveTimerRef.current);
            }

            // Set up new autosave timer
            autosaveTimerRef.current = setInterval(() => {
                localStorage.setItem(autosaveKey, content);
            }, autosaveInterval);

            // Clean up on unmount
            return () => {
                if (autosaveTimerRef.current) {
                    clearInterval(autosaveTimerRef.current);
                }
            };
        }
    }, [autosaveKey, autosaveInterval, content]);

    /**
     * Update the content and add to history
     */
    const updateContent = useCallback((newContent: string) => {
        if (newContent === content) return;

        setContent(newContent);

        // Add to history if it's different from the current state
        const newHistory = [...history.slice(0, historyIndex + 1), newContent];
        setHistory(newHistory);
        setHistoryIndex(historyIndex + 1);
    }, [content, history, historyIndex]);

    /**
     * Handle content change from editor
     * Safe implementation with null checks
     */
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!e || !e.target) return;

        const newContent = e.target.value;

        // Safely access selection properties
        const target = e.target;
        const start = typeof target.selectionStart === 'number' ? target.selectionStart : 0;
        const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : 0;

        // Update selection ref
        selectionRef.current = {
            start,
            end,
            text: newContent.substring(start, end)
        };

        // Update state
        setSelectionStart(start);
        setSelectionEnd(end);
        updateContent(newContent);
    }, [updateContent]);

    /**
     * Handle selection change safely
     */
    const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        if (!e || !e.currentTarget) return;

        const target = e.currentTarget;
        const start = typeof target.selectionStart === 'number' ? target.selectionStart : 0;
        const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : 0;

        // Update selection ref
        selectionRef.current = {
            start,
            end,
            text: content.substring(start, end)
        };

        // Update state
        setSelectionStart(start);
        setSelectionEnd(end);
    }, [content]);

    /**
     * Insert text at the current cursor position or replace selected text
     */
    const insertText = useCallback((text: string) => {
        if (!textAreaRef.current) return;

        const { start, end } = selectionRef.current;

        const newContent =
            content.substring(0, start) +
            text +
            content.substring(end);

        updateContent(newContent);

        // Focus and set selection after React updates the DOM
        setTimeout(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();

                const newPosition = start + text.length;
                textAreaRef.current.setSelectionRange(newPosition, newPosition);

                // Update selection state
                setSelectionStart(newPosition);
                setSelectionEnd(newPosition);
                selectionRef.current = {
                    start: newPosition,
                    end: newPosition,
                    text: ''
                };
            }
        }, 0);
    }, [content, updateContent]);

    /**
     * Wrap selected text with prefix and suffix
     */
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

        // Focus and restore selection after React updates the DOM
        setTimeout(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();

                const newSelectionStart = start + prefix.length;
                const newSelectionEnd = newSelectionStart + text.length;

                textAreaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd);

                // Update selection state
                setSelectionStart(newSelectionStart);
                setSelectionEnd(newSelectionEnd);
                selectionRef.current = {
                    start: newSelectionStart,
                    end: newSelectionEnd,
                    text
                };
            }
        }, 0);
    }, [content, updateContent]);

    /**
     * Save the content
     */
    const save = useCallback(() => {
        if (autosaveKey) {
            localStorage.setItem(autosaveKey, content);
        }

        onSave?.(content);
    }, [content, autosaveKey, onSave]);

    /**
     * Undo the last change
     */
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
        }
    }, [history, historyIndex]);

    /**
     * Redo the last undone change
     */
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
        }
    }, [history, historyIndex]);

    // Current editor state object
    const editorState: MarkdownEditorState = {
        content,
        selectionStart,
        selectionEnd,
        selectedText,
        cursorPosition,
        previewMode,
        wordCount,
        charCount,
    };

    // Actions object
    const actions = {
        setContent: updateContent,
        setPreviewMode,
        handleChange,
        handleSelect,
        insertText,
        wrapText,
        save,
        undo,
        redo,
    };

    // Refs object
    const refs = {
        textAreaRef,
        selectionRef,
    };

    return {
        state: editorState,
        actions,
        refs,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
    };
}

export default useMarkdownState;