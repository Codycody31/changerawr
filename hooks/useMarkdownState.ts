// components/markdown-editor/hooks/useMarkdownState.ts

import { useState, useCallback } from 'react';

export interface MarkdownState {
    content: string;
    history: string[];
    historyIndex: number;
    isDirty: boolean;
}

export interface MarkdownActions {
    setContent: (content: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    markClean: () => void;
}

export interface UseMarkdownStateOptions {
    initialContent?: string;
    maxHistory?: number;
    onChange?: (content: string) => void;
}

export function useMarkdownState(options: UseMarkdownStateOptions = {}) {
    const { initialContent = '', maxHistory = 50, onChange } = options;

    const [state, setState] = useState<MarkdownState>({
        content: initialContent,
        history: [initialContent],
        historyIndex: 0,
        isDirty: false
    });

    const addToHistory = useCallback((content: string) => {
        setState(prev => {
            const newHistory = prev.history.slice(0, prev.historyIndex + 1);
            newHistory.push(content);

            // Limit history size
            if (newHistory.length > maxHistory) {
                newHistory.shift();
            }

            return {
                ...prev,
                content,
                history: newHistory,
                historyIndex: newHistory.length - 1,
                isDirty: true
            };
        });
        onChange?.(content);
    }, [maxHistory, onChange]);

    const setContent = useCallback((content: string) => {
        addToHistory(content);
    }, [addToHistory]);

    const undo = useCallback(() => {
        setState(prev => {
            if (prev.historyIndex > 0) {
                const newIndex = prev.historyIndex - 1;
                const content = prev.history[newIndex];
                onChange?.(content);
                return {
                    ...prev,
                    content,
                    historyIndex: newIndex,
                    isDirty: true
                };
            }
            return prev;
        });
    }, [onChange]);

    const redo = useCallback(() => {
        setState(prev => {
            if (prev.historyIndex < prev.history.length - 1) {
                const newIndex = prev.historyIndex + 1;
                const content = prev.history[newIndex];
                onChange?.(content);
                return {
                    ...prev,
                    content,
                    historyIndex: newIndex,
                    isDirty: true
                };
            }
            return prev;
        });
    }, [onChange]);

    const canUndo = useCallback(() => state.historyIndex > 0, [state.historyIndex]);
    const canRedo = useCallback(() => state.historyIndex < state.history.length - 1, [state.historyIndex, state.history.length]);

    const markClean = useCallback(() => {
        setState(prev => ({ ...prev, isDirty: false }));
    }, []);

    return {
        state,
        actions: {
            setContent,
            undo,
            redo,
            canUndo,
            canRedo,
            markClean
        }
    };
}