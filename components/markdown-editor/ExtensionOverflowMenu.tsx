/**
 * Extension Overflow Menu
 *
 * Searchable dropdown menu for extension buttons that don't fit inline.
 * Features:
 * - Search by extension name
 * - Grouped by category
 * - Pin/unpin extensions
 * - Shows usage indicators
 */

'use client';

import React, { useState, useMemo } from 'react';
import { MoreHorizontal, Search, Pin, PinOff, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ExtensionButton } from '@/components/markdown-editor/MarkdownToolbar';
import { getToolbarManager } from '@/lib/services/toolbar/extensionToolbarManager';

interface ExtensionOverflowMenuProps {
    buttons: ExtensionButton[];
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>;
    onInsert?: (before: string, after: string, placeholder?: string) => void;
    onPinChange?: () => void; // Callback when pin status changes
}

const categoryLabels: Record<string, string> = {
    formatting: 'Formatting',
    blocks: 'Blocks',
    media: 'Media',
    integrations: 'Integrations',
    utilities: 'Utilities',
    other: 'Other',
};

export const ExtensionOverflowMenu: React.FC<ExtensionOverflowMenuProps> = ({
    buttons,
    textAreaRef,
    onInsert,
    onPinChange,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const toolbarManager = useMemo(() => getToolbarManager(), []);

    // Search and group buttons
    const { groupedButtons, totalCount } = useMemo(() => {
        const searched = toolbarManager.searchExtensions(buttons, searchQuery);
        const grouped = toolbarManager.groupByCategory(searched);
        const total = searched.length;

        return { groupedButtons: grouped, totalCount: total };
    }, [buttons, searchQuery, toolbarManager]);

    const handleButtonClick = (button: ExtensionButton) => {
        const extensionId = button.extensionId || button.id;

        // Record usage
        toolbarManager.recordUsage(extensionId);

        // Execute action
        if (button.onClick) {
            button.onClick();
        } else if (button.action && onInsert) {
            onInsert(button.action.before, button.action.after, button.action.placeholder);
        }

        // Close menu
        setIsOpen(false);

        // Notify parent of usage change (might affect inline buttons)
        if (onPinChange) {
            onPinChange();
        }
    };

    const handleTogglePin = (extensionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        toolbarManager.togglePin(extensionId);

        // Notify parent of pin change
        if (onPinChange) {
            onPinChange();
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };

    if (buttons.length === 0) {
        return null; // No overflow buttons
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 relative"
                                type="button"
                            >
                                <MoreHorizontal size={16} />
                                {buttons.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                        {buttons.length > 99 ? '99+' : buttons.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>More Extensions ({buttons.length})</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>More Extensions</span>
                    <span className="text-xs text-muted-foreground font-normal">
                        {totalCount} available
                    </span>
                </DropdownMenuLabel>

                <div className="px-2 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search extensions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-8"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={handleClearSearch}
                            >
                                <X size={14} />
                            </Button>
                        )}
                    </div>
                </div>

                <DropdownMenuSeparator />

                <ScrollArea className="h-[400px]">
                    {totalCount === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No extensions found matching "{searchQuery}"
                        </div>
                    ) : (
                        Object.entries(groupedButtons).map(([category, categoryButtons]) => (
                            <DropdownMenuGroup key={category}>
                                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                                    {categoryLabels[category] || category}
                                </DropdownMenuLabel>

                                {categoryButtons.map((button) => {
                                    const extensionId = button.extensionId || button.id;
                                    const isPinned = toolbarManager.isPinned(extensionId);

                                    return (
                                        <DropdownMenuItem
                                            key={button.id}
                                            onClick={() => handleButtonClick(button)}
                                            className="flex items-center gap-2 cursor-pointer group"
                                        >
                                            <span className="flex-shrink-0">
                                                {button.icon}
                                            </span>
                                            <span className="flex-1 truncate">
                                                {button.label}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                onClick={(e) => handleTogglePin(extensionId, e)}
                                                title={isPinned ? 'Unpin from toolbar' : 'Pin to toolbar'}
                                            >
                                                {isPinned ? (
                                                    <PinOff size={12} className="text-primary" />
                                                ) : (
                                                    <Pin size={12} className="text-muted-foreground" />
                                                )}
                                            </Button>
                                        </DropdownMenuItem>
                                    );
                                })}

                                <DropdownMenuSeparator />
                            </DropdownMenuGroup>
                        ))
                    )}
                </ScrollArea>

                <DropdownMenuSeparator />

                <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                    Click <Pin size={10} className="inline" /> to pin frequently used extensions
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
