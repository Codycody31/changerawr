// components/changelog/editor/TagSelector.tsx
import React, {useState, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {Tags, Check, Plus, Sparkles, Loader2, X, AlertCircle, CheckCircle, Palette, Lightbulb, ThumbsUp, ThumbsDown, Info} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { renderToTailwind } from '@changerawr/markdown';
import {Separator} from '@/components/ui/separator';
import {Badge} from "@/components/ui/badge";
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip';
import {Input} from '@/components/ui/input';
import {ColorPicker, ColoredTag} from '@/components/changelog/editor/TagColorPicker';
import {TAG_COLOR_OPTIONS} from '@/lib/types/changelog';

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagSelectorProps {
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    content?: string;
    aiApiKey?: string;
    changelogTaggerConfigured?: boolean;
    projectId: string;
}

// Tag suggestions shown when no tags exist - hardcoded suggestions
interface TagSuggestion {
    name: string;
    colorValue: string; // Reference to TAG_COLOR_OPTIONS value
}

const TAG_SUGGESTIONS: TagSuggestion[] = [
    {name: 'Feature', colorValue: 'green'},
    {name: 'Bug Fixes', colorValue: 'red'},
    {name: 'Improvement', colorValue: 'blue'},
    {name: 'Other', colorValue: 'gray'},
];


export default function TagSelector({
                                        selectedTags,
                                        availableTags,
                                        onTagsChange,
                                        content = '',
                                        aiApiKey,
                                        changelogTaggerConfigured = false,
                                        projectId
                                    }: TagSelectorProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState<string | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // AI suggestion state
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
    const [tagSynopses, setTagSynopses] = useState<Record<string, string>>({});
    const [tagFeedback, setTagFeedback] = useState<Record<string, 'up' | 'down'>>({});
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Filter tags based on search
    const filteredTags = search
        ? availableTags.filter(tag =>
            tag.name.toLowerCase().includes(search.toLowerCase()))
        : availableTags;

    // Calculate which suggested tags haven't been selected yet
    const unselectedSuggestions = suggestedTags.filter(
        tag => !selectedTags.some(selected => selected.id === tag.id)
    );

    const submitFeedback = useCallback((confirmedTags: Tag[]) => {
        if (!changelogTaggerConfigured || !content || confirmedTags.length === 0) return;
        fetch('/api/ai/tag-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, tags: confirmedTags.map(t => t.name) }),
        }).catch(() => {});
    }, [content, changelogTaggerConfigured]);

    const applyAllSuggestions = () => {
        const toApply = unselectedSuggestions.filter(t => t.id && tagFeedback[t.id] !== 'down');
        if (toApply.length === 0) return;
        const newTags = [...selectedTags, ...toApply].filter(t => !!t.id);
        onTagsChange(newTags);
        submitFeedback(toApply);
    };

    const handleFeedback = useCallback((tag: Tag, vote: 'up' | 'down') => {
        setTagFeedback(prev => ({ ...prev, [tag.id]: vote }));
        if (vote === 'up') submitFeedback([tag]);
        if (vote === 'down' && selectedTags.some(t => t.id === tag.id)) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        }
    }, [submitFeedback, selectedTags, onTagsChange]);

    // Handle creating a new tag with color support
    const handleCreateTag = useCallback(async (name: string, color?: string | null) => {
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    color: color !== undefined ? color : newTagColor
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create tag');
            }

            const newTag = await response.json();

            // Add new tag to selected tags
            onTagsChange([...selectedTags, newTag]);

            // Reset form
            setSearch('');
            setNewTagName('');
            setNewTagColor(null);
            setShowColorPicker(false);
        } catch (error) {
            console.error('Error creating tag:', error);
        } finally {
            setIsCreating(false);
        }
    }, [projectId, selectedTags, onTagsChange, newTagColor]);

    const canSuggest = (!!aiApiKey || changelogTaggerConfigured) && content.trim().length > 10;

    const generateTagSuggestions = useCallback(async () => {
        if (!canSuggest) {
            setSuggestionError('Cannot generate suggestions without content or available tags');
            return;
        }

        setIsGenerating(true);
        setSuggestionError(null);

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
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to get tag suggestions');
            }

            const { tags: suggestedNames, synopsis = {} } = await res.json();

            const results: Tag[] = [];
            for (const name of suggestedNames as string[]) {
                const existing = availableTags.find(t => t.name.toLowerCase() === name.toLowerCase());
                if (existing) results.push(existing);
                // No match → silently skip; never create tags without explicit user action
            }

            if (results.length === 0) {
                setSuggestionError('Could not generate suitable tag suggestions');
            } else {
                setSuggestedTags(results);
                setTagSynopses(synopsis as Record<string, string>);
                setTagFeedback({});
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error('[TagSelector] suggest-tags error:', err);
            setSuggestionError(err instanceof Error ? err.message : 'Failed to analyze content');
        } finally {
            setIsGenerating(false);
        }
    }, [content, availableTags, canSuggest]);

    // Toggle tag selection
    const toggleTag = useCallback((tag: Tag) => {
        if (!tag.id) return;
        const isSelected = selectedTags.some(t => t.id === tag.id);
        if (isSelected) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        } else {
            onTagsChange([...selectedTags.filter(t => !!t.id), tag]);
        }
    }, [selectedTags, onTagsChange]);

    // Clear all selected tags
    const clearTags = () => {
        if (selectedTags.length === 0) return;
        onTagsChange([]);
    };

    return (
        <>
        <TooltipProvider>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 border-dashed">
                        <Tags className="mr-2 h-4 w-4"/>
                        {selectedTags?.length > 0 ? (
                            <>
                                <span className="hidden md:inline-block">
                                  {selectedTags.length} selected
                                </span>
                                <Separator orientation="vertical" className="mx-2 h-4"/>
                            </>
                        ) : (
                            <span className="hidden md:inline-block">Select tags</span>
                        )}
                        <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                        >
                            {selectedTags?.length}
                        </Badge>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 rounded-t-none" align="start">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                        <div className="flex items-center gap-2">
                            <Tags className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-sm font-medium">Tags</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2"
                                        onClick={clearTags}
                                        disabled={selectedTags.length === 0}
                                    >
                                        <X className="h-3.5 w-3.5 mr-1"/>
                                        <span className="text-xs">Clear</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Clear all selected tags</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <Command className="[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:flex-1">
                        {/* Search row */}
                        <div className="flex items-center px-1 py-1">
                            <CommandInput
                                placeholder="Search tags..."
                                value={search}
                                onValueChange={setSearch}
                                className="flex-1"
                            />
                            {canSuggest && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            disabled={isGenerating}
                                            onClick={generateTagSuggestions}
                                        >
                                            {isGenerating
                                                ? <Loader2 className="h-4 w-4 animate-spin"/>
                                                : <Sparkles className="h-4 w-4"/>}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Suggest tags</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <CommandList className="scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* AI Suggestions */}
                            <AnimatePresence>
                                {showSuggestions && suggestedTags.length > 0 && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        transition={{duration: 0.15}}
                                        className="overflow-hidden"
                                    >
                                        {/* Section header */}
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-y border-border/60">
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles className="h-3 w-3 text-primary"/>
                                                <span className="text-xs font-semibold text-foreground">AI Suggestions</span>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                {unselectedSuggestions.length > 0 && (
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={applyAllSuggestions}>
                                                        <CheckCircle className="h-3 w-3 mr-1"/>
                                                        Apply all
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowSuggestions(false)}>
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Tag rows */}
                                        <div className="divide-y divide-border/40 border-b border-border/60">
                                            {suggestedTags.map((tag) => {
                                                const isSelected = selectedTags.some(t => t.id === tag.id);
                                                const hasSynopsis = !!tagSynopses[tag.name];
                                                const fb = tagFeedback[tag.id];
                                                return (
                                                    <div key={tag.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                                                        {/* Toggle checkbox */}
                                                        <button
                                                            onClick={() => toggleTag(tag)}
                                                            className={cn(
                                                                'flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                                                isSelected
                                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                                    : 'border-border hover:border-primary/50'
                                                            )}
                                                        >
                                                            {isSelected && <Check className="h-2.5 w-2.5"/>}
                                                        </button>

                                                        {/* Color dot + tag name */}
                                                        <span className="flex items-center gap-1.5 flex-1 cursor-pointer select-none" onClick={() => toggleTag(tag)}>
                                                            {tag.color && (
                                                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }}/>
                                                            )}
                                                            <span className="text-sm">{tag.name}</span>
                                                        </span>

                                                        {/* Info hover — tagger only */}
                                                        {hasSynopsis && changelogTaggerConfigured && (
                                                            <HoverCard openDelay={200} closeDelay={100}>
                                                                <HoverCardTrigger asChild>
                                                                    <button className="flex-shrink-0 text-blue-500 hover:text-blue-400 transition-colors">
                                                                        <Info className="h-3.5 w-3.5"/>
                                                                    </button>
                                                                </HoverCardTrigger>
                                                                <HoverCardContent side="left" className="w-64 text-sm p-3">
                                                                    <p className="text-xs font-medium mb-1.5 text-foreground">Why this tag?</p>
                                                                    <div
                                                                        className="text-xs text-muted-foreground leading-relaxed"
                                                                        dangerouslySetInnerHTML={{ __html: renderToTailwind(tagSynopses[tag.name]) }}
                                                                    />
                                                                </HoverCardContent>
                                                            </HoverCard>
                                                        )}

                                                        {/* Feedback — tagger only */}
                                                        {changelogTaggerConfigured && <div className="flex items-center flex-shrink-0">
                                                            <button
                                                                onClick={() => handleFeedback(tag, 'up')}
                                                                className={cn('h-6 w-6 rounded flex items-center justify-center transition-colors', fb === 'up' ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-500')}
                                                            >
                                                                <ThumbsUp className="h-3 w-3"/>
                                                            </button>
                                                            <span className="text-muted-foreground/30 text-xs select-none px-0.5">/</span>
                                                            <button
                                                                onClick={() => handleFeedback(tag, 'down')}
                                                                className={cn('h-6 w-6 rounded flex items-center justify-center transition-colors', fb === 'down' ? 'text-red-500' : 'text-muted-foreground/40 hover:text-red-500')}
                                                            >
                                                                <ThumbsDown className="h-3 w-3"/>
                                                            </button>
                                                        </div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {suggestionError && (
                                <div className="px-2 py-2 text-xs text-destructive flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                                    <span>{suggestionError}</span>
                                </div>
                            )}

                            <CommandEmpty>
                                <div className="py-3 px-4 text-center text-sm">
                                    {!search && availableTags.length === 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-center gap-2 pb-2">
                                                <Lightbulb className="h-4 w-4 text-yellow-500"/>
                                                <p className="text-sm font-medium text-foreground">Quick start tags</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {TAG_SUGGESTIONS.map((suggestion) => {
                                                    const colorOption = TAG_COLOR_OPTIONS.find(opt => opt.value === suggestion.colorValue);
                                                    return (
                                                        <button
                                                            key={suggestion.name}
                                                            onClick={() => {
                                                                handleCreateTag(suggestion.name, colorOption?.color || null);
                                                            }}
                                                            className="group transition-all hover:scale-105"
                                                        >
                                                            <ColoredTag
                                                                name={suggestion.name}
                                                                color={colorOption?.color}
                                                                size="sm"
                                                                className="cursor-pointer opacity-70 group-hover:opacity-100"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {search && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">No tags found — create one:</p>
                                            <div className="flex gap-1.5">
                                                <Input
                                                    type="text"
                                                    value={newTagName || search}
                                                    onChange={(e) => setNewTagName(e.target.value)}
                                                    className="flex-1 h-8 text-sm"
                                                    placeholder="Tag name"
                                                />
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <ColorPicker
                                                        value={newTagColor}
                                                        onChange={setNewTagColor}
                                                        minimal
                                                        align="end"
                                                        showCustomInput
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0"
                                                        disabled={isCreating || !(newTagName || search).trim()}
                                                        onClick={() => handleCreateTag(newTagName || search)}
                                                    >
                                                        {isCreating
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                                            : <Plus className="h-3.5 w-3.5"/>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CommandEmpty>

                            <CommandGroup heading="Available Tags">
                                <div className="max-h-[200px] overflow-y-auto">
                                    {filteredTags.map((tag) => {
                                        const isSelected = selectedTags.some(
                                            (selectedTag) => selectedTag.id === tag.id
                                        );
                                        const isSuggested = suggestedTags.some(
                                            (suggestedTag) => suggestedTag.id === tag.id
                                        );

                                        return (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => toggleTag(tag)}
                                                className={cn(
                                                    isSuggested && !isSelected && "bg-primary/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "mr-2 h-4 w-4 flex items-center justify-center rounded-sm",
                                                    isSelected ? "bg-primary text-primary-foreground" : "border border-primary/20"
                                                )}>
                                                    {isSelected && <Check className="h-3 w-3"/>}
                                                </div>

                                                {tag.color && (
                                                    <div
                                                        className="h-3 w-3 rounded-full border border-gray-300 mr-2"
                                                        style={{backgroundColor: tag.color}}
                                                    />
                                                )}

                                                <span className="flex-1">{tag.name}</span>
                                                <div className="flex items-center gap-1">
                                                    {isSuggested && !isSelected && (
                                                        <Badge variant="outline"
                                                               className="ml-auto text-xs bg-primary/10">
                                                            Suggested
                                                        </Badge>
                                                    )}
                                                    {isSelected && (
                                                        <Badge variant="default" className="ml-auto text-xs">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </div>
                            </CommandGroup>

                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </TooltipProvider>

            {/* Synopsis modal */}
        </>
    );
}