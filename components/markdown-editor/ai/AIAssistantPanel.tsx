'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    X,
    Sparkles,
    Loader2,
    ArrowRight,
    Copy,
    Check,
    RefreshCw,
    ChevronRight,
    Lightbulb,
    Settings,
    Wand2,
} from 'lucide-react';

import { AICompletionType, AIEditorResult } from '@/lib/utils/ai/types';
import { getCompletionTypeDescription } from '@/lib/utils/ai/prompts';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
     * Is currently regenerating content
     */
    isRegenerating?: boolean;

    /**
     * Generated result
     */
    generatedResult?: AIEditorResult | null;

    /**
     * Error message if generation failed
     */
    error?: Error | null;

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
     * Handler for changing temperature
     */
    onTemperatureChange?: (temperature: number) => void;

    /**
     * Current temperature value
     */
    temperature?: number;

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
     * Handler for setting API key
     */
    onSetApiKey?: (key: string) => void;

    /**
     * Is API key valid
     */
    isApiKeyValid?: boolean | null;
}

/**
 * Redesigned AI Assistant Panel component with improved UX
 */
export default function AIAssistantPanel({
                                             isVisible,
                                             content,
                                             completionType,
                                             customPrompt,
                                             isLoading,
                                             isRegenerating = false,
                                             generatedResult,
                                             error,
                                             onClose,
                                             onCompletionTypeChange,
                                             onCustomPromptChange,
                                             onTemperatureChange,
                                             temperature = 0.7,
                                             onGenerate,
                                             onApply,
                                             onRegenerate,
                                             onSetApiKey,
                                             isApiKeyValid = null,
                                         }: AIAssistantPanelProps) {
    // State for API key input
    const [apiKey, setApiKey] = useState('');

    // State for copy button
    const [copied, setCopied] = useState(false);

    // State for advanced settings and suggestions
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Refs for content and result
    const contentPreviewRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // Truncate text for display
    const truncateContent = (text: string, maxLength: number = 200): string => {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    };

    // Copy generated text to clipboard
    const handleCopy = () => {
        if (generatedResult?.text) {
            navigator.clipboard.writeText(generatedResult.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Scroll elements into view when they mount
    useEffect(() => {
        if (isVisible && resultRef.current && generatedResult) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isVisible, generatedResult]);

    // Reset copy state when result changes
    useEffect(() => {
        setCopied(false);
    }, [generatedResult]);

    // Sample writing suggestions based on content
    const getSuggestions = () => {
        // These would normally be generated dynamically based on content
        return [
            { type: AICompletionType.IMPROVE, label: 'Improve writing style' },
            { type: AICompletionType.EXPAND, label: 'Add more details' },
            { type: AICompletionType.SUMMARIZE, label: 'Create a summary' },
            { type: AICompletionType.FIX_GRAMMAR, label: 'Fix grammar and spelling' }
        ];
    };

    // Animation variants
    const panelVariants = {
        hidden: { opacity: 0, x: '100%' },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: '100%' },
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-end overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full sm:w-[450px] lg:w-[520px] bg-background border-l border-t sm:border rounded-tl-lg sm:rounded-lg shadow-2xl overflow-hidden sm:mr-6 sm:my-6 max-h-[90vh] flex flex-col h-[75vh]"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-primary/15 text-primary p-1.5 rounded-md">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-base">AI Assistant</h3>
                                    <p className="text-xs text-muted-foreground">Enhance your writing with AI</p>
                                </div>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={onClose}
                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Close</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-grow">
                            <div className="p-5 space-y-6">
                                {/* API key input if not valid */}
                                {isApiKeyValid === false && onSetApiKey && (
                                    <Card className="bg-muted/30 border-orange-200 dark:border-orange-800">
                                        <CardContent className="pt-4 pb-3">
                                            <h4 className="text-sm font-medium mb-2 flex items-center">
                                                <span className="text-orange-500 mr-2">⚠</span>
                                                Enter API Key
                                            </h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Your API key is required for AI features. It will be stored only in your browser.
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder="sk-..."
                                                    className="flex-grow p-2 text-sm rounded-md border focus:ring-1 focus:ring-primary/70 focus:border-primary/70"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => onSetApiKey(apiKey)}
                                                    className="gap-1"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5" />
                                                    <span>Save</span>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Action selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium">Select AI action</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2.5 text-xs rounded-full transition-colors",
                                                showSuggestions && "bg-primary/10 text-primary hover:bg-primary/15"
                                            )}
                                            onClick={() => setShowSuggestions(!showSuggestions)}
                                        >
                                            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                            <span>Suggestions</span>
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {showSuggestions && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-muted/30 p-3.5 rounded-md border mb-3.5">
                                                    <h5 className="text-xs font-medium mb-2.5">Suggestions based on your content</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {getSuggestions().map((suggestion, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors py-1"
                                                                onClick={() => onCompletionTypeChange(suggestion.type)}
                                                            >
                                                                {suggestion.label}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Tabs
                                        defaultValue={completionType}
                                        value={completionType}
                                        onValueChange={(value) => onCompletionTypeChange(value as AICompletionType)}
                                        className="w-full"
                                    >
                                        <TabsList className="w-full grid grid-cols-4 h-9">
                                            <TabsTrigger value={AICompletionType.COMPLETE} className="text-xs">
                                                Complete
                                            </TabsTrigger>
                                            <TabsTrigger value={AICompletionType.IMPROVE} className="text-xs">
                                                Improve
                                            </TabsTrigger>
                                            <TabsTrigger value={AICompletionType.SUMMARIZE} className="text-xs">
                                                Summarize
                                            </TabsTrigger>
                                            <TabsTrigger value={AICompletionType.CUSTOM} className="text-xs">
                                                Custom
                                            </TabsTrigger>
                                        </TabsList>
                                        <div className="flex mt-2.5">
                                            <TabsList className="h-auto bg-transparent p-0">
                                                <TabsTrigger
                                                    value={AICompletionType.EXPAND}
                                                    className="text-xs mr-1.5 h-7 px-3 rounded-full border"
                                                    data-state={completionType === AICompletionType.EXPAND ? "active" : "inactive"}
                                                >
                                                    Expand
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value={AICompletionType.REPHRASE}
                                                    className="text-xs mr-1.5 h-7 px-3 rounded-full border"
                                                    data-state={completionType === AICompletionType.REPHRASE ? "active" : "inactive"}
                                                >
                                                    Rephrase
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value={AICompletionType.FIX_GRAMMAR}
                                                    className="text-xs h-7 px-3 rounded-full border"
                                                    data-state={completionType === AICompletionType.FIX_GRAMMAR ? "active" : "inactive"}
                                                >
                                                    Fix Grammar
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                    </Tabs>

                                    <p className="text-xs text-muted-foreground">
                                        {getCompletionTypeDescription(completionType)}
                                    </p>
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
                                            className="min-h-[80px] text-sm resize-none focus:ring-1 focus:ring-primary/70"
                                        />
                                    </div>
                                )}

                                {/* Content preview */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium flex items-center">
                                            Content to process
                                        </h4>
                                        <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                            {content.length} characters
                                        </p>
                                    </div>
                                    <div
                                        ref={contentPreviewRef}
                                        className="p-3.5 bg-muted/30 rounded-md border text-sm max-h-32 overflow-y-auto break-words whitespace-pre-wrap"
                                    >
                                        {content ? truncateContent(content, 300) : (
                                            <span className="text-muted-foreground italic">No text selected. AI will use the current cursor position.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Advanced settings */}
                                <Collapsible
                                    open={showAdvancedSettings}
                                    onOpenChange={setShowAdvancedSettings}
                                    className="border rounded-md overflow-hidden transition-shadow"
                                >
                                    <CollapsibleTrigger asChild>
                                        <div
                                            className={cn(
                                                "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors",
                                                showAdvancedSettings && "bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Advanced settings</span>
                                            </div>
                                            <ChevronRight
                                                className={`w-4 h-4 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-90' : ''}`}
                                            />
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="p-4 border-t space-y-4 bg-muted/10">
                                            {/* Temperature setting */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label htmlFor="temperature" className="text-sm">Temperature</label>
                                                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-full">
                            {temperature.toFixed(1)}
                          </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-xs text-muted-foreground">Precise</span>
                                                    <Slider
                                                        id="temperature"
                                                        min={0}
                                                        max={1}
                                                        step={0.1}
                                                        value={[temperature]}
                                                        onValueChange={(value) => onTemperatureChange?.(value[0])}
                                                        className="flex-grow"
                                                    />
                                                    <span className="text-xs text-muted-foreground">Creative</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Higher values make output more creative but less predictable
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Error message */}
                                {error && (
                                    <div className="p-4 bg-destructive/10 border-destructive/20 border rounded-md text-sm text-destructive">
                                        <p className="font-medium mb-1">Error</p>
                                        <p>{error.message}</p>
                                    </div>
                                )}

                                {/* Generated content */}
                                {generatedResult && (
                                    <div ref={resultRef} className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium flex items-center">
                                                Generated content
                                                <span className="ml-2 inline-flex h-2 w-2 bg-emerald-400 rounded-full"></span>
                                            </h4>
                                            <div className="flex gap-1.5">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-full hover:bg-primary/10"
                                                                onClick={handleCopy}
                                                            >
                                                                {copied ?
                                                                    <Check className="h-3.5 w-3.5 text-emerald-500" /> :
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                }
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" align="center">
                                                            {copied ? "Copied!" : "Copy to clipboard"}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                {onRegenerate && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-full hover:bg-primary/10"
                                                                    onClick={onRegenerate}
                                                                    disabled={isRegenerating}
                                                                >
                                                                    {isRegenerating ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" align="center">
                                                                {isRegenerating ? "Regenerating..." : "Regenerate content"}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-md text-sm max-h-[250px] overflow-y-auto break-words whitespace-pre-wrap shadow-sm">
                                            {generatedResult.text}
                                        </div>

                                        {/* Metadata */}
                                        {generatedResult.metadata && (
                                            <p className="text-xs text-muted-foreground flex items-center">
                        <span className="bg-muted/50 px-2 py-0.5 rounded-full mr-2">
                          {generatedResult.metadata.model}
                        </span>
                                                {generatedResult.usage && (
                                                    <span className="bg-muted/50 px-2 py-0.5 rounded-full">
                            {generatedResult.usage.total_tokens} tokens
                          </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Footer with buttons */}
                        <div className="p-4 border-t flex justify-between items-center gap-3 bg-muted/20">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                                className="min-w-[80px]"
                            >
                                Cancel
                            </Button>

                            {generatedResult ? (
                                <Button
                                    onClick={() => onApply(generatedResult.text)}
                                    className="gap-1.5 px-4 bg-primary/90 hover:bg-primary"
                                >
                                    <span>Insert</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={onGenerate}
                                    disabled={isLoading || isApiKeyValid === false || (completionType === AICompletionType.CUSTOM && !customPrompt.trim())}
                                    className="gap-1.5 min-w-[120px] bg-primary/90 hover:bg-primary"
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