import React, {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {useMutation, useQuery, useInfiniteQuery, useQueryClient} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import MarkdownEditor from '@/components/markdown-editor/MarkdownEditor';
import {useDebounce} from 'use-debounce';
import {toast} from "@/hooks/use-toast";
import EditorHeader from '@/components/changelog/editor/EditorHeader';
import {Loader2, AlertTriangle, RefreshCw, Save, AlertCircle} from 'lucide-react';
import {Alert, AlertDescription, AlertActions, AlertTitle} from '@/components/ui/alert';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/lib/utils';

// ===== Type Definitions =====

interface Tag {
    id: string;
    name: string;
}

interface ProjectResponse {
    id: string;
    defaultTags: string[];
    name: string;
    requireApproval: boolean;
    allowAutoPublish: boolean;
}

interface EntryResponse {
    id: string;
    title: string;
    content: string;
    version: string;
    tags: Tag[];
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface TagsResponse {
    tags: Tag[];
    pagination: {
        page: number;
        hasMore: boolean;
        totalCount: number;
    };
}

interface AISystemSettings {
    enableAIAssistant: boolean;
    aiApiKey: string | null;
    aiDefaultModel: string | null;
}

interface SaveErrorDetails {
    message: string;
    code?: string;
    details?: unknown;
    timestamp: Date;
    retryable: boolean;
}

interface EditorState {
    title: string;
    content: string;
    version: string;
    tags: Tag[];
    isPublished: boolean;
    hasUnsavedChanges: boolean;
    hasVersionConflict: boolean;
}

interface EditorStatus {
    isSaving: boolean;
    isAutoSaving: boolean;
    lastSaveError: SaveErrorDetails | null;
    lastSavedTime: Date | null;
    saveAttempts: number;
    canRetry: boolean;
}

interface SaveError extends Error {
    status?: number;
    details?: unknown;
}

// ===== Constants =====

const ITEMS_PER_PAGE = 20;
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const DEBOUNCE_TIME = 1000; // 1 second
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// ===== Enhanced EditorHeader Wrapper =====

interface EnhancedEditorHeaderProps extends React.ComponentProps<typeof EditorHeader> {
    onLoadMoreTags?: () => Promise<void>;
    onVersionConflict?: (hasConflict: boolean) => void;
    hasVersionConflict?: boolean;
}

const EnhancedEditorHeader: React.FC<EnhancedEditorHeaderProps> = ({
                                                                       onLoadMoreTags,
                                                                       onVersionConflict,
                                                                       hasVersionConflict,
                                                                       availableTags,
                                                                       onTagsChange,
                                                                       content,
                                                                       ...otherProps
                                                                   }) => {
    const tagsContainerRef = useRef<HTMLDivElement>(null);

    const handleTagsChange = useCallback((tags: Tag[]) => {
        onTagsChange(tags);
    }, [onTagsChange]);

    // Setup intersection observer for infinite tag loading
    useEffect(() => {
        if (!onLoadMoreTags) return;

        const containerElement = tagsContainerRef.current;
        if (!containerElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    onLoadMoreTags();
                }
            },
            {threshold: 0.5}
        );

        observer.observe(containerElement);

        return () => {
            observer.unobserve(containerElement);
        };
    }, [onLoadMoreTags]);

    return (
        <>
            <EditorHeader
                {...otherProps}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
                content={content}
                onVersionConflict={onVersionConflict}
                hasVersionConflict={hasVersionConflict}
            />
            {/* Hidden container to trigger infinite loading */}
            {onLoadMoreTags && <div ref={tagsContainerRef} style={{height: 1, opacity: 0}}/>}
        </>
    );
};

// ===== Main Component =====

interface ChangelogEditorProps {
    projectId: string;
    entryId?: string;
    isNewChangelog?: boolean;
    initialPublishedStatus?: boolean;
    initialContent?: string;
    initialVersion?: string;
    initialTitle?: string;
}

