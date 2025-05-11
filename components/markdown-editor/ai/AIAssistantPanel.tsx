'use client';

import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
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
} from 'lucide-react';

import {AICompletionType, AIEditorResult} from '@/lib/utils/ai/types';
import {
    getCompletionTypeDescription
} from '@/lib/utils/ai/prompts';

import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Slider} from '@/components/ui/slider';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
            resultRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
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
            {type: AICompletionType.IMPROVE, label: 'Improve writing style'},
            {type: AICompletionType.EXPAND, label: 'Add more details'},
            {type: AICompletionType.SUMMARIZE, label: 'Create a summary'},
            {type: AICompletionType.FIX_GRAMMAR, label: 'Fix grammar and spelling'}
        ];
    };

    // Animation variants
    const panelVariants = {
        hidden: {opacity: 0, x: '100%'},
        visible: {opacity: 1, x: 0},
        exit: {opacity: 0, x: '100%'},
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 bg-black/20 dark:bg-black/50 z-50 flex items-center justify-end overflow-hidden"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full sm:w-[450px] lg:w-[500px] bg-background border-l border-t sm:border rounded-tl-lg sm:rounded-lg shadow-xl overflow-hidden sm:mr-4 sm:my-4 max-h-[90vh] flex flex-col h-[75vh]"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{type: "spring", damping: 25, stiffness: 250}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 text-primary p-1.5 rounded-md">
                                    <Bot className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h3 className="font-medium text-base">AI Assistant</h3>
                                    <p className="text-xs text-muted-foreground">Enhance your writing with AI</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8"
                            >
                                <X className="w-4 h-4"/>
                            </Button>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-grow">
                            <div className="p-4 space-y-5">
                                {/* API key input if not valid */}
                                {isApiKeyValid === false && onSetApiKey && (
                                    <Card className="bg-muted/30">
                                        <CardContent className="pt-4 pb-3">
                                            <h4 className="text-sm font-medium mb-2">Enter API Key</h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Your API key is required for AI features. It will be stored only in your
                                                browser.
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
                                                    Save
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
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setShowSuggestions(!showSuggestions)}
                                        >
                                            <Lightbulb className="w-3.5 h-3.5 mr-1"/>
                                            <span>Suggestions</span>
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {showSuggestions && (
                                            <motion.div
                                                initial={{height: 0, opacity: 0}}
                                                animate={{height: 'auto', opacity: 1}}
                                                exit={{height: 0, opacity: 0}}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-muted/30 p-3 rounded-md border mb-3">
                                                    <h5 className="text-xs font-medium mb-2">Suggestions based on your
                                                        content</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {getSuggestions().map((suggestion, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-muted transition-colors"
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
                                        <div className="flex mt-2">
                                            <TabsList>
                                            <TabsTrigger
                                                value={AICompletionType.EXPAND}
                                                className="text-xs mr-1 h-7 px-2 rounded-md"
                                                data-state={completionType === AICompletionType.EXPAND ? "active" : "inactive"}
                                            >
                                                Expand
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value={AICompletionType.REPHRASE}
                                                className="text-xs mr-1 h-7 px-2 rounded-md"
                                                data-state={completionType === AICompletionType.REPHRASE ? "active" : "inactive"}
                                            >
                                                Rephrase
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value={AICompletionType.FIX_GRAMMAR}
                                                className="text-xs h-7 px-2 rounded-md"
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
                                    className="min-h-[80px] text-sm resize-none"
                                />
                            </div>
                        )}

                        {/* Content preview */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Content to process</h4>
                                <p className="text-xs text-muted-foreground">
                                    {content.length} characters
                                </p>
                            </div>
                            <div
                                ref={contentPreviewRef}
                                className="p-3 bg-muted/30 rounded-md border text-sm max-h-32 overflow-y-auto break-words whitespace-pre-wrap"
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
                            className="border rounded-md overflow-hidden"
                        >
                            <CollapsibleTrigger asChild>
                                <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-muted-foreground"/>
                                        <span className="text-sm font-medium">Advanced settings</span>
                                    </div>
                                    <ChevronRight
                                        className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                                    />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="p-3 border-t space-y-4">
                                    {/* Temperature setting */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="temperature" className="text-sm">Temperature</label>
                                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {temperature.toFixed(1)}
                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                        <p className="text-xs text-muted-foreground">
                                            Higher values make output more creative but less predictable
                                        </p>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Error message */}
                        {error && (
                            <div
                                className="p-3 bg-destructive/10 border-destructive/20 border rounded-md text-sm text-destructive">
                                <p className="font-medium">Error</p>
                                <p>{error.message}</p>
                            </div>
                        )}

                        {/* Generated content */}
                        {generatedResult && (
                            <div ref={resultRef} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Generated content</h4>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={handleCopy}
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5"/> :
                                                <Copy className="h-3.5 w-3.5"/>}
                                        </Button>
                                        {onRegenerate && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={onRegenerate}
                                                title="Regenerate"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5"/>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm max-h-[200px] overflow-y-auto break-words whitespace-pre-wrap">
                                    {generatedResult.text}
                                </div>

                                {/* Metadata */}
                                {generatedResult.metadata && (
                                    <p className="text-xs text-muted-foreground">
                                        Generated with {generatedResult.metadata.model}
                                        {generatedResult.usage && ` • ${generatedResult.usage.total_tokens} tokens`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

            {/* Footer with buttons */}
            <div className="p-4 border-t flex justify-between items-center gap-2 bg-muted/10">
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
                        className="gap-1"
                    >
                        <span>Insert</span>
                        <ArrowRight className="w-4 h-4"/>
                    </Button>
                ) : (
                    <Button
                        onClick={onGenerate}
                        disabled={isLoading || isApiKeyValid === false || (completionType === AICompletionType.CUSTOM && !customPrompt.trim())}
                        className="gap-1 min-w-[120px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin"/>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4"/>
                                <span>Generate</span>
                            </>
                        )}
                    </Button>
                )}
            </div>
        </motion.div>
</motion.div>
)
}
</AnimatePresence>
)
;
}