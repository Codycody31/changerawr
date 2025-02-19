// components/changelog/ChangelogActionRequest.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2, BookCheck } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { Role } from '@prisma/client'

type ActionType = 'PUBLISH' | 'DELETE';

interface ChangelogActionRequestProps {
    projectId: string;
    entryId: string;
    action: ActionType;
    title: string;
    isPublished?: boolean;
    onSuccess?: () => void;
    className?: string;
}

export function ChangelogActionRequest({
                                           projectId,
                                           entryId,
                                           action,
                                           title,
                                           isPublished = false,
                                           onSuccess,
                                           className
                                       }: ChangelogActionRequestProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle publish action
    const publishEntry = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true);
            try {
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
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['changelog-entry', entryId]);
            toast({
                title: 'Entry Published',
                description: 'The changelog entry has been published successfully.'
            });
            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Publish',
                description: error.message || 'There was an error publishing the entry.',
                variant: 'destructive'
            });
            setIsOpen(false);
        }
    });

    // Handle delete action
    const deleteEntry = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true);
            try {
                const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to delete entry');
                }

                return response.json();
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['changelog-entries', projectId]);
            toast({
                title: 'Entry Deleted',
                description: 'The changelog entry has been deleted successfully.'
            });
            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            console.error('Delete error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete entry',
                variant: 'destructive'
            });
            setIsOpen(false);
        }
    });

    // Determine if user can perform the action
    const canPerformAction = user?.role === Role.ADMIN ||
        (user?.role === Role.STAFF && action === 'PUBLISH');

    if (!canPerformAction) return null;

    // Skip UI if action is publish and entry is already published
    if (action === 'PUBLISH' && isPublished) return null;

    const handleAction = () => {
        if (action === 'PUBLISH') {
            publishEntry.mutate();
        } else {
            deleteEntry.mutate();
        }
    };

    const getActionButton = () => {
        if (action === 'PUBLISH') {
            return (
                <Button
                    onClick={() => setIsOpen(true)}
                    disabled={isSubmitting}
                    className="gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            <BookCheck className="h-4 w-4" />
                            Publish
                        </>
                    )}
                </Button>
            );
        }

        return (
            <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsOpen(true)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {getActionButton()}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {action === 'PUBLISH' ? 'Publish Entry' : 'Delete Entry'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {action === 'PUBLISH'
                            ? `Are you sure you want to publish "${title}"? Published entries will be visible to all users.`
                            : `Are you sure you want to delete "${title}"? This action cannot be undone.`
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className={action === 'DELETE' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        onClick={handleAction}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {action === 'PUBLISH' ? 'Publishing...' : 'Deleting...'}
                            </>
                        ) : (
                            action === 'PUBLISH' ? 'Publish' : 'Delete'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}