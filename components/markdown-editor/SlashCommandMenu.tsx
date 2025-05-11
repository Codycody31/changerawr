'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { Command } from './utils/keyboard-shortcuts';

/**
 * Props for slash command group
 */
export interface CommandGroup {
    name: string;
    commands: Command[];
}

/**
 * Props for SlashCommandMenu component
 */
export interface SlashCommandMenuProps {
    /**
     * Whether the menu is visible
     */
    visible: boolean;

    /**
     * Position of the menu
     */
    position?: {
        x: number;
        y: number;
    };

    /**
     * Current search query
     */
    query: string;

    /**
     * Command groups to display
     */
    commandGroups: CommandGroup[];

    /**
     * Currently active command index
     */
    activeCommandIndex: number;

    /**
     * Handler for clicking a command
     */
    onCommandClick: (command: Command) => void;

    /**
     * Handler for changing the active command
     */
    onActiveCommandChange?: (index: number) => void;

    /**
     * Handler for closing the menu
     */
    onClose?: () => void;

    /**
     * Max height of the menu
     */
    maxHeight?: number;
}

/**
 * Slash Command Menu Component
 */
export default function SlashCommandMenu({
                                             visible,
                                             position = { x: 0, y: 0 },
                                             query,
                                             commandGroups,
                                             activeCommandIndex,
                                             onCommandClick,
                                             onActiveCommandChange,
                                             onClose,
                                             maxHeight = 300,
                                         }: SlashCommandMenuProps) {
    // Filter command groups based on query
    const filteredGroups = commandGroups
        .map(group => ({
            ...group,
            commands: group.commands.filter(cmd =>
                cmd.name.toLowerCase().includes(query.toLowerCase())
            )
        }))
        .filter(group => group.commands.length > 0);

    // Flatten commands for easier indexing
    const flattenedCommands = filteredGroups.flatMap(group => group.commands);

    // Get the active command
    const activeCommand = flattenedCommands[activeCommandIndex] || null;

    // Handle mouse enter on command items
    const handleMouseEnter = (index: number) => {
        if (onActiveCommandChange) {
            onActiveCommandChange(index);
        }
    };

    // If no groups or no commands, don't render
    if (filteredGroups.length === 0 || flattenedCommands.length === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-64 bg-background border shadow-md rounded-md overflow-hidden"
                    style={{
                        top: position.y,
                        left: position.x,
                    }}
                >
                    {/* Search header */}
                    <div className="p-2 border-b flex items-center gap-2 text-sm text-muted-foreground">
                        <Search className="w-3.5 h-3.5" />
                        <span>
              {query.length > 0 ? `"${query}"` : "Type to search..."}
            </span>
                    </div>

                    {/* Command list */}
                    <div className="overflow-y-auto" style={{ maxHeight }}>
                        {filteredGroups.map((group, groupIndex) => (
                            <div key={`group-${groupIndex}`}>
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {group.name}
                                </div>

                                {group.commands.map((command, cmdIndex) => {
                                    // Calculate global index for this command
                                    const globalIndex = flattenedCommands.indexOf(command);
                                    const isActive = globalIndex === activeCommandIndex;

                                    return (
                                        <motion.div
                                            key={`cmd-${cmdIndex}`}
                                            className={`px-2 py-1.5 mx-1 rounded flex items-center gap-2 cursor-pointer ${
                                                isActive
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => onCommandClick(command)}
                                            onMouseEnter={() => handleMouseEnter(globalIndex)}
                                            whileHover={{ backgroundColor: isActive ? undefined : 'rgba(0, 0, 0, 0.05)' }}
                                        >
                      <span className="flex items-center justify-center w-5 h-5">
                        {command.icon || null}
                      </span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{command.name}</span>
                                                {command.description && (
                                                    <span className="text-xs text-muted-foreground">
                            {command.description}
                          </span>
                                                )}
                                            </div>
                                            {command.shortcut && (
                                                <span className="ml-auto text-xs text-muted-foreground">
                          {command.shortcut}
                        </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Optional keyboard navigation hints */}
                    <div className="px-2 py-1 border-t border-muted text-xs text-muted-foreground flex justify-between">
                        <div className="flex gap-2">
                            <span>↑ ↓</span>
                            <span>Navigate</span>
                        </div>
                        <div className="flex gap-2">
                            <span>↵</span>
                            <span>Select</span>
                        </div>
                        <div className="flex gap-2">
                            <span>Esc</span>
                            <span>Dismiss</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}