export function ChangelogEditor({
                                    projectId,
                                    entryId,
                                    isNewChangelog = false,
                                    initialPublishedStatus = false,
                                    initialContent = '',
                                    initialVersion = '',
                                    initialTitle = '',
                                }: ChangelogEditorProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    // ===== Refs =====
    const initialValuesApplied = useRef(false);
    const lastSavedStateRef = useRef<Omit<EditorState, 'isPublished' | 'hasUnsavedChanges' | 'hasVersionConflict'> | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ===== State Management =====
    const [editorState, setEditorState] = useState<EditorState>(() => ({
        title: initialTitle,
        content: initialContent,
        version: initialVersion,
        tags: [],
        isPublished: initialPublishedStatus,
        hasUnsavedChanges: !!(initialTitle || initialContent || initialVersion),
        hasVersionConflict: false,
    }));

    const [status, setStatus] = useState<EditorStatus>({
        isSaving: false,
        isAutoSaving: false,
        lastSaveError: null,
        lastSavedTime: null,
        saveAttempts: 0,
        canRetry: false,
    });

    // Debounced state for autosave
    const [debouncedState] = useDebounce(editorState, DEBOUNCE_TIME);

    // ===== Data Fetching =====

    // Fetch AI system settings
    const { data: aiSystemSettings, isLoading: isAISettingsLoading } = useQuery<AISystemSettings>({
        queryKey: ['ai-system-settings'],
        queryFn: async (): Promise<AISystemSettings> => {
            try {
                // Fetch encrypted settings
                const response = await fetch('/api/ai/settings');
                if (!response.ok) {
                    console.warn('Failed to fetch AI settings:', response.statusText);
                    return { enableAIAssistant: false, aiApiKey: null, aiDefaultModel: null };
                }

                const encryptedData = await response.json();

                // If no API key or AI disabled, return as-is
                if (!encryptedData.enableAIAssistant || !encryptedData.aiApiKey) {
                    return {
                        enableAIAssistant: encryptedData.enableAIAssistant || false,
                        aiApiKey: null,
                        aiDefaultModel: encryptedData.aiDefaultModel || null
                    };
                }

                // Decrypt the API key
                const decryptResponse = await fetch('/api/ai/decrypt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ encryptedToken: encryptedData.aiApiKey }),
                });

                let decryptedApiKey: string | null = null;

                if (decryptResponse.ok) {
                    const decryptData = await decryptResponse.json();
                    decryptedApiKey = decryptData.decryptedKey;
                } else {
                    console.error('Failed to decrypt API key:', decryptResponse.statusText);
                }

                return {
                    enableAIAssistant: encryptedData.enableAIAssistant || false,
                    aiApiKey: decryptedApiKey,
                    aiDefaultModel: encryptedData.aiDefaultModel || null
                };

            } catch (error) {
                console.error('Error in AI settings query:', error);
                return { enableAIAssistant: false, aiApiKey: null, aiDefaultModel: null };
            }
        },
        staleTime: CACHE_TIME,
        retry: 1,
    });

    // Fetch initial data (project and entry)
    const {data: initialData, isLoading: isInitialDataLoading, error: initialDataError} = useQuery({
        queryKey: ['changelog-init', projectId, entryId],
        queryFn: async () => {
            const [projectResponse, entryResponse] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                entryId ? fetch(`/api/projects/${projectId}/changelog/${entryId}`) : Promise.resolve(null)
            ]);

            if (!projectResponse.ok) {
                throw new Error(`Failed to fetch project: ${projectResponse.statusText}`);
            }

            const project: ProjectResponse = await projectResponse.json();
            let entry: EntryResponse | null = null;

            if (entryResponse) {
                if (!entryResponse.ok) {
                    throw new Error(`Failed to fetch entry: ${entryResponse.statusText}`);
                }
                entry = await entryResponse.json();
            }

            return {project, entry};
        },
        staleTime: CACHE_TIME,
        retry: 2,
    });

    // Fetch tags with pagination
    const {
        data: tagsData,
        fetchNextPage,
        hasNextPage,
        isLoading: isTagsLoading,
        error: tagsError
    } = useInfiniteQuery<TagsResponse>({
        queryKey: ['changelog-tags', projectId],
        queryFn: async ({pageParam = 1}) => {
            const response = await fetch(
                `/api/projects/${projectId}/changelog/tags?page=${pageParam}&limit=${ITEMS_PER_PAGE}`
            );
            if (!response.ok) {
                throw new Error(`Failed to fetch tags: ${response.statusText}`);
            }
            return response.json();
        },
        getNextPageParam: (lastPage: TagsResponse) => {
            return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
        },
        staleTime: CACHE_TIME,
        initialPageParam: 1,
        retry: 2,
    });

    // ===== Computed Values =====
    const aiEnabled = aiSystemSettings?.enableAIAssistant || false;
    const sectonApiKey = aiSystemSettings?.aiApiKey || '';

    const {availableTags, mappedDefaultTags} = useMemo(() => {
        if (!initialData || !tagsData?.pages) {
            return {availableTags: [], mappedDefaultTags: []};
        }

        const allTags = tagsData.pages.flatMap(page => page.tags);
        const {project} = initialData;
        const defaultTags = project.defaultTags || [];

        const tagMap = new Map<string, Tag>();
        const defaultTagObjects: Tag[] = [];

        // Process existing tags
        allTags.forEach(tag => {
            const lowercaseName = tag.name.toLowerCase();
            if (!tagMap.has(lowercaseName)) {
                tagMap.set(lowercaseName, tag);
            }
        });

        // Process default tags
        defaultTags.forEach(name => {
            const lowercaseName = name.toLowerCase();
            if (!tagMap.has(lowercaseName)) {
                const tag = {
                    id: `default-${lowercaseName}`,
                    name: name
                };
                tagMap.set(lowercaseName, tag);
                defaultTagObjects.push(tag);
            } else {
                const existingTag = tagMap.get(lowercaseName);
                if (existingTag) {
                    defaultTagObjects.push(existingTag);
                }
            }
        });

        return {
            availableTags: Array.from(tagMap.values()),
            mappedDefaultTags: defaultTagObjects
        };
    }, [initialData, tagsData?.pages]);

    // ===== Save Mutation =====
    const saveEntry = useMutation({
        mutationFn: async (data: Omit<EditorState, 'isPublished' | 'hasUnsavedChanges' | 'hasVersionConflict'>) => {
            const url = entryId
                ? `/api/projects/${projectId}/changelog/${entryId}`
                : `/api/projects/${projectId}/changelog`;

            const tagData = data.tags.map(tag =>
                tag.id.startsWith('default-')
                    ? {name: tag.name}
                    : {id: tag.id, name: tag.name}
            );

            const response = await fetch(url, {
                method: entryId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    title: data.title,
                    content: data.content,
                    version: data.version,
                    tags: tagData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error: SaveError = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.details = errorData;
                throw error;
            }

            return response.json();
        }
    });

    // ===== Event Handlers =====
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

    const handleVersionConflict = useCallback((hasConflict: boolean) => {
        setEditorState(prev => ({
            ...prev,
            hasVersionConflict: hasConflict
        }));
    }, []);

    // ===== Save Logic =====
    const performSave = useCallback(async (isManual = false) => {
        const currentState = {
            title: editorState.title,
            content: editorState.content,
            version: editorState.version,
            tags: editorState.tags
        };

        // Validation checks
        if (!currentState.title.trim()) {
            const error: SaveErrorDetails = {
                message: 'Title is required',
                timestamp: new Date(),
                retryable: false
            };
            setStatus(prev => ({...prev, lastSaveError: error}));
            return false;
        }

        if (!currentState.content.trim()) {
            const error: SaveErrorDetails = {
                message: 'Content is required',
                timestamp: new Date(),
                retryable: false
            };
            setStatus(prev => ({...prev, lastSaveError: error}));
            return false;
        }

        if (!currentState.version.trim()) {
            const error: SaveErrorDetails = {
                message: 'Version is required',
                timestamp: new Date(),
                retryable: false
            };
            setStatus(prev => ({...prev, lastSaveError: error}));
            return false;
        }

        if (editorState.hasVersionConflict) {
            const error: SaveErrorDetails = {
                message: 'Version conflict must be resolved',
                timestamp: new Date(),
                retryable: false
            };
            setStatus(prev => ({...prev, lastSaveError: error}));
            return false;
        }

        // Check if state actually changed
        const stateChanged = !lastSavedStateRef.current ||
            JSON.stringify(currentState) !== JSON.stringify(lastSavedStateRef.current);

        if (!stateChanged && !isManual) {
            return true; // No changes to save
        }

        // Update status
        setStatus(prev => ({
            ...prev,
            isSaving: true,
            isAutoSaving: !isManual,
            lastSaveError: null,
            saveAttempts: prev.saveAttempts + 1
        }));

        try {
            const result = await saveEntry.mutateAsync(currentState);

            // Handle navigation for new entries
            if (!entryId && result.id) {
                router.replace(`/dashboard/projects/${projectId}/changelog/${result.id}`);
            }

            // Update success state
            lastSavedStateRef.current = currentState;
            setStatus(prev => ({
                ...prev,
                isSaving: false,
                isAutoSaving: false,
                lastSavedTime: new Date(),
                lastSaveError: null,
                saveAttempts: 0,
                canRetry: false
            }));

            setEditorState(prev => ({
                ...prev,
                hasUnsavedChanges: false
            }));

            // Invalidate relevant queries
            queryClient.invalidateQueries({queryKey: ['project-versions', projectId]});

            if (isManual) {
                toast({
                    title: "Changes saved",
                    description: "Your changes have been saved successfully."
                });
            }

            return true;

        } catch (error: unknown) {
            console.error('Save error:', error);

            const saveError = error as SaveError;
            const isRetryable = saveError.status !== 400 && saveError.status !== 409 && saveError.status !== 422;
            const errorDetails: SaveErrorDetails = {
                message: saveError.message || 'Failed to save changes',
                code: saveError.status?.toString(),
                details: saveError.details,
                timestamp: new Date(),
                retryable: isRetryable && status.saveAttempts < MAX_RETRY_ATTEMPTS
            };

            setStatus(prev => ({
                ...prev,
                isSaving: false,
                isAutoSaving: false,
                lastSaveError: errorDetails,
                canRetry: errorDetails.retryable
            }));

            if (isManual) {
                toast({
                    title: "Save failed",
                    description: errorDetails.message,
                    variant: "destructive"
                });
            }

            return false;
        }
    }, [editorState, entryId, projectId, router, saveEntry, status.saveAttempts, queryClient]);

    const handleManualSave = useCallback(async () => {
        await performSave(true);
    }, [performSave]);

    const handleRetryAutosave = useCallback(async () => {
        if (status.canRetry) {
            setStatus(prev => ({...prev, lastSaveError: null}));
            await performSave(false);
        }
    }, [performSave, status.canRetry]);

    // ===== Auto-save Logic =====
    useEffect(() => {
        if (!debouncedState.hasUnsavedChanges || status.isSaving || status.lastSaveError?.retryable === false) {
            return;
        }

        const currentState = {
            title: debouncedState.title,
            content: debouncedState.content,
            version: debouncedState.version,
            tags: debouncedState.tags
        };

        const stateChanged = !lastSavedStateRef.current ||
            JSON.stringify(currentState) !== JSON.stringify(lastSavedStateRef.current);

        if (!stateChanged || !currentState.title || !currentState.content || !currentState.version) {
            return;
        }

        // Auto-save with delay
        const timeoutId = setTimeout(() => {
            performSave(false);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [debouncedState, status.isSaving, status.lastSaveError, performSave]);

    // ===== Auto-retry Logic =====
    useEffect(() => {
        if (status.lastSaveError?.retryable && status.saveAttempts < MAX_RETRY_ATTEMPTS) {
            retryTimeoutRef.current = setTimeout(() => {
                handleRetryAutosave();
            }, RETRY_DELAY * status.saveAttempts); // Exponential backoff

            return () => {
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current);
                }
            };
        }
    }, [status.lastSaveError, status.saveAttempts, handleRetryAutosave]);

    // ===== Initialize Editor State =====
    useEffect(() => {
        if (!initialData) return;

        const {entry} = initialData;

        if (entry) {
            // Load existing entry data
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
                hasUnsavedChanges: false,
                hasVersionConflict: false
            });
            initialValuesApplied.current = true;
            return;
        }

        // Initialize new entry
        if (isNewChangelog && !initialValuesApplied.current) {
            const hasInitialValues = !!(initialTitle || initialContent || initialVersion);

            setEditorState(prev => ({
                ...prev,
                title: initialTitle || prev.title,
                content: initialContent || prev.content,
                version: initialVersion || prev.version,
                tags: mappedDefaultTags.length > 0 ? mappedDefaultTags : prev.tags,
                hasUnsavedChanges: hasInitialValues || mappedDefaultTags.length > 0
            }));

            initialValuesApplied.current = true;

            if (hasInitialValues) {
                toast({
                    title: "Content loaded",
                    description: "Pre-filled content has been loaded into the editor.",
                });
            }
        }
    }, [initialData, isNewChangelog, mappedDefaultTags, initialTitle, initialContent, initialVersion]);

    // ===== Export Handler =====
    const handleExport = useCallback(() => {
        if (!editorState.content) return;

        const element = document.createElement('a');
        const file = new Blob([editorState.content], {type: 'text/markdown'});
        element.href = URL.createObjectURL(file);

        const safeTitle = editorState.title
            ? editorState.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            : 'changelog_entry';
        const version = editorState.version ? `_${editorState.version}` : '';
        const timestamp = new Date().toISOString().slice(0, 10);

        element.download = `${safeTitle}${version}_${timestamp}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }, [editorState.content, editorState.title, editorState.version]);

    // ===== Loading States =====
    const isLoading = isInitialDataLoading || isTagsLoading || isAISettingsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    <p className="text-muted-foreground">Loading editor...</p>
                </div>
            </div>
        );
    }

    // ===== Error States =====
    if (initialDataError || tagsError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Failed to load editor</AlertTitle>
                    <AlertDescription className="mt-2">
                        {(initialDataError as Error)?.message || (tagsError as Error)?.message || 'An unexpected error occurred'}
                    </AlertDescription>
                    <AlertActions>
                        <Button
                            onClick={() => window.location.reload()}
                            size="sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Retry
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            size="sm"
                        >
                            Go Back
                        </Button>
                    </AlertActions>
                </Alert>
            </div>
        );
    }

    // ===== Main Render =====
    return (
        <div className="min-h-screen bg-background text-foreground">
            <EnhancedEditorHeader
                title={editorState.title}
                isSaving={status.isSaving}
                hasUnsavedChanges={editorState.hasUnsavedChanges}
                lastSaveError={status.lastSaveError?.message || null}
                onManualSave={handleManualSave}
                onBack={() => router.back()}
                isPublished={editorState.isPublished}
                projectId={projectId}
                entryId={entryId}
                version={editorState.version}
                onVersionChange={handleVersionChange}
                onVersionConflict={handleVersionConflict}
                hasVersionConflict={editorState.hasVersionConflict}
                selectedTags={editorState.tags}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
                onTitleChange={handleTitleChange}
                content={editorState.content}
                aiApiKey={sectonApiKey}
                onLoadMoreTags={hasNextPage ? async () => {
                    await fetchNextPage();
                } : undefined}
            />

            <div className="container py-6 space-y-6">
                {/* Save Error Alert */}
                <AnimatePresence>
                    {status.lastSaveError && !status.isSaving && (
                        <motion.div
                            initial={{opacity: 0, y: -20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -20}}
                            transition={{duration: 0.3}}
                        >
                            <Alert
                                variant={status.lastSaveError.retryable ? "warning" : "destructive"}
                            >
                                <AlertTitle>
                                    {status.lastSaveError.retryable ? 'Save Failed' : 'Validation Error'}
                                </AlertTitle>
                                <AlertDescription>
                                    {status.lastSaveError.message}
                                    {status.lastSaveError.retryable && status.saveAttempts < MAX_RETRY_ATTEMPTS && (
                                        <span className="block mt-1 text-sm">
                                            Retrying automatically... (Attempt {status.saveAttempts}/{MAX_RETRY_ATTEMPTS})
                                        </span>
                                    )}
                                </AlertDescription>
                                {(status.canRetry || !status.lastSaveError.retryable) && (
                                    <AlertActions>
                                        {status.canRetry && (
                                            <Button
                                                onClick={handleRetryAutosave}
                                                size="sm"
                                                disabled={status.isSaving}
                                            >
                                                {status.isSaving ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 mr-2 animate-spin"/>
                                                        Retrying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-3 w-3 mr-2"/>
                                                        Retry Now
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => setStatus(prev => ({...prev, lastSaveError: null}))}
                                            size="sm"
                                        >
                                            Dismiss
                                        </Button>
                                    </AlertActions>
                                )}
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Version Conflict Alert */}
                <AnimatePresence>
                    {editorState.hasVersionConflict && (
                        <motion.div
                            initial={{opacity: 0, y: -20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -20}}
                            transition={{duration: 0.3}}
                        >
                            <Alert variant="warning">
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle>Version Conflict</AlertTitle>
                                <AlertDescription>
                                    The selected version already exists. Please choose a different version to continue.
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Entry Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Entry Details
                            {status.isAutoSaving && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin"/>
                                    Auto-saving...
                                </div>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Entry title"
                            value={editorState.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className={cn(
                                "text-lg font-medium",
                                !editorState.title.trim() && status.lastSaveError && "border-red-500"
                            )}
                        />
                        {!editorState.title.trim() && status.lastSaveError && (
                            <p className="text-sm text-red-600 mt-1">Title is required</p>
                        )}
                    </CardContent>
                </Card>

                {/* Markdown Editor */}
                {!isAISettingsLoading ? (
                    <MarkdownEditor
                        key={entryId || 'new'}
                        initialValue={editorState.content}
                        onChange={handleContentChange}
                        onSave={handleManualSave}
                        onExport={handleExport}
                        placeholder="What's been changed today?"
                        className={cn(
                            "min-h-[500px]",
                            !editorState.content.trim() && status.lastSaveError && "border-red-500"
                        )}
                        enableAI={aiEnabled && !!sectonApiKey}
                        aiApiKey={sectonApiKey}
                        autoFocus={isNewChangelog && !initialContent}
                    />
                ) : (
                    <div className="flex items-center justify-center p-12 border rounded-md bg-muted/10">
                        <Loader2 className="w-6 h-6 mr-2 animate-spin"/>
                        <span>Loading editor...</span>
                    </div>
                )}

                {!editorState.content.trim() && status.lastSaveError && (
                    <p className="text-sm text-red-600 -mt-4">Content is required</p>
                )}

                {/* Save Status Footer */}
                <AnimatePresence>
                    {(status.lastSavedTime || status.isSaving) && (
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                        >
                            <div className="flex items-center space-x-3">
                                {status.isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600"/>
                                        <span className="text-sm text-muted-foreground">
                                            {status.isAutoSaving ? 'Auto-saving...' : 'Saving...'}
                                        </span>
                                    </>
                                ) : status.lastSavedTime ? (
                                    <>
                                        <div className="h-2 w-2 bg-green-500 rounded-full"/>
                                        <span className="text-sm text-muted-foreground">
                                            Last saved {status.lastSavedTime.toLocaleTimeString()}
                                        </span>
                                    </>
                                ) : null}
                            </div>

                            {editorState.hasUnsavedChanges && !status.isSaving && (
                                <Button
                                    onClick={handleManualSave}
                                    size="sm"
                                    disabled={editorState.hasVersionConflict || !editorState.title.trim() || !editorState.content.trim()}
                                >
                                    <Save className="h-3 w-3 mr-2"/>
                                    Save Now
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default ChangelogEditor;