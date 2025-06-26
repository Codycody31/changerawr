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
import {Globe, Loader2, PackageOpen, Trash2, Calendar} from 'lucide-react'
import {useAuth} from '@/context/auth'
import {Role} from '@prisma/client'
import {cn} from '@/lib/utils'

type ActionType = 'PUBLISH' | 'UNPUBLISH' | 'DELETE' | 'ALLOW_SCHEDULE';
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ChangelogActionRequestProps {
    projectId: string;
    entryId: string;
    action: ActionType;
    title: string;
    isPublished?: boolean;
    onSuccess?: () => void;
    className?: string;
    variant?: ButtonVariant;
    disabled?: boolean;
    size?: ButtonSize;
}

export function ChangelogActionRequest({
                                           projectId,
                                           entryId,
                                           action,
                                           title,
                                           isPublished = false,
                                           onSuccess,
                                           className,
                                           variant = 'default',
                                           disabled = false,
                                           size = 'default'
                                       }: ChangelogActionRequestProps) {
    const {user} = useAuth();
    const {toast} = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = user?.role === Role.ADMIN;
    const isStaff = user?.role === Role.STAFF;

    // Update permission check to allow staff to perform all actions
    const canPerformAction = isAdmin || isStaff;

    // Handle publish/unpublish/allow_schedule action
    const updateEntry = useMutation({
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: ['changelog-entry', entryId]});
            queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});
            queryClient.setQueryData(['changelog-entry', entryId], data);

            const actionMessages = {
                'PUBLISH': {
                    title: 'Entry Published',
                    description: 'The changelog entry has been published successfully.'
                },
                'UNPUBLISH': {
                    title: 'Entry Unpublished',
                    description: 'The changelog entry has been unpublished successfully.'
                },
                'ALLOW_SCHEDULE': {
                    title: 'Schedule Allowed',
                    description: 'The changelog entry has been approved for scheduling.'
                }
            };

            const message = actionMessages[action as keyof typeof actionMessages];

            toast({
                title: message.title,
                description: message.description
            });
            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: `Failed to ${action.toLowerCase().replace('_', ' ')}`,
                description: error.message || `There was an error ${action.toLowerCase().replace('_', ' ')}ing the entry.`,
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
                    throw new Error(error.error || 'Failed to process deletion');
                }

                const data = await response.json();
                return {data, status: response.status};
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: (result) => {
            // For staff, it will be a request (202). For admin, it's a direct deletion
            if (isStaff && result.status === 202) {
                toast({
                    title: 'Deletion Request Submitted',
                    description: 'Your request has been sent to an administrator for approval.'
                });

                // Optionally invalidate requests list if you're tracking them
                queryClient.invalidateQueries({queryKey: ['changelog-requests']});
            } else {
                queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});
                queryClient.removeQueries({queryKey: ['changelog-entry', entryId]});

                toast({
                    title: 'Entry Deleted',
                    description: 'The changelog entry has been deleted successfully.'
                });
            }

            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            console.error('Delete error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process deletion request',
                variant: 'destructive'
            });
            setIsOpen(false);
        }
    });

    if (!canPerformAction) return null;

    const handleAction = () => {
        if (action === 'DELETE') {
            deleteEntry.mutate();
        } else {
            updateEntry.mutate();
        }
    };

    const getButtonVariant = (): ButtonVariant => {
        if (variant) return variant;
        if (action === 'DELETE') return 'destructive';
        if (action === 'UNPUBLISH') return 'outline';
        return 'default';
    };

    const getActionDescription = () => {
        switch (action) {
            case 'PUBLISH':
                return "Published entries will be visible to all users.";
            case 'UNPUBLISH':
                return "The entry will no longer be visible to users.";
            case 'ALLOW_SCHEDULE':
                return "This will allow the entry to be scheduled for future publication.";
            case 'DELETE':
                return isStaff
                    ? "Your deletion request will be sent to an administrator for approval."
                    : "This action cannot be undone.";
            default:
                return "";
        }
    };

    const getActionButton = () => {
        if (action === 'PUBLISH' || action === 'UNPUBLISH' || action === 'ALLOW_SCHEDULE') {
            const actionConfig = {
                'PUBLISH': {icon: Globe, label: 'Publish', loadingLabel: 'Publishing...'},
                'UNPUBLISH': {icon: PackageOpen, label: 'Unpublish', loadingLabel: 'Unpublishing...'},
                'ALLOW_SCHEDULE': {icon: Calendar, label: 'Allow Schedule', loadingLabel: 'Processing...'}
            };

            const config = actionConfig[action as keyof typeof actionConfig];
            const IconComponent = config.icon;

            return (
                <Button
                    onClick={() => setIsOpen(true)}
                    disabled={disabled || isSubmitting}
                    variant={getButtonVariant()}
                    size={size}
                    className={cn("gap-2", className)}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin"/>
                            {config.loadingLabel}
                        </>
                    ) : (
                        <>
                            <IconComponent className="h-4 w-4"/>
                            {config.label}
                        </>
                    )}
                </Button>
            );
        }

        // Delete button
        return (
            <Button
                variant="destructive"
                size={size === 'default' ? 'icon' : size}
                className={cn(className)}
                onClick={() => setIsOpen(true)}
                disabled={disabled || isSubmitting}
            >
                {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                    <Trash2 className="h-4 w-4"/>
                )}
            </Button>
        );
    };

    // Don't render if action is publish and entry is already published
    if (action === 'PUBLISH' && isPublished) return null;

    const getDialogTitle = () => {
        switch (action) {
            case 'DELETE':
                return isStaff ? 'Request Entry Deletion' : 'Delete Entry';
            case 'PUBLISH':
                return 'Publish Entry';
            case 'UNPUBLISH':
                return 'Unpublish Entry';
            case 'ALLOW_SCHEDULE':
                return 'Allow Entry Scheduling';
            default:
                return 'Confirm Action';
        }
    };

    const getConfirmButtonText = () => {
        if (isSubmitting) {
            const loadingMessages = {
                'DELETE': isStaff ? 'Submitting Request...' : 'Deleting...',
                'PUBLISH': 'Publishing...',
                'UNPUBLISH': 'Unpublishing...',
                'ALLOW_SCHEDULE': 'Processing...'
            };
            return (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    {loadingMessages[action as keyof typeof loadingMessages]}
                </>
            );
        }

        const confirmMessages = {
            'DELETE': isStaff ? 'Request Deletion' : 'Delete',
            'PUBLISH': 'Publish',
            'UNPUBLISH': 'Unpublish',
            'ALLOW_SCHEDULE': 'Allow Schedule'
        };

        return confirmMessages[action as keyof typeof confirmMessages];
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {getActionButton()}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {getDialogTitle()}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want
                        to {action.toLowerCase().replace('_', ' ')} &ldquo;{title}&rdquo;? {getActionDescription()}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(
                            action === 'DELETE' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        )}
                        onClick={handleAction}
                        disabled={disabled || isSubmitting}
                    >
                        {getConfirmButtonText()}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}