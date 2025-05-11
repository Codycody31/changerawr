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

/**
 * Check if keyboard event matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    // Match modifiers
    if ((shortcut.ctrlKey || shortcut.metaKey) && !(event.ctrlKey || event.metaKey)) return false;
    if (shortcut.shiftKey && !event.shiftKey) return false;
    if (shortcut.altKey && !event.altKey) return false;

    // For non-modifier keys, match key exactly
    if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;

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
        // Skip if target is an input and enableInInputs is false
        if (!config.enableInInputs && ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
            return;
        }

        // Check each shortcut
        for (const shortcut of config.shortcuts) {
            if (matchesShortcut(event, shortcut)) {
                if (shortcut.preventDefault) {
                    event.preventDefault();
                }
                shortcut.action();
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
    const config: KeyboardShortcutsConfig = {
        shortcuts,
        enableInInputs: options.enableInInputs ?? false,
    };

    const handler = createShortcutHandler(config);

    // Add the event listener
    element.addEventListener('keydown', handler as EventListener);

    // Return a cleanup function
    return () => {
        element.removeEventListener('keydown', handler as EventListener);
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