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

// AI prompt parameters
const MAX_CHARS_PER_SECTION = 500; // Characters per extracted section
const SECTIONS_TO_EXTRACT = 3;     // Number of sections to extract
const SECTIONS_TO_ANALYZE = 3;     // Number of sections to actually send to AI

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

    /**
     * Extract meaningful sections from content optimized for tag detection
     * This approach samples from beginning, middle and end of the document
     * to get a better representation of the full content.
     */
    const extractContentSections = (text: string): string[] => {
        if (!text) return [];

        const cleanedText = text.trim();
        if (cleanedText.length <= MAX_CHARS_PER_SECTION * SECTIONS_TO_EXTRACT) {
            return [cleanedText]; // Return all content if it's short enough
        }

        const sections: string[] = [];

        // Extract beginning section (always include)
        sections.push(extractSection(cleanedText, 0, MAX_CHARS_PER_SECTION));

        // If there's more content, extract middle section
        if (cleanedText.length > MAX_CHARS_PER_SECTION * 2) {
            const middleStart = Math.floor(cleanedText.length / 2) - (MAX_CHARS_PER_SECTION / 2);
            sections.push(extractSection(cleanedText, middleStart, MAX_CHARS_PER_SECTION));
        }

        // If there's more content, extract ending section
        if (cleanedText.length > MAX_CHARS_PER_SECTION * 3) {
            const endStart = Math.max(0, cleanedText.length - MAX_CHARS_PER_SECTION);
            sections.push(extractSection(cleanedText, endStart, MAX_CHARS_PER_SECTION));
        }

        // Extract headings if there are any (often contains important context)
        const headingMatches = cleanedText.match(/#+\s+.*$/gm) || [];
        if (headingMatches.length > 0) {
            const headings = headingMatches.slice(0, 5).join('\n');
            if (headings.length > 0) {
                sections.push(`Key sections:\n${headings}`);
            }
        }

        return sections;
    };

    /**
     * Extract a section of content with intelligent boundaries
     */
    const extractSection = (text: string, startPos: number, length: number): string => {
        // Safety checks
        if (!text || startPos >= text.length) return '';

        // Find start at paragraph or sentence boundary if possible
        let actualStart = startPos;
        let actualEnd = Math.min(text.length, startPos + length);

        // If not starting at beginning, find a good start boundary
        if (startPos > 0) {
            // Try to find paragraph start
            const paraStart = text.lastIndexOf('\n\n', startPos) + 2;
            if (paraStart > 0 && paraStart < startPos && (startPos - paraStart) < length / 2) {
                actualStart = paraStart;
            } else {
                // Try to find sentence start
                const sentStart = text.lastIndexOf('. ', startPos) + 2;
                if (sentStart > 0 && sentStart < startPos && (startPos - sentStart) < length / 3) {
                    actualStart = sentStart;
                }
            }
        }

        // Find a good end boundary
        if (actualEnd < text.length) {
            // Try to find paragraph end
            const paraEnd = text.indexOf('\n\n', actualEnd - 20);
            if (paraEnd > 0 && paraEnd < (actualEnd + length / 3)) {
                actualEnd = paraEnd;
            } else {
                // Try to find sentence end
                const sentEnd = text.indexOf('. ', actualEnd - 20);
                if (sentEnd > 0 && sentEnd < (actualEnd + length / 4)) {
                    actualEnd = sentEnd + 1; // Include the period
                }
            }
        }

        // If this is not the beginning, add indication
        const prefix = actualStart > 0 ? '... ' : '';
        // If this is not the end, add indication
        const suffix = actualEnd < text.length ? ' ...' : '';

        return prefix + text.substring(actualStart, actualEnd) + suffix;
    };

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

            // Extract key sections from the content
            const contentSections = extractContentSections(content);

            // Limit number of sections if too many
            const sectionsToUse = contentSections.slice(0, SECTIONS_TO_ANALYZE);

            // Combine sections with section numbers for readability
            const formattedSections = sectionsToUse.map((section, index) =>
                `Section ${index + 1}:\n${section}`
            ).join('\n\n');

            const prompt = `
I need to categorize the following changelog content with appropriate tags.
Available tags: ${tagNames}

I'll provide key sections from the content below. Based on these sections, which tags (maximum 3) would be most relevant? 
Only respond with tags from the provided list above, separated by commas.
Do not add any explanations, just return the tag names.

${formattedSections}
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
                    max_tokens: 30 // Further reduced since we only need tag names
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to get tag suggestions, AI content: ${prompt}`);
            }

            const result = await response.json();
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