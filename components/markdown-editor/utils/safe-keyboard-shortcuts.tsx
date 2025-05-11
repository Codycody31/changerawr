'use client';

import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    action: () => void;
    description: string;
}

/**
 * Hook for safely adding keyboard shortcuts without breaking typing
 */
export function useSafeKeyboardShortcuts(
    shortcuts: KeyboardShortcut[],
    targetRef: React.RefObject<HTMLElement>,
    enabled: boolean = true,
    debug: boolean = false
) {
    // Ref to track currently active handlers
    const handlersRef = useRef<Function[]>([]);

    // Log function that only logs in debug mode
    const log = useCallback((message: string) => {
        if (debug) {
            console.log(`[KeyboardShortcuts] ${message}`);
        }
    }, [debug]);

    // Check if a keyboard event matches a shortcut
    const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
        // First check the key
        if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) {
            return false;
        }

        // Check modifiers - shortcut requires modifier but event doesn't have it
        if ((shortcut.ctrlKey || shortcut.metaKey) && !(event.ctrlKey || event.metaKey)) {
            return false;
        }

        if (shortcut.shiftKey && !event.shiftKey) {
            return false;
        }

        if (shortcut.altKey && !event.altKey) {
            return false;
        }

        // Check modifiers - event has modifier but shortcut doesn't require it
        // This ensures you can still type normally (e.g., shift+a for 'A')
        if (!shortcut.ctrlKey && !shortcut.metaKey && (event.ctrlKey || event.metaKey)) {
            return false;
        }

        if (!shortcut.altKey && event.altKey) {
            return false;
        }

        return true;
    }, []);

    // Set up shortcuts
    useEffect(() => {
        // Clean up any existing handlers
        handlersRef.current.forEach(cleanup => cleanup());
        handlersRef.current = [];

        // If not enabled or no target element, skip
        if (!enabled || !targetRef.current) {
            log('Shortcuts disabled or no target element');
            return;
        }

        const targetElement = targetRef.current;
        log(`Setting up ${shortcuts.length} shortcuts on ${targetElement.tagName}`);

        // Create handler for this element
        const handler = (event: KeyboardEvent) => {
            // Skip if target is different (event bubbling)
            if (event.target !== targetElement) {
                return;
            }

            // Only process events with modifier keys when in an input or textarea
            // This allows normal typing to work uninterrupted
            const isInputElement =
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement;

            if (isInputElement && !event.ctrlKey && !event.metaKey && !event.altKey) {
                return;
            }

            // Check each shortcut
            for (const shortcut of shortcuts) {
                if (matchesShortcut(event, shortcut)) {
                    log(`Matched shortcut: ${shortcut.description}`);

                    // Prevent default to avoid triggering browser shortcuts
                    event.preventDefault();

                    try {
                        // Execute the action
                        shortcut.action();
                    } catch (error) {
                        console.error(`Error executing shortcut ${shortcut.description}:`, error);
                    }

                    // Stop after first match
                    return;
                }
            }
        };

        // Add handler
        targetElement.addEventListener('keydown', handler);

        // Save cleanup function
        handlersRef.current.push(() => {
            targetElement.removeEventListener('keydown', handler);
        });

        // Cleanup function
        return () => {
            handlersRef.current.forEach(cleanup => cleanup());
            handlersRef.current = [];
        };
    }, [shortcuts, targetRef, enabled, matchesShortcut, log]);

    // Helper to manually clean up handlers
    const cleanupHandlers = useCallback(() => {
        handlersRef.current.forEach(cleanup => cleanup());
        handlersRef.current = [];
    }, []);

    return { cleanupHandlers };
}

/**
 * Component that adds keyboard shortcuts to children
 */
export function KeyboardShortcutsProvider({
                                              shortcuts,
                                              children,
                                              enabled = true,
                                              debug = false
                                          }: {
    shortcuts: KeyboardShortcut[];
    children: React.ReactNode;
    enabled?: boolean;
    debug?: boolean;
}) {
    // Ref for the container
    const containerRef = useRef<HTMLDivElement>(null);

    // Use our hook
    useSafeKeyboardShortcuts(shortcuts, containerRef, enabled, debug);

    return (
        <div ref={containerRef} className="keyboard-shortcuts-container">
        {children}
        </div>
);
}

export default useSafeKeyboardShortcuts;