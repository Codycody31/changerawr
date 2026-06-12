'use client';

import React from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Pin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {toast} from '@/hooks/use-toast';

export interface PinRevisionButtonProps {
    projectId: string;
    entryId: string;
    revisionId: string;
    pinned: boolean;
}

/** Toggle button for pinning a saved revision so it's surfaced at the top of the version history list. */
export function PinRevisionButton({projectId, entryId, revisionId, pinned}: PinRevisionButtonProps) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (next: boolean) => {
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/${revisionId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({pinned: next}),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update pin');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['changelog-revisions', projectId, entryId]});
            queryClient.invalidateQueries({queryKey: ['changelog-revision', projectId, entryId, revisionId]});
        },
        onError: (error: Error) => {
            toast({title: 'Failed to update pin', description: error.message, variant: 'destructive'});
        },
    });

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title={pinned ? 'Unpin this version' : 'Pin this version'}
            onClick={() => mutation.mutate(!pinned)}
            disabled={mutation.isPending}
        >
            <Pin className={cn('h-3.5 w-3.5', pinned && 'fill-amber-500 text-amber-500')}/>
        </Button>
    );
}
