'use client';

import React, {memo, useState} from 'react';
import {
    Bold,
    Italic,
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
    Menu,
    X,
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

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';

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

    // Additional handlers for specific actions
    onBold?: () => void;
    onItalic?: () => void;
    onLink?: () => void;
    onHeading1?: () => void;
    onHeading2?: () => void;
    onHeading3?: () => void;
    onBulletList?: () => void;
    onNumberedList?: () => void;
    onQuote?: () => void;
    onCode?: () => void;
    onImage?: () => void;
}

// Create stable action component to prevent re-renders
const ToolbarAction = memo(({action, isMobile = false}: { action: ToolbarAction; isMobile?: boolean }) => {
    if (isMobile) {
        return (
            <Button
                variant={action.variant || (action.isActive ? 'default' : 'ghost')}
                onClick={action.onClick}
                className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
                type="button"
            >
                <span className="mr-4 text-muted-foreground">{action.icon}</span>
                <span className="flex-1 text-foreground">{action.label}</span>
            </Button>
        );
    }

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
const ToolbarDropdownComponent = memo(({dropdown, isMobile = false}: {
    dropdown: ToolbarDropdown;
    isMobile?: boolean
}) => {
    if (isMobile) {
        return (
            <div className="space-y-3">
                <div className="flex items-center space-x-3 px-4">
                    <div className="p-2 bg-muted rounded-lg">
                        {dropdown.icon}
                    </div>
                    <h3 className="font-semibold text-base text-foreground">{dropdown.name}</h3>
                </div>
                <div className="space-y-1 px-2">
                    {dropdown.actions.map((action, actionIndex) => (
                        <ToolbarAction
                            key={`mobile-dropdown-action-${actionIndex}`}
                            action={action}
                            isMobile={true}
                        />
                    ))}
                </div>
            </div>
        );
    }

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
                <DropdownMenuSeparator/>
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

// Mobile toolbar sheet component
const MobileToolbarSheet = memo(({
                                     groups,
                                     dropdowns,
                                     canUndo,
                                     canRedo,
                                     onUndo,
                                     onRedo,
                                     onSave,
                                     onExport,
                                     viewMode,
                                     onViewModeChange,
                                     onAIAssist,
                                     enableAI,
                                     onBold,
                                     onItalic,
                                     onLink,
                                     onHeading1,
                                     onHeading2,
                                     onHeading3,
                                     onBulletList,
                                     onNumberedList,
                                     onQuote,
                                     onCode,
                                     onImage,
                                 }: Omit<MarkdownToolbarProps, 'className'>) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleActionClick = (originalOnClick: () => void) => {
        return () => {
            originalOnClick();
            setIsOpen(false);
        };
    };

    // Default formatting actions
    const defaultFormatGroup: ToolbarGroup = {
        name: 'Formatting',
        actions: [
            {
                icon: <Bold size={16}/>,
                label: 'Bold',
                onClick: handleActionClick(onBold || (() => {
                })),
            },
            {
                icon: <Italic size={16}/>,
                label: 'Italic',
                onClick: handleActionClick(onItalic || (() => {
                })),
            },
            {
                icon: <Link size={16}/>,
                label: 'Link',
                onClick: handleActionClick(onLink || (() => {
                })),
            },
        ],
    };

    // Default heading actions
    const defaultHeadingGroup: ToolbarGroup = {
        name: 'Headings',
        actions: [
            {
                icon: <Heading1 size={16}/>,
                label: 'Heading 1',
                onClick: handleActionClick(onHeading1 || (() => {
                })),
            },
            {
                icon: <Heading2 size={16}/>,
                label: 'Heading 2',
                onClick: handleActionClick(onHeading2 || (() => {
                })),
            },
            {
                icon: <Heading3 size={16}/>,
                label: 'Heading 3',
                onClick: handleActionClick(onHeading3 || (() => {
                })),
            },
        ],
    };

    // Default list actions
    const defaultListGroup: ToolbarGroup = {
        name: 'Lists & Quotes',
        actions: [
            {
                icon: <List size={16}/>,
                label: 'Bullet List',
                onClick: handleActionClick(onBulletList || (() => {
                })),
            },
            {
                icon: <ListOrdered size={16}/>,
                label: 'Numbered List',
                onClick: handleActionClick(onNumberedList || (() => {
                })),
            },
            {
                icon: <Quote size={16}/>,
                label: 'Blockquote',
                onClick: handleActionClick(onQuote || (() => {
                })),
            },
        ],
    };

    // Default insert actions
    const defaultInsertGroup: ToolbarGroup = {
        name: 'Insert',
        actions: [
            {
                icon: <Code size={16}/>,
                label: 'Inline Code',
                onClick: handleActionClick(onCode || (() => {
                })),
            },
            {
                icon: <Image size={16}/>,
                label: 'Image',
                onClick: handleActionClick(onImage || (() => {
                })),
            },
        ],
    };

    // Combine with provided groups or use defaults
    const allGroups = groups && groups.length > 0 ? groups : [
        defaultFormatGroup,
        defaultHeadingGroup,
        defaultListGroup,
        defaultInsertGroup,
    ];

    // Combine with provided dropdowns or use defaults
    const allDropdowns = dropdowns && dropdowns.length > 0 ? dropdowns : [];

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 relative hover:bg-accent/80 transition-colors"
                    type="button"
                >
                    <Menu size={16}/>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="bottom"
                className="h-[85vh] rounded-t-3xl border-t-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
                <div className="relative">
                    {/* Drag handle */}
                    <div
                        className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/20 rounded-full"/>

                    <SheetHeader className="pt-8 pb-6 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl font-semibold">Editor Tools</SheetTitle>
                                <SheetDescription className="text-muted-foreground mt-1">
                                    Formatting and editor options
                                </SheetDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 rounded-full"
                            >
                                <X size={16}/>
                            </Button>
                        </div>
                    </SheetHeader>
                </div>

                <div className="mt-6 space-y-8 overflow-y-auto max-h-[calc(85vh-8rem)] pb-6">
                    {/* History actions */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 px-4">
                            <div className="p-2 bg-muted rounded-lg">
                                <RotateCcw size={16}/>
                            </div>
                            <h3 className="font-semibold text-base text-foreground">History</h3>
                        </div>
                        <div className="space-y-1 px-2">
                            <Button
                                variant="ghost"
                                onClick={handleActionClick(onUndo || (() => {
                                }))}
                                disabled={!canUndo}
                                className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors disabled:opacity-50"
                                type="button"
                            >
                                <RotateCcw size={16} className="mr-4 text-muted-foreground"/>
                                <span className="flex-1 text-foreground">Undo</span>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleActionClick(onRedo || (() => {
                                }))}
                                disabled={!canRedo}
                                className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors disabled:opacity-50"
                                type="button"
                            >
                                <RotateCw size={16} className="mr-4 text-muted-foreground"/>
                                <span className="flex-1 text-foreground">Redo</span>
                            </Button>
                        </div>
                    </div>

                    {/* Action groups */}
                    {allGroups.map((group, groupIndex) => (
                        <div key={`mobile-group-${groupIndex}`} className="space-y-3">
                            <div className="flex items-center space-x-3 px-4">
                                <div className="p-2 bg-muted rounded-lg">
                                    {group.actions[0]?.icon}
                                </div>
                                <h3 className="font-semibold text-base text-foreground">{group.name}</h3>
                            </div>
                            <div className="space-y-1 px-2">
                                {group.actions.map((action, actionIndex) => (
                                    <ToolbarAction
                                        key={`mobile-action-${actionIndex}`}
                                        action={{
                                            ...action,
                                            onClick: handleActionClick(action.onClick)
                                        }}
                                        isMobile={true}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Dropdowns */}
                    {allDropdowns.map((dropdown, dropdownIndex) => (
                        <ToolbarDropdownComponent
                            key={`mobile-dropdown-${dropdownIndex}`}
                            dropdown={{
                                ...dropdown,
                                actions: dropdown.actions.map(action => ({
                                    ...action,
                                    onClick: handleActionClick(action.onClick)
                                }))
                            }}
                            isMobile={true}
                        />
                    ))}

                    {/* AI Assistant */}
                    {enableAI && onAIAssist && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 px-4">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400"/>
                                </div>
                                <h3 className="font-semibold text-base text-foreground">AI Tools</h3>
                            </div>
                            <div className="px-2">
                                <Button
                                    variant="ghost"
                                    onClick={handleActionClick(onAIAssist)}
                                    className="w-full justify-start h-14 font-normal text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    type="button"
                                >
                                    <Sparkles size={16} className="mr-4"/>
                                    <span className="flex-1">AI Assistant</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* File actions */}
                    {(onSave || onExport) && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 px-4">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Save size={16}/>
                                </div>
                                <h3 className="font-semibold text-base text-foreground">File Actions</h3>
                            </div>
                            <div className="space-y-1 px-2">
                                {onSave && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleActionClick(onSave)}
                                        className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors"
                                        type="button"
                                    >
                                        <Save size={16} className="mr-4 text-muted-foreground"/>
                                        <span className="flex-1 text-foreground">Save Document</span>
                                    </Button>
                                )}
                                {onExport && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleActionClick(onExport)}
                                        className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors"
                                        type="button"
                                    >
                                        <FileDown size={16} className="mr-4 text-muted-foreground"/>
                                        <span className="flex-1 text-foreground">Export Markdown</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* View mode selector */}
                    {onViewModeChange && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 px-4">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Eye size={16}/>
                                </div>
                                <h3 className="font-semibold text-base text-foreground">View Mode</h3>
                            </div>
                            <div className="space-y-1 px-2">
                                <Button
                                    variant={viewMode === 'edit' ? 'default' : 'ghost'}
                                    onClick={() => {
                                        onViewModeChange('edit');
                                        setIsOpen(false);
                                    }}
                                    className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors"
                                    type="button"
                                >
                                    <EyeOff size={16} className="mr-4 text-muted-foreground"/>
                                    <span className="flex-1 text-foreground">Edit Mode</span>
                                    {viewMode === 'edit' && (
                                        <div className="w-2 h-2 bg-primary rounded-full"/>
                                    )}
                                </Button>
                                <Button
                                    variant={viewMode === 'preview' ? 'default' : 'ghost'}
                                    onClick={() => {
                                        onViewModeChange('preview');
                                        setIsOpen(false);
                                    }}
                                    className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors"
                                    type="button"
                                >
                                    <Eye size={16} className="mr-4 text-muted-foreground"/>
                                    <span className="flex-1 text-foreground">Preview Mode</span>
                                    {viewMode === 'preview' && (
                                        <div className="w-2 h-2 bg-primary rounded-full"/>
                                    )}
                                </Button>
                                <Button
                                    variant={viewMode === 'split' ? 'default' : 'ghost'}
                                    onClick={() => {
                                        onViewModeChange('split');
                                        setIsOpen(false);
                                    }}
                                    className="w-full justify-start h-14 font-normal hover:bg-accent/50 transition-colors"
                                    type="button"
                                >
                                    <Split size={16} className="mr-4 text-muted-foreground"/>
                                    <span className="flex-1 text-foreground">Split View</span>
                                    {viewMode === 'split' && (
                                        <div className="w-2 h-2 bg-primary rounded-full"/>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
});
MobileToolbarSheet.displayName = 'MobileToolbarSheet';

/**
 * Toolbar component for the markdown editor with full mobile support
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
                                  onBold,
                                  onItalic,
                                  onLink,
                                  onHeading1,
                                  onHeading2,
                                  onHeading3,
                                  onBulletList,
                                  onNumberedList,
                                  onQuote,
                                  onCode,
                                  onImage,
                              }: MarkdownToolbarProps) => {
    return (
        <div className={`flex items-center p-2 border-b bg-muted/10 ${className}`}>
            {/* Mobile view */}
            <div className="sm:hidden flex items-center justify-between w-full">
                {/* Essential mobile actions */}
                <div className="flex items-center space-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="h-8 w-8"
                        type="button"
                    >
                        <RotateCcw size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="h-8 w-8"
                        type="button"
                    >
                        <RotateCw size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBold}
                        className="h-8 w-8"
                        type="button"
                    >
                        <Bold size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onItalic}
                        className="h-8 w-8"
                        type="button"
                    >
                        <Italic size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLink}
                        className="h-8 w-8"
                        type="button"
                    >
                        <Link size={16}/>
                    </Button>
                </div>

                {/* Right side actions */}
                <div className="flex items-center space-x-1">
                    {/* Mobile menu sheet */}
                    <MobileToolbarSheet
                        groups={groups}
                        dropdowns={dropdowns}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={onUndo}
                        onRedo={onRedo}
                        onSave={onSave}
                        onExport={onExport}
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                        onAIAssist={onAIAssist}
                        enableAI={enableAI}
                        onBold={onBold}
                        onItalic={onItalic}
                        onLink={onLink}
                        onHeading1={onHeading1}
                        onHeading2={onHeading2}
                        onHeading3={onHeading3}
                        onBulletList={onBulletList}
                        onNumberedList={onNumberedList}
                        onQuote={onQuote}
                        onCode={onCode}
                        onImage={onImage}
                    />
                </div>
            </div>

            {/* Desktop view - exact match to your original design */}
            <div className="hidden sm:flex items-center w-full">
                <div className="flex items-center space-x-1">
                    {/* Undo/Redo */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="h-8 w-8"
                        title="Undo (Ctrl+Z)"
                    >
                        <RotateCcw size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="h-8 w-8"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <RotateCw size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    {/* Text formatting */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBold}
                        className="h-8 w-8"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onItalic}
                        className="h-8 w-8"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLink}
                        className="h-8 w-8"
                        title="Link (Ctrl+K)"
                    >
                        <Link size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    {/* Headings */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onHeading1}
                        className="h-8 w-8"
                        title="Heading 1 (Ctrl+1)"
                    >
                        <Heading1 size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onHeading2}
                        className="h-8 w-8"
                        title="Heading 2 (Ctrl+2)"
                    >
                        <Heading2 size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onHeading3}
                        className="h-8 w-8"
                        title="Heading 3 (Ctrl+3)"
                    >
                        <Heading3 size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    {/* Lists and quotes */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBulletList}
                        className="h-8 w-8"
                        title="Bullet List"
                    >
                        <List size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNumberedList}
                        className="h-8 w-8"
                        title="Numbered List"
                    >
                        <ListOrdered size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onQuote}
                        className="h-8 w-8"
                        title="Blockquote"
                    >
                        <Quote size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    {/* Code and images */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCode}
                        className="h-8 w-8"
                        title="Inline Code"
                    >
                        <Code size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onImage}
                        className="h-8 w-8"
                        title="Image"
                    >
                        <Image size={16}/>
                    </Button>
                </div>

                {/* Right side toolbar */}
                <div className="flex items-center space-x-1 ml-auto">
                    {/* AI Assistant button (if enabled) */}
                    {enableAI && onAIAssist && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onAIAssist}
                                className="h-8 gap-1 text-primary"
                                title="AI Assistant (Alt+A)"
                            >
                                <Sparkles size={15}/>
                                <span>AI</span>
                            </Button>

                            <Separator orientation="vertical" className="mx-1 h-6"/>
                        </>
                    )}

                    {/* Save and export */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        className="h-8 w-8"
                        title="Save (Ctrl+S)"
                    >
                        <Save size={16}/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onExport}
                        className="h-8 w-8"
                        title="Export"
                    >
                        <FileDown size={16}/>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6"/>

                    {/* View mode selector */}
                    {onViewModeChange && (
                        <Tabs value={viewMode}
                              onValueChange={(v: string) => onViewModeChange(v as 'edit' | 'preview' | 'split')}>
                            <TabsList className="h-8">
                                <TabsTrigger value="edit" className="h-7 px-2">
                                    <EyeOff size={14} className="mr-1"/>
                                    <span className="text-xs">Edit</span>
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="h-7 px-2">
                                    <Eye size={14} className="mr-1"/>
                                    <span className="text-xs">Preview</span>
                                </TabsTrigger>
                                <TabsTrigger value="split" className="h-7 px-2">
                                    <Split size={14} className="mr-1"/>
                                    <span className="text-xs">Split</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
});

// Display name for React DevTools
MarkdownToolbar.displayName = 'MarkdownToolbar';

export default MarkdownToolbar;