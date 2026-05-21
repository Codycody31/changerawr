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

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,} from '@/components/ui/sheet';

import {Tabs, TabsList, TabsTrigger,} from '@/components/ui/tabs';

import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import type { ExtensionWithMetadata } from '@/lib/services/core/markdown/extensions';

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

    // Extension integration
    extensions?: ExtensionWithMetadata[];
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>;
    onToolbarInsert?: (before: string, after: string, placeholder?: string) => void;

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

/**
 * Helper to convert Lucide icon name string to React component
 * Special case: 'ExtensionIcon' uses extension's icon.png from API
 */
function getLucideIcon(iconName: string, size: number = 16, extensionId?: string, invertIcon?: boolean): React.ReactNode {
    // Special handling for ExtensionIcon
    if (iconName === 'ExtensionIcon' && extensionId) {
        return (
            <img
                src={`/api/extensions/${extensionId}/icon`}
                alt="Extension icon"
                className={`w-4 h-4 object-contain ${invertIcon ? 'dark:invert' : ''}`}
            />
        );
    }

    const Icon = (LucideIcons as any)[iconName];
    if (!Icon) {
        console.warn(`Lucide icon "${iconName}" not found, using default`);
        return <LucideIcons.HelpCircle size={size} />;
    }
    return <Icon size={size} />;
}

interface ExtensionButton {
    id: string;
    group: string;
    icon: React.ReactNode;
    label: string;
    customUI?: {
        type: 'popover' | 'modal' | 'inline';
        component: React.ComponentType<any>;
    };
    action?: {
        before: string;
        after: string;
        placeholder?: string;
    };
    onClick?: () => void;
    settings?: Record<string, any>;
    extensionName?: string;
    extensionId?: string;
}

/**
 * Convert extension toolbar buttons with custom UI support
 */
function convertExtensionButtons(
    extensions: ExtensionWithMetadata[],
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>
): Record<string, ExtensionButton[]> {
    const groupedActions: Record<string, ExtensionButton[]> = {
        formatting: [],
        blocks: [],
        media: [],
        advanced: [],
    };

    for (const ext of extensions) {
        const toolbar = ext.metadata.toolbar;
        if (!toolbar) continue;

        // Handle both array format and new object format
        const buttons = Array.isArray(toolbar) ? toolbar : toolbar.buttons;
        const customUIs = !Array.isArray(toolbar) && toolbar.customUI ? toolbar.customUI : [];

        if (!buttons) continue;

        for (const button of buttons) {
            const group = button.group || 'advanced';

            // Handle both React component icons and string icons
            const iconComponent = typeof button.icon === 'string'
                ? getLucideIcon(button.icon, 16, (ext.metadata as any).id, ext.metadata.invertIcon)
                : React.createElement(button.icon, { size: 16 });

            // Check if this button has custom UI
            const customUI = customUIs.find((ui: any) => ui.buttonId === button.id);

            const extensionButton: ExtensionButton = {
                id: button.id,
                group,
                icon: iconComponent,
                label: button.tooltip,
                customUI: customUI ? {
                    type: customUI.type,
                    component: customUI.component,
                } : undefined,
                action: button.action,
                onClick: button.onClick,
                settings: (ext as any).settings || {}, // Pass actual extension settings values
                extensionName: ext.metadata.name, // Pass extension name for fetching settings
                extensionId: (ext.metadata as any).id, // Pass extension database ID for direct settings access
            };

            if (!groupedActions[group]) {
                groupedActions[group] = [];
            }
            groupedActions[group].push(extensionButton);
        }
    }

    return groupedActions;
}

