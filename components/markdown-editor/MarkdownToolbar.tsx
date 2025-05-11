'use client';

import React, { memo } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Image,
    Link,
    RotateCcw,
    RotateCw,
    Sparkles,
    Save,
    FileDown,
    EyeOff,
    Split,
    Eye,
    Table
} from 'lucide-react';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface ToolbarAction {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    shortcut?: string;
    isActive?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
}

export interface ToolbarGroup {
    name: string;
    actions: ToolbarAction[];
}

export interface ToolbarDropdown {
    name: string;
    icon: React.ReactNode;
    actions: ToolbarAction[];
}

export interface MarkdownToolbarProps {
    groups?: ToolbarGroup[];
    dropdowns?: ToolbarDropdown[];
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onSave?: () => void;
    onExport?: () => void;
    viewMode?: 'edit' | 'preview' | 'split';
    onViewModeChange?: (mode: 'edit' | 'preview' | 'split') => void;
    onAIAssist?: () => void;
    enableAI?: boolean;
    className?: string;
}

// Create stable action component to prevent re-renders
const ToolbarAction = memo(({ action }: { action: ToolbarAction }) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={action.variant || (action.isActive ? 'default' : 'ghost')}
                        size="icon"
                        onClick={action.onClick}
                        className="h-8 w-8"
                        type="button"
                    >
                        {action.icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="flex justify-between w-full">
                        <span>{action.label}</span>
                        {action.shortcut && (
                            <span className="text-muted-foreground ml-4">{action.shortcut}</span>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
ToolbarAction.displayName = 'ToolbarAction';

// Create stable dropdown component to prevent re-renders
const ToolbarDropdownComponent = memo(({ dropdown }: { dropdown: ToolbarDropdown }) => {
    return (
        <DropdownMenu>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                                {dropdown.icon}
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{dropdown.name}</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent align="start">
                <DropdownMenuLabel>{dropdown.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {dropdown.actions.map((action, actionIndex) => (
                    <DropdownMenuItem
                        key={`dropdown-action-${actionIndex}`}
                        onClick={action.onClick}
                    >
                        <span className="mr-2">{action.icon}</span>
                        <span>{action.label}</span>
                        {action.shortcut && (
                            <span className="ml-auto text-xs text-muted-foreground">
                                {action.shortcut}
                            </span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
ToolbarDropdownComponent.displayName = 'ToolbarDropdownComponent';

// Create stable view mode component to prevent re-renders
const ViewModeSelector = memo(({
                                   viewMode,
                                   onViewModeChange
                               }: {
    viewMode: 'edit' | 'preview' | 'split',
    onViewModeChange: (mode: 'edit' | 'preview' | 'split') => void
}) => {
    return (
        <div className="flex border rounded-md overflow-hidden">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'edit' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('edit')}
                            className="rounded-none px-2 h-8"
                            type="button"
                        >
                            <EyeOff size={15} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'preview' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('preview')}
                            className="rounded-none px-2 h-8"
                            type="button"
                        >
                            <Eye size={15} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'split' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('split')}
                            className="rounded-none px-2 h-8"
                            type="button"
                        >
                            <Split size={15} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Split View</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
});
ViewModeSelector.displayName = 'ViewModeSelector';

/**
 * Toolbar component for the markdown editor
 */
const MarkdownToolbar = memo(({
                                  groups = [],
                                  dropdowns = [],
                                  canUndo = false,
                                  canRedo = false,
                                  onUndo,
                                  onRedo,
                                  onSave,
                                  onExport,
                                  viewMode = 'edit',
                                  onViewModeChange,
                                  onAIAssist,
                                  enableAI = false,
                                  className = '',
                              }: MarkdownToolbarProps) => {
    // Default formatting actions
    const defaultFormatGroup: ToolbarGroup = {
        name: 'format',
        actions: [
            {
                icon: <Bold size={16} />,
                label: 'Bold',
                onClick: () => {},
                shortcut: 'Ctrl+B',
            },
            {
                icon: <Italic size={16} />,
                label: 'Italic',
                onClick: () => {},
                shortcut: 'Ctrl+I',
            },
            {
                icon: <Underline size={16} />,
                label: 'Strikethrough',
                onClick: () => {},
            },
        ],
    };

    // Default heading actions
    const defaultHeadingDropdown: ToolbarDropdown = {
        name: 'Headings',
        icon: <Heading2 size={16} />,
        actions: [
            {
                icon: <Heading1 size={16} />,
                label: 'Heading 1',
                onClick: () => {},
                shortcut: 'Ctrl+1',
            },
            {
                icon: <Heading2 size={16} />,
                label: 'Heading 2',
                onClick: () => {},
                shortcut: 'Ctrl+2',
            },
            {
                icon: <Heading3 size={16} />,
                label: 'Heading 3',
                onClick: () => {},
                shortcut: 'Ctrl+3',
            },
        ],
    };

    // Default insert actions
    const defaultInsertGroup: ToolbarGroup = {
        name: 'insert',
        actions: [
            {
                icon: <Link size={16} />,
                label: 'Link',
                onClick: () => {},
                shortcut: 'Ctrl+K',
            },
            {
                icon: <Image size={16} />,
                label: 'Image',
                onClick: () => {},
            },
            {
                icon: <Code size={16} />,
                label: 'Code',
                onClick: () => {},
            },
        ],
    };

    // Default list actions
    const defaultListGroup: ToolbarGroup = {
        name: 'lists',
        actions: [
            {
                icon: <List size={16} />,
                label: 'Bullet List',
                onClick: () => {},
            },
            {
                icon: <ListOrdered size={16} />,
                label: 'Numbered List',
                onClick: () => {},
            },
            {
                icon: <Quote size={16} />,
                label: 'Quote',
                onClick: () => {},
            },
        ],
    };

    // Combine with provided groups or use defaults
    const allGroups = groups.length > 0 ? groups : [
        defaultFormatGroup,
        defaultInsertGroup,
        defaultListGroup,
    ];

    // Combine with provided dropdowns or use defaults
    const allDropdowns = dropdowns.length > 0 ? dropdowns : [
        defaultHeadingDropdown,
    ];

    return (
        <div className={`flex items-center p-1 border-b bg-muted/20 ${className}`}>
            <div className="flex items-center space-x-1">
                {/* History actions */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onUndo}
                                disabled={!canUndo}
                                className="h-8 w-8"
                                type="button"
                            >
                                <RotateCcw size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex justify-between w-full">
                                <span>Undo</span>
                                <span className="text-muted-foreground ml-4">Ctrl+Z</span>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onRedo}
                                disabled={!canRedo}
                                className="h-8 w-8"
                                type="button"
                            >
                                <RotateCw size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex justify-between w-full">
                                <span>Redo</span>
                                <span className="text-muted-foreground ml-4">Ctrl+Shift+Z</span>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Action groups */}
                {allGroups.map((group, groupIndex) => (
                    <React.Fragment key={`group-${groupIndex}`}>
                        <div className="flex items-center space-x-1">
                            {group.actions.map((action, actionIndex) => (
                                <ToolbarAction key={`action-${actionIndex}`} action={action} />
                            ))}
                        </div>

                        {groupIndex < allGroups.length - 1 && (
                            <Separator orientation="vertical" className="mx-1 h-6" />
                        )}
                    </React.Fragment>
                ))}

                {allGroups.length > 0 && allDropdowns.length > 0 && (
                    <Separator orientation="vertical" className="mx-1 h-6" />
                )}

                {/* Dropdowns */}
                {allDropdowns.map((dropdown, dropdownIndex) => (
                    <ToolbarDropdownComponent key={`dropdown-${dropdownIndex}`} dropdown={dropdown} />
                ))}
            </div>

            {/* Right side actions */}
            <div className="ml-auto flex items-center space-x-1">
                {/* AI Assistant button */}
                {enableAI && onAIAssist && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onAIAssist}
                                    className="h-8 gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-950 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                    type="button"
                                >
                                    <Sparkles size={14} />
                                    <span>AI</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex justify-between w-full">
                                    <span>AI Assistant</span>
                                    <span className="text-muted-foreground ml-4">Alt+A</span>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Save button */}
                {onSave && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onSave}
                                    className="h-8 w-8"
                                    type="button"
                                >
                                    <Save size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex justify-between w-full">
                                    <span>Save</span>
                                    <span className="text-muted-foreground ml-4">Ctrl+S</span>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Export button */}
                {onExport && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onExport}
                                    className="h-8 w-8"
                                    type="button"
                                >
                                    <FileDown size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export Markdown</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* View mode selector */}
                {onViewModeChange && (
                    <>
                        <Separator orientation="vertical" className="mx-1 h-6" />
                        <ViewModeSelector
                            viewMode={viewMode}
                            onViewModeChange={onViewModeChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
});

// Display name for React DevTools
MarkdownToolbar.displayName = 'MarkdownToolbar';

export default MarkdownToolbar;