import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { useDebounce } from 'use-debounce';
import { toast } from "@/hooks/use-toast";
// Import the original component
import EditorHeader from '@/components/changelog/editor/EditorHeader';

// Create a wrapper component to extend functionality
const EnhancedEditorHeader: React.FC<React.ComponentProps<typeof EditorHeader> & {
    onLoadMoreTags?: () => Promise<unknown>;
}> = ({ onLoadMoreTags, availableTags, onTagsChange, ...otherProps }) => {
    // Create enhanced tags selection with load more functionality
    const handleTagsChange = (tags: Tag[]) => {
        onTagsChange(tags);
    };

    // Create a ref to track if we need to load more tags
    const tagsContainerRef = useRef<HTMLDivElement>(null);

    // Setup an effect to detect when we need to load more tags
    useEffect(() => {
        if (!onLoadMoreTags) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // If the last tag is visible and we have more to load, trigger loading
                if (entries[0].isIntersecting) {
                    onLoadMoreTags();
                }
            },
            { threshold: 0.5 }
        );

        if (tagsContainerRef.current) {
            observer.observe(tagsContainerRef.current);
        }

        return () => {
            if (tagsContainerRef.current) {
                observer.unobserve(tagsContainerRef.current);
            }
        };
    }, [onLoadMoreTags]);

    return (
        <>
            <EditorHeader
                {...otherProps}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
            />
            {/* Hidden container to trigger infinite loading */}
            {onLoadMoreTags && <div ref={tagsContainerRef} style={{ height: 1, opacity: 0 }} />}
        </>
    );
};

interface ChangelogEditorProps {
    projectId: string;
    entryId?: string;
    isNewChangelog?: boolean;
    initialPublishedStatus?: boolean;
}

interface Tag {
    id: string;
    name: string;
}

interface EditorState {
    title: string;
    content: string;
    version: string;
    tags: Tag[];
    isPublished: boolean;
    hasUnsavedChanges: boolean;
}

// API response interfaces
interface ProjectResponse {
    id: string;
    defaultTags: string[];
    // Add other project properties as needed
}

interface EntryResponse {
    id: string;
    title: string;
    content: string;
    version: string;
    tags: Tag[];
    publishedAt?: string;
    // Add other entry properties as needed
}

interface TagsResponse {
    tags: Tag[];
    pagination: {
        page: number;
        hasMore: boolean;
    };
}

// Constants for pagination and caching
const ITEMS_PER_PAGE = 20;
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const DEBOUNCE_TIME = 1000; // 1 second

// Import or extend the EditorHeader props instead of redefining them
// The actual component likely doesn't have the onLoadMoreTags prop in its interface

