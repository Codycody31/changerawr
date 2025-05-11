'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMarkdownState, PreviewMode } from '@/hooks/useMarkdownState';
import useAIAssistant from '@/hooks/useAIAssistant';
import useSlashCommands from '@/hooks/useSlashCommands';
import { getTextMetrics, positionToLineColumn } from './utils/formatting';
import { bindGlobalShortcuts, KeyboardShortcut } from './utils/keyboard-shortcuts';
import { AICompletionType } from '@/lib/utils/ai/types';

// Import sub-components
import MarkdownToolbar from './MarkdownToolbar';
import MarkdownEditorArea from './MarkdownEditorArea';
import MarkdownPreview from './MarkdownPreview';
import StatusBar from './StatusBar';
import SlashCommandMenu from './SlashCommandMenu';
import AIAssistantPanel from './ai/AIAssistantPanel';

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
    Table
} from 'lucide-react';

export interface MarkdownEditorProps {
    /**
     * Initial value for the editor
     */
    initialValue?: string;

    /**
     * Change handler
     */
    onChange?: (value: string) => void;

    /**
     * Save handler
     */
    onSave?: (value: string) => void;

    /**
     * Export handler
     */
    onExport?: (value: string) => void;

    /**
     * Local storage key for autosave
     */
    autosaveKey?: string;

    /**
     * Placeholder text
     */
    placeholder?: string;

    /**
     * Enable AI features
     */
    enableAI?: boolean;

    /**
     * AI API key
     */
    aiApiKey?: string;

    /**
     * Minimum height
     */
    minHeight?: string;

    /**
     * Maximum height
     */
    maxHeight?: string;

    /**
     * Whether the editor is resizable
     */
    resizable?: boolean;

    /**
     * Additional class names
     */
    className?: string;

    /**
     * Focus editor on mount
     */
    autoFocus?: boolean;

    /**
     * Show line numbers in preview
     */
    showLineNumbers?: boolean;

    /**
     * Initial preview mode
     */
    initialPreviewMode?: PreviewMode;

    /**
     * Available features for the editor
     */
    features?: {
        headings?: boolean;
        bold?: boolean;
        italic?: boolean;
        lists?: boolean;
        links?: boolean;
        code?: boolean;
        blockquotes?: boolean;
        tables?: boolean;
    };
}

/**
 * Markdown Editor Component
 */
