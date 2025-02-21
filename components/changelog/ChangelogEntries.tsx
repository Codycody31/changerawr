'use client'

import {useEffect, useRef, useState} from 'react'
import {motion, useInView} from 'framer-motion'
import {format} from 'date-fns'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent} from '@/components/ui/card'
import {Skeleton} from '@/components/ui/skeleton'
import {ChevronRight, Clock, GitCommit, Loader2, Tag} from 'lucide-react'
import {useInfiniteQuery} from '@tanstack/react-query'
import type {ChangelogEntry} from '@/lib/types/changelog'
import {cn} from '@/lib/utils'
import Markdown from "react-markdown";

interface ChangelogEntriesProps {
    projectId: string
}

const container = {
    hidden: {opacity: 0},
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: {opacity: 0, y: 20},
    show: {opacity: 1, y: 0}
}

const SkeletonEntry = () => (
    <Card className="relative overflow-hidden border-primary/5">
        <CardContent className="p-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64"/>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-24"/>
                        </div>
                    </div>
                    <Skeleton className="h-5 w-32"/>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="h-4 w-3/4"/>
                    <Skeleton className="h-4 w-5/6"/>
                </div>
                <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16"/>
                        <Skeleton className="h-6 w-16"/>
                        <Skeleton className="h-6 w-16"/>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
)

const SkeletonSidebarItem = () => (
    <div className="px-3 py-2">
        <Skeleton className="h-6 w-full"/>
    </div>
)