export function ChangelogEditor({
                                    projectId,
                                    entryId,
                                    isNewChangelog = false,
                                    initialPublishedStatus = false,
                                }: ChangelogEditorProps) {
    const router = useRouter();

    // Optimized state management
    const [editorState, setEditorState] = useState<EditorState>(() => ({
        title: '',
        content: '',
        version: '',
        tags: [],
        isPublished: initialPublishedStatus,
        hasUnsavedChanges: false
    }));

    // UI state with useRef for values that don't need re-renders
    const isSaving = useRef(false);
    const [lastSaveError, setLastSaveError] = useState<string | null>(null);
    const lastSavedStateRef = useRef<Omit<EditorState, 'isPublished' | 'hasUnsavedChanges'> | null>(null);
    const saveFailedRef = useRef(false);
    const isAutoSavingRef = useRef(false);

    // Debounced state for autosave
    const [debouncedState] = useDebounce(editorState, DEBOUNCE_TIME);

    // Optimized data fetching with react-query
    const { data: initialData, isLoading: isInitialDataLoading } = useQuery({
        queryKey: ['changelog-init', projectId, entryId],
        queryFn: async () => {
            const [projectResponse, entryResponse] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                entryId ? fetch(`/api/projects/${projectId}/changelog/${entryId}`) : Promise.resolve(null)
            ]);

            const project = await projectResponse.json() as ProjectResponse;
            const entry = entryResponse ? await entryResponse.json() as EntryResponse : null;

            return { project, entry };
        },
        staleTime: CACHE_TIME,
    });

    // Separate query for tags with pagination
    const {
        data: tagsData,
        fetchNextPage,
        hasNextPage,
        isLoading: isTagsLoading
    } = useInfiniteQuery<TagsResponse>({
        queryKey: ['changelog-tags', projectId],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await fetch(
                `/api/projects/${projectId}/changelog/tags?page=${pageParam}&limit=${ITEMS_PER_PAGE}`
            );
            return response.json();
        },
        getNextPageParam: (lastPage: TagsResponse) => {
            return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
        },
        staleTime: CACHE_TIME,
        initialPageParam: 0, // Add this to fix the missing initialPageParam error
    });

    // Memoized tags processing
    const { availableTags, mappedDefaultTags } = useMemo(() => {
        if (!initialData || !tagsData?.pages) {
            return { availableTags: [], mappedDefaultTags: [] };
        }

        const allTags = tagsData.pages.flatMap(page => page.tags);
        const { project } = initialData;
        const defaultTags = project.defaultTags || [];

        const tagMap = new Map<string, Tag>();
        const defaultTagObjects: Tag[] = [];

        const processTags = (tags: Tag[], isDefault = false) => {
            tags.forEach(tag => {
                const lowercaseName = tag.name.toLowerCase();
                if (!tagMap.has(lowercaseName)) {
                    tagMap.set(lowercaseName, tag);
                    if (isDefault) {
                        defaultTagObjects.push(tag);
                    }
                }
            });
        };

        processTags(allTags);
        processTags(defaultTags.map(name => ({
            id: `default-${name.toLowerCase()}`,
            name
        })), true);

        return {
            availableTags: Array.from(tagMap.values()),
            mappedDefaultTags: defaultTagObjects
        };
    }, [initialData, tagsData?.pages]);

    // Initialize editor state from fetched data
    useEffect(() => {
        if (!initialData) return;

        const { entry } = initialData;
        if (!entry) {
            if (isNewChangelog && mappedDefaultTags.length > 0) {
                setEditorState(prev => ({
                    ...prev,
                    tags: mappedDefaultTags,
                    hasUnsavedChanges: false
                }));
            }
            return;
        }

        const entryTags = entry.tags || [];
        const formattedTags = entryTags.map(tag => ({
            ...tag,
            name: tag.name.charAt(0).toUpperCase() + tag.name.slice(1).toLowerCase()
        }));

        setEditorState({
            title: entry.title || '',
            content: entry.content || '',
            version: entry.version || '',
            tags: formattedTags,
            isPublished: !!entry.publishedAt,
            hasUnsavedChanges: false
        });
    }, [initialData, isNewChangelog, mappedDefaultTags]);

    // Save mutation
    const saveEntry = useMutation({
        mutationFn: async (data: Omit<EditorState, 'isPublished' | 'hasUnsavedChanges'>) => {
            const url = entryId
                ? `/api/projects/${projectId}/changelog/${entryId}`
                : `/api/projects/${projectId}/changelog`;

            // Properly format tag data for the API
            const tagData = data.tags.map(tag =>
                tag.id.startsWith('default-')
                    ? { name: tag.name }
                    : { id: tag.id }  // Direct id property
            );

            const response = await fetch(url, {
                method: entryId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.title,
                    content: data.content,
                    version: data.version,
                    tags: tagData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save entry');
            }

            return response.json();
        }
    });

    // Optimized change handlers
    const handleContentChange = useCallback((newContent: string) => {
        setEditorState(prev => ({
            ...prev,
            content: newContent,
            hasUnsavedChanges: true
        }));
    }, []);

    const handleTitleChange = useCallback((newTitle: string) => {
        setEditorState(prev => ({
            ...prev,
            title: newTitle,
            hasUnsavedChanges: true
        }));
    }, []);

    const handleVersionChange = useCallback((newVersion: string) => {
        setEditorState(prev => ({
            ...prev,
            version: newVersion,
            hasUnsavedChanges: true
        }));
    }, []);

    const handleTagsChange = useCallback((newTags: Tag[]) => {
        setEditorState(prev => ({
            ...prev,
            tags: newTags,
            hasUnsavedChanges: true
        }));
    }, []);

    // Optimized save handler
    const handleSave = useCallback(async () => {
        if (isAutoSavingRef.current || saveFailedRef.current) return;

        const currentState = {
            title: editorState.title,
            content: editorState.content,
            version: editorState.version,
            tags: editorState.tags
        };

        const stateChanged = !lastSavedStateRef.current ||
            JSON.stringify(currentState) !== JSON.stringify(lastSavedStateRef.current);

        if (!stateChanged || !editorState.title || !editorState.content) return;

        isSaving.current = true;
        setLastSaveError(null);
        isAutoSavingRef.current = true;

        try {
            const result = await saveEntry.mutateAsync(currentState);

            if (!entryId) {
                router.replace(`/dashboard/projects/${projectId}/changelog/${result.id}`);
            }

            saveFailedRef.current = false;
            lastSavedStateRef.current = currentState;

            setEditorState(prev => ({
                ...prev,
                hasUnsavedChanges: false
            }));

            toast({
                title: "Changes saved",
                description: "Your changes have been saved successfully."
            });
        } catch (error) {
            console.error('Save error:', error);
            saveFailedRef.current = true;
            setLastSaveError('Failed to save changes. Please try again.');

            toast({
                title: "Save failed",
                description: "There was an error saving your changes.",
                variant: "destructive"
            });
        } finally {
            isSaving.current = false;
            isAutoSavingRef.current = false;
        }
    }, [editorState, entryId, projectId, router, saveEntry]);

    // Autosave effect
    useEffect(() => {
        if (saveFailedRef.current || !debouncedState.hasUnsavedChanges) return;

        const currentState = {
            title: debouncedState.title,
            content: debouncedState.content,
            version: debouncedState.version,
            tags: debouncedState.tags
        };

        const stateChanged = !lastSavedStateRef.current ||
            JSON.stringify(currentState) !== JSON.stringify(lastSavedStateRef.current);

        if (!stateChanged || !debouncedState.title || !debouncedState.content) return;

        const timeoutId = setTimeout(handleSave, 0);
        return () => clearTimeout(timeoutId);
    }, [debouncedState, handleSave]);

    if (isInitialDataLoading || isTagsLoading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <EnhancedEditorHeader
                title={editorState.title}
                isSaving={isSaving.current}
                hasUnsavedChanges={editorState.hasUnsavedChanges}
                lastSaveError={lastSaveError}
                onManualSave={handleSave}
                onBack={() => router.back()}
                isPublished={editorState.isPublished}
                projectId={projectId}
                entryId={entryId}
                version={editorState.version}
                onVersionChange={handleVersionChange}
                selectedTags={editorState.tags}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
                onLoadMoreTags={hasNextPage ? async () => {
                    await fetchNextPage();
                    return;
                } : undefined}
            />

            <div className="container py-6">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Entry Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Entry title"
                            value={editorState.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="text-lg font-medium"
                        />
                    </CardContent>
                </Card>

                <MarkdownEditor
                    key={entryId || 'new'}
                    initialValue={editorState.content}
                    onChange={handleContentChange}
                    placeholder="Write your changelog entry in Markdown..."
                    className="min-h-[500px]"
                    features={{
                        headings: true,
                        bold: true,
                        italic: true,
                        lists: true,
                        links: true,
                        code: true,
                        blockquotes: true,
                        tables: true
                    }}
                />
            </div>
        </div>
    );
}