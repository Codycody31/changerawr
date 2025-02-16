'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Check, X, Loader2, AlertTriangle } from 'lucide-react'
import type { ChangelogRequest, RequestStatus } from '@/lib/types/changelog'

export function RequestManagement() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: requests, isLoading, error } = useQuery<ChangelogRequest[]>({
        queryKey: ['changelog-requests'],
        queryFn: async () => {
            const response = await fetch('/api/changelog/requests')
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to fetch requests')
            }
            return response.json()
        }
    })

    const processRequest = useMutation({
        mutationFn: async ({
                               requestId,
                               status
                           }: {
            requestId: string
            status: RequestStatus
        }) => {
            const response = await fetch(`/api/changelog/requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to process request')
            }

            return response.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['changelog-requests'] })
            toast({
                title: 'Success',
                description: `Request ${data.status.toLowerCase()} successfully`
            })
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed to load requests</p>
            </div>
        )
    }

    const handleProcessRequest = (requestId: string, status: RequestStatus) => {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        size="sm"
                        variant={status === 'APPROVED' ? 'default' : 'destructive'}
                        disabled={processRequest.isPending}
                    >
                        {status === 'APPROVED' ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {status === 'APPROVED' ? 'Approve Request?' : 'Reject Request?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {status === 'APPROVED'
                                ? 'This will approve the request and execute the requested action.'
                                : 'This will reject the request. The requested action will not be performed.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => processRequest.mutate({ requestId, status })}
                            className={status === 'APPROVED' ? '' : 'bg-destructive hover:bg-destructive/90'}
                        >
                            {processRequest.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : status === 'APPROVED' ? (
                                'Approve'
                            ) : (
                                'Reject'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                    Manage destructive action requests from staff members
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!requests?.length ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No pending requests</p>
                    </div>
                ) : (
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Requested</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {request.type === 'DELETE_PROJECT' ? 'Delete Project' : 'Delete Tag'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.project.name}
                                        </TableCell>
                                        <TableCell>
                                            {request.staff.name || request.staff.email}
                                        </TableCell>
                                        <TableCell>
                                            {request.type === 'DELETE_TAG'
                                                ? request.ChangelogTag?.name
                                                : 'Entire Project'}
                                        </TableCell>
                                        <TableCell>
                                            {formatDistanceToNow(new Date(request.createdAt), {
                                                addSuffix: true
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {handleProcessRequest(request.id, 'APPROVED')}
                                                {handleProcessRequest(request.id, 'REJECTED')}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}