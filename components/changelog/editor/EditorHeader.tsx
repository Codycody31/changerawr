import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChangelogActionRequest } from "@/components/changelog/ChangelogActionRequest";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import TagSelector from './TagSelector';
import VersionSelector from './VersionSelector';
import AITitleGenerator from './AITitleGenerator';

// ===== Type Definitions =====

interface Tag {
    id: string;
    name: string;
}

interface EntryData {
    publishedAt?: string;
    title: string;
    version: string;
    content: string;
    tags: Tag[];
}

interface EditorHeaderProps {
    title: string;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    lastSaveError: string | null;
    onManualSave: () => Promise<void>;
    onBack: () => void;
    isPublished: boolean;
    projectId: string;
    entryId?: string;
    version: string;
    onVersionChange: (version: string) => void;
    onVersionConflict?: (hasConflict: boolean) => void;
    hasVersionConflict?: boolean;
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    onTitleChange: (title: string) => void;
    content: string;
    aiApiKey?: string;
    aiApiProvider?: 'secton' | 'openai';
    aiApiBaseUrl?: string | null;
}

// ===== Main Component =====

const EditorHeader: React.FC<EditorHeaderProps> = ({
                                                       title,
                                                       isSaving,
                                                       hasUnsavedChanges,
                                                       lastSaveError,
                                                       onManualSave,
                                                       onBack,
                                                       isPublished,
                                                       projectId,
                                                       entryId,
                                                       version,
                                                       onVersionChange,
                                                       onVersionConflict,
                                                       hasVersionConflict = false,
                                                       selectedTags,
                                                       availableTags,
                                                       onTagsChange,
                                                       onTitleChange,
                                                       content,
                                                       aiApiKey,
                                                       aiApiProvider = 'secton',
                                                       aiApiBaseUrl = null,
                                                   }) => {
    const queryClient = useQueryClient();

    // ===== Data Fetching (Stable) =====
    const { data: entryData } = useQuery<EntryData>({
        queryKey: ['changelog-entry', projectId, entryId],
        queryFn: async (): Promise<EntryData> => {
            if (!entryId) throw new Error('No entry ID provided');
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch entry: ${response.statusText}`);
            }
            return response.json();
        },
        enabled: !!entryId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // ===== Memoized Computed Values =====
    const computedValues = useMemo(() => {
        const currentPublishStatus = entryData?.publishedAt ? true : isPublished;

        // Validation checks
        const hasTitle = title.trim() !== '';
        const hasContent = content.trim() !== '';
        const hasVersion = version.trim() !== '';
        const noConflict = !hasVersionConflict;

        // Can perform actions
        const canSave = hasUnsavedChanges && !isSaving && hasTitle && hasContent && hasVersion && noConflict;
        const canPublish = hasTitle && hasContent && hasVersion && noConflict;

        // Tooltip messages
        const getSaveTooltip = (): string => {
            if (isSaving) return "Saving in progress...";
            if (!hasUnsavedChanges) return "No unsaved changes";
            if (hasVersionConflict) return "Resolve version conflict before saving";
            if (!hasTitle) return "Title is required";
            if (!hasContent) return "Content is required";
            if (!hasVersion) return "Version is required";
            return "Save changes";
        };

        const getPublishTooltip = (): string => {
            if (hasVersionConflict) return "Resolve version conflict before publishing";
            if (!hasVersion) return "Set a version before publishing";
            if (!hasTitle) return "Add a title before publishing";
            if (!hasContent) return "Add content before publishing";
            return currentPublishStatus ? "Unpublish this entry" : "Publish this entry";
        };

        return {
            currentPublishStatus,
            canSave,
            canPublish,
            getSaveTooltip,
            getPublishTooltip,
            hasTitle,
            hasContent,
            hasVersion,
            noConflict
        };
    }, [
        entryData?.publishedAt,
        isPublished,
        title,
        content,
        version,
        hasVersionConflict,
        hasUnsavedChanges,
        isSaving
    ]);

    // ===== Stable Event Handlers =====
    const handleActionSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['changelog-entry', projectId, entryId] });
        queryClient.invalidateQueries({ queryKey: ['project-versions', projectId] });
    }, [queryClient, projectId, entryId]);

    const handleVersionChange = useCallback((newVersion: string) => {
        onVersionChange(newVersion);
    }, [onVersionChange]);

    const handleVersionConflict = useCallback((hasConflict: boolean) => {
        onVersionConflict?.(hasConflict);
    }, [onVersionConflict]);

    const handleTagsChange = useCallback((tags: Tag[]) => {
        onTagsChange(tags);
    }, [onTagsChange]);

    const handleTitleChange = useCallback((newTitle: string) => {
        onTitleChange(newTitle);
    }, [onTitleChange]);

    const handleDeleteSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['changelog-entry', projectId] });
        onBack();
    }, [queryClient, projectId, onBack]);

    // ===== Status Indicators Component =====
    const StatusIndicators = useMemo(() => {
        if (!hasUnsavedChanges && !hasVersionConflict && !isSaving) {
            return null;
        }

        return (
            <div className="flex items-center gap-4">
                <AnimatePresence mode="wait">
                    {/* Unsaved changes */}
                    {hasUnsavedChanges && !isSaving && (
                        <motion.div
                            key="unsaved"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center text-sm text-amber-600 dark:text-amber-400"
                        >
                            <div className="h-2 w-2 bg-amber-500 rounded-full mr-2 animate-pulse" />
                            Unsaved changes
                        </motion.div>
                    )}

                    {/* Saving indicator */}
                    {isSaving && (
                        <motion.div
                            key="saving"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center text-sm text-blue-600 dark:text-blue-400"
                        >
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Saving...
                        </motion.div>
                    )}

                    {/* Version conflict */}
                    {hasVersionConflict && (
                        <motion.div
                            key="conflict"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center text-sm text-red-600 dark:text-red-400"
                        >
                            <AlertTriangle className="h-3 w-3 mr-2" />
                            Version conflict
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }, [hasUnsavedChanges, isSaving, hasVersionConflict]);

    // ===== Action Buttons Components =====
    const SaveButton = useMemo(() => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    onClick={onManualSave}
                    disabled={!computedValues.canSave}
                    className={cn(
                        "transition-colors duration-200",
                        hasVersionConflict && "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </>
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {computedValues.getSaveTooltip()}
            </TooltipContent>
        </Tooltip>
    ), [computedValues.canSave, computedValues.getSaveTooltip, hasVersionConflict, isSaving, onManualSave]);

    const PublishButton = useMemo(() => {
        if (!entryId) return null;

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <ChangelogActionRequest
                            projectId={projectId}
                            entryId={entryId}
                            action={computedValues.currentPublishStatus ? "UNPUBLISH" : "PUBLISH"}
                            title={title}
                            isPublished={computedValues.currentPublishStatus}
                            variant={computedValues.currentPublishStatus ? "outline" : "default"}
                            disabled={!computedValues.canPublish && !computedValues.currentPublishStatus}
                            onSuccess={handleActionSuccess}
                            className={cn(
                                hasVersionConflict && !computedValues.currentPublishStatus && "border-red-300 opacity-60"
                            )}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    {computedValues.getPublishTooltip()}
                </TooltipContent>
            </Tooltip>
        );
    }, [
        entryId,
        projectId,
        computedValues.currentPublishStatus,
        computedValues.canPublish,
        computedValues.getPublishTooltip,
        title,
        hasVersionConflict,
        handleActionSuccess
    ]);

    const DeleteButton = useMemo(() => {
        if (!entryId) return null;

        return (
            <ChangelogActionRequest
                projectId={projectId}
                entryId={entryId}
                action="DELETE"
                title={title}
                variant="destructive"
                onSuccess={handleDeleteSuccess}
            />
        );
    }, [entryId, projectId, title, handleDeleteSuccess]);

    // ===== Error Alert Component =====
    const ErrorAlert = useMemo(() => {
        if (!lastSaveError && !hasVersionConflict) return null;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    <Alert
                        variant={hasVersionConflict ? "warning" : "destructive"}
                        className="w-auto max-w-md"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {hasVersionConflict
                                ? "Version conflict - select a different version"
                                : lastSaveError
                            }
                        </AlertDescription>
                    </Alert>
                </motion.div>
            </AnimatePresence>
        );
    }, [lastSaveError, hasVersionConflict]);

    // ===== Main Render =====
    return (
        <TooltipProvider>
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container py-4">
                    <div className="flex flex-col gap-4">
                        {/* Top Row - Navigation and Actions */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBack}
                                className="hover:bg-accent hover:text-accent-foreground"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>

                            <div className="flex items-center gap-2">
                                {ErrorAlert}

                                {SaveButton}

                                {entryId && (
                                    <>
                                        <Separator orientation="vertical" className="h-6" />
                                        {PublishButton}
                                        {DeleteButton}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Middle Row - Title and AI Tools */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                                <h1 className={cn(
                                    "text-2xl font-bold truncate flex-1 transition-colors duration-200",
                                    !computedValues.hasTitle && lastSaveError && "text-red-600 dark:text-red-400"
                                )}>
                                    {title || 'Untitled Entry'}
                                </h1>

                                {/* AI Title Generator */}
                                {aiApiKey && computedValues.hasContent && (
                                    <AITitleGenerator
                                        content={content}
                                        onSelectTitle={handleTitleChange}
                                        apiKey={aiApiKey}
                                    />
                                )}
                            </div>

                            {/* Controls Row - Tags and Version */}
                            <div className="flex items-center gap-2">
                                <TagSelector
                                    selectedTags={selectedTags}
                                    availableTags={availableTags}
                                    onTagsChange={handleTagsChange}
                                    content={content}
                                    aiApiKey={aiApiKey}
                                    aiApiProvider={aiApiProvider}
                                    projectId={projectId}
                                />

                                <VersionSelector
                                    version={version}
                                    onVersionChange={handleVersionChange}
                                    onConflictDetected={handleVersionConflict}
                                    projectId={projectId}
                                    entryId={entryId}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        {/* Bottom Row - Status Indicators */}
                        {StatusIndicators}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default EditorHeader;