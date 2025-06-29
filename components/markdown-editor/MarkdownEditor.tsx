'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Bold, Italic, Link, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3, Image} from 'lucide-react';


// Import the MarkdownToolbar component
import MarkdownToolbar, {ToolbarGroup, ToolbarDropdown} from './MarkdownToolbar';

// Import AI integration
import useAIAssistant from '@/hooks/useAIAssistant';
import {AICompletionType} from '@/lib/utils/ai/types';
import AIAssistantPanel from './ai/AIAssistantPanel';
import {RenderMarkdown} from '../MarkdownEditor';

/**
 * Simple, stable Markdown Editor component
 */
export interface MarkdownEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    onExport?: (value: string) => void;
    placeholder?: string;
    className?: string;
    height?: string;
    autoFocus?: boolean;
    readOnly?: boolean;
    enableAI?: boolean;
    aiApiKey?: string;
}

export default function MarkdownEditor({
                                           initialValue = '',
                                           onChange,
                                           onSave,
                                           onExport,
                                           placeholder = 'Start writing...',
                                           className = '',
                                           height = '500px',
                                           autoFocus = false,
                                           readOnly = false,
                                           enableAI = false,
                                           aiApiKey,
                                       }: MarkdownEditorProps) {
    // Main state
    const [content, setContent] = useState(initialValue);
    const [view, setView] = useState<'edit' | 'preview' | 'split'>('edit');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selection, setSelection] = useState({start: 0, end: 0});

    // Track history for undo/redo
    const [history, setHistory] = useState<string[]>([initialValue]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // UI state
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [isSaved, setIsSaved] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isInitialRender = useRef(true);

    // Track if initial value is changed externally (controlled component behavior)
    const initialValueRef = useRef(initialValue);

    // Initialize AI assistant (always call the hook, but conditionally use its methods)
    const ai = useAIAssistant({
        apiKey: aiApiKey,
        onGenerated: () => {
            // Show success message
            setStatusMessage('AI content generated');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    });

    // Only enable AI features if the prop is true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const enabledAI = enableAI ? ai : null;

    // Effect to handle initialValue changes (controlled component support)
    useEffect(() => {
        // If initialValue has changed from what we previously stored
        if (initialValue !== initialValueRef.current) {
            // Store new initial value
            initialValueRef.current = initialValue;

            // Reset the editor state
            setContent(initialValue);
            setHistory([initialValue]);
            setHistoryIndex(0);
            setIsSaved(true);

            // Recalculate metrics for new content
            calculateMetrics(initialValue);
        }
    }, [initialValue]);

    // Calculate metrics (word count, char count) from content
    const calculateMetrics = useCallback((text: string) => {
        // Count words
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        setWordCount(words);

        // Count characters
        setCharCount(text.length);
    }, []);

    // Add content to history when it changes
    const addToHistory = useCallback((newContent: string) => {
        if (newContent === history[historyIndex]) return;

        // Clear timeout if exists
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce history additions
        timeoutRef.current = setTimeout(() => {
            setHistory(prev => {
                // Remove future history if we're not at the end
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(newContent);

                // Limit history size
                if (newHistory.length > 100) {
                    return newHistory.slice(newHistory.length - 100);
                }
                return newHistory;
            });
            setHistoryIndex(prev => prev + 1);
        }, 500);
    }, [history, historyIndex]);

    // Undo/redo functions
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (!canUndo) return;
        const newIndex = historyIndex - 1;
        const previousContent = history[newIndex];

        setHistoryIndex(newIndex);
        setContent(previousContent);

        // Notify parent of the change
        onChange?.(previousContent);
    }, [canUndo, history, historyIndex, onChange]);

    const handleRedo = useCallback(() => {
        if (!canRedo) return;
        const newIndex = historyIndex + 1;
        const nextContent = history[newIndex];

        setHistoryIndex(newIndex);
        setContent(nextContent);

        // Notify parent of the change
        onChange?.(nextContent);
    }, [canRedo, history, historyIndex, onChange]);

    // Handle content change
    const handleChange = useCallback((newContent: string) => {
        setContent(newContent);
        setIsSaved(false);

        // Notify parent
        onChange?.(newContent);

        // Add to history for undo/redo
        addToHistory(newContent);

        // Update metrics
        calculateMetrics(newContent);
    }, [onChange, addToHistory, calculateMetrics]);

    // Initial calculation of metrics
    useEffect(() => {
        calculateMetrics(content);
    }, []);

    // Handle save function
    const handleSave = useCallback(() => {
        onSave?.(content);
        setIsSaved(true);
        setLastSaved(new Date());
        setStatusMessage('Document saved');
        setTimeout(() => setStatusMessage(null), 3000);
    }, [content, onSave]);

    // Handle export function
    const handleExport = useCallback(() => {
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
    }, [content, onExport]);

    // Formatting helpers
    const insertFormat = useCallback((prefix: string, suffix: string = '') => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        // If no selection, just insert prefix+suffix and place cursor in between
        if (start === end) {
            const newContent =
                content.substring(0, start) +
                prefix + suffix +
                content.substring(end);

            handleChange(newContent);

            // Set cursor position between prefix and suffix
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = start + prefix.length;
                textarea.selectionEnd = start + prefix.length;
            }, 0);
        } else {
            // Wrap selected text
            const newContent =
                content.substring(0, start) +
                prefix + selectedText + suffix +
                content.substring(end);

            handleChange(newContent);

            // Maintain selection with formatting
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = start + prefix.length;
                textarea.selectionEnd = start + prefix.length + selectedText.length;
            }, 0);
        }
    }, [content, handleChange]);

    // Format handlers
    const handleBold = useCallback(() => insertFormat('**', '**'), [insertFormat]);
    const handleItalic = useCallback(() => insertFormat('_', '_'), [insertFormat]);
    const handleLink = useCallback(() => insertFormat('[', '](url)'), [insertFormat]);
    const handleImage = useCallback(() => insertFormat('![', '](url)'), [insertFormat]);
    const handleCode = useCallback(() => insertFormat('`', '`'), [insertFormat]);
    const handleHeading1 = useCallback(() => insertFormat('# '), [insertFormat]);
    const handleHeading2 = useCallback(() => insertFormat('## '), [insertFormat]);
    const handleHeading3 = useCallback(() => insertFormat('### '), [insertFormat]);
    const handleQuote = useCallback(() => insertFormat('> '), [insertFormat]);
    const handleBulletList = useCallback(() => insertFormat('- '), [insertFormat]);
    const handleNumberedList = useCallback(() => insertFormat('1. '), [insertFormat]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Save shortcut: Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }

        // Bold: Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            handleBold();
        }

        // Italic: Ctrl+I
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            handleItalic();
        }

        // Link: Ctrl+K
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            handleLink();
        }

        // Undo: Ctrl+Z
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            handleUndo();
        }

        // Redo: Ctrl+Shift+Z or Ctrl+Y
        if ((e.ctrlKey && e.shiftKey && e.key === 'z') ||
            (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            handleRedo();
        }

        // Headings: Ctrl+1, Ctrl+2, Ctrl+3
        if (e.ctrlKey && e.key === '1') {
            e.preventDefault();
            handleHeading1();
        }
        if (e.ctrlKey && e.key === '2') {
            e.preventDefault();
            handleHeading2();
        }
        if (e.ctrlKey && e.key === '3') {
            e.preventDefault();
            handleHeading3();
        }

        // AI Assistant: Alt+A
        if (e.altKey && e.key === 'a' && enableAI && ai) {
            e.preventDefault();
            ai.openAssistant(AICompletionType.COMPLETE);
        }
    }, [
        handleSave, handleUndo, handleRedo,
        handleBold, handleItalic, handleLink,
        handleHeading1, handleHeading2, handleHeading3,
        enableAI, ai
    ]);

    // Handle selection change
    const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        setSelection({
            start: target.selectionStart,
            end: target.selectionEnd
        });
    }, []);

    // Utility to extract relevant content for AI processing
    const getContextForAI = useCallback(() => {
        if (!textareaRef.current) return '';

        const textarea = textareaRef.current;
        const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd);

        // If there's a selection, use that
        if (selectedText.trim()) {
            return selectedText;
        }

        // No selection - get context around cursor
        const cursorPos = textarea.selectionStart;

        // Get a reasonable amount of context around cursor
        // (up to 2000 chars - 1000 before, 1000 after)
        const contextStart = Math.max(0, cursorPos - 1000);
        const contextEnd = Math.min(content.length, cursorPos + 1000);

        return content.substring(contextStart, contextEnd);
    }, [content]);

    // Apply AI-generated content
    const handleApplyAIContent = useCallback((text: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // If there's a selection, replace it
        if (start !== end) {
            const newContent =
                content.substring(0, start) +
                text +
                content.substring(end);

            handleChange(newContent);
        } else {
            // No selection, insert at cursor
            const newContent =
                content.substring(0, start) +
                text +
                content.substring(start);

            handleChange(newContent);
        }

        // Close the AI panel
        ai?.closeAssistant();

        // Show success message
        setStatusMessage('AI content applied');
        setTimeout(() => setStatusMessage(null), 3000);

        // Focus back on editor
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + text.length;
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        }, 0);
    }, [content, handleChange, ai]);

    // Generate AI content
    const handleGenerateAI = useCallback(() => {
        if (!enableAI || !ai) return;

        const contextText = getContextForAI();

        if (!contextText.trim()) {
            setStatusMessage('Please select text or position cursor in content');
            setTimeout(() => setStatusMessage(null), 3000);
            return;
        }

        ai.generateCompletion({
            type: ai.state.completionType,
            content: contextText,
            customPrompt: ai.state.customPrompt,
            options: {
                temperature: ai.state.temperature
            }
        }).catch(error => {
            console.error('Error generating AI content:', error);
            setStatusMessage('Error generating AI content');
            setTimeout(() => setStatusMessage(null), 3000);
        });
    }, [enableAI, ai, getContextForAI]);

    // Create toolbar groups for MarkdownToolbar
    const toolbarGroups: ToolbarGroup[] = [
        {
            name: 'format',
            actions: [
                {
                    icon: <Bold size={16}/>,
                    label: 'Bold',
                    onClick: handleBold,
                    shortcut: 'Ctrl+B',
                },
                {
                    icon: <Italic size={16}/>,
                    label: 'Italic',
                    onClick: handleItalic,
                    shortcut: 'Ctrl+I',
                },
                {
                    icon: <Link size={16}/>,
                    label: 'Link',
                    onClick: handleLink,
                    shortcut: 'Ctrl+K',
                },
            ],
        },
        {
            name: 'content',
            actions: [
                {
                    icon: <List size={16}/>,
                    label: 'Bullet List',
                    onClick: handleBulletList,
                },
                {
                    icon: <ListOrdered size={16}/>,
                    label: 'Numbered List',
                    onClick: handleNumberedList,
                },
                {
                    icon: <Quote size={16}/>,
                    label: 'Blockquote',
                    onClick: handleQuote,
                },
                {
                    icon: <Code size={16}/>,
                    label: 'Inline Code',
                    onClick: handleCode,
                },
                {
                    icon: <Image size={16}/>,
                    label: 'Image',
                    onClick: handleImage,
                },
            ],
        },
    ];

    // Create toolbar dropdowns for MarkdownToolbar
    const toolbarDropdowns: ToolbarDropdown[] = [
        {
            name: 'Headings',
            icon: <Heading2 size={16}/>,
            actions: [
                {
                    icon: <Heading1 size={16}/>,
                    label: 'Heading 1',
                    onClick: handleHeading1,
                    shortcut: 'Ctrl+1',
                },
                {
                    icon: <Heading2 size={16}/>,
                    label: 'Heading 2',
                    onClick: handleHeading2,
                    shortcut: 'Ctrl+2',
                },
                {
                    icon: <Heading3 size={16}/>,
                    label: 'Heading 3',
                    onClick: handleHeading3,
                    shortcut: 'Ctrl+3',
                },
            ],
        },
    ];

    return (
        <div className={`border rounded-md shadow-sm bg-background ${className}`}>
            {/* Use MarkdownToolbar component */}
            <MarkdownToolbar
                groups={toolbarGroups}
                dropdowns={toolbarDropdowns}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={onSave ? handleSave : undefined}
                onExport={handleExport}
                viewMode={view}
                onViewModeChange={(mode: 'edit' | 'preview' | 'split') => setView(mode)}
                onAIAssist={enableAI && ai ? () => ai.openAssistant(AICompletionType.COMPLETE) : undefined}
                enableAI={enableAI}
            />

            {/* Editor content */}
            <div className="flex" style={{height}}>
                {/* Edit mode */}
                {(view === 'edit' || view === 'split') && (
                    <div className={`${view === 'split' ? 'w-1/2 border-r' : 'w-full'}`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleChange(e.target.value)}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full h-full p-4 font-mono text-sm border-0 bg-background focus-visible:ring-0 focus-visible:outline-none resize-none"
                spellCheck="false"
                autoFocus={autoFocus}
                readOnly={readOnly}
            />
                    </div>
                )}

                {/* Preview mode - using RenderMarkdown component */}
                {(view === 'preview' || view === 'split') && (
                    <div className={`${view === 'split' ? 'w-1/2' : 'w-full'} overflow-auto p-4`}>
                        <RenderMarkdown>{content}</RenderMarkdown>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div
                className="flex items-center justify-between h-6 px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20">
                <div className="flex items-center space-x-3">
                    <span>{wordCount} words</span>
                    <span>{charCount} characters</span>
                </div>

                {statusMessage && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
                        {isSaved && <span className="text-green-500 mr-1">●</span>}
                        <span>{statusMessage}</span>
                    </div>
                )}

                <div className="flex items-center">
                    {lastSaved && (
                        <span>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
                    )}
                </div>
            </div>

            {/* AI Assistant Panel */}
            {enableAI && ai && (
                <AIAssistantPanel
                    isVisible={ai.state.isVisible}
                    content={getContextForAI()}
                    completionType={ai.state.completionType}
                    customPrompt={ai.state.customPrompt}
                    isLoading={ai.state.isLoading}
                    generatedResult={ai.state.lastResult}
                    error={ai.state.error}
                    temperature={ai.state.temperature}
                    onTemperatureChange={ai.setTemperature}
                    onClose={ai.closeAssistant}
                    onCompletionTypeChange={ai.setCompletionType}
                    onCustomPromptChange={ai.setCustomPrompt}
                    onGenerate={handleGenerateAI}
                    onApply={handleApplyAIContent}
                    onRegenerate={handleGenerateAI}
                    isApiKeyValid={ai.state.apiKeyValid}
                    onSetApiKey={ai.setApiKey}
                />
            )}
        </div>
    );
}