// Extension Button Component with Custom UI support
const ExtensionButtonComponent = memo(({
    button,
    textAreaRef,
    onInsert,
}: {
    button: ExtensionButton;
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>;
    onInsert?: (before: string, after: string, placeholder?: string) => void;
}) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleClick = () => {
        // If there's custom UI, handle it
        if (button.customUI) {
            if (button.customUI.type === 'popover') {
                setIsPopoverOpen(!isPopoverOpen);
            } else if (button.customUI.type === 'modal') {
                setIsModalOpen(true);
            }
            return;
        }

        // Otherwise handle simple action or onClick
        if (button.onClick) {
            button.onClick();
        } else if (button.action && onInsert) {
            // Use the callback to properly update React state
            onInsert(button.action.before, button.action.after, button.action.placeholder);
        }
    };

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    // If this button has a modal, render it
    if (button.customUI?.type === 'modal') {
        const CustomComponent = button.customUI.component;

        return (
            <>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClick}
                                className="h-8 w-8"
                                type="button"
                            >
                                {button.icon}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{button.label}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-6xl h-[85vh]">
                        <DialogHeader>
                            <DialogTitle>{button.label}</DialogTitle>
                        </DialogHeader>
                        {textAreaRef?.current && (
                            <CustomComponent
                                textarea={textAreaRef.current}
                                onClose={handleModalClose}
                                settings={button.settings}
                                extensionName={button.extensionName}
                                extensionId={button.extensionId}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // If this button has a popover, render it
    if (button.customUI?.type === 'popover') {
        const CustomComponent = button.customUI.component;

        return (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    type="button"
                                >
                                    {button.icon}
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{button.label}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <PopoverContent className="w-64 p-0" align="start">
                    {textAreaRef?.current && (
                        <CustomComponent
                            textarea={textAreaRef.current}
                            onClose={handlePopoverClose}
                            settings={button.settings}
                            extensionName={button.extensionName}
                            extensionId={button.extensionId}
                        />
                    )}
                </PopoverContent>
            </Popover>
        );
    }

    // Regular button without custom UI
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClick}
                        className="h-8 w-8"
                        type="button"
                    >
                        {button.icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{button.label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
ExtensionButtonComponent.displayName = 'ExtensionButtonComponent';

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

// Mobile Extension Button Component - renders extension buttons with custom UI support in mobile
const MobileExtensionButton = memo(({
    button,
    textAreaRef,
    onActionComplete,
}: {
    button: ExtensionButton;
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>;
    onActionComplete: () => void;
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleClick = () => {
        // If there's custom UI, open dialog
        if (button.customUI) {
            setIsDialogOpen(true);
            return;
        }

        // Otherwise handle simple action
        if (button.onClick) {
            button.onClick();
        }
        onActionComplete();
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        onActionComplete();
    };

    // If this button has custom UI, render it in a dialog
    if (button.customUI?.type === 'popover') {
        const CustomComponent = button.customUI.component;

        return (
            <>
                <Button
                    variant="ghost"
                    onClick={handleClick}
                    className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
                    type="button"
                >
                    <span className="mr-4 text-muted-foreground">{button.icon}</span>
                    <span className="flex-1 text-foreground">{button.label}</span>
                </Button>

                {/* Render custom UI in a dialog for mobile */}
                {isDialogOpen && textAreaRef?.current && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md">
                            <div className="bg-background border rounded-lg shadow-lg">
                                <CustomComponent
                                    textarea={textAreaRef.current}
                                    onClose={handleDialogClose}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Regular button without custom UI
    return (
        <Button
            variant="ghost"
            onClick={handleClick}
            className="w-full justify-start h-14 text-left font-normal hover:bg-accent/50 transition-colors"
            type="button"
        >
            <span className="mr-4 text-muted-foreground">{button.icon}</span>
            <span className="flex-1 text-foreground">{button.label}</span>
        </Button>
    );
});
MobileExtensionButton.displayName = 'MobileExtensionButton';

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
                                     extensions = [],
                                     textAreaRef,
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

    // Convert extension toolbar buttons to actions
    const extensionActions = React.useMemo(
        () => convertExtensionButtons(extensions, textAreaRef),
        [extensions, textAreaRef]
    );

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

                        {/* Extension Formatting Actions */}
                        {extensionActions.formatting.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 px-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {extensionActions.formatting[0]?.icon}
                                    </div>
                                    <h3 className="font-semibold text-base text-foreground">Extensions - Formatting</h3>
                                </div>
                                <div className="space-y-1 px-2">
                                    {extensionActions.formatting.map((button, idx) => (
                                        <MobileExtensionButton
                                            key={`ext-formatting-${idx}`}
                                            button={button}
                                            textAreaRef={textAreaRef}
                                            onActionComplete={() => setIsOpen(false)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extension Block Actions */}
                        {extensionActions.blocks.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 px-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {extensionActions.blocks[0]?.icon}
                                    </div>
                                    <h3 className="font-semibold text-base text-foreground">Extensions - Blocks</h3>
                                </div>
                                <div className="space-y-1 px-2">
                                    {extensionActions.blocks.map((button, idx) => (
                                        <MobileExtensionButton
                                            key={`ext-blocks-${idx}`}
                                            button={button}
                                            textAreaRef={textAreaRef}
                                            onActionComplete={() => setIsOpen(false)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extension Media Actions */}
                        {extensionActions.media.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 px-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {extensionActions.media[0]?.icon}
                                    </div>
                                    <h3 className="font-semibold text-base text-foreground">Extensions - Media</h3>
                                </div>
                                <div className="space-y-1 px-2">
                                    {extensionActions.media.map((button, idx) => (
                                        <MobileExtensionButton
                                            key={`ext-media-${idx}`}
                                            button={button}
                                            textAreaRef={textAreaRef}
                                            onActionComplete={() => setIsOpen(false)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extension Advanced Actions */}
                        {extensionActions.advanced.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 px-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {extensionActions.advanced[0]?.icon}
                                    </div>
                                    <h3 className="font-semibold text-base text-foreground">Extensions - Advanced</h3>
                                </div>
                                <div className="space-y-1 px-2">
                                    {extensionActions.advanced.map((button, idx) => (
                                        <MobileExtensionButton
                                            key={`ext-advanced-${idx}`}
                                            button={button}
                                            textAreaRef={textAreaRef}
                                            onActionComplete={() => setIsOpen(false)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

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
                                                             extensions = [],
                                                             textAreaRef,
                                                             onToolbarInsert,
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
    // Convert extension toolbar buttons to actions
    const extensionActions = React.useMemo(
        () => convertExtensionButtons(extensions, textAreaRef),
        [extensions, textAreaRef]
    );
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
                    extensions={extensions}
                    textAreaRef={textAreaRef}
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

                        {/* Extension formatting actions */}
                        {extensionActions.formatting.map((button, idx) => (
                            <ExtensionButtonComponent key={`ext-formatting-${idx}`} button={button} textAreaRef={textAreaRef} onInsert={onToolbarInsert} />
                        ))}

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

                        {/* Extension block actions */}
                        {extensionActions.blocks.map((button, idx) => (
                            <ExtensionButtonComponent key={`ext-blocks-${idx}`} button={button} textAreaRef={textAreaRef} onInsert={onToolbarInsert} />
                        ))}

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

                        {/* Extension media actions */}
                        {extensionActions.media.map((button, idx) => (
                            <ExtensionButtonComponent key={`ext-media-${idx}`} button={button} textAreaRef={textAreaRef} onInsert={onToolbarInsert} />
                        ))}

                        {/* Extension advanced actions */}
                        {extensionActions.advanced.length > 0 && (
                            <>
                                <Separator orientation="vertical" className="mx-1 h-6"/>
                                {extensionActions.advanced.map((button, idx) => (
                                    <ExtensionButtonComponent key={`ext-advanced-${idx}`} button={button} textAreaRef={textAreaRef} onInsert={onToolbarInsert} />
                                ))}
                            </>
                        )}

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