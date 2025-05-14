import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChangelogActionRequest } from "@/components/changelog/ChangelogActionRequest";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TagSelector from './TagSelector'; // Use the properly named component
import VersionSelector from './VersionSelector';
import AITitleGenerator from './AITitleGenerator';

interface Tag {
    id: string;
    name: string;
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
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    onTitleChange: (title: string) => void;
    content: string;
    aiApiKey?: string;
}

interface EntryData {
    publishedAt?: string;
    // Add other fields as needed
}

const EditorHeader = ({
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
                          selectedTags,
                          availableTags,
                          onTagsChange,
                          onTitleChange,
                          content,
                          aiApiKey,
                      }: EditorHeaderProps) => {
    const queryClient = useQueryClient();

    const { data: entryData } = useQuery({
        queryKey: ['changelog-entry', projectId, entryId],
        queryFn: async () => {
            if (!entryId) return null;
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`);
            if (!response.ok) throw new Error('Failed to fetch entry');
            return await response.json() as Promise<EntryData>;
        },
        enabled: !!entryId,
    });

    const currentPublishStatus = entryData?.publishedAt ? true : isPublished;
    const handleActionSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['changelog-entry', projectId, entryId] });
    };
    const canPublish = !!version && version.trim() !== '';
    const publishTooltip = !canPublish
        ? "Please set a version before publishing"
        : currentPublishStatus
            ? "Unpublish this entry"
            : "Publish this entry";

    return (
        <TooltipProvider>
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBack}
                                className="hover:bg-accent hover:text-accent-foreground"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2"/>
                                Back
                            </Button>

                            <div className="flex items-center gap-2">
                                {lastSaveError && (
                                    <Alert variant="destructive" className="w-auto">
                                        <AlertDescription>
                                            {lastSaveError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            onClick={onManualSave}
                                            disabled={isSaving || !hasUnsavedChanges}
                                        >
                                            <Save className="h-4 w-4 mr-2"/>
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {hasUnsavedChanges ? 'Save changes' : 'No unsaved changes'}
                                    </TooltipContent>
                                </Tooltip>

                                {entryId && (
                                    <>
                                        <Separator orientation="vertical" className="h-6" />
                                        {/* Fixed the nested button issue by wrapping in div */}
                                        <div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div>
                                                        <ChangelogActionRequest
                                                            projectId={projectId}
                                                            entryId={entryId}
                                                            action={currentPublishStatus ? "UNPUBLISH" : "PUBLISH"}
                                                            title={title}
                                                            isPublished={currentPublishStatus}
                                                            variant="default"
                                                            disabled={!canPublish && !currentPublishStatus}
                                                            onSuccess={handleActionSuccess}
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {publishTooltip}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div>
                                            <ChangelogActionRequest
                                                projectId={projectId}
                                                entryId={entryId}
                                                action="DELETE"
                                                title={title}
                                                variant="destructive"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                                <h1 className="text-2xl font-bold truncate flex-1">
                                    {title || 'Untitled Entry'}
                                </h1>
                                {/* AI Title Generator if API key is available */}
                                {aiApiKey && (
                                    <AITitleGenerator
                                        content={content}
                                        onSelectTitle={onTitleChange}
                                        apiKey={aiApiKey}
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Use the fixed TagSelector with the original name */}
                                <TagSelector
                                    selectedTags={selectedTags}
                                    availableTags={availableTags}
                                    onTagsChange={onTagsChange}
                                    content={content}
                                    aiApiKey={aiApiKey}
                                    projectId={projectId}
                                />

                                <VersionSelector
                                    version={version}
                                    onVersionChange={onVersionChange}
                                    projectId={projectId}
                                />
                            </div>
                        </div>

                        {hasUnsavedChanges && (
                            <div className="text-sm text-muted-foreground">
                                You have unsaved changes
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default EditorHeader;