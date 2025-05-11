'use client'

import React, { useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Loader2 } from 'lucide-react'

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

interface VirtualizedListProps {
    items: AuditLog[]
    height?: number
    loadMore?: () => void
    hasMore?: boolean
    isLoadingMore?: boolean
    onLogSelect: (log: AuditLog) => void
    getActionVariant: (action: string) => string
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
                                                             items,
                                                             height = 500,
                                                             loadMore = () => {},
                                                             hasMore = false,
                                                             isLoadingMore = false,
                                                             onLogSelect,
                                                             getActionVariant
                                                         }) => {
    const parentRef = useRef<HTMLDivElement>(null)

    // Virtual list implementation
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 46, // Row height
        overscan: 10,
    })

    // Handle scroll to load more data
    const handleScroll = useCallback(() => {
        if (hasMore && !isLoadingMore && parentRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = parentRef.current

            // If scrolled to 90% of the way down, load more
            if (scrollTop + clientHeight >= scrollHeight * 0.9) {
                loadMore()
            }
        }
    }, [hasMore, isLoadingMore, loadMore])

    // Animation variants for row animations
    const rowVariants = {
        hidden: { opacity: 0, y: 5 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.01, // Staggered delay based on index
                duration: 0.2,
            }
        })
    }

    return (
        <div
            ref={parentRef}
            className="relative overflow-auto w-full"
            style={{ height }}
            onScroll={handleScroll}
        >
            <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium p-2 pl-3 w-40">Timestamp</th>
                    <th className="text-left font-medium p-2 w-40">Action</th>
                    <th className="text-left font-medium p-2 w-48">Performer</th>
                    <th className="text-left font-medium p-2">Target</th>
                    <th className="text-right font-medium p-2 w-16">Details</th>
                </tr>
                </thead>
            </table>

            {/* Virtualized rows container */}
            <div
                style={{
                    height: virtualizer.getTotalSize(),
                    width: '100%',
                    position: 'relative'
                }}
            >
                <AnimatePresence>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const item = items[virtualRow.index]
                        return (
                            <motion.div
                                key={item.id}
                                data-index={virtualRow.index}
                                className={`${
                                    virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                } hover:bg-muted/20 transition-colors border-b cursor-pointer absolute top-0 left-0 w-full`}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => onLogSelect(item)}
                                initial="hidden"
                                animate="visible"
                                custom={virtualRow.index}
                                variants={rowVariants}
                            >
                                <div className="flex items-center w-full h-full">
                                    <div className="text-xs whitespace-nowrap p-2 pl-3 w-40">
                                        {format(parseISO(item.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                    </div>
                                    <div className="p-2 w-40">
                                        <Badge
                                            variant={getActionVariant(item.action) as "info" | "default" | "outline" | "secondary" | "destructive" | "ghost" | "success" | "warning" | null | undefined}
                                            className="text-xs font-medium"
                                        >
                                            {item.action}
                                        </Badge>
                                    </div>
                                    <div className="p-2 text-xs w-48 truncate">
                                        {item.user.name || item.user.email}
                                    </div>
                                    <div className="p-2 text-xs flex-1 truncate">
                                        {item.targetUser
                                            ? (item.targetUser.name || item.targetUser.email)
                                            : "—"}
                                    </div>
                                    <div className="p-2 w-16 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 ml-auto"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onLogSelect(item)
                                            }}
                                        >
                                            <Info className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Bottom message */}
            {isLoadingMore && (
                <div className="text-center py-2 text-xs text-muted-foreground sticky bottom-0 bg-background bg-opacity-90 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Loading more logs...</span>
                    </div>
                </div>
            )}

            {!hasMore && items.length > 0 && (
                <div className="text-center py-2 text-xs text-muted-foreground sticky bottom-0 bg-background bg-opacity-90 backdrop-blur-sm">
                    <span>You&apos;ve reached the end of the logs ({items.length} records)</span>
                </div>
            )}
        </div>
    )
}

export default VirtualizedList