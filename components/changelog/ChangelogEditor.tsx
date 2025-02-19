import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useMutation, useQuery} from '@tanstack/react-query';
import {ChevronLeft, Loader2, Search, Tag as TagIcon, X, BookCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Badge} from "@/components/ui/badge";
import {MarkdownEditor} from '@/components/MarkdownEditor';
import {useDebounce} from 'use-debounce';
import {compareVersions} from 'compare-versions';
import {toast} from "@/hooks/use-toast";
import {DestructiveActionRequest} from "@/components/changelog/RequestHandler";
import {ChangelogActionRequest} from "@/components/changelog/ChangelogActionRequest";

interface ChangelogEditorProps {
    projectId: string;
    entryId?: string;
    isNewChangelog?: boolean; // New prop to control default tag behavior
    initialPublishedStatus?: boolean; // New prop
}

interface Tag {
    id: string;
    name: string;
}

interface ChangelogEntry {
    version?: string;
}

interface Project {
    defaultTags: string[];
}

export function ChangelogEditor({
                                    projectId,
                                    entryId,
                                    isNewChangelog = false,
                                    initialPublishedStatus = false,
                                }: ChangelogEditorProps) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [version, setVersion] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [tagSearchInput, setTagSearchInput] = useState('');
    const [debouncedContent] = useDebounce(content, 1000);
    const [debouncedTitle] = useDebounce(title, 1000);
    const [debouncedVersion] = useDebounce(version, 1000);
    const [debouncedTags] = useDebounce(selectedTags, 1000);
    const [isSaving, setIsSaving] = useState(false);
    const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(initialPublishedStatus);
    const [isPublishing, setIsPublishing] = useState(false);

    // Fetch project details to get default tags
    const {data: projectData} = useQuery<Project>({
        queryKey: ['project-details', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) {
                console.error('Failed to fetch project details');
                return {defaultTags: []};
            }
            return response.json();
        },
        placeholderData: {defaultTags: []}
    });

    // Fetch tags
    const {data: tagsData = []} = useQuery<Tag[]>({
        queryKey: ['project-tags', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags`);
            if (!response.ok) {
                console.error('Failed to fetch tags');
                return [];
            }
            return response.json();
        },
        placeholderData: []
    });

    // Combine existing tags with default tags
    const combinedTags = useMemo(() => {
        const defaultTagNames = projectData?.defaultTags || [];

        // Create tags for default tags that don't exist
        const newDefaultTags = defaultTagNames
            .filter(name => !tagsData.some(tag => tag.name === name))
            .map(name => ({id: `default-${name}`, name}));

        return [...tagsData, ...newDefaultTags];
    }, [tagsData, projectData]);

    // Filter tags based on search input
    const filteredTags = combinedTags.filter(tag =>
        tag.name.toLowerCase().includes(tagSearchInput.toLowerCase())
    );

    // Fetch all changelog entries for version history
    const {data: entriesData = {entries: []}} = useQuery<{ entries: ChangelogEntry[] }>({
        queryKey: ['changelog-entries', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog`);
            if (!response.ok) {
                console.error('Failed to fetch entries');
                return {entries: []};
            }
            return response.json();
        },
        placeholderData: {entries: []}
    });

    // Calculate version suggestions
    const versionSuggestions = useMemo(() => {
        const entries = entriesData.entries || [];

        const versions = entries
            .map((e: ChangelogEntry) => e.version)
            .filter(Boolean)
            .sort((a, b) => compareVersions(b || '0.0.0', a || '0.0.0'));

        if (!versions.length) return ['1.0.0'];

        const latestVersion = versions[0] || '0.0.0';
        const [major, minor, patch] = latestVersion.split('.').map(Number);

        return [
            `${major + 1}.0.0`, // Major bump
            `${major}.${minor + 1}.0`, // Minor bump
            `${major}.${minor}.${patch + 1}`, // Patch bump
            ...versions // Existing versions
        ];
    }, [entriesData]);

    // Fetch existing entry if editing
    const {data: existingEntry} = useQuery({
        queryKey: ['changelog-entry', entryId],
        queryFn: async () => {
            if (!entryId) return null;
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`);
            if (!response.ok) throw new Error('Failed to fetch entry');
            return response.json();
        },
        enabled: !!entryId
    });

    // Load existing entry data
    useEffect(() => {
        if (existingEntry) {
            setTitle(existingEntry.title || '');
            setVersion(existingEntry.version || '');
            setIsPublished(!!existingEntry.publishedAt);

            const entryTags = Array.isArray(existingEntry.tags)
                ? existingEntry.tags.map((t: any) => t.id)
                : [];

            // Only add default tags if it's a new changelog
            const defaultTagIds = isNewChangelog
                ? combinedTags
                    .filter(tag => projectData?.defaultTags.includes(tag.name))
                    .map(tag => tag.id)
                : [];

            setSelectedTags([
                ...new Set([...entryTags, ...defaultTagIds])
            ]);

            setContent(existingEntry.content || '');
        } else if (isNewChangelog) {
            // For brand new changelogs, auto-select default tags
            const defaultTagIds = combinedTags
                .filter(tag => projectData?.defaultTags.includes(tag.name))
                .map(tag => tag.id);

            setSelectedTags(defaultTagIds);
        }
    }, [existingEntry, projectData, combinedTags, isNewChangelog]);

    // Save mutation
    const saveEntry = useMutation({
        mutationFn: async (data: any) => {
            const url = entryId
                ? `/api/projects/${projectId}/changelog/${entryId}`
                : `/api/projects/${projectId}/changelog`;

            const response = await fetch(url, {
                method: entryId ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save entry');
            return response.json();
        }
    });

    const publishEntry = useMutation({
        mutationFn: async () => {
            if (!entryId) return;

            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish' })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to publish entry');
            }

            return response.json();
        },
        onSuccess: () => {
            setIsPublished(true);
            toast({
                title: 'Entry Published',
                description: 'The changelog entry has been published successfully.'
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Publish',
                description: error.message || 'There was an error publishing the entry.',
                variant: 'destructive'
            });
        }
    });

    // Autosave effect
    useEffect(() => {
        if (!debouncedTitle || !debouncedContent) return;

        const save = async () => {
            setIsSaving(true);
            try {
                const result = await saveEntry.mutateAsync({
                    title: debouncedTitle,
                    content: debouncedContent,
                    version: debouncedVersion,
                    tags: debouncedTags
                });

                if (!entryId && !savedEntryId) {
                    setSavedEntryId(result.id);
                    router.replace(`/dashboard/projects/${projectId}/changelog/${result.id}`);
                }
            } finally {
                setIsSaving(false);
            }
        };

        save();
    }, [debouncedTitle, debouncedContent, debouncedVersion, debouncedTags]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="hover:bg-accent hover:text-accent-foreground"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2"/>
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {entryId ? 'Edit Changelog Entry' : 'New Changelog Entry'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {isSaving ? 'Saving...' : 'All changes saved'}
                            </p>
                        </div>
                    </div>

                    {entryId && (
                        <div className="flex items-center gap-2">
                            <ChangelogActionRequest
                                projectId={projectId}
                                entryId={entryId}
                                action="PUBLISH"
                                title={title}
                                isPublished={isPublished}
                                onSuccess={() => setIsPublished(true)}
                            />
                            <ChangelogActionRequest
                                projectId={projectId}
                                entryId={entryId}
                                action="DELETE"
                                title={title}
                                onSuccess={() => router.push(`/dashboard/projects/${projectId}/changelog`)}
                            />
                        </div>
                    )}
                </div>

                {/* Title and Metadata */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Entry Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Input
                                placeholder="Entry title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-lg font-medium"
                            />
                        </div>
                        <div className="flex gap-4">
                            {/* Version Dropdown */}
                            <div className="relative w-48">
                                <select
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    className="w-full p-2 border rounded bg-background text-foreground"
                                >
                                    <option value="">Select version...</option>
                                    {versionSuggestions.map((v) => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tags Dropdown */}
                            <div className="relative w-64">
                                <div className="relative">
                                    <Input
                                        placeholder="Search or add tags"
                                        value={tagSearchInput}
                                        onChange={(e) => setTagSearchInput(e.target.value)}
                                        className="pr-10"
                                    />
                                    <Search
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4"/>
                                </div>
                                {tagSearchInput && (
                                    <div
                                        className="absolute z-10 mt-1 w-full border rounded bg-background shadow-lg max-h-60 overflow-y-auto">
                                        {filteredTags.map((tag) => (
                                            <div
                                                key={tag.id}
                                                className={`p-2 hover:bg-accent cursor-pointer ${
                                                    selectedTags.includes(tag.id)
                                                        ? 'bg-accent text-accent-foreground'
                                                        : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedTags(current =>
                                                        current.includes(tag.id)
                                                            ? current.filter(id => id !== tag.id)
                                                            : [...current, tag.id]
                                                    );
                                                    setTagSearchInput('');
                                                }}
                                            >
                                                {tag.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {selectedTags.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                {selectedTags.map((tagId) => {
                                    const tag = combinedTags.find((t) => t.id === tagId);
                                    return tag ? (
                                        <Badge
                                            key={tagId}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
                                        >
                                            <TagIcon className="h-3 w-3 mr-1"/>
                                            {tag.name}
                                            <X className="h-3 w-3 ml-1"/>
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Markdown Editor */}
                <MarkdownEditor
                    key={entryId || 'new'}
                    initialValue={content}
                    onChange={setContent}
                    value={content}
                    placeholder="Write your changelog entry in Markdown..."
                    className="min-h-[500px]"
                    features={{
                        headings: true,
                        bold: true,
                        italic: true,
                        lists: true,
                        links: true,
                        code: true,
                        blockquotes: true
                    }}
                />
            </div>
        </div>
    );
}