export default function ChangelogEntries({projectId}: ChangelogEntriesProps) {
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeEntry, setActiveEntry] = useState<string | null>(null)

    const isLoadMoreVisible = useInView(loadMoreRef, {
        rootMargin: '200px',
    })

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error} =
        useInfiniteQuery({
            queryKey: ['changelog-entries', projectId],
            queryFn: async ({pageParam = undefined}) => {
                const searchParams = new URLSearchParams()
                if (pageParam) {
                    searchParams.set('cursor', pageParam)
                }
                const res = await fetch(
                    `/api/changelog/${projectId}/entries?${searchParams.toString()}`
                )
                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || 'Failed to fetch entries')
                }
                return res.json()
            },
            getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
            initialPageSize: 10,
            refetchOnWindowFocus: false,
        })

    useEffect(() => {
        if (isLoadMoreVisible && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [isLoadMoreVisible, hasNextPage, isFetchingNextPage, fetchNextPage])

    // const {scrollYProgress} = useScroll({
    //     target: containerRef,
    //     offset: ["start end", "end end"]
    // })

    // const scaleX = useSpring(scrollYProgress, {
    //     stiffness: 100,
    //     damping: 30,
    //     restDelta: 0.001
    // })

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return

            const entries = containerRef.current.querySelectorAll('[data-entry-id]')
            const viewportMiddle = window.innerHeight / 2
            let closestEntry = null
            let closestDistance = Infinity

            entries.forEach((entry) => {
                const rect = entry.getBoundingClientRect()
                const entryMiddle = rect.top + rect.height / 2
                const distance = Math.abs(entryMiddle - viewportMiddle)

                if (distance < closestDistance) {
                    closestDistance = distance
                    closestEntry = entry.getAttribute('data-entry-id')
                }
            })

            setActiveEntry(closestEntry)
        }

        window.addEventListener('scroll', handleScroll, {passive: true})
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [data?.pages])

    if (status === 'error') {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">
                    Error loading changelog entries: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
            </div>
        )
    }

    const isLoading = status === 'loading'

    return (
        <div ref={containerRef} className="relative min-h-[50vh]">
            {/* Progress bar - kinda inaccurate so disabled for now */}
            {/*<motion.div*/}
            {/*    className="fixed top-0 left-0 right-0 h-1 bg-primary/10 z-50"*/}
            {/*    initial={{opacity: 0}}*/}
            {/*    animate={{opacity: 1}}*/}
            {/*    transition={{delay: 0.5}}*/}
            {/*>*/}
            {/*    <motion.div*/}
            {/*        className="h-full bg-gradient-to-r from-primary/40 to-primary origin-left"*/}
            {/*        style={{scaleX}}*/}
            {/*    />*/}
            {/*</motion.div>*/}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-16"
                >
                    {isLoading ? (
                        <div className="space-y-16">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    variants={item}
                                    initial="hidden"
                                    animate="show"
                                >
                                    <SkeletonEntry/>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {data?.pages.map((page, pageIndex) => (
                                <div key={pageIndex} className="space-y-16">
                                    {page.items.map((entry: ChangelogEntry) => (
                                        <motion.div
                                            key={entry.id}
                                            variants={item}
                                            data-entry-id={entry.id}
                                            className={cn(
                                                "relative transition-all duration-300",
                                                activeEntry === entry.id && "scale-[1.02]"
                                            )}
                                        >
                                            {/* Active indicator */}
                                            <motion.div
                                                className={cn(
                                                    "absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-8 rounded-full bg-primary/40"
                                                )}
                                                initial={{opacity: 0}}
                                                animate={{opacity: activeEntry === entry.id ? 1 : 0}}
                                                transition={{duration: 0.2}}
                                            />

                                            <Card
                                                className="relative overflow-hidden border-primary/5 hover:border-primary/20 transition-all group">
                                                <CardContent className="p-6">
                                                    <div className="space-y-6">
                                                        {/* Header */}
                                                        <div
                                                            className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                            <div className="space-y-2">
                                                                <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                                                                    {entry.title}
                                                                </h3>
                                                                {entry.version && (
                                                                    <div className="flex items-center gap-2">
                                                                        <GitCommit
                                                                            className="w-4 h-4 text-muted-foreground"/>
                                                                        <Badge variant="outline" className="font-mono">
                                                                            {entry.version}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {entry.publishedAt && (
                                                                <div
                                                                    className="flex items-center gap-2 text-muted-foreground">
                                                                    <Clock className="w-4 h-4"/>
                                                                    <time
                                                                        dateTime={entry.publishedAt}
                                                                        className="text-sm tabular-nums"
                                                                    >
                                                                        {format(new Date(entry.publishedAt), 'MMMM d, yyyy')}
                                                                    </time>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div
                                                            className="prose prose-lg max-w-none prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border">
                                                            <Markdown>
                                                                {entry.content}
                                                            </Markdown>
                                                        </div>

                                                        {/* Tags */}
                                                        {entry.tags?.length > 0 && (
                                                            <div className="pt-6 border-t border-border">
                                                                <div className="flex items-start gap-2">
                                                                    <Tag
                                                                        className="w-4 h-4 text-muted-foreground mt-1"/>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {entry.tags.map((tag) => (
                                                                            <Badge
                                                                                key={tag.id}
                                                                                variant="secondary"
                                                                                className="bg-primary/5 hover:bg-primary/10 transition-colors"
                                                                            >
                                                                                {tag.name}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ))}
                        </>
                    )}

                    {/* Load more section */}
                    <div
                        ref={loadMoreRef}
                        className={cn(
                            "h-20 flex items-center justify-center",
                            !hasNextPage && "hidden"
                        )}
                    >
                        {isFetchingNextPage && (
                            <motion.div
                                className="flex items-center gap-2 text-muted-foreground"
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                            >
                                <Loader2 className="w-4 h-4 animate-spin"/>
                                <span>Loading more entries...</span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Side panel */}
                <div className="hidden lg:block">
                    <div className="sticky top-4 space-y-4">
                        <Card>
                            <CardContent className="p-4">
                                <h4 className="font-semibold mb-4">Quick Navigation</h4>
                                <div
                                    className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                                    {isLoading ? (
                                        <div className="space-y-1">
                                            {[...Array(5)].map((_, i) => (
                                                <SkeletonSidebarItem key={i}/>
                                            ))}
                                        </div>
                                    ) : (
                                        data?.pages.map((page) =>
                                            page.items.map((entry: ChangelogEntry) => (
                                                <motion.button
                                                    key={entry.id}
                                                    onClick={() => {
                                                        document
                                                            .querySelector(`[data-entry-id="${entry.id}"]`)
                                                            ?.scrollIntoView({behavior: 'smooth'})
                                                    }}
                                                    className={cn(
                                                        "flex items-center w-full text-left px-3 py-2 rounded-md transition-all",
                                                        "text-sm hover:bg-primary/10",
                                                        activeEntry === entry.id ?
                                                            "bg-primary/20 text-primary font-medium" :
                                                            "text-muted-foreground"
                                                    )}
                                                    initial={{opacity: 0, x: -20}}
                                                    animate={{opacity: 1, x: 0}}
                                                    transition={{delay: 0.1}}
                                                >
                                                    <ChevronRight className={cn(
                                                        "w-4 h-4 mr-2 transition-transform",
                                                        activeEntry === entry.id && "rotate-90"
                                                    )}/>
                                                    <span className="truncate">{entry.title}</span>
                                                </motion.button>
                                            ))
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}