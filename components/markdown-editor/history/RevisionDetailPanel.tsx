// components/markdown-editor/history/RevisionDetailPanel.tsx

'use client';

import React, {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {formatDistanceToNow} from 'date-fns';
import {Loader2, Undo2} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {DiffView, DiffHunk} from '@/components/markdown-editor/history/DiffView';
import {PreviewView} from '@/components/markdown-editor/history/PreviewView';
import {RawView} from '@/components/markdown-editor/history/RawView';
import {BlameView, BlameLine, BlameRevisionInfo} from '@/components/markdown-editor/history/BlameView';
import {ViewModeTabs, DetailViewMode} from '@/components/markdown-editor/history/ViewModeTabs';
import {getRevisionDisplay} from '@/components/markdown-editor/history/revision-reasons';
import {EditRevisionMarkerPopover} from '@/components/markdown-editor/history/EditRevisionMarkerPopover';
import {PinRevisionButton} from '@/components/markdown-editor/history/PinRevisionButton';
import {toast} from '@/hooks/use-toast';

interface RevisionDetail {
    id: string;
    title: string;
    content: string;
    version: string | null;
    reason: string;
    linesAdded: number;
    linesRemoved: number;
    createdAt: string;
    label: string | null;
    icon: string | null;
    color: string | null;
    pinned: boolean;
    createdBy: { id: string; name: string | null; email: string } | null;
}

interface RestoredFromInfo {
    id: string;
    title: string;
    reason: string;
    label: string | null;
    icon: string | null;
    color: string | null;
    createdAt: string;
}

interface RevisionDetailResponse {
    revision: RevisionDetail;
    previous: { id: string; createdAt: string } | null;
    restoredFrom: RestoredFromInfo | null;
    diff: DiffHunk[];
}

interface RevisionBlameResponse {
    lines: BlameLine[];
    revisions: Record<string, BlameRevisionInfo>;
}

function formatVersion(version: string): string {
    return version.toLowerCase().startsWith('v') ? version : `v${version}`;
}

export interface RevisionDetailPanelProps {
    projectId: string;
    entryId: string;
    revisionId: string;
    onRestore?: (revision: { title: string; content: string; version: string | null }) => void;
    onJumpToRevision?: (revisionId: string) => void;
}

/** Shows a saved revision's metadata and diff vs. its predecessor, with an inline restore action. */
export function RevisionDetailPanel({projectId, entryId, revisionId, onRestore, onJumpToRevision}: RevisionDetailPanelProps) {
    const queryClient = useQueryClient();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [viewMode, setViewMode] = useState<DetailViewMode>('diff');

    const {data, isLoading} = useQuery({
        queryKey: ['changelog-revision', projectId, entryId, revisionId],
        queryFn: async (): Promise<RevisionDetailResponse> => {
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/${revisionId}`);
            if (!res.ok) throw new Error('Failed to load revision');
            return res.json();
        },
    });

    const {data: blameData, isLoading: isBlameLoading} = useQuery({
        queryKey: ['changelog-revision-blame', projectId, entryId, revisionId],
        queryFn: async (): Promise<RevisionBlameResponse> => {
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/${revisionId}/blame`);
            if (!res.ok) throw new Error('Failed to load blame');
            return res.json();
        },
        enabled: viewMode === 'blame',
    });

    const restoreMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/${revisionId}/restore`, {
                method: 'POST',
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to restore version');
            }
            return res.json();
        },
        onSuccess: (result) => {
            onRestore?.({
                title: result.entry.title,
                content: result.entry.content,
                version: result.entry.version,
            });
            queryClient.invalidateQueries({queryKey: ['changelog-revisions', projectId, entryId]});
            queryClient.invalidateQueries({queryKey: ['project-versions', projectId]});
            toast({
                title: 'Version restored',
                description: 'The entry has been reverted to the selected version.',
            });
            setConfirmOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Restore failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    if (isLoading || !data) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    const revision = data.revision;
    const {Icon: MarkerIcon, label: markerLabel, color: markerColor} = getRevisionDisplay(revision);

    return (
        <TooltipProvider delayDuration={300}>
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-col gap-1.5 border-b p-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{revision.title}</h3>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[320px] break-words">
                            {revision.title}
                        </TooltipContent>
                    </Tooltip>
                    <ViewModeTabs value={viewMode} onChange={setViewMode} showBlame/>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="gap-1" customColor={markerColor ?? undefined}>
                        <MarkerIcon className="h-3 w-3"/>
                        {markerLabel}
                    </Badge>
                    {revision.version && <Badge variant="outline">{formatVersion(revision.version)}</Badge>}
                    {revision.linesAdded > 0 && (
                        <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{revision.linesAdded}
                        </span>
                    )}
                    {revision.linesRemoved > 0 && (
                        <span className="text-xs tabular-nums text-red-500 dark:text-red-400">
                            -{revision.linesRemoved}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(revision.createdAt), {addSuffix: true})}
                    </span>
                    {revision.createdBy && (
                        <span className="text-xs text-muted-foreground">
                            by {revision.createdBy.name || revision.createdBy.email}
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-0.5 rounded-md border p-0.5">
                        <PinRevisionButton
                            projectId={projectId}
                            entryId={entryId}
                            revisionId={revisionId}
                            pinned={revision.pinned}
                        />
                        <EditRevisionMarkerPopover
                            projectId={projectId}
                            entryId={entryId}
                            revisionId={revisionId}
                            label={revision.label}
                            icon={revision.icon}
                            color={revision.color}
                        />
                    </div>
                </div>
                {data.restoredFrom && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Undo2 className="h-3 w-3 shrink-0"/>
                        <span>Restored from</span>
                        <button
                            type="button"
                            onClick={() => onJumpToRevision?.(data.restoredFrom!.id)}
                            className="font-medium text-foreground hover:underline"
                        >
                            {getRevisionDisplay(data.restoredFrom).label}
                        </button>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(data.restoredFrom.createdAt), {addSuffix: true})}</span>
                    </div>
                )}
            </div>
            <div className="min-h-0 flex-1 p-3">
                {viewMode === 'diff' && <DiffView diff={data.diff} className="h-full"/>}
                {viewMode === 'preview' && <PreviewView content={revision.content} className="h-full"/>}
                {viewMode === 'raw' && <RawView content={revision.content} className="h-full"/>}
                {viewMode === 'blame' && (
                    isBlameLoading || !blameData ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                        </div>
                    ) : (
                        <BlameView lines={blameData.lines} revisions={blameData.revisions} className="h-full"/>
                    )
                )}
            </div>
            <div className="flex shrink-0 justify-end border-t p-3">
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={restoreMutation.isPending}>
                            Restore this version
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will overwrite the current title, content, and version with this
                                snapshot. Tags are not affected. Your current draft content will be
                                replaced — this can be undone by restoring a different version.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={restoreMutation.isPending}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    restoreMutation.mutate();
                                }}
                                disabled={restoreMutation.isPending}
                            >
                                {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Restore
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        </TooltipProvider>
    );
}
