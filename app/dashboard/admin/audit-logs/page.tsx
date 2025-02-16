'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import {
    RefreshCw,
    XCircle,
    Info
} from 'lucide-react'

// Types for Audit Log
interface AuditLog {
    id: string
    action: string
    userId: string
    targetUserId?: string | null
    details?: Record<string, unknown> | string
    createdAt: string
    user: {
        name?: string | null
        email: string
    }
    targetUser?: {
        name?: string | null
        email?: string
    } | null
}

// API response type
interface AuditLogsResponse {
    logs: AuditLog[]
    total: number
}

// Safe JSON parsing with fallback
function safeJSONParse(input?: string | Record<string, unknown>): Record<string, unknown> {
    // If already an object, return it
    if (input && typeof input === 'object') {
        return input as Record<string, unknown>
    }

    // If it's a string, try parsing
    if (typeof input === 'string') {
        try {
            // First, attempt to parse as JSON
            return JSON.parse(input)
        } catch {
            // If parsing fails, try to handle malformed input
            try {
                // If it looks like a joined array of characters
                if (Array.isArray(input)) {
                    const joined = input.join('')
                    return JSON.parse(joined)
                }
            } catch {}
        }
    }

    // If all else fails, return an empty object
    return {}
}

// Format log details safely
function formatLogDetails(details?: string | Record<string, unknown>): string {
    try {
        const parsedDetails = safeJSONParse(details)

        // If no details or empty object
        if (!parsedDetails || Object.keys(parsedDetails).length === 0) {
            return 'No additional details'
        }

        // Format each key-value pair
        return Object.entries(parsedDetails)
            .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
            .join('\n')
    } catch {
        // Absolute fallback
        return 'Unable to parse log details'
    }
}

export default function AuditLogsPage() {
    // Advanced filtering states
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const pageSize = 10

    // Fetch audit logs
    const {
        data,
        isLoading,
        isError,
        refetch
    } = useQuery<AuditLogsResponse>({
        queryKey: ['audit-logs', page, search, actionFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search,
                action: actionFilter,
                sortOrder: 'desc' // Explicitly request most recent logs first
            })

            const response = await fetch(`/api/admin/audit-logs?${params}`)

            if (!response.ok) {
                throw new Error('Failed to fetch audit logs')
            }

            return response.json()
        }
    })

    // Derived data for filters
    const uniqueActions = useMemo(() =>
            Array.from(new Set(data?.logs?.map(log => log.action) || [])),
        [data?.logs]
    )

    // Reset filters
    const resetFilters = () => {
        setSearch('')
        setActionFilter('')
        setPage(1)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Audit Logs</CardTitle>
                        <CardDescription>
                            Comprehensive activity tracking and system events
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4 items-center">
                    <Input
                        placeholder="Search logs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                    />

                    <Select
                        value={actionFilter || 'all'}
                        onValueChange={(value) => {
                            setActionFilter(value === 'all' ? '' : value)
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActions.map(action => (
                                <SelectItem key={action} value={action}>
                                    {action}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(search || actionFilter) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-destructive"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Clear Filters
                        </Button>
                    )}
                </div>

                {/* Logs Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Performer</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, index) => (
                                <TableRow key={index}>
                                    {[1, 2, 3, 4, 5].map(cell => (
                                        <TableCell key={cell}>
                                            <div className="h-4 bg-muted animate-pulse rounded"></div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-destructive">
                                    Failed to load audit logs
                                </TableCell>
                            </TableRow>
                        ) : data?.logs?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No audit logs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.logs?.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        {format(parseISO(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{log.action}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{log.user.name || log.user.email}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {log.user.name ? log.user.email : ''}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.targetUser
                                            ? (
                                                <div className="flex flex-col">
                                                    <span>{log.targetUser.name || log.targetUser.email || 'N/A'}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {log.targetUser.name && log.targetUser.email}
                                                    </span>
                                                </div>
                                            )
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <Info className="h-4 w-4 mr-2" />
                                            Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Details Dialog */}
                <Dialog
                    open={!!selectedLog}
                    onOpenChange={() => setSelectedLog(null)}
                >
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Log Details</DialogTitle>
                            <DialogDescription>
                                Detailed information about the audit log entry
                            </DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                <div>
                                    <p className="font-medium">Action:</p>
                                    <Badge variant="secondary">{selectedLog.action}</Badge>
                                </div>
                                <div>
                                    <p className="font-medium">Timestamp:</p>
                                    <p>{format(parseISO(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
                                </div>
                                <div>
                                    <p className="font-medium">Performer:</p>
                                    <p>{selectedLog.user.name || selectedLog.user.email}</p>
                                    <p className="text-muted-foreground text-sm">{selectedLog.user.email}</p>
                                </div>
                                {selectedLog.targetUser && (
                                    <div>
                                        <p className="font-medium">Target:</p>
                                        <p>{selectedLog.targetUser.name || selectedLog.targetUser.email}</p>
                                        {selectedLog.targetUser.name && (
                                            <p className="text-muted-foreground text-sm">{selectedLog.targetUser.email}</p>
                                        )}
                                    </div>
                                )}
                                {selectedLog.details && (
                                    <div>
                                        <p className="font-medium">Details:</p>
                                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                                            {formatLogDetails(selectedLog.details)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-muted-foreground">
                        Total Logs: {data?.total || 0}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p =>
                                (data?.logs?.length === pageSize) ? p + 1 : p
                            )}
                            disabled={!data?.logs || data.logs.length < pageSize}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}