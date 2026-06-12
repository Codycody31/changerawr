// components/markdown-editor/history/VersionHistoryPanel.tsx

'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {diffLines} from 'diff';
import {formatDistanceToNow} from 'date-fns';
import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {useDebounce} from 'use-debounce';
import {History, Loader2, Pin, Search, X} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {DiffView} from '@/components/markdown-editor/history/DiffView';
import {PreviewView} from '@/components/markdown-editor/history/PreviewView';
import {RawView} from '@/components/markdown-editor/history/RawView';
import {ViewModeTabs, DetailViewMode} from '@/components/markdown-editor/history/ViewModeTabs';
import {RevisionDetailPanel} from '@/components/markdown-editor/history/RevisionDetailPanel';
import {REVISION_REASON_LABELS, getRevisionDisplay} from '@/components/markdown-editor/history/revision-reasons';
import type {ToolbarHistoryEntry, MarkdownToolbarProps} from '@/components/markdown-editor/MarkdownToolbar';

/** Word count for a content snapshot, used for history deltas. */
function countWords(text: string): number {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}

interface SavedRevisionListItem {
    id: string;
    title: string;
    version: string | null;
    reason: string;
    linesAdded: number;
    linesRemoved: number;
    createdAt: string;
    restoredFromId: string | null;
    restoredFrom: {
        id: string;
        title: string;
        reason: string;
        label: string | null;
        icon: string | null;
        color: string | null;
        createdAt: string
    } | null;
    label: string | null;
    icon: string | null;
    color: string | null;
    pinned: boolean;
    createdBy: { id: string; name: string | null; email: string } | null;
}

interface SavedRevisionsPage {
    revisions: SavedRevisionListItem[];
    nextCursor: string | null;
}

function formatRevisionVersion(version: string): string {
    return version.toLowerCase().startsWith('v') ? version : `v${version}`;
}

/** Compact relative time, e.g. "2h", "3d", "just now" — for tight list rows where `formatDistanceToNow` is too verbose. */
function formatShortRelativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;

    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;

    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d`;

    const diffMonth = Math.round(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo`;

    return `${Math.round(diffMonth / 12)}y`;
}

interface ChangeSummary {
    type: 'added' | 'removed' | 'none';
    text: string;
}

/** Summarizes what actually changed between two content snapshots, for sidebar previews. */
function getChangeSummary(prevContent: string, content: string): ChangeSummary {
    if (!prevContent) {
        const firstLine = content.split('\n').find((line) => line.trim().length > 0);
        return {type: 'none', text: firstLine ? firstLine.trim().slice(0, 80) : 'Empty document'};
    }

    for (const change of diffLines(prevContent, content)) {
        if (!change.added && !change.removed) continue;
        const firstLine = change.value.split('\n').find((line) => line.trim().length > 0);
        if (!firstLine) continue;
        return {type: change.added ? 'added' : 'removed', text: firstLine.trim().slice(0, 78)};
    }

    return {type: 'none', text: 'No changes'};
}

