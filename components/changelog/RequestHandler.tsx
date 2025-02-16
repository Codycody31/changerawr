import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Loader2, Trash2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/auth'

interface DestructiveActionRequestProps {
    projectId: string
    action: 'DELETE_PROJECT' | 'DELETE_TAG'
    targetId?: string
    targetName?: string
    onSuccess?: () => void
}

export function DestructiveActionRequest({
                                             projectId,
                                             action,
                                             targetId,
                                             targetName,
                                             onSuccess
                                         }: DestructiveActionRequestProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)

    // Query to check for existing pending requests
    const { data: existingRequests } = useQuery({
        queryKey: ['changelog-requests'],
        queryFn: async () => {
            const response = await fetch('/api/changelog/requests')
            if (!response.ok) {
                throw new Error('Failed to fetch requests')
            }
            return response.json()
        },
        enabled: user?.role !== 'ADMIN', // Only fetch for non-admin users
        staleTime: 30000, // Cache for 30 seconds
    })

    // Check if there's already a pending request
    const existingRequest = existingRequests?.find(
        (req: any) =>
            req.status === 'PENDING' &&
            req.projectId === projectId &&
            req.type === action &&
            (action === 'DELETE_PROJECT' || req.targetId === targetId)
    )

    const createRequest = useMutation({
        mutationFn: async () => {
            if (existingRequest) {
                throw new Error('A request for this action is already pending approval')
            }

            const response = await fetch('/api/changelog/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: action,
                    projectId,
                    targetId: action === 'DELETE_TAG' ? targetId : undefined
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create request')
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['changelog-requests'] })
            toast({
                title: 'Request Submitted',
                description: 'An admin will review your request shortly.',
            })
            setIsOpen(false)
            onSuccess?.()
        },
        onError: (error: Error) => {
            console.error('Request error:', error)
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            })
            if (error.message.includes('already pending')) {
                setIsOpen(false)
            }
        }
    })

    // If user is admin, they can perform the action directly
    if (user?.role === 'ADMIN') {
        return null
    }

    const actionLabel = action === 'DELETE_PROJECT'
        ? 'Delete Project'
        : `Delete Tag "${targetName}"`

    // If there's already a pending request, show a disabled state
    if (existingRequest) {
        return (
            <div className="inline-flex items-center">
                {action === 'DELETE_TAG' ? (
                    <button
                        className="ml-1 text-muted-foreground cursor-not-allowed"
                        disabled
                        title="A deletion request is pending"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                ) : (
                    <Button
                        variant="outline"
                        disabled
                        className="inline-flex items-center gap-2"
                    >
                        <AlertCircle className="h-4 w-4" />
                        Request Pending
                    </Button>
                )}
            </div>
        )
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {action === 'DELETE_TAG' ? (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="ml-1 hover:text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                ) : (
                    <Button variant="destructive">{actionLabel}</Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Request {actionLabel}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {action === 'DELETE_PROJECT'
                            ? 'This will request deletion of the entire project and all its data.'
                            : `This will request deletion of the tag "${targetName}" from this project.`}
                        <br /><br />
                        This action requires admin approval. Would you like to submit a request?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                            createRequest.mutate()
                        }}
                        disabled={createRequest.isPending || !!existingRequest}
                    >
                        {createRequest.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Request'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}