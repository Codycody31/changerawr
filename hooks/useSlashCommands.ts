import { useState, useCallback, useEffect } from 'react';
import { AICompletionType } from '@/lib/utils/ai/types';

// Command group definition
export interface CommandGroup {
    name: string;
    commands: Command[];
}

// Command definition
export interface Command {
    name: string;
    description: string;
    icon: React.ReactNode;
    action: (text?: string) => void;
    shortcut?: string;
    category?: 'basic' | 'format' | 'insert' | 'ai';
}

// Slash menu state
export interface SlashCommandState {
    visible: boolean;
    query: string;
    position: { x: number; y: number } | null;
    activeCommandIndex: number;
}

// Hook props
export interface UseSlashCommandsProps {
    content: string;
    cursorPosition: number;
    onInsertText: (text: string) => void;
    onWrapText: (prefix: string, suffix?: string) => void;
    onAICommand?: (type: AICompletionType, customPrompt?: string) => void;
    commandGroups?: CommandGroup[];
    enableAICommands?: boolean;
}

/**
 * Hook for managing slash commands in the editor
 */
export function useSlashCommands({
                                     content,
                                     cursorPosition,
                                     onInsertText,
                                     onWrapText,
                                     onAICommand,
                                     commandGroups: propCommandGroups,
                                     enableAICommands = true,
                                 }: UseSlashCommandsProps) {
    // Slash menu state
    const [state, setState] = useState<SlashCommandState>({
        visible: false,
        query: '',
        position: null,
        activeCommandIndex: 0,
    });

    // Track if we're currently processing slash input
    const [lastKeyWasSlash, setLastKeyWasSlash] = useState(false);

    // Default command groups
    const defaultCommandGroups: CommandGroup[] = [
        {
            name: 'Basic',
            commands: [
                {
                    name: 'Heading 1',
                    description: 'Add a large heading',
                    icon: '# H1',
                    category: 'format',
                    shortcut: '# ',
                    action: () => onWrapText('# ', '\n'),
                },
                {
                    name: 'Heading 2',
                    description: 'Add a medium heading',
                    icon: '## H2',
                    category: 'format',
                    shortcut: '## ',
                    action: () => onWrapText('## ', '\n'),
                },
                {
                    name: 'Heading 3',
                    description: 'Add a small heading',
                    icon: '### H3',
                    category: 'format',
                    shortcut: '### ',
                    action: () => onWrapText('### ', '\n'),
                },
                {
                    name: 'Bold',
                    description: 'Make text bold',
                    icon: 'B',
                    category: 'format',
                    shortcut: 'Ctrl+B',
                    action: () => onWrapText('**', '**'),
                },
                {
                    name: 'Italic',
                    description: 'Make text italic',
                    icon: 'I',
                    category: 'format',
                    shortcut: 'Ctrl+I',
                    action: () => onWrapText('_', '_'),
                },
                {
                    name: 'Bullet List',
                    description: 'Add a bulleted list',
                    icon: '•',
                    category: 'format',
                    action: () => onInsertText('- '),
                },
                {
                    name: 'Numbered List',
                    description: 'Add a numbered list',
                    icon: '1.',
                    category: 'format',
                    action: () => onInsertText('1. '),
                },
                {
                    name: 'Task List',
                    description: 'Add a checkbox item',
                    icon: '☐',
                    category: 'insert',
                    action: () => onInsertText('- [ ] '),
                },
                {
                    name: 'Code Block',
                    description: 'Add a code block',
                    icon: '</>',
                    category: 'insert',
                    action: () => onWrapText('```\n', '\n```'),
                },
                {
                    name: 'Link',
                    description: 'Add a link',
                    icon: '🔗',
                    category: 'insert',
                    action: () => onWrapText('[', '](url)'),
                },
                {
                    name: 'Image',
                    description: 'Add an image',
                    icon: '🖼️',
                    category: 'insert',
                    action: () => onWrapText('![', '](url)'),
                },
                {
                    name: 'Quote',
                    description: 'Add a blockquote',
                    icon: '❝',
                    category: 'insert',
                    action: () => onInsertText('> '),
                },
                {
                    name: 'Divider',
                    description: 'Add a horizontal rule',
                    icon: '―',
                    category: 'insert',
                    action: () => onInsertText('\n---\n'),
                },
                {
                    name: 'Table',
                    description: 'Add a table',
                    icon: '⊞',
                    category: 'insert',
                    action: () => onInsertText('\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n'),
                },
            ],
        }
    ];

    // AI commands group (conditionally added if enableAICommands is true)
    const aiCommandGroup: CommandGroup = {
        name: 'AI',
        commands: [
            {
                name: 'ai complete',
                description: 'Complete your thought',
                icon: '✨',
                category: 'ai',
                action: () => onAICommand?.(AICompletionType.COMPLETE),
            },
            {
                name: 'ai expand',
                description: 'Elaborate on this topic',
                icon: '↔️',
                category: 'ai',
                action: () => onAICommand?.(AICompletionType.EXPAND),
            },
            {
                name: 'ai improve',
                description: 'Enhance writing style',
                icon: '✏️',
                category: 'ai',
                action: () => onAICommand?.(AICompletionType.IMPROVE),
            },
            {
                name: 'ai summarize',
                description: 'Summarize content',
                icon: '📝',
                category: 'ai',
                action: () => onAICommand?.(AICompletionType.SUMMARIZE),
            },
            {
                name: 'ai custom',
                description: 'Custom AI instruction',
                icon: '🤖',
                category: 'ai',
                action: () => onAICommand?.(AICompletionType.CUSTOM),
            },
        ],
    };

    // Combine command groups
    const commandGroups = propCommandGroups || [
        ...defaultCommandGroups,
        ...(enableAICommands ? [aiCommandGroup] : []),
    ];

    // Flatten all commands for easier handling
    const allCommands = commandGroups.flatMap(group => group.commands);

    // Filter commands based on query
    const filteredCommandGroups = commandGroups.map(group => ({
        ...group,
        commands: group.commands.filter(cmd =>
            cmd.name.toLowerCase().includes(state.query.toLowerCase())
        ),
    })).filter(group => group.commands.length > 0);

    // Get filtered commands as a flat list
    const filteredCommands = filteredCommandGroups.flatMap(group => group.commands);

    /**
     * Handle keydown events for slash commands
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // If ESC pressed, close menu
        if (e.key === 'Escape' && state.visible) {
            e.preventDefault();
            setState(prev => ({ ...prev, visible: false }));
            return;
        }

        // If menu is visible, handle navigation and selection
        if (state.visible) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setState(prev => ({
                    ...prev,
                    activeCommandIndex: (prev.activeCommandIndex + 1) % filteredCommands.length
                }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setState(prev => ({
                    ...prev,
                    activeCommandIndex: (prev.activeCommandIndex - 1 + filteredCommands.length) % filteredCommands.length
                }));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();

                if (filteredCommands.length > 0) {
                    const selectedCommand = filteredCommands[state.activeCommandIndex];
                    executeCommand(selectedCommand);
                }
            }
        }

        // Track slash key press
        if (e.key === '/') {
            setLastKeyWasSlash(true);
        } else {
            setLastKeyWasSlash(false);
        }
    }, [state, filteredCommands]);

    /**
     * Handle content changes for slash commands
     */
    const handleContentChange = useCallback(() => {
        if (lastKeyWasSlash && !state.visible) {
            // If the last key was a slash, show the menu
            setState({
                visible: true,
                query: '',
                position: calculateMenuPosition(),
                activeCommandIndex: 0,
            });
        } else if (state.visible) {
            // Extract the query from content
            const textBeforeCursor = content.substring(0, cursorPosition);
            const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

            if (lastSlashIndex !== -1) {
                const query = textBeforeCursor.substring(lastSlashIndex + 1);
                setState(prev => ({ ...prev, query }));
            } else {
                // If there's no slash, hide the menu
                setState(prev => ({ ...prev, visible: false }));
            }
        }
    }, [lastKeyWasSlash, state.visible, content, cursorPosition]);

    /**
     * Calculate menu position based on cursor
     */
    const calculateMenuPosition = useCallback(() => {
        // This is a placeholder. In a real implementation, you'd get the actual position
        // of the cursor in the textarea. This would involve DOM measurements.
        return { x: 0, y: 0 };
    }, []);

    /**
     * Execute a command and hide the menu
     */
    const executeCommand = useCallback((command: Command) => {
        // Replace the slash command in the text
        const textBeforeCursor = content.substring(0, cursorPosition);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

        // If the command is an AI command, remove the slash command
        if (command.category === 'ai') {
            const beforeSlashText = content.substring(0, lastSlashIndex);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const afterQueryText = content.substring(cursorPosition);

            // Execute AI command
            command.action(beforeSlashText);

            // Close slash menu
            setState(prev => ({ ...prev, visible: false }));
        } else {
            // Execute regular command
            command.action();

            // Close slash menu
            setState(prev => ({ ...prev, visible: false }));
        }
    }, [content, cursorPosition, onInsertText]);

    /**
     * Show the slash menu
     */
    const showMenu = useCallback((position: { x: number; y: number } = { x: 0, y: 0 }) => {
        setState({
            visible: true,
            query: '',
            position,
            activeCommandIndex: 0,
        });
    }, []);

    /**
     * Hide the slash menu
     */
    const hideMenu = useCallback(() => {
        setState(prev => ({ ...prev, visible: false }));
    }, []);

    /**
     * Handle command click
     */
    const handleCommandClick = useCallback((command: Command) => {
        executeCommand(command);
    }, [executeCommand]);

    // Update menu state when content changes
    useEffect(() => {
        handleContentChange();
    }, [content, cursorPosition, handleContentChange]);

    // Reset state if AI commands get disabled
    useEffect(() => {
        if (!enableAICommands) {
            // Hide menu if it was showing an AI command
            const activeCommand = filteredCommands[state.activeCommandIndex];
            if (activeCommand?.category === 'ai') {
                setState(prev => ({ ...prev, visible: false }));
            }
        }
    }, [enableAICommands, filteredCommands, state.activeCommandIndex]);

    return {
        menu: {
            ...state,
            filteredCommandGroups,
            allCommands,
            filteredCommands,
        },
        actions: {
            showMenu,
            hideMenu,
            handleKeyDown,
            handleCommandClick,
        },
    };
}

export default useSlashCommands;