export default function MarkdownEditor({
                                           initialValue = '',
                                           onChange,
                                           onSave,
                                           onExport,
                                           autosaveKey,
                                           placeholder = 'Start writing...',
                                           enableAI = false,
                                           aiApiKey,
                                           minHeight = '300px',
                                           maxHeight = '800px',
                                           resizable = false,
                                           className = '',
                                           autoFocus = false,
                                           showLineNumbers = false,
                                           initialPreviewMode = 'edit',
                                           features = {
                                               headings: true,
                                               bold: true,
                                               italic: true,
                                               lists: true,
                                               links: true,
                                               code: true,
                                               blockquotes: true,
                                               tables: true
                                           },
                                       }: MarkdownEditorProps) {
    // Main editor container ref
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // Use markdown state hook with safety wrapper
    const safeMarkdownState = (() => {
        try {
            return useMarkdownState({
                initialValue,
                autosaveKey,
                onChange,
                onSave,
            });
        } catch (error) {
            console.error("Error initializing markdown state:", error);

            // Return a fallback minimal state if hook fails
            return {
                state: {
                    content: initialValue,
                    selectionStart: 0,
                    selectionEnd: 0,
                    selectedText: '',
                    cursorPosition: 0,
                    previewMode: initialPreviewMode as PreviewMode,
                    wordCount: 0,
                    charCount: 0
                },
                actions: {
                    setContent: (content: string) => { console.log('Update content', content); },
                    setPreviewMode: (mode: PreviewMode) => { console.log('Set mode', mode); },
                    handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => { console.log('Change', e); },
                    handleSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => { console.log('Select', e); },
                    insertText: (text: string) => { console.log('Insert', text); },
                    wrapText: (prefix: string, suffix?: string) => { console.log('Wrap', prefix, suffix); },
                    save: () => { console.log('Save'); },
                    undo: () => { console.log('Undo'); },
                    redo: () => { console.log('Redo'); }
                },
                refs: {
                    textAreaRef: { current: null },
                    selectionRef: { current: { start: 0, end: 0, text: '' } }
                },
                canUndo: false,
                canRedo: false
            };
        }
    })();

    const {
        state: editorState,
        actions: editorActions,
        refs: editorRefs,
        canUndo,
        canRedo,
    } = safeMarkdownState;

    // Read-only convenience variables from editor state
    const {
        content,
        selectionStart,
        selectionEnd,
        selectedText,
        cursorPosition,
        previewMode,
        wordCount,
        charCount
    } = editorState;

    // Local state
    const [lineCount, setLineCount] = useState(0);
    const [cursorLineCol, setCursorLineCol] = useState<{ line: number; column: number } | null>(null);
    const [isSaved, setIsSaved] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [readingTime, setReadingTime] = useState(0);

    // Use Effect with proper error handling
    useEffect(() => {
        try {
            const metrics = getTextMetrics(content);
            setLineCount(metrics.lines);

            // Calculate reading time (average 200 words per minute)
            const minutes = Math.ceil(metrics.words / 200);
            setReadingTime(minutes);

            // Mark as unsaved when content changes
            if (lastSaved !== null) {
                setIsSaved(false);
            }

            // Calculate cursor position
            if (cursorPosition !== null) {
                const pos = positionToLineColumn(content, cursorPosition);
                setCursorLineCol(pos);
            }
        } catch (error) {
            console.error('Error updating editor metrics:', error);
        }
    }, [content, cursorPosition, lastSaved]);

    // Initialize preview mode
    useEffect(() => {
        if (initialPreviewMode) {
            editorActions.setPreviewMode(initialPreviewMode);
        }
    }, [initialPreviewMode, editorActions]);

    // AI Assistant integration with safety wrapper
    const safeAIState = (() => {
        try {
            if (!enableAI) {
                return {
                    state: {
                        isVisible: false,
                        isLoading: false,
                        completionType: AICompletionType.COMPLETE,
                        customPrompt: '',
                        error: null,
                        lastResult: null,
                        apiKeyValid: null
                    },
                    setApiKey: () => {},
                    openAssistant: () => {},
                    closeAssistant: () => {},
                    setCompletionType: () => {},
                    setCustomPrompt: () => {},
                    generateCompletion: () => Promise.resolve(null),
                    clearLastResult: () => {}
                };
            }

            return useAIAssistant({
                onGenerated: (result) => {
                    // Auto set message when AI generates content
                    setStatusMessage('AI content generated');
                    setTimeout(() => setStatusMessage(null), 3000);
                }
            });
        } catch (error) {
            console.error("Error initializing AI assistant:", error);

            // Return a fallback minimal state if hook fails
            return {
                state: {
                    isVisible: false,
                    isLoading: false,
                    completionType: AICompletionType.COMPLETE,
                    customPrompt: '',
                    error: null,
                    lastResult: null,
                    apiKeyValid: null
                },
                setApiKey: () => {},
                openAssistant: () => {},
                closeAssistant: () => {},
                setCompletionType: () => {},
                setCustomPrompt: () => {},
                generateCompletion: () => Promise.resolve(null),
                clearLastResult: () => {}
            };
        }
    })();

    const {
        state: aiState,
        setApiKey,
        openAssistant,
        closeAssistant,
        setCompletionType,
        setCustomPrompt,
        generateCompletion,
        clearLastResult,
    } = safeAIState;

    // Set API key if provided
    useEffect(() => {
        if (enableAI && aiApiKey) {
            try {
                setApiKey(aiApiKey);
            } catch (error) {
                console.error('Error setting AI API key:', error);
            }
        }
    }, [enableAI, aiApiKey, setApiKey]);

    // Slash commands with safety wrapper
    const safeSlashCommands = (() => {
        try {
            return useSlashCommands({
                content,
                cursorPosition,
                onInsertText: editorActions.insertText,
                onWrapText: (prefix, suffix) => editorActions.wrapText(prefix, suffix || ''),
                onAICommand: enableAI ? (type) => {
                    // Get context from cursor position
                    const contextStart = Math.max(0, cursorPosition - 500);
                    const contextText = content.substring(contextStart, cursorPosition);

                    // Open AI panel with selected type
                    openAssistant(type);

                    // Generate completion after a delay to allow panel to open
                    setTimeout(() => {
                        generateCompletion({
                            type,
                            content: contextText,
                        }).catch(error => console.error('Error generating AI completion:', error));
                    }, 100);
                } : undefined,
                enableAICommands: enableAI
            });
        } catch (error) {
            console.error("Error initializing slash commands:", error);

            // Return a fallback minimal state if hook fails
            return {
                menu: {
                    visible: false,
                    query: '',
                    position: null,
                    activeCommandIndex: 0,
                    filteredCommandGroups: [],
                    allCommands: [],
                    filteredCommands: []
                },
                actions: {
                    showMenu: () => {},
                    hideMenu: () => {},
                    handleKeyDown: () => {},
                    handleCommandClick: () => {}
                }
            };
        }
    })();

    const {
        menu: slashMenu,
        actions: slashActions,
    } = safeSlashCommands;

    // Formatting actions with error handling
    const handleBold = useCallback(() => {
        try {
            editorActions.wrapText('**', '**');
        } catch (error) {
            console.error('Error applying bold format:', error);
        }
    }, [editorActions]);

    const handleItalic = useCallback(() => {
        try {
            editorActions.wrapText('_', '_');
        } catch (error) {
            console.error('Error applying italic format:', error);
        }
    }, [editorActions]);

    const handleLink = useCallback(() => {
        try {
            editorActions.wrapText('[', '](url)');
        } catch (error) {
            console.error('Error applying link format:', error);
        }
    }, [editorActions]);

    const handleImage = useCallback(() => {
        try {
            editorActions.wrapText('![', '](url)');
        } catch (error) {
            console.error('Error applying image format:', error);
        }
    }, [editorActions]);

    const handleCode = useCallback(() => {
        try {
            editorActions.wrapText('`', '`');
        } catch (error) {
            console.error('Error applying code format:', error);
        }
    }, [editorActions]);

    const handleCodeBlock = useCallback(() => {
        try {
            editorActions.wrapText('```\n', '\n```');
        } catch (error) {
            console.error('Error applying code block format:', error);
        }
    }, [editorActions]);

    const handleQuote = useCallback(() => {
        try {
            editorActions.wrapText('> ', '');
        } catch (error) {
            console.error('Error applying quote format:', error);
        }
    }, [editorActions]);

    const handleBulletList = useCallback(() => {
        try {
            editorActions.insertText('- ');
        } catch (error) {
            console.error('Error applying bullet list format:', error);
        }
    }, [editorActions]);

    const handleNumberedList = useCallback(() => {
        try {
            editorActions.insertText('1. ');
        } catch (error) {
            console.error('Error applying numbered list format:', error);
        }
    }, [editorActions]);

    const handleHeading = useCallback((level: number) => {
        try {
            const prefix = '#'.repeat(level) + ' ';
            editorActions.wrapText(prefix, '');
        } catch (error) {
            console.error('Error applying heading format:', error);
        }
    }, [editorActions]);

    const handleTable = useCallback(() => {
        try {
            editorActions.insertText('\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n');
        } catch (error) {
            console.error('Error inserting table:', error);
        }
    }, [editorActions]);

    // Handler for save action with status updates
    const handleSave = useCallback(() => {
        try {
            editorActions.save();
            setIsSaved(true);
            setLastSaved(new Date());
            setStatusMessage('Changes saved');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Error saving content:', error);
            setStatusMessage('Error saving changes');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    }, [editorActions]);

    // Handler for preview mode change
    const handlePreviewModeChange = useCallback((mode: PreviewMode) => {
        try {
            editorActions.setPreviewMode(mode);
        } catch (error) {
            console.error('Error changing preview mode:', error);
        }
    }, [editorActions]);

    // Apply AI-generated content
    const handleApplyAIContent = useCallback((text: string) => {
        try {
            editorActions.insertText(text);
            closeAssistant();
            setStatusMessage('AI content applied');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Error applying AI content:', error);
            setStatusMessage('Error applying AI content');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    }, [editorActions, closeAssistant]);

    // Re-generate AI content
    const handleRegenerateAI = useCallback(() => {
        try {
            // Get context from cursor position
            const contextText = content.substring(Math.max(0, cursorPosition - 500), cursorPosition);

            // Generate new completion
            generateCompletion({
                type: aiState.completionType,
                content: contextText,
                customPrompt: aiState.customPrompt,
            }).catch(error => console.error('Error regenerating AI content:', error));
        } catch (error) {
            console.error('Error regenerating AI content:', error);
        }
    }, [content, cursorPosition, aiState.completionType, aiState.customPrompt, generateCompletion]);

    // Handle export with error handling
    const handleExport = useCallback(() => {
        try {
            if (onExport) {
                onExport(content);
            } else {
                // Default export implementation
                const element = document.createElement('a');
                const file = new Blob([content], {type: 'text/markdown'});
                element.href = URL.createObjectURL(file);
                element.download = `document_${new Date().toISOString().slice(0, 10)}.md`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }
        } catch (error) {
            console.error('Error exporting content:', error);
            setStatusMessage('Error exporting content');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    }, [content, onExport]);

    // Configure keyboard shortcuts with error handling
    useEffect(() => {
        if (!editorContainerRef.current) return;

        try {
            const shortcuts: KeyboardShortcut[] = [
                {
                    key: 'b',
                    ctrlKey: true,
                    action: handleBold,
                    description: 'Bold',
                    preventDefault: true,
                },
                {
                    key: 'i',
                    ctrlKey: true,
                    action: handleItalic,
                    description: 'Italic',
                    preventDefault: true,
                },
                {
                    key: 'k',
                    ctrlKey: true,
                    action: handleLink,
                    description: 'Link',
                    preventDefault: true,
                },
                {
                    key: '1',
                    ctrlKey: true,
                    action: () => handleHeading(1),
                    description: 'Heading 1',
                    preventDefault: true,
                },
                {
                    key: '2',
                    ctrlKey: true,
                    action: () => handleHeading(2),
                    description: 'Heading 2',
                    preventDefault: true,
                },
                {
                    key: '3',
                    ctrlKey: true,
                    action: () => handleHeading(3),
                    description: 'Heading 3',
                    preventDefault: true,
                },
                {
                    key: 's',
                    ctrlKey: true,
                    action: handleSave,
                    description: 'Save',
                    preventDefault: true,
                },
                {
                    key: 'z',
                    ctrlKey: true,
                    action: editorActions.undo,
                    description: 'Undo',
                    preventDefault: true,
                },
                {
                    key: 'z',
                    ctrlKey: true,
                    shiftKey: true,
                    action: editorActions.redo,
                    description: 'Redo',
                    preventDefault: true,
                },
            ];

            // Add AI shortcut if enabled
            if (enableAI) {
                shortcuts.push({
                    key: 'a',
                    altKey: true,
                    action: () => openAssistant(AICompletionType.COMPLETE),
                    description: 'AI Assistant',
                    preventDefault: true,
                });
            }

            // Bind shortcuts to the editor container
            const cleanup = bindGlobalShortcuts(shortcuts, { enableInInputs: true });

            return cleanup;
        } catch (error) {
            console.error('Error setting up keyboard shortcuts:', error);
            return () => {}; // Empty cleanup function
        }
    }, [
        handleBold,
        handleItalic,
        handleLink,
        handleHeading,
        handleSave,
        editorActions,
        enableAI,
        openAssistant
    ]);

    // Toolbar configuration
    const toolbarGroups = [
        {
            name: 'format',
            actions: [
                {
                    icon: <Bold size={16} />,
                    label: 'Bold',
                    onClick: handleBold,
                    shortcut: 'Ctrl+B',
                    isActive: false,
                },
                {
                    icon: <Italic size={16} />,
                    label: 'Italic',
                    onClick: handleItalic,
                    shortcut: 'Ctrl+I',
                    isActive: false,
                },
                {
                    icon: <Underline size={16} />,
                    label: 'Strikethrough',
                    onClick: () => {
                        try {
                            editorActions.wrapText('~~', '~~');
                        } catch (error) {
                            console.error('Error applying strikethrough:', error);
                        }
                    },
                    isActive: false,
                },
            ],
        },
        {
            name: 'insert',
            actions: [
                {
                    icon: <Link size={16} />,
                    label: 'Link',
                    onClick: handleLink,
                    shortcut: 'Ctrl+K',
                    isActive: false,
                },
                {
                    icon: <Image size={16} />,
                    label: 'Image',
                    onClick: handleImage,
                    isActive: false,
                },
                {
                    icon: <Code size={16} />,
                    label: 'Code',
                    onClick: handleCode,
                    isActive: false,
                },
            ],
        },
        {
            name: 'lists',
            actions: [
                {
                    icon: <List size={16} />,
                    label: 'Bullet List',
                    onClick: handleBulletList,
                    isActive: false,
                },
                {
                    icon: <ListOrdered size={16} />,
                    label: 'Numbered List',
                    onClick: handleNumberedList,
                    isActive: false,
                },
                {
                    icon: <Quote size={16} />,
                    label: 'Quote',
                    onClick: handleQuote,
                    isActive: false,
                },
            ],
        },
    ];

    const toolbarDropdowns = [
        {
            name: 'Headings',
            icon: <Heading2 size={16} />,
            actions: [
                {
                    icon: <Heading1 size={16} />,
                    label: 'Heading 1',
                    onClick: () => handleHeading(1),
                    shortcut: 'Ctrl+1',
                },
                {
                    icon: <Heading2 size={16} />,
                    label: 'Heading 2',
                    onClick: () => handleHeading(2),
                    shortcut: 'Ctrl+2',
                },
                {
                    icon: <Heading3 size={16} />,
                    label: 'Heading 3',
                    onClick: () => handleHeading(3),
                    shortcut: 'Ctrl+3',
                },
            ],
        },
        {
            name: 'Advanced',
            icon: <Table size={16} />,
            actions: [
                {
                    icon: <Table size={16} />,
                    label: 'Table',
                    onClick: handleTable,
                },
                {
                    icon: <Code size={16} />,
                    label: 'Code Block',
                    onClick: handleCodeBlock,
                },
            ],
        },
    ];

    // Filter toolbar items based on enabled features
    const filteredToolbarGroups = React.useMemo(() => {
        if (!features) return toolbarGroups;

        return toolbarGroups.map(group => {
            let filteredActions = group.actions;

            // Filter out disabled formatting options
            if (group.name === 'format') {
                if (!features.bold) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Bold');
                }
                if (!features.italic) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Italic');
                }
            }

            // Filter out disabled insert options
            if (group.name === 'insert') {
                if (!features.links) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Link');
                }
                if (!features.code) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Code');
                }
            }

            // Filter out disabled list options
            if (group.name === 'lists') {
                if (!features.lists) {
                    filteredActions = filteredActions.filter(action =>
                        action.label !== 'Bullet List' && action.label !== 'Numbered List'
                    );
                }
                if (!features.blockquotes) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Quote');
                }
            }

            return {
                ...group,
                actions: filteredActions
            };
        }).filter(group => group.actions.length > 0);
    }, [features, toolbarGroups]);

    // Filter dropdown items based on enabled features
    const filteredToolbarDropdowns = React.useMemo(() => {
        if (!features) return toolbarDropdowns;

        return toolbarDropdowns.map(dropdown => {
            let filteredActions = dropdown.actions;

            if (dropdown.name === 'Headings' && !features.headings) {
                filteredActions = [];
            }

            if (dropdown.name === 'Advanced') {
                if (!features.tables) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Table');
                }
                if (!features.code) {
                    filteredActions = filteredActions.filter(action => action.label !== 'Code Block');
                }
            }

            return {
                ...dropdown,
                actions: filteredActions
            };
        }).filter(dropdown => dropdown.actions.length > 0);
    }, [features, toolbarDropdowns]);

    // Safe render function to handle errors gracefully
    const safeRender = () => {
        try {
            // Styling based on props
            const containerStyle = {
                minHeight,
                maxHeight: resizable ? undefined : maxHeight,
                height: resizable ? undefined : minHeight,
            };

            return (
                <div
                    ref={editorContainerRef}
                    className={`flex flex-col border rounded-md overflow-hidden shadow-sm bg-background ${className}`}
                    style={containerStyle}
                >
                    {/* Toolbar */}
                    <MarkdownToolbar
                        groups={filteredToolbarGroups}
                        dropdowns={filteredToolbarDropdowns}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={editorActions.undo}
                        onRedo={editorActions.redo}
                        onSave={handleSave}
                        onExport={handleExport}
                        viewMode={previewMode}
                        onViewModeChange={handlePreviewModeChange}
                        onAIAssist={enableAI ? () => openAssistant(AICompletionType.COMPLETE) : undefined}
                        enableAI={enableAI}
                    />

                    {/* Main content area */}
                    <div className="flex-grow flex overflow-hidden">
                        {/* Editor pane - shown in edit or split mode */}
                        {(previewMode === 'edit' || previewMode === 'split') && (
                            <div className={`${previewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} relative overflow-hidden`}>
                                {/* Editor area */}
                                <MarkdownEditorArea
                                    ref={editorRefs.textAreaRef}
                                    value={content}
                                    onChange={editorActions.handleChange}
                                    onSelect={(start, end, text) => {
                                        try {
                                            editorActions.handleSelect({
                                                currentTarget: {
                                                    selectionStart: start,
                                                    selectionEnd: end
                                                }
                                            } as React.SyntheticEvent<HTMLTextAreaElement>);
                                        } catch (error) {
                                            console.error('Error handling selection:', error);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        try {
                                            slashActions.handleKeyDown(e);
                                        } catch (error) {
                                            console.error('Error handling key down:', error);
                                        }
                                    }}
                                    placeholder={placeholder}
                                    resizable={resizable}
                                    className="h-full"
                                    disabled={false}
                                    autoFocus={autoFocus}
                                    onBold={handleBold}
                                    onItalic={handleItalic}
                                    onLink={handleLink}
                                    onCode={handleCode}
                                    onQuote={handleQuote}
                                    onBulletList={handleBulletList}
                                    onNumberedList={handleNumberedList}
                                    onHeading={(text, level) => handleHeading(level)}
                                />

                                {/* Slash command menu with error handling wrapper */}
                                {slashMenu.visible && (
                                    <SlashCommandMenu
                                        visible={slashMenu.visible}
                                        position={slashMenu.position || { x: 0, y: 0 }}
                                        query={slashMenu.query}
                                        commandGroups={slashMenu.filteredCommandGroups}
                                        activeCommandIndex={slashMenu.activeCommandIndex}
                                        onCommandClick={(command) => {
                                            try {
                                                slashActions.handleCommandClick(command);
                                            } catch (error) {
                                                console.error('Error handling command click:', error);
                                            }
                                        }}
                                        onActiveCommandChange={(index) => {}}
                                        onClose={() => {
                                            try {
                                                slashActions.hideMenu();
                                            } catch (error) {
                                                console.error('Error hiding menu:', error);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Preview pane - shown in preview or split mode */}
                        {(previewMode === 'preview' || previewMode === 'split') && (
                            <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto`}>
                                <MarkdownPreview
                                    content={content}
                                    scrollSync={previewMode === 'split'}
                                    renderOptions={{
                                        className: 'p-4',
                                        features: {
                                            headings: features?.headings ?? true,
                                            anchors: true,
                                            bold: features?.bold ?? true,
                                            italic: features?.italic ?? true,
                                            strikethrough: true,
                                            blockquotes: features?.blockquotes ?? true,
                                            code: features?.code ?? true,
                                            inlineCode: features?.code ?? true,
                                            links: features?.links ?? true,
                                            images: true,
                                            lists: features?.lists ?? true,
                                            taskLists: features?.lists ?? true,
                                            tables: features?.tables ?? true,
                                            footnotes: true,
                                            lineBreaks: true,
                                            horizontalRules: true,
                                        },
                                        openLinksInNewTab: true,
                                    }}
                                    showLineNumbers={showLineNumbers}
                                    highlightCode={true}
                                />
                            </div>
                        )}
                    </div>

                    {/* Status bar */}
                    <StatusBar
                        wordCount={wordCount}
                        charCount={charCount}
                        lineCount={lineCount}
                        cursorPosition={cursorLineCol || undefined}
                        readingTime={readingTime}
                        isSaved={isSaved}
                        statusMessage={statusMessage || undefined}
                        lastSaved={lastSaved || undefined}
                    />

                    {/* AI Assistant Panel */}
                    {enableAI && (
                        <AIAssistantPanel
                            isVisible={aiState.isVisible}
                            content={content.substring(Math.max(0, cursorPosition - 500), cursorPosition)}
                            completionType={aiState.completionType}
                            customPrompt={aiState.customPrompt}
                            isLoading={aiState.isLoading}
                            generatedResult={aiState.lastResult}
                            error={aiState.error}
                            availableModels={[{ id: 'copilot-zero', name: 'Copilot Zero' }]}
                            selectedModel="copilot-zero"
                            onClose={closeAssistant}
                            onCompletionTypeChange={setCompletionType}
                            onCustomPromptChange={setCustomPrompt}
                            onGenerate={handleRegenerateAI}
                            onApply={handleApplyAIContent}
                            onRegenerate={handleRegenerateAI}
                            isApiKeyValid={aiState.apiKeyValid}
                            onSetApiKey={setApiKey}
                        />
                    )}
                </div>
            );
        } catch (error) {
            console.error('Error rendering MarkdownEditor:', error);

            // Fallback UI in case of rendering errors
            return (
                <div className={`border rounded-md overflow-hidden shadow-sm bg-background p-4 ${className}`} style={{ minHeight }}>
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <p className="text-destructive font-medium">There was an error rendering the Markdown editor.</p>
                        <textarea
                            value={content}
                            onChange={(e) => onChange?.(e.target.value)}
                            className="w-full min-h-[300px] p-4 border rounded"
                            placeholder={placeholder}
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
                                onClick={() => onSave?.(content)}
                            >
                                Save
                            </button>
                            {onExport && (
                                <button
                                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                                    onClick={() => onExport(content)}
                                >
                                    Export
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return safeRender();
}