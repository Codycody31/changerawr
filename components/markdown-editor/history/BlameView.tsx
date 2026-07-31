'use client';

import React, {useMemo} from 'react';
import {formatDistanceToNow} from 'date-fns';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {getGravatarUrl} from '@/lib/utils/gravatar';
import {REVISION_REASON_LABELS} from '@/components/markdown-editor/history/revision-reasons';
import {cn} from '@/lib/utils';

export interface BlameLine {
    text: string;
    revisionId: string;
}

export interface BlameRevisionInfo {
    createdAt: string;
    reason: string;
    version: string | null;
    linesAdded: number;
    linesRemoved: number;
    createdBy: { id: string; name: string | null; email: string } | null;
}

interface BlameGroup {
    revisionId: string;
    info?: BlameRevisionInfo;
    lines: string[];
}

function groupLines(lines: BlameLine[], revisions: Record<string, BlameRevisionInfo>): BlameGroup[] {
    const groups: BlameGroup[] = [];

    for (const line of lines) {
        const last = groups[groups.length - 1];

        if (last && last.revisionId === line.revisionId) {
            last.lines.push(line.text);
        } else {
            groups.push({revisionId: line.revisionId, info: revisions[line.revisionId], lines: [line.text]});
        }
    }

    return groups;
}

const ACCENT_COLORS = [
    {avatar: 'bg-blue-500', tint: 'bg-blue-500/5'},
    {avatar: 'bg-amber-500', tint: 'bg-amber-500/5'},
    {avatar: 'bg-emerald-500', tint: 'bg-emerald-500/5'},
    {avatar: 'bg-purple-500', tint: 'bg-purple-500/5'},
    {avatar: 'bg-rose-500', tint: 'bg-rose-500/5'},
    {avatar: 'bg-cyan-500', tint: 'bg-cyan-500/5'},
];

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatVersion(version: string): string {
    return version.toLowerCase().startsWith('v') ? version : `v${version}`;
}

/** Renders a snapshot's content with each line attributed to the revision and author that last changed it, like `git blame`. */
export function BlameView({lines, revisions, className}: {
    lines: BlameLine[];
    revisions: Record<string, BlameRevisionInfo>;
    className?: string;
}) {
    const groups = useMemo(() => groupLines(lines, revisions), [lines, revisions]);

    const accentByRevision = useMemo(() => {
        const map = new Map<string, typeof ACCENT_COLORS[number]>();
        let colorIndex = 0;

        for (const group of groups) {
            if (!map.has(group.revisionId)) {
                map.set(group.revisionId, ACCENT_COLORS[colorIndex % ACCENT_COLORS.length]);
                colorIndex++;
            }
        }

        return map;
    }, [groups]);

    if (lines.length === 0) {
        return (
            <div className={cn('flex h-32 items-center justify-center text-sm text-muted-foreground', className)}>
                Empty
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={150}>
            <ScrollArea className={cn('h-[50vh] rounded-md border', className)}>
                <div className="font-mono text-xs">
                    {groups.map((group, groupIndex) => {
                        const author = group.info?.createdBy?.name || group.info?.createdBy?.email || 'Unknown';
                        const reasonLabel = group.info ? (REVISION_REASON_LABELS[group.info.reason] ?? group.info.reason) : 'Unknown';
                        const time = group.info
                            ? formatDistanceToNow(new Date(group.info.createdAt), {addSuffix: true})
                            : '';
                        const accent = accentByRevision.get(group.revisionId) ?? ACCENT_COLORS[0];

                        return (
                            <div key={groupIndex} className={cn('flex', accent.tint)}>
                                <div className="flex w-8 shrink-0 flex-col items-center border-r py-0.5">
                                    {group.lines.map((_, lineIndex) => (
                                        <div key={lineIndex} className="flex h-5 w-full items-center justify-center">
                                            {lineIndex === 0 && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="h-4 w-4 cursor-default">
                                                            {group.info?.createdBy?.email && (
                                                                <AvatarImage
                                                                    src={getGravatarUrl(group.info.createdBy.email, 32)}
                                                                    alt={author}
                                                                />
                                                            )}
                                                            <AvatarFallback className={cn('text-[8px] font-semibold text-white', accent.avatar)}>
                                                                {getInitials(author)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        <div className="font-medium">{author}</div>
                                                        <div className="text-muted-foreground">
                                                            {reasonLabel}
                                                            {group.info?.version ? ` · ${formatVersion(group.info.version)}` : ''}
                                                            {time ? ` · ${time}` : ''}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="min-w-0 flex-1">
                                    {group.lines.map((text, lineIndex) => (
                                        <div key={lineIndex} title={text} className="h-5 truncate px-3 leading-5">
                                            {text || ' '}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </TooltipProvider>
    );
}
