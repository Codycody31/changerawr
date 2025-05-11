'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    X,
    Wand2,
    Sparkles,
    MessageSquarePlus,
    PenLine,
    FileText,
    Loader2,
    ArrowRight,
    SlidersHorizontal,
    Copy,
    RefreshCw,
    Check,
    RotateCcw,
    ChevronRight,
    AlignLeft
} from 'lucide-react';

import { AICompletionType, AIEditorResult } from '@/lib/utils/ai/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface AIAssistantPanelProps {
    /**
     * Whether the panel is visible
     */
    isVisible: boolean;

    /**
     * Current selection or content to process
     */
    content: string;

    /**
     * Selected AI completion type
     */
    completionType: AICompletionType;

    /**
     * Custom prompt (for custom completion type)
     */
    customPrompt: string;

    /**
     * Is currently generating content
     */
    isLoading: boolean;

    /**
     * Generated result
     */
    generatedResult?: AIEditorResult | null;

    /**
     * Error message if generation failed
     */
    error?: Error | null;

    /**
     * Available AI models
     */
    availableModels?: Array<{
        id: string;
        name?: string;
    }>;

    /**
     * Currently selected model
     */
    selectedModel?: string;

    /**
     * Handler for closing the panel
     */
    onClose: () => void;

    /**
     * Handler for changing completion type
     */
    onCompletionTypeChange: (type: AICompletionType) => void;

    /**
     * Handler for changing custom prompt
     */
    onCustomPromptChange: (prompt: string) => void;

    /**
     * Handler for model change
     */
    onModelChange?: (modelId: string) => void;

    /**
     * Handler for generating content
     */
    onGenerate: () => void;

    /**
     * Handler for applying generated content
     */
    onApply: (text: string) => void;

    /**
     * Handler for regenerating content
     */
    onRegenerate?: () => void;

    /**
     * Handler for canceling generation
     */
    onCancel?: () => void;

    /**
     * Is API key valid
     */
    isApiKeyValid?: boolean | null;

    /**
     * Handler for setting API key
     */
    onSetApiKey?: (key: string) => void;
}

/**
 * AI Assistant Panel component
 */
