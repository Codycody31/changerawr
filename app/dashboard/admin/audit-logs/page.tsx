'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
    RefreshCw,
    XCircle,
    Info,
    Calendar as CalendarIcon,
    Filter,
    Download,
} from 'lucide-react'

// Types
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

interface AuditLogsResponse {
    logs: AuditLog[]
    total: number
    pages: number
}

interface FilterState {
    search: string
    action: string
    dateRange: {
        from: Date | null
        to: Date | null
    }
    userId?: string
    targetId?: string
}

// Utility functions
const formatLogDetails = (details?: string | Record<string, unknown>): string => {
    if (!details) return 'No additional details'

    try {
        const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details
        return JSON.stringify(parsedDetails, null, 2)
    } catch {
        return typeof details === 'string' ? details : 'Unable to parse log details'
    }
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default function AuditLogsPage() {
    // State
    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        action: '',
        dateRange: {
            from: subDays(new Date(), 7),
            to: new Date()
        }
    })
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const pageSize = 20

    // Debounced search
    const debouncedSearch = useDebounce(searchInput)

    // Update filters when debounced search changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: debouncedSearch }))
        setPage(1)
    }, [debouncedSearch])

    // Data fetching
    const {
        data,
        isLoading,
        isError,
        refetch,
        isFetching
    } = useQuery<AuditLogsResponse>({
        queryKey: ['audit-logs', page, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search: filters.search,
                action: filters.action,
                from: filters.dateRange.from?.toISOString() || '',
                to: filters.dateRange.to?.toISOString() || '',
                userId: filters.userId || '',
                targetId: filters.targetId || ''
            })

            const response = await fetch(`/api/admin/audit-logs?${params}`)
            if (!response.ok) throw new Error('Failed to fetch audit logs')
            return response.json()
        }
    })

    // Actions list
    const uniqueActions = useMemo(() => {
        if (!data?.logs) return []
        const actions = new Set(data.logs.map(log => log.action))
        return Array.from(actions).sort()
    }, [data?.logs])

    // Export function
    const exportLogs = async () => {
        try {
            const params = new URLSearchParams({
                search: filters.search,
                action: filters.action,
                from: filters.dateRange.from?.toISOString() || '',
                to: filters.dateRange.to?.toISOString() || '',
                userId: filters.userId || '',
                targetId: filters.targetId || '',
                export: 'true'
            });

            const response = await fetch(`/api/admin/audit-logs?${params}`)
            if (!response.ok) throw new Error('Failed to export logs')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export failed:', error)
            // Here you might want to show a toast notification for the error
        }
    }

    // Reset filters
    const resetFilters = () => {
        setSearchInput('')
        setFilters({
            search: '',
            action: '',
            dateRange: {
                from: subDays(new Date(), 7),
                to: new Date()
            }
        })
        setPage(1)
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Audit Logs</CardTitle>
                            <CardDescription>
                                Track and monitor system activities
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportLogs}
                                disabled={isLoading || isFetching}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isLoading || isFetching}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search logs..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="max-w-md"
                                />
                            </div>

                            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filters
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Action Type</h4>
                                            <Select
                                                value={filters.action}
                                                onValueChange={(value) => {
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        action: value === 'all' ? '' : value
                                                    }))
                                                    setPage(1)
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select action" />
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
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-medium">Date Range</h4>
                                            <div className="grid gap-2">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span className="text-sm">
                                                        {filters.dateRange.from
                                                            ? format(filters.dateRange.from, 'PP')
                                                            : 'Pick start date'
                                                        }
                                                        {' → '}
                                                        {filters.dateRange.to
                                                            ? format(filters.dateRange.to, 'PP')
                                                            : 'Pick end date'
                                                        }
                                                    </span>
                                                </div>
                                                <Calendar
                                                    mode="range"
                                                    selected={{
                                                        from: filters.dateRange.from || undefined,
                                                        to: filters.dateRange.to || undefined
                                                    }}
                                                    onSelect={(range) => {
                                                        setFilters(prev => ({
                                                            ...prev,
                                                            dateRange: {
                                                                from: range?.from || null,
                                                                to: range?.to || null
                                                            }
                                                        }))
                                                        setPage(1)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {(filters.search || filters.action || filters.dateRange.from || filters.dateRange.to) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="text-destructive"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {isFetching && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center"
                                >
                                    <RefreshCw className="h-6 w-6 animate-spin" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Performer</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead className="w-[100px]">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isError ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-24 text-center text-destructive"
                                            >
                                                Failed to load audit logs
                                            </TableCell>
                                        </TableRow>
                                    ) : data?.logs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No audit logs found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data?.logs?.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {format(parseISO(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {log.user.name || log.user.email}
                                                        </span>
                                                        {log.user.name && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {log.user.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.targetUser ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {log.targetUser.name || log.targetUser.email}
                                                            </span>
                                                            {log.targetUser.name && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {log.targetUser.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedLog(log)}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                            Showing {((page - 1) * pageSize) + 1} to{' '}
                            {Math.min(page * pageSize, data?.total || 0)} of{' '}
                            {data?.total || 0} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, data?.pages || 1) }, (_, i) => {
                                    const pageNumber = page <= 3
                                        ? i + 1
                                        : page + i - 2
                                    if (pageNumber <= (data?.pages || 1)) {
                                        return (
                                            <Button
                                                key={pageNumber}
                                                variant={page === pageNumber ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(pageNumber)}
                                                className="w-8"
                                            >
                                                {pageNumber}
                                            </Button>
                                        )
                                    }
                                    return null
                                })}
                                {data?.pages && data.pages > 5 && page < data.pages - 2 && (
                                    <>
                                        <span className="mx-1">...</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(data.pages)}
                                            className="w-8"
                                        >
                                            {data.pages}
                                        </Button>
                                    </>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={!data?.logs || page >= (data?.pages || 1) || isLoading}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    {/* Details Dialog */}
                    <Dialog
                        open={!!selectedLog}
                        onOpenChange={(open) => !open && setSelectedLog(null)}
                    >
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Log Details</DialogTitle>
                                <DialogDescription>
                                    Detailed information about this audit log entry
                                </DialogDescription>
                            </DialogHeader>

                            {selectedLog && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-medium mb-1">Timestamp</h4>
                                            <p className="text-sm">
                                                {format(parseISO(selectedLog.createdAt), 'PPpp')}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-medium mb-1">Action</h4>
                                            <Badge variant="secondary">
                                                {selectedLog.action}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-2">Performer</h4>
                                        <Card className="bg-muted">
                                            <CardContent className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {selectedLog.user.name || selectedLog.user.email}
                                                    </span>
                                                    {selectedLog.user.name && (
                                                        <span className="text-sm text-muted-foreground">
                                                            {selectedLog.user.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {selectedLog.targetUser && (
                                        <div>
                                            <h4 className="font-medium mb-2">Target</h4>
                                            <Card className="bg-muted">
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {selectedLog.targetUser.name || selectedLog.targetUser.email}
                                                        </span>
                                                        {selectedLog.targetUser.name && (
                                                            <span className="text-sm text-muted-foreground">
                                                                {selectedLog.targetUser.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {selectedLog.details && (
                                        <div>
                                            <h4 className="font-medium mb-2">Details</h4>
                                            <Card className="bg-muted">
                                                <CardContent className="p-4">
                                                    <pre className="text-xs whitespace-pre-wrap font-mono">
                                                        {formatLogDetails(selectedLog.details)}
                                                    </pre>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    )
}