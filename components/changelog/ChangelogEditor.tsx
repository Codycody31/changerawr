import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { useDebounce } from 'use-debounce';
import { toast } from "@/hooks/use-toast";
import EditorHeader from '@/components/changelog/editor/EditorHeader';

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

const formatTagName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export function ChangelogEditor({
                                    projectId,
                                    entryId,
                                    isNewChangelog = false,
                                    initialPublishedStatus = false,
                                }: ChangelogEditorProps) {
    const router = useRouter();

    // Combined state to reduce individual updates
    const [editorState, setEditorState] = useState<EditorState>({
        title: '',
        content: '',
        version: '',
        tags: [],
        isPublished: initialPublishedStatus,
        hasUnsavedChanges: false
    });

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveError, setLastSaveError] = useState<string | null>(null);

    // Debounced state for autosave
    const [debouncedState] = useDebounce(editorState, 1000);

    // Fetch all necessary data in parallel
    const { data: initialData } = useQuery({
        queryKey: ['changelog-init', projectId, entryId],
        queryFn: async () => {
            const [projectResponse, tagsResponse, entryResponse] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/projects/${projectId}/changelog/tags`),
                entryId ? fetch(`/api/projects/${projectId}/changelog/${entryId}`) : Promise.resolve(null)
            ]);

            const project = await projectResponse.json();
            const tags = await tagsResponse.json();
            const entry = entryResponse ? await entryResponse.json() : null;

            return { project, tags, entry };
        }
    });

    // Process tags and available options
    const { availableTags, mappedDefaultTags } = useMemo(() => {
        if (!initialData) return { availableTags: [], mappedDefaultTags: [] };

        const { project, tags } = initialData;
        const defaultTags = project.defaultTags || [];
        const tagMap = new Map<string, Tag>();
        const defaultTagObjects: Tag[] = [];

        // Process existing tags
        tags.forEach(tag => {
            const formattedName = formatTagName(tag.name);
            tagMap.set(formattedName.toLowerCase(), {
                ...tag,
                name: formattedName
            });
        });

        // Process default tags
        defaultTags.forEach(defaultTag => {
            const formattedName = formatTagName(defaultTag);
            const lowercaseName = formattedName.toLowerCase();

            if (tagMap.has(lowercaseName)) {
                defaultTagObjects.push(tagMap.get(lowercaseName)!);
            } else {
                const newTag: Tag = {
                    id: `default-${lowercaseName}`,
                    name: formattedName
                };
                tagMap.set(lowercaseName, newTag);
                defaultTagObjects.push(newTag);
            }
        });

        return {
            availableTags: Array.from(tagMap.values()),
            mappedDefaultTags: defaultTagObjects
        };
    }, [initialData]);

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
            name: formatTagName(tag.name)
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

            const tagData = data.tags.map(tag =>
                tag.id.startsWith('default-')
                    ? { name: formatTagName(tag.name) }
                    : { id: tag.id }
            );

            const response = await fetch(url, {
                method: entryId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    tags: tagData
                })
            });

            if (!response.ok) throw new Error('Failed to save entry');
            return response.json();
        }
    });

    // Handlers
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
            tags: newTags.map(tag => ({
                ...tag,
                name: formatTagName(tag.name)
            })),
            hasUnsavedChanges: true
        }));
    }, []);

    const handleSave = useCallback(async () => {
        if (!editorState.title || !editorState.content) return;

        setIsSaving(true);
        setLastSaveError(null);

        try {
            const result = await saveEntry.mutateAsync({
                title: editorState.title,
                content: editorState.content,
                version: editorState.version,
                tags: editorState.tags
            });

            if (!entryId) {
                router.replace(`/dashboard/projects/${projectId}/changelog/${result.id}`);
            }

            setEditorState(prev => ({
                ...prev,
                hasUnsavedChanges: false
            }));

            toast({
                title: "Changes saved",
                description: "Your changes have been saved successfully."
            });
        } catch (error: unknown) {
            console.error((error as Error).stack);
            setLastSaveError('Failed to save changes. Please try again.');
            toast({
                title: "Save failed",
                description: "There was an error saving your changes.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    }, [editorState, entryId, projectId, router, saveEntry]);

    // Autosave effect
    useEffect(() => {
        if (!debouncedState.hasUnsavedChanges || !debouncedState.title || !debouncedState.content) return;
        handleSave();
    }, [debouncedState, handleSave]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <EditorHeader
                title={editorState.title}
                isSaving={isSaving}
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