import { useState, useCallback, useEffect, useRef } from 'react';
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
    const [menuState, setMenuState] = useState<SlashCommandState>({
        visible: false,
        query: '',
        position: null,
        activeCommandIndex: 0,
    });

    // Use refs to track state without causing updates
    const stateRef = useRef(menuState);
    const lastKeyWasSlashRef = useRef(false);

    // Update ref when state changes
    useEffect(() => {
        stateRef.current = menuState;
    }, [menuState]);

    // AI commands group
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

    // Default basic commands
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

    // Combine command groups
    const allCommandGroups = propCommandGroups || [
        ...defaultCommandGroups,
        ...(enableAICommands && onAICommand ? [aiCommandGroup] : []),
    ];

    // Get filtered command groups based on query
    const getFilteredCommandGroups = useCallback(() => {
        const query = stateRef.current.query.toLowerCase();

        return allCommandGroups
            .map(group => ({
                ...group,
                commands: group.commands.filter(cmd =>
                    cmd.name.toLowerCase().includes(query)
                )
            }))
            .filter(group => group.commands.length > 0);
    }, [allCommandGroups]);

    // Calculate menu position
    const calculateMenuPosition = useCallback(() => {
        return { x: 0, y: 0 };
    }, []);

    // Handle keydown events for slash commands
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Track if the key is a slash to potentially show menu
        if (e.key === '/') {
            lastKeyWasSlashRef.current = true;
            return;
        }

        // If not a slash, reset flag
        if (e.key !== 'Shift') { // Ignore shift key presses
            lastKeyWasSlashRef.current = false;
        }

        // Handle navigation when menu is visible
        if (stateRef.current.visible) {
            // Close menu on escape
            if (e.key === 'Escape') {
                e.preventDefault();
                setMenuState(prev => ({ ...prev, visible: false }));
                return;
            }

            // Get current filtered commands
            const filteredGroups = getFilteredCommandGroups();
            const filteredCommands = filteredGroups.flatMap(group => group.commands);

            // Navigation keys
            if (filteredCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMenuState(prev => ({
                        ...prev,
                        activeCommandIndex: (prev.activeCommandIndex + 1) % filteredCommands.length
                    }));
                    return;
                }

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMenuState(prev => ({
                        ...prev,
                        activeCommandIndex: (prev.activeCommandIndex - 1 + filteredCommands.length) % filteredCommands.length
                    }));
                    return;
                }

                // Selection keys
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();

                    try {
                        const selectedCommand = filteredCommands[stateRef.current.activeCommandIndex];
                        if (selectedCommand) {
                            executeCommand(selectedCommand);
                        }
                    } catch (error) {
                        console.error('Error executing command:', error);
                        setMenuState(prev => ({ ...prev, visible: false }));
                    }
                    return;
                }
            }
        }
    }, [getFilteredCommandGroups]);

    // Execute a command and hide the menu
    const executeCommand = useCallback((command: Command) => {
        try {
            // Replace the slash command in the text if needed
            const textBeforeCursor = content.substring(0, cursorPosition);
            const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

            // If the command is an AI command, remove the slash command
            if (command.category === 'ai' && onAICommand) {
                // Temporarily store context
                const beforeSlashText = content.substring(0, lastSlashIndex);

                // Execute AI command
                command.action(beforeSlashText);
            } else {
                // Execute regular command
                command.action();
            }

            // Close menu
            setMenuState(prev => ({ ...prev, visible: false }));
        } catch (error) {
            console.error('Error executing command:', error);
            setMenuState(prev => ({ ...prev, visible: false }));
        }
    }, [content, cursorPosition, onAICommand]);

    // Check if a slash was typed and show menu if needed
    useEffect(() => {
        try {
            if (lastKeyWasSlashRef.current && !stateRef.current.visible) {
                // Show menu when slash is pressed
                setMenuState({
                    visible: true,
                    query: '',
                    position: calculateMenuPosition(),
                    activeCommandIndex: 0,
                });
            } else if (stateRef.current.visible) {
                // Update query based on text after slash
                const textBeforeCursor = content.substring(0, cursorPosition);
                const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

                if (lastSlashIndex !== -1) {
                    // Extract query from content
                    const query = textBeforeCursor.substring(lastSlashIndex + 1);

                    // Only update if query changed to avoid re-renders
                    if (query !== stateRef.current.query) {
                        setMenuState(prev => ({ ...prev, query }));
                    }
                } else {
                    // If there's no slash anymore, hide the menu
                    setMenuState(prev => ({ ...prev, visible: false }));
                }
            }
        } catch (error) {
            console.error('Error in slash command effect:', error);
        }
    }, [content, cursorPosition, calculateMenuPosition]);

    // Show the slash menu
    const showMenu = useCallback((position: { x: number; y: number } = { x: 0, y: 0 }) => {
        setMenuState({
            visible: true,
            query: '',
            position,
            activeCommandIndex: 0,
        });
    }, []);

    // Hide the slash menu
    const hideMenu = useCallback(() => {
        setMenuState(prev => ({ ...prev, visible: false }));
    }, []);

    // Handle command click
    const handleCommandClick = useCallback((command: Command) => {
        executeCommand(command);
    }, [executeCommand]);

    // Get current filtered data
    const filteredCommandGroups = getFilteredCommandGroups();
    const allCommands = allCommandGroups.flatMap(group => group.commands);
    const filteredCommands = filteredCommandGroups.flatMap(group => group.commands);

    return {
        menu: {
            ...menuState,
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