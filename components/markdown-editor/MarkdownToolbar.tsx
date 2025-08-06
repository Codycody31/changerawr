// components/markdown-editor/MarkdownToolbar.tsx

'use client';

import React, {memo, useState} from 'react';
import {
    Bold,
    ChevronDown,
    Code,
    FileDown,
    Heading1,
    Heading2,
    Heading3,
    Image,
    Italic,
    Link,
    List,
    ListOrdered,
    Menu,
    Quote,
    RotateCcw,
    RotateCw,
    Save,
    Sparkles,
} from 'lucide-react';

import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from '@/components/ui/tooltip';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,} from '@/components/ui/sheet';

import {Tabs, TabsList, TabsTrigger,} from '@/components/ui/tabs';

import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';

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
                                 }: Omit<MarkdownToolbarProps, 'className' | 'viewMode' | 'onViewModeChange'>) => {
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
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                    <Menu size={16}/>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 flex flex-col">
                <SheetHeader className="flex-shrink-0">
                    <SheetTitle>Markdown Tools</SheetTitle>
                    <SheetDescription>
                        Format your text and insert content elements
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 mt-6">
                    <div className="space-y-6 pr-4">
                        {/* History */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-base text-foreground">History</h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleActionClick(onUndo || (() => {
                                    }))}
                                    disabled={!canUndo}
                                    className="flex-1"
                                >
                                    <RotateCcw size={16} className="mr-2"/>
                                    Undo
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleActionClick(onRedo || (() => {
                                    }))}
                                    disabled={!canRedo}
                                    className="flex-1"
                                >
                                    <RotateCw size={16} className="mr-2"/>
                                    Redo
                                </Button>
                            </div>
                        </div>

                        {/* Groups */}
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
                                    <div className="p-2 bg-muted rounded-lg">
                                        <Sparkles size={16}/>
                                    </div>
                                    <h3 className="font-semibold text-base text-foreground">AI Assistant</h3>
                                </div>
                                <div className="px-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleActionClick(onAIAssist)}
                                        className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
                                    >
                                        <Sparkles size={16} className="mr-4 text-muted-foreground"/>
                                        <span className="flex-1 text-foreground">Open AI Assistant</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Save & Export */}
                        {(onSave || onExport) && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base text-foreground">Actions</h3>
                                <div className="space-y-2 px-2">
                                    {onSave && (
                                        <Button
                                            variant="outline"
                                            onClick={handleActionClick(onSave)}
                                            className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
                                        >
                                            <Save size={16} className="mr-4 text-muted-foreground"/>
                                            <span className="flex-1 text-foreground">Save</span>
                                        </Button>
                                    )}
                                    {onExport && (
                                        <Button
                                            variant="outline"
                                            onClick={handleActionClick(onExport)}
                                            className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
                                        >
                                            <FileDown size={16} className="mr-4 text-muted-foreground"/>
                                            <span className="flex-1 text-foreground">Export</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
});

MobileToolbarSheet.displayName = 'MobileToolbarSheet';

// Main toolbar component
const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
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
                                                         }) => {
    return (
        <div className={`flex items-center justify-between p-2 border-b bg-muted/10 ${className}`}>
            {/* Left side - Tools */}
            <div className="flex items-center space-x-1">
                {/* Mobile toolbar */}
                <MobileToolbarSheet
                    groups={groups}
                    dropdowns={dropdowns}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    onSave={onSave}
                    onExport={onExport}
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

                {/* Desktop toolbar */}
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

                        {/* Dropdowns (including CUM Extensions) */}
                        {dropdowns.length > 0 && (
                            <>
                                <Separator orientation="vertical" className="mx-1 h-6"/>
                                {dropdowns.map((dropdown, index) => (
                                    <DropdownMenu key={index}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-1"
                                                title={dropdown.name}
                                            >
                                                {dropdown.icon}
                                                <ChevronDown size={12}/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuLabel>{dropdown.name}</DropdownMenuLabel>
                                            <DropdownMenuSeparator/>
                                            {dropdown.actions.map((action, actionIndex) => (
                                                <DropdownMenuItem
                                                    key={actionIndex}
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
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side - View modes */}
            <div className="flex items-center">
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

                {/* Save & Export */}
                {onSave && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        className="h-8 w-8"
                        title="Save (Ctrl+S)"
                    >
                        <Save size={16}/>
                    </Button>
                )}
                {onExport && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onExport}
                        className="h-8 w-8"
                        title="Export"
                    >
                        <FileDown size={16}/>
                    </Button>
                )}

                <Separator orientation="vertical" className="mx-1 h-6"/>

                {/* View mode tabs */}
                <Tabs
                    value={viewMode}
                    onValueChange={(value) => onViewModeChange?.(value as 'edit' | 'preview' | 'split')}
                    className="w-auto"
                >
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="edit" className="h-6 px-3 text-xs">
                            Edit
                        </TabsTrigger>
                        <TabsTrigger value="split" className="h-6 px-3 text-xs">
                            Split
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="h-6 px-3 text-xs">
                            Preview
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
};

export default MarkdownToolbar;