export default function AIAssistantPanel({
                                             isVisible,
                                             content,
                                             completionType,
                                             customPrompt,
                                             isLoading,
                                             generatedResult,
                                             error,
                                             availableModels = [],
                                             selectedModel = 'copilot-zero',
                                             onClose,
                                             onCompletionTypeChange,
                                             onCustomPromptChange,
                                             onModelChange,
                                             onGenerate,
                                             onApply,
                                             onRegenerate,
                                             onCancel,
                                             isApiKeyValid = null,
                                             onSetApiKey,
                                         }: AIAssistantPanelProps) {
    // State for API key input
    const [apiKey, setApiKey] = useState('');

    // State for copy button
    const [copied, setCopied] = useState(false);

    // State for advanced settings visibility
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // Copy generated text to clipboard
    const handleCopy = () => {
        if (generatedResult?.text) {
            navigator.clipboard.writeText(generatedResult.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Reset copy state when result changes
    useEffect(() => {
        setCopied(false);
    }, [generatedResult]);

    // Truncate content for display
    const truncateContent = (text: string, maxLength: number = 150): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Panel variants for animation
    const panelVariants = {
        hidden: { opacity: 0, x: '100%' },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: '100%' },
    };

    // Get icon for completion type
    const getTypeIcon = (type: AICompletionType) => {
        switch (type) {
            case AICompletionType.COMPLETE:
                return <Wand2 className="w-4 h-4" />;
            case AICompletionType.EXPAND:
                return <MessageSquarePlus className="w-4 h-4" />;
            case AICompletionType.IMPROVE:
                return <PenLine className="w-4 h-4" />;
            case AICompletionType.SUMMARIZE:
                return <AlignLeft className="w-4 h-4" />;
            case AICompletionType.CUSTOM:
                return <FileText className="w-4 h-4" />;
            default:
                return <Sparkles className="w-4 h-4" />;
        }
    };

    // Get label for completion type
    const getTypeLabel = (type: AICompletionType) => {
        switch (type) {
            case AICompletionType.COMPLETE:
                return 'Continue writing';
            case AICompletionType.EXPAND:
                return 'Expand on this';
            case AICompletionType.IMPROVE:
                return 'Improve my writing';
            case AICompletionType.SUMMARIZE:
                return 'Summarize';
            case AICompletionType.CUSTOM:
                return 'Custom instruction';
            default:
                return 'AI Assistant';
        }
    };

    // Get description for completion type
    const getTypeDescription = (type: AICompletionType) => {
        switch (type) {
            case AICompletionType.COMPLETE:
                return 'Continue writing from where you left off';
            case AICompletionType.EXPAND:
                return 'Add more details, examples, or explanations';
            case AICompletionType.IMPROVE:
                return 'Enhance clarity, flow, and style';
            case AICompletionType.SUMMARIZE:
                return 'Create a concise summary of the text';
            case AICompletionType.CUSTOM:
                return 'Write your own instructions';
            default:
                return '';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 bg-black/20 dark:bg-black/50 z-50 flex items-end sm:items-center justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full sm:w-[400px] bg-background border-l border-t sm:border rounded-t-lg sm:rounded-lg shadow-xl overflow-hidden sm:mr-4 sm:mb-4 sm:max-h-[85vh] max-h-[80vh] flex flex-col"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", damping: 25, stiffness: 250 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-primary" />
                                <h3 className="font-medium">AI Assistant</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-grow">
                            <div className="p-4 space-y-4">
                                {/* API key input if not valid */}
                                {isApiKeyValid === false && onSetApiKey && (
                                    <div className="space-y-2 mb-4 p-3 border rounded-md bg-muted/30">
                                        <h4 className="text-sm font-medium">Enter Secton API Key</h4>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            Your API key will be used to access the AI service. It will not be stored on any server.
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="sk-..."
                                                className="flex-grow p-2 text-sm rounded-md border"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => onSetApiKey(apiKey)}
                                            >
                                                Set Key
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Action selection */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                        What would you like AI to help with?
                                    </h4>

                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.values(AICompletionType).map((type) => (
                                            <Button
                                                key={type}
                                                variant={completionType === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => onCompletionTypeChange(type)}
                                                className={`justify-start gap-2 ${completionType === type ? 'border-primary/20' : ''}`}
                                            >
                                                {getTypeIcon(type)}
                                                <span>{getTypeLabel(type)}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom prompt input */}
                                {completionType === AICompletionType.CUSTOM && (
                                    <div className="space-y-2">
                                        <label htmlFor="customPrompt" className="text-sm font-medium">
                                            Custom instruction
                                        </label>
                                        <Textarea
                                            id="customPrompt"
                                            placeholder="Describe what you want the AI to do..."
                                            value={customPrompt}
                                            onChange={(e) => onCustomPromptChange(e.target.value)}
                                            className="min-h-[80px] text-sm"
                                        />
                                    </div>
                                )}

                                {/* Context */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-muted-foreground">Context</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {content.length} characters
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-md border text-sm max-h-32 overflow-y-auto break-words whitespace-pre-wrap">
                                        {content ? truncateContent(content, 300) : (
                                            <span className="text-muted-foreground italic">No text selected. AI will use the current cursor position.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Error message */}
                                {error && (
                                    <div className="p-3 bg-destructive/10 border-destructive/20 border rounded-md text-sm text-destructive">
                                        <p className="font-medium">Error</p>
                                        <p>{error.message}</p>
                                    </div>
                                )}

                                {/* Generated content */}
                                {generatedResult && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-muted-foreground">Generated content</h4>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={handleCopy}
                                                    title="Copy to clipboard"
                                                >
                                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                </Button>
                                                {onRegenerate && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={onRegenerate}
                                                        title="Regenerate"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm max-h-60 overflow-y-auto break-words whitespace-pre-wrap">
                                            {generatedResult.text}
                                        </div>

                                        {/* Metadata */}
                                        {generatedResult.metadata && (
                                            <p className="text-xs text-muted-foreground">
                                                Generated with {generatedResult.metadata.model}
                                                {generatedResult.usage && ` • ${generatedResult.usage.prompt_tokens + generatedResult.usage.completion_tokens} tokens`}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Model & Advanced Settings */}
                                <div className="space-y-2">
                                    <button
                                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                    >
                                        <SlidersHorizontal className="w-3 h-3" />
                                        <span>{showAdvancedSettings ? 'Hide' : 'Show'} advanced settings</span>
                                        <ChevronRight className={`w-3 h-3 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`} />
                                    </button>

                                    {showAdvancedSettings && (
                                        <div className="pt-1 pb-2 space-y-4">
                                            {/* Model selector */}
                                            {availableModels.length > 0 && onModelChange && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">AI Model</label>
                                                    <Select
                                                        value={selectedModel}
                                                        onValueChange={onModelChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select a model" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                <SelectLabel>Available Models</SelectLabel>
                                                                {availableModels.map((model) => (
                                                                    <SelectItem key={model.id} value={model.id}>
                                                                        {model.name || model.id}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {/* Temperature slider could go here */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Footer with buttons */}
                        <div className="p-4 border-t flex justify-between items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>

                            {generatedResult ? (
                                <Button
                                    onClick={() => onApply(generatedResult.text)}
                                    className="gap-1"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    <span>Insert</span>
                                </Button>
                            ) : (
                                <Button
                                    onClick={onGenerate}
                                    disabled={isLoading || isApiKeyValid === false}
                                    className="gap-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Generate</span>
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}