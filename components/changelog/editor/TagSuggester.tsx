import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';

interface Tag {
    id: string;
    name: string;
}

interface TagSuggesterProps {
    content: string;
    availableTags: Tag[];
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    apiKey?: string;
}

export default function TagSuggester({
                                         content,
                                         availableTags,
                                         selectedTags,
                                         onTagsChange,
                                         apiKey
                                     }: TagSuggesterProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const analyzeContent = async () => {
        if (!content || !apiKey || !availableTags.length) {
            setError('Cannot generate suggestions without content or available tags');
            return;
        }

        if (content.trim().length < 20) {
            setError('Content is too short for meaningful tag suggestions');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Prepare prompt for the AI
            const tagNames = availableTags.map(tag => tag.name).join(', ');
            const prompt = `
I need to categorize the following changelog content with appropriate tags.
Available tags: ${tagNames}

Based on the content, which tags (maximum 3) would be most relevant? 
Only respond with tags from the provided list above, separated by commas.
Do not add any explanations, just return the tag names.

Content to analyze:
${content.substring(0, 1000)}
      `.trim();

            // Call AI API
            const response = await fetch('https://api.secton.org/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'copilot-zero',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a skilled content tagger for a changelog system. Your job is to select the most appropriate tags for content.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 100
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get tag suggestions');
            }

            const result = await response.json();
            console.log('AI Response:', JSON.stringify(result, null, 2));
            const suggestedTagsText = result.messages[result.messages.length - 1]?.content || '';

            // Process the AI's response
            const suggestedTagNames = suggestedTagsText
                .split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean);

            // Map the suggested tag names to actual tag objects
            const validSuggestions = suggestedTagNames
                .map((name: string) => {
                    // Find case-insensitive match
                    return availableTags.find(tag =>
                        tag.name.toLowerCase() === name.toLowerCase()
                    );
                })
                .filter(Boolean) as Tag[];

            if (validSuggestions.length === 0) {
                setError('Could not generate suitable tag suggestions');
            } else {
                setSuggestions(validSuggestions);
                setIsOpen(true);
            }
        } catch (err) {
            console.error('Error suggesting tags:', err);
            setError(err instanceof Error ? err.message : 'Failed to analyze content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTag = (tag: Tag) => {
        // Check if tag is already selected
        const isSelected = selectedTags.some(t => t.id === tag.id);

        if (isSelected) {
            // Remove tag if already selected
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        } else {
            // Add tag if not selected
            onTagsChange([...selectedTags, tag]);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={isLoading || !apiKey}
                            onClick={!isOpen ? analyzeContent : undefined}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">Suggest Tags</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{apiKey ? 'AI-powered tag suggestions' : 'AI features not available'}</TooltipContent>
                </Tooltip>
            </PopoverTrigger>

            <PopoverContent className="w-[250px] p-4" align="end">
                <h4 className="text-sm font-medium mb-2">Suggested Tags</h4>

                {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <AnimatePresence>
                                {suggestions.map(tag => {
                                    const isSelected = selectedTags.some(t => t.id === tag.id);

                                    return (
                                        <motion.div
                                            key={tag.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Badge
                                                variant={isSelected ? "default" : "outline"}
                                                className="cursor-pointer flex items-center gap-1"
                                                onClick={() => handleSelectTag(tag)}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                                {tag.name}
                                            </Badge>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Click on a tag to add or remove it from your selection.
                        </p>
                    </>
                )}

                <div className="mt-3 flex justify-end">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                            setIsOpen(false);
                            setSuggestions([]);
                            setError(null);
                        }}
                    >
                        Close
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}