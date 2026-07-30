'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import React, {useState} from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {useToast} from '@/hooks/use-toast'
import {formatDistanceToNow, format} from 'date-fns'
import {
    Check,
    X,
    Loader2,
    AlertTriangle,
    Calendar,
    Clock,
    ChevronDown,
    ChevronRight,
    Eye,
    User,
    Building,
    FileText,
    Tag,
    Trash2,
    MessageSquare,
    ExternalLink,
    RefreshCw,
    History,
} from 'lucide-react'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {motion, AnimatePresence} from 'framer-motion'

// Updated type definitions
export type RequestType = 'DELETE_PROJECT' | 'DELETE_TAG' | 'DELETE_ENTRY' | 'DELETE_ALL_ENTRIES' | 'DELETE_ALL_HISTORY' | 'ALLOW_PUBLISH' | 'ALLOW_SCHEDULE';

export const REQUEST_TYPES: Record<RequestType, {
    label: string;
    description: string;
    targetDisplay: (request: ChangelogRequest) => string;
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    severity: 'low' | 'medium' | 'high' | 'critical';
    getDetails: (request: ChangelogRequest) => React.ReactNode;
}> = {
    DELETE_PROJECT: {
        label: 'Delete Project',
        description: 'Permanently delete an entire project and all associated data',
        targetDisplay: () => 'Entire Project',
        icon: <AlertTriangle className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'critical',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <AlertTriangle className="h-4 w-4"/>
                        Critical Action - Irreversible
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        This will permanently delete the entire project, including all changelog entries, tags, and
                        settings.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <p className="font-medium text-red-600">All data will be lost</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_TAG: {
        label: 'Delete Tag',
        description: 'Remove a specific changelog tag',
        targetDisplay: (request) => request.ChangelogTag?.name || 'Unknown Tag',
        icon: <Tag className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'medium',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                        <Tag className="h-4 w-4"/>
                        Tag Removal
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                        This tag will be removed from all changelog entries and the project defaults.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Tag Name:</span>
                        <p className="font-medium">{request.ChangelogTag?.name || request.targetId || 'Unknown'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_ENTRY: {
        label: 'Delete Entry',
        description: 'Remove a specific changelog entry',
        targetDisplay: (request) => request.ChangelogEntry?.title || 'Unknown Entry',
        icon: <Trash2 className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'high',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <FileText className="h-4 w-4"/>
                        Entry Deletion
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        This changelog entry will be permanently removed and cannot be recovered.
                    </p>
                </div>
                <div className="space-y-2 text-sm">
                    <div>
                        <span className="text-muted-foreground">Entry Title:</span>
                        <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_ALL_ENTRIES: {
        label: 'Delete All Entries',
        description: 'Permanently remove every changelog entry in a project',
        targetDisplay: (request) => `All entries in ${request.project.name}`,
        icon: <AlertTriangle className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'critical',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <AlertTriangle className="h-4 w-4"/>
                        Critical Action - Irreversible
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        Every changelog entry in this project (published, scheduled, and draft) will be permanently
                        deleted. The project itself and its settings will be kept.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <p className="font-medium text-red-600">All entries will be lost</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_ALL_HISTORY: {
        label: 'Delete All History',
        description: 'Permanently remove all saved version history for every entry in a project',
        targetDisplay: (request) => `All history in ${request.project.name}`,
        icon: <History className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'critical',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <AlertTriangle className="h-4 w-4"/>
                        Critical Action - Irreversible
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        Every saved version history revision for every entry in this project will be permanently
                        deleted. The entries themselves will be kept.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <p className="font-medium text-red-600">All version history will be lost</p>
                    </div>
                </div>
            </div>
        )
    },
    ALLOW_PUBLISH: {
        label: 'Publish Entry',
        description: 'Request approval to publish a changelog entry',
        targetDisplay: (request) => request.ChangelogEntry?.title || 'Unknown Entry',
        icon: <Check className="h-3 w-3"/>,
        variant: 'default',
        severity: 'low',
        getDetails: (request) => {
            const metadata = request.metadata as {customPublishedAt?: string} | null;
            const customPublishedAt = metadata?.customPublishedAt;
            const publishDate = customPublishedAt ? new Date(customPublishedAt) : null;

            return (
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                        customPublishedAt
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                    }`}>
                        <div className={`flex items-center gap-2 font-medium ${
                            customPublishedAt
                                ? 'text-amber-800'
                                : 'text-blue-800'
                        }`}>
                            <FileText className="h-4 w-4"/>
                            {customPublishedAt ? 'Publish with Custom Date' : 'Publish Request'}
                        </div>
                        <p className={`text-sm mt-1 ${
                            customPublishedAt
                                ? 'text-amber-700'
                                : 'text-blue-700'
                        }`}>
                            {customPublishedAt && publishDate
                                ? `Staff member wants to publish this entry with a backdated publish date of ${format(publishDate, 'PPP p')}.`
                                : 'Staff member wants to publish this changelog entry immediately.'
                            }
                        </p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Entry Title:</span>
                            <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Project:</span>
                            <p className="font-medium">{request.project.name}</p>
                        </div>
                        {customPublishedAt && publishDate && (
                            <>
                                <div>
                                    <span className="text-muted-foreground">Requested Publish Date:</span>
                                    <p className="font-medium text-amber-700">{format(publishDate, 'PPP p')}</p>
                                </div>
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                    ⚠️ This entry will show the custom date instead of the current date. Ensure this is intentional.
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
    },
    ALLOW_SCHEDULE: {
        label: 'Schedule Entry',
        description: 'Request approval to schedule a changelog entry for automatic publishing',
        targetDisplay: (request) => {
            const title = request.ChangelogEntry?.title || 'Unknown Entry';
            const scheduledTime = request.targetId ? format(new Date(request.targetId), 'MMM d, h:mm a') : 'Unknown time';
            return `${title} (${scheduledTime})`;
        },
        icon: <Clock className="h-3 w-3"/>,
        variant: 'secondary',
        severity: 'low',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-800 font-medium">
                        <Calendar className="h-4 w-4"/>
                        Schedule Request
                    </div>
                    <p className="text-sm text-purple-700 mt-1">
                        Staff member wants to schedule this entry for automatic publishing.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Entry Title:</span>
                        <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Scheduled For:</span>
                        <p className="font-medium text-purple-600">
                            {request.targetId
                                ? format(new Date(request.targetId), 'PPP p')
                                : 'Unknown time'
                            }
                        </p>
                    </div>
                </div>
                <div className="text-sm">
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">{request.project.name}</p>
                </div>
                {request.targetId && (
                    <div className="text-sm">
                        <span className="text-muted-foreground">Time until publish:</span>
                        <p className="font-medium">
                            {formatDistanceToNow(new Date(request.targetId), {addSuffix: true})}
                        </p>
                    </div>
                )}
            </div>
        )
    }
};

// Updated types
export interface ChangelogRequest {
    id: string;
    type: RequestType;
    targetId?: string | null;
    projectId: string;
    metadata?: {customPublishedAt?: string} | null;
    project: {
        id: string;
        name: string;
    };
    staff: {
        name: string | null;
        email: string;
    };
    ChangelogTag?: {
        id: string;
        name: string;
    };
    ChangelogEntry?: {
        id: string;
        title: string;
    };
    createdAt: string;
}

export type RequestStatus = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'CHANGES_REQUESTED_PENDING';

type ProcessingRequest = {
    id: string;
    status: RequestStatus;
} | null;

export function RequestManagement() {
    const {toast} = useToast()
    const queryClient = useQueryClient()
    const [processingRequest, setProcessingRequest] = useState<ProcessingRequest>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [selectedRequest, setSelectedRequest] = useState<ChangelogRequest | null>(null)
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
    const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
    const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null)
    const [feedbackText, setFeedbackText] = useState('')
    const [confirmFeedback, setConfirmFeedback] = useState('')
    const [sortBy, setSortBy] = useState<'date' | 'type' | 'severity'>('date')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const {data: emailConfig} = useQuery<{smtpHost?: string | null}>({
        queryKey: ['system-email-config'],
        queryFn: async () => {
            const res = await fetch('/api/admin/config/system-email')
            if (!res.ok) return {}
            return res.json()
        },
        staleTime: 5 * 60 * 1000,
    })
    const emailConfigured = !!emailConfig?.smtpHost

    const {data: requests, isLoading, error} = useQuery<ChangelogRequest[]>({
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
                               status,
                               feedback,
                           }: {
            requestId: string
            status: RequestStatus
            feedback?: string
        }) => {
            const response = await fetch(`/api/changelog/requests/${requestId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status, ...(feedback ? { feedback } : {}) })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to process request')
            }

            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['changelog-requests']})
            // Refresh the sidebar badge counter
            queryClient.invalidateQueries({queryKey: ['pending-requests-count']})
            toast({
                title: 'Success',
                description: `Request ${processingRequest?.status?.toLowerCase() || ''} successfully`
            })
            setIsDialogOpen(false)
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
            setIsDialogOpen(false)
            setProcessingRequest(null)
        }
    })

    const handleProcessRequest = (requestId: string, status: RequestStatus) => {
        setProcessingRequest({id: requestId, status})
        setIsDialogOpen(true)
    }

    const handleRequestChanges = (requestId: string) => {
        setFeedbackRequestId(requestId)
        setFeedbackText('')
        setIsFeedbackDialogOpen(true)
    }

    const confirmRequestChanges = () => {
        if (!feedbackRequestId || !feedbackText.trim()) return
        processRequest.mutate({
            requestId: feedbackRequestId,
            status: 'CHANGES_REQUESTED',
            feedback: feedbackText.trim(),
        })
        setIsFeedbackDialogOpen(false)
        setFeedbackRequestId(null)
        setFeedbackText('')
    }

    const confirmProcessRequest = () => {
        if (!processingRequest) return
        processRequest.mutate({
            requestId: processingRequest.id,
            status: processingRequest.status,
            feedback: confirmFeedback.trim() || undefined,
        })
        setConfirmFeedback('')
    }

    const toggleRowExpansion = (requestId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(requestId)) {
            newExpanded.delete(requestId)
        } else {
            newExpanded.add(requestId)
        }
        setExpandedRows(newExpanded)
    }

    const openDetailDialog = (request: ChangelogRequest) => {
        setSelectedRequest(request)
        setIsDetailDialogOpen(true)
    }

    const getRequestTypeInfo = (type: RequestType) => {
        return REQUEST_TYPES[type] || {
            label: type,
            description: 'Unknown request type',
            targetDisplay: () => 'Unknown',
            icon: <AlertTriangle className="h-3 w-3"/>,
            variant: 'outline' as const,
            severity: 'medium' as const,
            getDetails: () => <div>No details available</div>
        };
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive"/>
                <p className="text-sm text-muted-foreground">Failed to load requests</p>
            </div>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Pending Requests</CardTitle>
                            <CardDescription>
                                Review and manage action requests from staff members.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                                value={`${sortBy}-${sortDir}`}
                                onValueChange={(v) => {
                                    const [by, dir] = v.split('-') as [typeof sortBy, typeof sortDir];
                                    setSortBy(by); setSortDir(dir);
                                }}
                            >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date-desc">Newest first</SelectItem>
                                    <SelectItem value="date-asc">Oldest first</SelectItem>
                                    <SelectItem value="type-asc">Type A–Z</SelectItem>
                                    <SelectItem value="severity-desc">Severity ↓</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => queryClient.invalidateQueries({queryKey: ['changelog-requests']})}
                                title="Reload"
                            >
                                <RefreshCw className="h-3.5 w-3.5"/>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!requests?.length ? (
                        <div className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <Calendar className="h-8 w-8 text-muted-foreground"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">No pending requests</p>
                                    <p className="text-xs text-muted-foreground">All requests have been processed</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[...(requests ?? [])].sort((a, b) => {
                                const severityOrder = {critical: 4, high: 3, medium: 2, low: 1};
                                if (sortBy === 'date') {
                                    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                                    return sortDir === 'asc' ? diff : -diff;
                                }
                                if (sortBy === 'type') {
                                    const diff = a.type.localeCompare(b.type);
                                    return sortDir === 'asc' ? diff : -diff;
                                }
                                if (sortBy === 'severity') {
                                    const aS = severityOrder[getRequestTypeInfo(a.type).severity] ?? 0;
                                    const bS = severityOrder[getRequestTypeInfo(b.type).severity] ?? 0;
                                    return sortDir === 'desc' ? bS - aS : aS - bS;
                                }
                                return 0;
                            }).map((request) => {
                                const typeInfo = getRequestTypeInfo(request.type);
                                const isExpanded = expandedRows.has(request.id);
                                const isResubmitted = (request as unknown as {status: string}).status === 'CHANGES_REQUESTED_PENDING';

                                return (
                                    <motion.div
                                        key={request.id}
                                        initial={{opacity: 0, y: 20}}
                                        animate={{opacity: 1, y: 0}}
                                        className="border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                                    >
                                        <Collapsible
                                            open={isExpanded}
                                            onOpenChange={() => toggleRowExpansion(request.id)}
                                        >
                                            <CollapsibleTrigger asChild>
                                                <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                {isExpanded ? (
                                                                    <ChevronDown
                                                                        className="h-4 w-4 text-muted-foreground"/>
                                                                ) : (
                                                                    <ChevronRight
                                                                        className="h-4 w-4 text-muted-foreground"/>
                                                                )}
                                                                <Badge
                                                                    variant={typeInfo.variant}
                                                                    className={`gap-1 ${getSeverityColor(typeInfo.severity)}`}
                                                                >
                                                                    {typeInfo.icon}
                                                                    {typeInfo.label}
                                                                </Badge>
                                                                {isResubmitted && (
                                                                    <Badge variant="outline" className="gap-1 text-xs border-blue-300 text-blue-600 bg-blue-50">
                                                                        <MessageSquare className="h-2.5 w-2.5"/>
                                                                        Resubmitted
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <Building
                                                                        className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                                    <span className="font-medium text-sm truncate">
                                                                        {request.project.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <User
                                                                        className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                                    <span
                                                                        className="text-sm text-muted-foreground truncate">
                                                                        {request.staff.name || request.staff.email}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-sm font-medium">
                                                                    {typeInfo.targetDisplay(request)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(request.createdAt), {
                                                                        addSuffix: true
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 ml-4">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDetailDialog(request);
                                                                }}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleProcessRequest(request.id, 'APPROVED');
                                                                }}
                                                                disabled={processRequest.isPending}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Check className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestChanges(request.id);
                                                                }}
                                                                disabled={processRequest.isPending}
                                                                className="h-8 w-8 p-0 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                                                title="Request changes"
                                                            >
                                                                <MessageSquare className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleProcessRequest(request.id, 'REJECTED');
                                                                }}
                                                                disabled={processRequest.isPending}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{opacity: 0, height: 0}}
                                                            animate={{opacity: 1, height: 'auto'}}
                                                            exit={{opacity: 0, height: 0}}
                                                            transition={{duration: 0.2}}
                                                        >
                                                            <Separator/>
                                                            <div className="p-4 bg-muted/25">
                                                                {typeInfo.getDetails(request)}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    {REQUEST_TYPES[selectedRequest.type].icon}
                                    <DialogTitle>
                                        {REQUEST_TYPES[selectedRequest.type].label} Request
                                    </DialogTitle>
                                </div>
                                <DialogDescription>
                                    Detailed information about this request
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {REQUEST_TYPES[selectedRequest.type].getDetails(selectedRequest)}

                                <Separator/>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Requested by:</span>
                                        <div className="font-medium">
                                            {selectedRequest.staff.name || 'Unnamed User'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedRequest.staff.email}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Requested:</span>
                                        <p className="font-medium">
                                            {formatDistanceToNow(new Date(selectedRequest.createdAt), {
                                                addSuffix: true
                                            })}
                                        </p>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(selectedRequest.createdAt), 'PPP p')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 flex-wrap">
                                    {/* Open the relevant resource in a new tab for review */}
                                    {selectedRequest.ChangelogEntry?.id && (
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(
                                                `/dashboard/projects/${selectedRequest.project.id}/changelog/${selectedRequest.ChangelogEntry!.id}`,
                                                '_blank'
                                            )}
                                            className="mr-auto"
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2"/>
                                            Open entry
                                        </Button>
                                    )}
                                    {selectedRequest.type === 'DELETE_PROJECT' && (
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(
                                                `/dashboard/projects/${selectedRequest.project.id}`,
                                                '_blank'
                                            )}
                                            className="mr-auto"
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2"/>
                                            Open project
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => {
                                            setIsDetailDialogOpen(false);
                                            handleProcessRequest(selectedRequest.id, 'APPROVED');
                                        }}
                                        variant="success"
                                    >
                                        <Check className="h-4 w-4 mr-2"/>
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsDetailDialogOpen(false);
                                            handleRequestChanges(selectedRequest.id);
                                        }}
                                        className="border-amber-300 text-amber-600 hover:bg-amber-50"
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2"/>
                                        Request Changes
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setIsDetailDialogOpen(false);
                                            handleProcessRequest(selectedRequest.id, 'REJECTED');
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-2"/>
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Approve / Reject Confirmation Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) { setProcessingRequest(null); setConfirmFeedback('') }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {processingRequest?.status === 'APPROVED'
                                ? <><Check className="h-5 w-5 text-green-500"/> Approve request?</>
                                : <><X className="h-5 w-5 text-destructive"/> Reject request?</>}
                        </DialogTitle>
                        <DialogDescription>
                            {processingRequest?.status === 'APPROVED'
                                ? 'This will approve the request and execute the action immediately.'
                                : `The requested action will not be performed.${emailConfigured ? ' The staff member will be notified by email.' : ''}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-feedback">
                            Note for staff{' '}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="confirm-feedback"
                            placeholder={processingRequest?.status === 'APPROVED'
                                ? 'e.g. Great work — goes live tonight.'
                                : 'e.g. This conflicts with the upcoming v2 release.'}
                            value={confirmFeedback}
                            onChange={(e) => setConfirmFeedback(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setIsDialogOpen(false); setProcessingRequest(null); setConfirmFeedback('') }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmProcessRequest}
                            disabled={processRequest.isPending}
                            variant={processingRequest?.status === 'APPROVED' ? 'success' : 'destructive'}
                        >
                            {processRequest.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                : processingRequest?.status === 'APPROVED'
                                    ? <Check className="h-4 w-4 mr-2"/>
                                    : <X className="h-4 w-4 mr-2"/>}
                            {processingRequest?.status === 'APPROVED' ? 'Approve' : 'Reject'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Feedback / Request Changes Dialog */}
            <Dialog open={isFeedbackDialogOpen} onOpenChange={(open) => {
                setIsFeedbackDialogOpen(open);
                if (!open) { setFeedbackText(''); setFeedbackRequestId(null); }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-amber-500"/>
                            Request Changes
                        </DialogTitle>
                        <DialogDescription>
                            Describe what needs to be changed. The staff member will be{' '}
                            {emailConfigured ? 'notified by email with your feedback.' : 'able to see your feedback in their requests page.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="feedback">Feedback for the staff member</Label>
                        <Textarea
                            id="feedback"
                            placeholder="e.g. Please clarify the breaking change section and add migration steps..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={5}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            {feedbackText.length}/2000 characters
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmRequestChanges}
                            disabled={!feedbackText.trim() || processRequest.isPending}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {processRequest.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                : <MessageSquare className="h-4 w-4 mr-2"/>}
                            Send Feedback
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}