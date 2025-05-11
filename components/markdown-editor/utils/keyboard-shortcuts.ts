/**
 * Keyboard shortcut utilities for the markdown editor
 */

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    preventDefault?: boolean;
    action: () => void;
    description: string;
}

/**
 * Keyboard shortcut handler configuration
 */
export interface KeyboardShortcutsConfig {
    shortcuts: KeyboardShortcut[];
    // Additional options can be added here
    enableInInputs?: boolean;
}

/**
 * Default keyboard shortcuts for markdown editor
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    {
        key: 'b',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Bold',
        preventDefault: true,
    },
    {
        key: 'i',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Italic',
        preventDefault: true,
    },
    {
        key: 'k',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Link',
        preventDefault: true,
    },
    {
        key: '1',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Heading 1',
        preventDefault: true,
    },
    {
        key: '2',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Heading 2',
        preventDefault: true,
    },
    {
        key: '3',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Heading 3',
        preventDefault: true,
    },
    {
        key: 'z',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Undo',
        preventDefault: true,
    },
    {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Redo',
        preventDefault: true,
    },
    {
        key: 's',
        ctrlKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Save',
        preventDefault: true,
    },
    {
        key: 'a',
        altKey: true,
        action: () => {}, // Will be connected in the component
        description: 'Open AI Assistant',
        preventDefault: true,
    },
];

// Store active handlers to prevent duplicates and allow cleanup
const activeHandlers = new Map<HTMLElement, (e: KeyboardEvent) => void>();

/**
 * Check if keyboard event matches a shortcut
 * @param event The keyboard event
 * @param shortcut The shortcut to match against
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    // For non-modifier keys, we need to match key and modifiers exactly
    if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;

    // Ctrl/Cmd check (either event or shortcut must have it, and they must match)
    if ((shortcut.ctrlKey || shortcut.metaKey) !== (event.ctrlKey || event.metaKey)) return false;

    // Shift check
    if ((shortcut.shiftKey === true) !== event.shiftKey) return false;

    // Alt check
    if ((shortcut.altKey === true) !== event.altKey) return false;

    return true;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrlKey || shortcut.metaKey) {
        // Use platform-specific symbol
        const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        parts.push(isMac ? '⌘' : 'Ctrl');
    }

    if (shortcut.shiftKey) {
        parts.push('⇧');
    }

    if (shortcut.altKey) {
        parts.push('Alt');
    }

    // Format the key (capitalize single letters)
    const key = shortcut.key.length === 1
        ? shortcut.key.toUpperCase()
        : shortcut.key;

    parts.push(key);

    return parts.join('+');
}

/**
 * Create a keyboard event handler
 */
export function createShortcutHandler(config: KeyboardShortcutsConfig) {
    return (event: KeyboardEvent) => {
        // Critical fix: Skip if target is an input/textarea and NO modifiers
        // This allows normal typing to work in inputs/textareas
        if (!config.enableInInputs) {
            const tagName = (event.target as HTMLElement)?.tagName;
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                // Only process shortcuts with modifiers
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    return;
                }
            }
        }

        // Check each shortcut
        for (const shortcut of config.shortcuts) {
            if (matchesShortcut(event, shortcut)) {
                // Only prevent default if specified
                if (shortcut.preventDefault) {
                    event.preventDefault();
                }

                try {
                    // Execute the action
                    shortcut.action();
                } catch (error) {
                    console.error("Error executing keyboard shortcut:", error);
                }

                // Stop after first match
                return;
            }
        }
    };
}

/**
 * Connect keyboard shortcuts to a specific element
 */
export function bindShortcutsToElement(
    element: HTMLElement,
    shortcuts: KeyboardShortcut[],
    options: Partial<KeyboardShortcutsConfig> = {}
): () => void {
    // Remove any existing handler for this element
    if (activeHandlers.has(element)) {
        const oldHandler = activeHandlers.get(element);
        if (oldHandler) {
            element.removeEventListener('keydown', oldHandler as EventListener);
        }
    }

    // Set up config with defaults
    const config: KeyboardShortcutsConfig = {
        shortcuts,
        enableInInputs: options.enableInInputs ?? false,
    };

    const handler = createShortcutHandler(config);

    // Store and add the handler
    activeHandlers.set(element, handler);
    element.addEventListener('keydown', handler as EventListener);

    // Return a cleanup function
    return () => {
        element.removeEventListener('keydown', handler as EventListener);
        activeHandlers.delete(element);
    };
}

/**
 * Hook-friendly function to bind shortcuts to document
 */
export function bindGlobalShortcuts(
    shortcuts: KeyboardShortcut[],
    options: Partial<KeyboardShortcutsConfig> = {}
): () => void {
    // Skip if not in browser environment
    if (typeof document === 'undefined') {
        return () => {};
    }

    return bindShortcutsToElement(document.documentElement, shortcuts, options);
}

/**
 * Get shortcut map for displaying in help dialogs
 */
export function getShortcutMap(shortcuts: KeyboardShortcut[]): Record<string, string> {
    return shortcuts.reduce((acc, shortcut) => {
        acc[shortcut.description] = formatShortcut(shortcut);
        return acc;
    }, {} as Record<string, string>);
}