/** Sidebar list of this session's edit snapshots. */
function SessionList({entries, selectedIndex, currentIndex, onSelect}: {
    entries: ToolbarHistoryEntry[];
    selectedIndex: number | null;
    currentIndex: number;
    onSelect: (index: number) => void;
}) {
    const rows = useMemo(() => {
        return entries
            .map((entry, index) => {
                const prevContent = index > 0 ? entries[index - 1].content : '';
                return {
                    entry,
                    index,
                    wordDelta: index === 0 ? 0 : countWords(entry.content) - countWords(prevContent),
                    changeSummary: getChangeSummary(prevContent, entry.content),
                };
            })
            .reverse();
    }, [entries]);

    return (
        <ScrollArea className="min-h-0 flex-1">
            {entries.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No snapshots yet — they appear here as you edit.
                </div>
            ) : (
                <ol className="flex flex-col gap-0.5 p-2">
                    {rows.map(({entry, index, wordDelta, changeSummary}) => {
                        const isSelected = index === selectedIndex;
                        const isCurrent = index === currentIndex;

                        return (
                            <li key={`${entry.timestamp}-${index}`}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(index)}
                                    className={cn(
                                        'flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent',
                                        isSelected && 'bg-accent'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={cn('text-xs font-semibold', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                                            {formatDistanceToNow(entry.timestamp, {addSuffix: true})}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {wordDelta !== 0 && (
                                                <span className={cn(
                                                    'text-[10px] tabular-nums',
                                                    wordDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                                                )}>
                                                    {wordDelta > 0 ? `+${wordDelta}` : wordDelta}
                                                </span>
                                            )}
                                            {isCurrent && (
                                                <Badge variant="secondary"
                                                       className="px-1.5 py-0 text-[10px] font-normal">
                                                    Current
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {index === 0 ? 'Initial version' : `Edit #${index}`}
                                    </span>
                                    <p className={cn(
                                        'truncate text-xs',
                                        changeSummary.type === 'added' && 'text-emerald-600 dark:text-emerald-400',
                                        changeSummary.type === 'removed' && 'text-red-500 dark:text-red-400',
                                        changeSummary.type === 'none' && 'text-muted-foreground/80'
                                    )}>
                                        {changeSummary.type === 'added' && '+ '}
                                        {changeSummary.type === 'removed' && '− '}
                                        {changeSummary.text}
                                    </p>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}
        </ScrollArea>
    );
}

/** Detail pane showing the selected session snapshot's diff vs. its predecessor. */
function SessionDetail({entries, selectedIndex, currentIndex, onJump}: {
    entries: ToolbarHistoryEntry[];
    selectedIndex: number | null;
    currentIndex: number;
    onJump: (index: number) => void;
}) {
    const [viewMode, setViewMode] = useState<DetailViewMode>('diff');
    const entry = selectedIndex !== null ? entries[selectedIndex] : undefined;

    const diff = useMemo(() => {
        if (!entry || selectedIndex === null) return [];
        const prevContent = selectedIndex > 0 ? entries[selectedIndex - 1].content : '';
        return diffLines(prevContent, entry.content);
    }, [entry, selectedIndex, entries]);

    if (!entry || selectedIndex === null) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Select a snapshot from the timeline to preview it here.
            </div>
        );
    }

    const isCurrent = selectedIndex === currentIndex;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 shrink-0">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">
                        {selectedIndex === 0 ? 'Initial version' : `Edit #${selectedIndex}`}
                    </h3>
                    {isCurrent && <Badge variant="secondary">Current</Badge>}
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(entry.timestamp, {addSuffix: true})}
                    </span>
                </div>
                <ViewModeTabs value={viewMode} onChange={setViewMode}/>
            </div>
            <div className="min-h-0 flex-1 p-3">
                {viewMode === 'diff' && <DiffView diff={diff} className="h-full"/>}
                {viewMode === 'preview' && <PreviewView content={entry.content} className="h-full"/>}
                {viewMode === 'raw' && <RawView content={entry.content} className="h-full"/>}
            </div>
            <div className="flex shrink-0 justify-end border-t p-3">
                <Button variant="outline" disabled={isCurrent} onClick={() => onJump(selectedIndex)}>
                    {isCurrent ? 'Currently active' : 'Jump to this snapshot'}
                </Button>
            </div>
        </div>
    );
}

/** Sidebar list of DB-persisted, git-log-style saved version checkpoints. */
function SavedList({
                       revisions,
                       isLoading,
                       hasNextPage,
                       isFetchingNextPage,
                       fetchNextPage,
                       selectedRevisionId,
                       onSelect,
                       search,
                       onSearchChange,
                   }: {
    revisions: SavedRevisionListItem[];
    isLoading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    selectedRevisionId: string | null;
    onSelect: (revisionId: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
}) {
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting && !isFetchingNextPage) {
                fetchNextPage();
            }
        }, {rootMargin: '150px'});

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col gap-1.5 px-2 pt-2">
                <div className="flex items-center justify-between gap-1.5">
                    <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Saved versions
                    </span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn('relative h-6 w-6', search && 'text-primary')}
                                title="Search saved versions"
                            >
                                <Search className="h-3.5 w-3.5"/>
                                {search && (
                                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary"/>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 p-2">
                            <div className="relative">
                                <Input
                                    autoFocus
                                    placeholder="Search title, label, version…"
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="h-8 pr-7 text-xs"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => onSearchChange('')}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5"/>
                                    </button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                {search && (
                    <div className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
                        <Search className="h-2.5 w-2.5 shrink-0"/>
                        <span className="min-w-0 truncate">
                            Searching for &ldquo;{search}&rdquo;
                        </span>
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="shrink-0 hover:text-foreground"
                        >
                            <X className="h-3 w-3"/>
                        </button>
                    </div>
                )}
            </div>
            <ScrollArea className="min-h-0 flex-1">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <LucideIcons.Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                    </div>
                ) : revisions.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                        {search ? 'No matching saved versions' : 'No saved versions yet'}
                    </div>
                ) : (
                    <ol className="flex flex-col gap-0.5 p-2">
                        {revisions.map((revision) => {
                            const isSelected = revision.id === selectedRevisionId;
                            const restoredFrom = revision.restoredFrom;
                            const reasonLabel = REVISION_REASON_LABELS[revision.reason] ?? revision.reason;
                            const {
                                Icon: DisplayIcon,
                                label: displayLabel,
                                color: displayColor
                            } = getRevisionDisplay(revision);
                            const author = revision.createdBy?.name || revision.createdBy?.email;
                            const tooltipLines = [
                                revision.pinned ? 'Pinned' : null,
                                revision.label ? reasonLabel : null,
                                restoredFrom
                                    ? `Restored from ${getRevisionDisplay(restoredFrom).label} · ${formatDistanceToNow(new Date(restoredFrom.createdAt), {addSuffix: true})}`
                                    : null,
                                formatDistanceToNow(new Date(revision.createdAt), {addSuffix: true}),
                                author ?? null,
                            ].filter((line): line is string => !!line);

                            return (
                                <li key={revision.id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(revision.id)}
                                        className={cn(
                                            'flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
                                            isSelected && 'bg-accent'
                                        )}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span
                                                    className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', !displayColor && 'bg-muted')}
                                                    style={displayColor ? {
                                                        backgroundColor: `${displayColor}1a`,
                                                        color: displayColor
                                                    } : undefined}
                                                >
                                                    <DisplayIcon
                                                        className={cn('h-3.5 w-3.5', !displayColor && 'text-muted-foreground')}/>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-[220px]">
                                                {tooltipLines.map((line, i) => <div key={i}>{line}</div>)}
                                            </TooltipContent>
                                        </Tooltip>
                                        <span
                                            className={cn('min-w-0 flex-1 truncate text-xs font-semibold', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                                            {displayLabel}
                                        </span>
                                        {revision.pinned && (
                                            <Pin className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500"/>
                                        )}
                                        <span className="shrink-0 text-[10px] text-muted-foreground">
                                            {formatShortRelativeTime(new Date(revision.createdAt))}
                                        </span>
                                        {(revision.linesAdded > 0 || revision.linesRemoved > 0) && (
                                            <div className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums">
                                                {revision.linesAdded > 0 && (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                        +{revision.linesAdded}
                                                    </span>
                                                )}
                                                {revision.linesRemoved > 0 && (
                                                    <span className="text-red-500 dark:text-red-400">
                                                        -{revision.linesRemoved}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {revision.version && (
                                            <Badge variant="outline"
                                                   className="shrink-0 px-1 py-0 text-[10px] font-normal">
                                                {formatRevisionVersion(revision.version)}
                                            </Badge>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                )}
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex h-8 items-center justify-center">
                        {isFetchingNextPage && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground"/>
                        )}
                    </div>
                )}
            </ScrollArea>
        </TooltipProvider>
    );
}

const panelVariants = {
    hidden: {opacity: 0, x: '100%'},
    visible: {opacity: 1, x: 0},
    exit: {opacity: 0, x: '100%'},
};

export interface VersionHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history?: ToolbarHistoryEntry[];
    historyIndex?: number;
    onJumpToHistory?: (index: number) => void;
    versionHistory?: MarkdownToolbarProps['versionHistory'];
}

/**
 * Slide-out, git-client-style version history panel matching the AI
 * assistant / spellcheck panel pop-out style. A sidebar lists this session's
 * edit snapshots (and, when `versionHistory` is provided, a second tab with
 * DB-persisted saved checkpoints), while the main pane shows a diff for
 * whichever entry is selected — with "jump to" / "restore" actions.
 */
export function VersionHistoryPanel({
                                        history,
                                        historyIndex,
                                        onJumpToHistory,
                                        versionHistory,
                                        isOpen,
                                        onClose
                                    }: VersionHistoryPanelProps) {
    const entries = useMemo(() => history ?? [], [history]);
    const currentIndex = historyIndex ?? entries.length - 1;

    const [activeTab, setActiveTab] = useState<'session' | 'saved'>('session');
    const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
    const [savedSearchInput, setSavedSearchInput] = useState('');
    const [savedSearch] = useDebounce(savedSearchInput.trim(), 400);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedSessionIndex((prev) => prev ?? (entries.length > 0 ? currentIndex : null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Lightweight count, fetched as soon as the panel is opened so the "Saved" tab
    // badge shows the real total without paginating through the full (potentially
    // 2,000+ item) revision list.
    const {data: countData} = useQuery({
        queryKey: ['changelog-revisions-count', versionHistory?.projectId, versionHistory?.entryId],
        queryFn: async (): Promise<{ count: number }> => {
            const {projectId, entryId} = versionHistory!;
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/count`);
            if (!res.ok) throw new Error('Failed to load saved version count');
            return res.json();
        },
        enabled: !!versionHistory && isOpen,
    });

    // Paginated revision content, lazy-loaded only once the "Saved" tab is opened.
    const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useInfiniteQuery({
        queryKey: ['changelog-revisions', versionHistory?.projectId, versionHistory?.entryId, savedSearch],
        queryFn: async ({pageParam}: { pageParam?: string }): Promise<SavedRevisionsPage> => {
            const {projectId, entryId} = versionHistory!;
            const url = new URL(`/api/projects/${projectId}/changelog/${entryId}/revisions`, window.location.origin);
            if (pageParam) url.searchParams.set('cursor', pageParam);
            if (savedSearch) url.searchParams.set('search', savedSearch);
            const res = await fetch(url.toString().replace(window.location.origin, ''));
            if (!res.ok) throw new Error('Failed to load saved versions');
            return res.json();
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!versionHistory && isOpen && activeTab === 'saved',
    });

    const revisions = useMemo(() => data?.pages.flatMap((page) => page.revisions) ?? [], [data]);

    useEffect(() => {
        if (!selectedRevisionId && revisions.length > 0) {
            setSelectedRevisionId(revisions[0].id);
        }
    }, [revisions, selectedRevisionId]);

    const jump = (index: number) => {
        onJumpToHistory?.(index);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-end overflow-hidden"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full sm:w-[94vw] md:w-[760px] lg:w-[880px] xl:w-[1000px] bg-background border-l border-t sm:border rounded-tl-lg sm:rounded-lg shadow-2xl overflow-hidden sm:mr-6 sm:my-6 max-h-[92vh] flex flex-col h-[82vh]"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{type: 'spring', damping: 30, stiffness: 300}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b bg-muted/40 shrink-0">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="shrink-0 rounded-md bg-muted p-1.5">
                                    <History className="h-5 w-5"/>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-semibold leading-none">Version History</h2>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {versionHistory ? 'Session edits and saved checkpoints' : "This session's snapshots"}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 shrink-0 p-0">
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                            <div
                                className="flex min-h-0 max-h-[40vh] shrink-0 flex-col border-b sm:h-full sm:max-h-none sm:w-[300px] sm:border-b-0 sm:border-r">
                                {versionHistory && (
                                    <Tabs
                                        value={activeTab}
                                        onValueChange={(value) => setActiveTab(value as 'session' | 'saved')}
                                        className="shrink-0"
                                    >
                                        <TabsList className="m-2 mb-0 grid w-[calc(100%-1rem)] grid-cols-2">
                                            <TabsTrigger value="session" className="gap-1.5 text-xs">
                                                Session
                                                {entries.length > 0 && (
                                                    <Badge variant="secondary"
                                                           className="h-4 min-w-4 justify-center px-1 text-[10px] font-normal">
                                                        {entries.length}
                                                    </Badge>
                                                )}
                                            </TabsTrigger>
                                            <TabsTrigger value="saved" className="gap-1.5 text-xs">
                                                Saved
                                                {countData !== undefined && countData.count > 0 && (
                                                    <Badge variant="secondary"
                                                           className="h-4 min-w-4 justify-center px-1 text-[10px] font-normal">
                                                        {countData.count}
                                                    </Badge>
                                                )}
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                )}
                                <div className="flex min-h-0 flex-1 flex-col">
                                    {activeTab === 'saved' && versionHistory ? (
                                        <SavedList
                                            revisions={revisions}
                                            isLoading={isLoading}
                                            hasNextPage={!!hasNextPage}
                                            isFetchingNextPage={isFetchingNextPage}
                                            fetchNextPage={fetchNextPage}
                                            selectedRevisionId={selectedRevisionId}
                                            onSelect={setSelectedRevisionId}
                                            search={savedSearchInput}
                                            onSearchChange={setSavedSearchInput}
                                        />
                                    ) : (
                                        <SessionList
                                            entries={entries}
                                            selectedIndex={selectedSessionIndex}
                                            currentIndex={currentIndex}
                                            onSelect={setSelectedSessionIndex}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                {activeTab === 'saved' && versionHistory ? (
                                    selectedRevisionId ? (
                                        <RevisionDetailPanel
                                            projectId={versionHistory.projectId}
                                            entryId={versionHistory.entryId}
                                            revisionId={selectedRevisionId}
                                            onRestore={versionHistory.onRestore}
                                            onJumpToRevision={setSelectedRevisionId}
                                        />
                                    ) : (
                                        <div
                                            className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                            {isLoading ? 'Loading saved versions…' : 'Select a saved version to preview it here.'}
                                        </div>
                                    )
                                ) : (
                                    <SessionDetail
                                        entries={entries}
                                        selectedIndex={selectedSessionIndex}
                                        currentIndex={currentIndex}
                                        onJump={jump}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
