import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Options for the editor history hook
 */
export interface EditorHistoryOptions {
    initialValue?: string;
    maxHistoryLength?: number;
    debounceTime?: number;
}

/**
 * Hook for managing editor history (undo/redo)
 */
export function useEditorHistory({
                                     initialValue = '',
                                     maxHistoryLength = 100,
                                     debounceTime = 500,
                                 }: EditorHistoryOptions = {}) {
    // State for content and history
    const [content, setContent] = useState(initialValue);
    const [history, setHistory] = useState<string[]>([initialValue]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Debounce timer for adding history entries
    const debounceTimerRef = useRef<number | null>(null);

    // Track if the content change is from undo/redo
    const isUndoRedoRef = useRef<boolean>(false);

    /**
     * Add a new history entry
     */
    const addHistoryEntry = useCallback((newContent: string) => {
        // Don't add if nothing changed or if we're undoing/redoing
        if (newContent === history[historyIndex] || isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }

        // Clear any existing timer
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Create a new timer
        debounceTimerRef.current = window.setTimeout(() => {
            setHistory(prev => {
                // If we're not at the newest entry, trim the history
                const newHistory = prev.slice(0, historyIndex + 1);

                // Add the new entry
                newHistory.push(newContent);

                // Trim history if it exceeds the max length
                if (newHistory.length > maxHistoryLength) {
                    return newHistory.slice(newHistory.length - maxHistoryLength);
                }

                return newHistory;
            });

            setHistoryIndex(prev => {
                // If we've cut off history due to maxLength, adjust the index
                const newIndex = prev + 1;
                return Math.min(newIndex, maxHistoryLength - 1);
            });
        }, debounceTime);
    }, [history, historyIndex, maxHistoryLength, debounceTime]);

    /**
     * Update editor content and track history
     */
    const updateContent = useCallback((newContent: string) => {
        setContent(newContent);

        // Skip history addition if coming from undo/redo
        if (!isUndoRedoRef.current) {
            addHistoryEntry(newContent);
        }
    }, [addHistoryEntry]);

    /**
     * Undo the last change
     */
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedoRef.current = true;
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
            isUndoRedoRef.current = true;
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
        }
    }, [history, historyIndex]);

    /**
     * Clear history and set new content
     */
    const resetContent = useCallback((newContent: string) => {
        setContent(newContent);
        setHistory([newContent]);
        setHistoryIndex(0);
    }, []);

    // Clean up the debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        content,
        updateContent,
        undo,
        redo,
        resetContent,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        historyLength: history.length,
        currentIndex: historyIndex,
    };
}

export default useEditorHistory;