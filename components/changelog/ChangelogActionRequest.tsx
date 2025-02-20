import {useState} from 'react'
import {useMutation, useQueryClient} from '@tanstack/react-query'
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
import {Button} from '@/components/ui/button'
import {useToast} from '@/hooks/use-toast'
import {Globe, Loader2, PackageOpen, Trash2} from 'lucide-react'
import {useAuth} from '@/context/auth'
import {Role} from '@prisma/client'

type ActionType = 'PUBLISH' | 'UNPUBLISH' | 'DELETE';

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
                                           onSuccess
                                       }: ChangelogActionRequestProps) {
    const {user} = useAuth();
    const {toast} = useToast();
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
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: action.toLowerCase()
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `Failed to ${action.toLowerCase()} entry`);
                }

                return response.json();
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['changelog-entry', entryId]});
            toast({
                title: `Entry ${action === 'PUBLISH' ? 'Published' : 'Unpublished'}`,
                description: `The changelog entry has been ${action === 'PUBLISH' ? 'published' : 'unpublished'} successfully.`
            });
            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: `Failed to ${action.toLowerCase()}`,
                description: error.message || `There was an error ${action.toLowerCase()}ing the entry.`,
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
            queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});
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
        if (action === 'PUBLISH' || action === 'UNPUBLISH') {
            publishEntry.mutate();
        } else {
            deleteEntry.mutate();
        }
    };

    const getActionButton = () => {
        if (action === 'PUBLISH' || action === 'UNPUBLISH') {
            return (
                <Button
                    onClick={() => setIsOpen(true)}
                    disabled={isSubmitting}
                    variant={action === 'UNPUBLISH' ? "outline" : "default"}
                    className="gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin"/>
                            {action === 'PUBLISH' ? 'Publishing...' : 'Unpublishing...'}
                        </>
                    ) : (
                        <>
                            {action === 'PUBLISH' ? (
                                <>
                                    <Globe className="h-4 w-4"/>
                                    Publish
                                </>
                            ) : (
                                <>
                                    <PackageOpen className="h-4 w-4"/>
                                    Unpublish
                                </>
                            )}
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
                <Trash2 className="h-4 w-4"/>
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
                        {action === 'PUBLISH' ? 'Publish Entry' :
                            action === 'UNPUBLISH' ? 'Unpublish Entry' :
                                'Delete Entry'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {action === 'PUBLISH'
                            ? `Are you sure you want to publish "${title}"? Published entries will be visible to all users.`
                            : action === 'UNPUBLISH'
                                ? `Are you sure you want to unpublish "${title}"? The entry will no longer be visible to users.`
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
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                {action === 'PUBLISH' ? 'Publishing...' :
                                    action === 'UNPUBLISH' ? 'Unpublishing...' :
                                        'Deleting...'}
                            </>
                        ) : (
                            action === 'PUBLISH' ? 'Publish' :
                                action === 'UNPUBLISH' ? 'Unpublish' :
                                    'Delete'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}