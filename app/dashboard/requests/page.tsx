'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Role } from '@prisma/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CheckCircle, Clock, XCircle, ArrowUpRight,
    FileText, Tag, Package, Send, Inbox, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestData {
    id: string;
    type: string;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
    project: { id: string; name: string };
    ChangelogEntry?: { id: string; title: string } | null;
    ChangelogTag?: { id: string; name: string } | null;
    admin?: { id: string; name: string | null; email: string } | null;
    metadata?: { feedback?: string; [key: string]: unknown } | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'changes';

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    DELETE_ENTRY:   { label: 'Delete entry',   icon: FileText, color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
    DELETE_TAG:     { label: 'Delete tag',     icon: Tag,      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    DELETE_PROJECT: { label: 'Delete project', icon: Package,  color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
    ALLOW_PUBLISH:  { label: 'Publish entry',  icon: Send,     color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    ALLOW_SCHEDULE: { label: 'Schedule entry', icon: Clock,    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
};

const STATUS_COLORS: Record<string, string> = {
    PENDING:           'border-l-amber-400',
    APPROVED:          'border-l-green-500',
    REJECTED:          'border-l-red-500',
    CHANGES_REQUESTED: 'border-l-orange-400',
};

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { icon: React.ElementType; label: string; className: string }> = {
        PENDING:           { icon: Clock,           label: 'Pending',          className: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' },
        APPROVED:          { icon: CheckCircle,     label: 'Approved',         className: 'text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400' },
        REJECTED:          { icon: XCircle,         label: 'Rejected',         className: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400' },
        CHANGES_REQUESTED: { icon: MessageSquare,   label: 'Changes requested', className: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400' },
    };
    const v = variants[status] ?? { icon: Clock, label: status, className: '' };
    const Icon = v.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', v.className)}>
            <Icon className="h-3 w-3" />{v.label}
        </span>
    );
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
        >
            {label}
            {count > 0 && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20')}>
                    {count}
                </span>
            )}
        </button>
    );
}

export default function RequestsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('all');

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user && user.role === Role.VIEWER) {
            router.push('/dashboard');
            toast({ title: 'Access Denied', variant: 'destructive' });
            return;
        }
        if (!user) return;

        (async () => {
            try {
                const res = await fetch('/api/requests');
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
                const data = await res.json();
                setRequests(data.requests);
            } catch (err) {
                toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        })();
    }, [user, authLoading, router, toast]);

    const counts = {
        all:      requests.length,
        pending:  requests.filter(r => r.status === 'PENDING').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length,
        changes:  requests.filter(r => r.status === 'CHANGES_REQUESTED').length,
    };

    const visible = filter === 'all' ? requests
        : filter === 'changes' ? requests.filter(r => r.status === 'CHANGES_REQUESTED')
        : requests.filter(r => r.status.toLowerCase() === filter);

    const getTargetLabel = (r: RequestData) => {
        if (r.ChangelogEntry) return r.ChangelogEntry.title;
        if (r.ChangelogTag) return r.ChangelogTag.name || r.ChangelogTag.id;
        return r.project.name;
    };

    const getEntryPath = (r: RequestData): string | null => {
        if (r.ChangelogEntry) return `/dashboard/projects/${r.project.id}/changelog/${r.ChangelogEntry.id}`;
        return null;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Track approval requests you've submitted.
                    </p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-fit">
                {([
                    { key: 'all',      label: 'All' },
                    { key: 'pending',  label: 'Pending' },
                    { key: 'changes',  label: 'Changes' },
                    { key: 'approved', label: 'Approved' },
                    { key: 'rejected', label: 'Rejected' },
                ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
                    <FilterTab
                        key={key}
                        label={label}
                        count={key === 'all' ? 0 : (counts as Record<string, number>)[key] ?? 0}
                        active={filter === key}
                        onClick={() => setFilter(key)}
                    />
                ))}
            </div>

            {/* List */}
            <AnimatePresence mode="wait">
                {visible.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Inbox className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="font-medium">No {filter !== 'all' ? filter : ''} requests</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {filter === 'pending' ? "Nothing waiting for approval." : "Nothing here yet."}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        {visible.map((request, i) => {
                            const meta = TYPE_META[request.type] ?? { label: request.type, icon: FileText, color: 'text-muted-foreground bg-muted' };
                            const Icon = meta.icon;
                            const entryPath = getEntryPath(request);
                            const reviewer = request.admin?.name || request.admin?.email;

                            const feedback = request.metadata?.feedback;
                            const isChangesRequested = request.status === 'CHANGES_REQUESTED';

                            return (
                                <motion.div
                                    key={request.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={cn(
                                        'rounded-xl border bg-card shadow-sm border-l-4 overflow-hidden',
                                        STATUS_COLORS[request.status] ?? 'border-l-border'
                                    )}
                                >
                                    <div className="flex items-center gap-4 px-4 py-3.5">
                                        {/* Type icon */}
                                        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium truncate">{getTargetLabel(request)}</span>
                                                <StatusBadge status={request.status} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                <span>{meta.label}</span>
                                                <span>·</span>
                                                <span>{request.project.name}</span>
                                                <span>·</span>
                                                <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
                                                {reviewer && request.status !== 'PENDING' && (
                                                    <>
                                                        <span>·</span>
                                                        <span>by {reviewer}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {isChangesRequested && entryPath && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                                                    onClick={() => router.push(entryPath)}
                                                >
                                                    Address changes
                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!isChangesRequested && entryPath && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 gap-1 text-xs"
                                                    onClick={() => router.push(entryPath)}
                                                >
                                                    View entry
                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-1 text-xs text-muted-foreground"
                                                onClick={() => router.push(`/dashboard/projects/${request.project.id}`)}
                                            >
                                                Project
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Feedback / notes block — shown for any status that has metadata.feedback */}
                                    {feedback && (
                                        <div className={cn(
                                            'border-t px-4 py-3',
                                            isChangesRequested
                                                ? 'border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20'
                                                : 'border-border/50 bg-muted/30'
                                        )}>
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', isChangesRequested ? 'text-orange-500' : 'text-muted-foreground')} />
                                                <div>
                                                    <p className={cn('text-xs font-medium mb-0.5', isChangesRequested ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground')}>
                                                        Note from {reviewer ?? 'admin'}
                                                    </p>
                                                    <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', isChangesRequested ? 'text-orange-800 dark:text-orange-300' : 'text-foreground')}>
                                                        {feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
