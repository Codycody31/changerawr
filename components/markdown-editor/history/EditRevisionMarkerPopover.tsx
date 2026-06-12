'use client';

import React, {useEffect, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Pencil} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {IconPicker} from '@/components/ui/icon-picker';
import {ColorPicker} from '@/components/changelog/editor/TagColorPicker';
import {MAX_REVISION_LABEL_LENGTH} from '@/lib/constants/revision-markers';
import {toast} from '@/hooks/use-toast';

export interface EditRevisionMarkerPopoverProps {
    projectId: string;
    entryId: string;
    revisionId: string;
    label: string | null;
    icon: string | null;
    color: string | null;
}

interface MarkerData {
    label: string | null;
    icon: string | null;
    color: string | null;
}

/** Popover for setting a custom label/icon/color marker on a saved revision, to highlight it in the history timeline. */
export function EditRevisionMarkerPopover({projectId, entryId, revisionId, label, icon, color}: EditRevisionMarkerPopoverProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [draftLabel, setDraftLabel] = useState(label ?? '');
    const [draftIcon, setDraftIcon] = useState<string | null>(icon);
    const [draftColor, setDraftColor] = useState<string | null>(color);

    useEffect(() => {
        if (isOpen) {
            setDraftLabel(label ?? '');
            setDraftIcon(icon);
            setDraftColor(color);
        }
    }, [isOpen, label, icon, color]);

    const mutation = useMutation({
        mutationFn: async (data: MarkerData) => {
            const res = await fetch(`/api/projects/${projectId}/changelog/${entryId}/revisions/${revisionId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update marker');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['changelog-revisions', projectId, entryId]});
            queryClient.invalidateQueries({queryKey: ['changelog-revision', projectId, entryId, revisionId]});
            setIsOpen(false);
        },
        onError: (error: Error) => {
            toast({title: 'Failed to update marker', description: error.message, variant: 'destructive'});
        },
    });

    const handleSave = () => {
        mutation.mutate({
            label: draftLabel.trim() || null,
            icon: draftIcon,
            color: draftColor,
        });
    };

    const handleClear = () => {
        mutation.mutate({label: null, icon: null, color: null});
    };

    const hasMarker = !!(label || icon || color);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Edit marker">
                    <Pencil className="h-3.5 w-3.5"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Label</label>
                        <Input
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            maxLength={MAX_REVISION_LABEL_LENGTH}
                            placeholder="e.g. Pre-launch"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <IconPicker value={draftIcon} onChange={setDraftIcon}/>
                        <ColorPicker value={draftColor} onChange={setDraftColor} minimal/>
                        <div className="ml-auto flex items-center gap-2">
                            {hasMarker && (
                                <Button variant="ghost" size="sm" onClick={handleClear} disabled={mutation.isPending}>
                                    Clear
                                </Button>
                            )}
                            <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
