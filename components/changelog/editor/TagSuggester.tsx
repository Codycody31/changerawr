import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagSuggesterProps {
    content: string;
    availableTags: Tag[];
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    projectId: string;
    apiKey?: string;
    changelogTaggerConfigured?: boolean;
}

export default function TagSuggester({
    content,
    availableTags,
    selectedTags,
    onTagsChange,
    projectId,
    apiKey,
    changelogTaggerConfigured = false,
}: TagSuggesterProps) {
    const [isLoading, setIsLoading]     = useState(false);
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [error, setError]             = useState<string | null>(null);
    const [isOpen, setIsOpen]           = useState(false);

    const canSuggest = (!!apiKey || changelogTaggerConfigured) && content.trim().length > 10;

    const analyzeContent = async () => {
        if (!canSuggest) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/suggest-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    tags: availableTags.map(t => t.name),
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to get suggestions');
            }

            const { tags: suggestedNames } = await res.json();

            // Only suggest tags that already exist in this project
            const results: Tag[] = [];
            for (const name of suggestedNames as string[]) {
                const existing = availableTags.find(
                    t => t.name.toLowerCase() === name.toLowerCase()
                );
                if (existing) results.push(existing);
            }

            if (results.length === 0) {
                setError('No suitable tags found for this content.');
            } else {
                setSuggestions(results);
                setIsOpen(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyse content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTag = (tag: Tag) => {
        const isSelected = selectedTags.some(t => t.id === tag.id);
        onTagsChange(
            isSelected
                ? selectedTags.filter(t => t.id !== tag.id)
                : [...selectedTags, tag]
        );
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
                            disabled={isLoading || !canSuggest}
                            onClick={!isOpen ? analyzeContent : undefined}
                        >
                            {isLoading
                                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                : <Sparkles className="h-4 w-4 mr-1" />}
                            <span className="hidden sm:inline">Suggest Tags</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {canSuggest ? 'Suggest tags with AI' : 'No AI service configured'}
                    </TooltipContent>
                </Tooltip>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-4" align="end">
                <p className="text-sm font-medium mb-3">Suggested tags</p>

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
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Badge
                                                variant={isSelected ? 'default' : 'outline'}
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
                        <p className="text-xs text-muted-foreground">Click a tag to toggle it.</p>
                    </>
                )}

                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => { setIsOpen(false); setSuggestions([]); setError(null); }}
                >
                    Close
                </Button>
            </PopoverContent>
        </Popover>
    );
}
