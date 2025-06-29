'use client'

import React, {useState, useRef, useEffect} from 'react'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {motion, useInView} from 'framer-motion'
import {
    AlertCircle,
    ArrowRight,
    Sparkles,
    Calendar,
    ThumbsUp,
    Rocket,
    XCircle
} from 'lucide-react'

export interface WhatsNewItem {
    title: string
    description: string
    type: 'feature' | 'improvement' | 'bugfix' | 'other'
}

export interface WhatsNewContent {
    version: string
    releaseDate: string
    title: string
    description?: string
    items: WhatsNewItem[]
}

interface WhatsNewModalProps {
    content: WhatsNewContent | null
    isOpen: boolean
    onClose: () => void
    previousVersions?: WhatsNewContent[]
}

const typeIcons = {
    feature: <Rocket className="h-4 w-4 text-primary"/>,
    improvement: <ThumbsUp className="h-4 w-4 text-green-500"/>,
    bugfix: <XCircle className="h-4 w-4 text-red-500"/>,
    other: <AlertCircle className="h-4 w-4 text-blue-500"/>
}

const typeColors = {
    feature: "bg-primary/10 text-primary border-primary/20",
    improvement: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    bugfix: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    other: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
}

const ItemCard = ({item, index}: { item: WhatsNewItem; index: number }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, {once: true, margin: "-10% 0px -10% 0px"})

    return (
        <motion.div
            ref={ref}
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
            transition={{delay: index * 0.08, duration: 0.4}}
            className="group relative"
        >
            <div
                className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent"/>

            <div className="relative pl-6 pb-6">
                <div
                    className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground"/>

                <div
                    className="overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all group-hover:shadow-md">
                    <div className="flex gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                            <div className="rounded-full bg-muted p-1.5">
                                {typeIcons[item.type]}
                            </div>
                        </div>

                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium">{item.title}</h3>
                                <Badge variant="outline" className={`${typeColors[item.type]} text-xs`}>
                                    {item.type === 'feature' ? 'New Feature' :
                                        item.type === 'improvement' ? 'Improvement' :
                                            item.type === 'bugfix' ? 'Bug Fix' : 'Update'}
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
                                                                content,
                                                                isOpen,
                                                                onClose,
                                                                previousVersions = []
                                                            }) => {
    const [activeTab, setActiveTab] = useState('current')
    const [canClose, setCanClose] = useState(false)
    const [countdown, setCountdown] = useState(3)
    const mainRef = useRef(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isInView = useInView(mainRef, {once: true})

    // Reset to current tab when opening the modal and start countdown
    useEffect(() => {
        if (isOpen) {
            setActiveTab('current')
            setCanClose(false)
            setCountdown(3)

            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setCanClose(true)
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            return () => clearInterval(timer)
        }
    }, [isOpen])

    const handleClose = () => {
        if (canClose) {
            onClose()
        }
    }

    if (!content) return null

    // Group items by type for the summary
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const itemsByType = content.items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <Dialog
            open={isOpen}
            onOpenChange={() => {
            }} // Prevent closing from outside clicks or escape
        >
            <DialogContent
                className="sm:max-w-xl w-full max-w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-none bg-background/95 backdrop-blur-sm shadow-2xl"
                onPointerDownOutside={(e) => e.preventDefault()} // Prevent outside clicks
                onEscapeKeyDown={(e) => e.preventDefault()} // Prevent escape key
            >
                <div
                    className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-background to-background/95 -z-10"/>

                {/* Remove the default close button by overriding it */}
                <div className="absolute right-4 top-4 z-10">
                    {/* Empty div to occupy space where close button would be */}
                </div>

                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <div className="flex items-start gap-4">
                        <div
                            className="h-12 w-12 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-primary"/>
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                            <DialogTitle className="text-xl font-semibold">
                                What&apos;s New in v{content.version}
                            </DialogTitle>

                            <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0"/>
                                <time dateTime={content.releaseDate}>
                                    {new Date(content.releaseDate).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </time>
                            </div>

                            {content.description && (
                                <p className="text-sm text-muted-foreground pt-2">{content.description}</p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-hidden">
                    {previousVersions.length > 0 ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <div className="border-b px-6 flex-shrink-0">
                                <TabsList className="bg-transparent h-auto p-0">
                                    <TabsTrigger
                                        value="current"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2.5 px-3"
                                    >
                                        Current
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2.5 px-3"
                                    >
                                        Previous Updates
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="current" className="flex-1 min-h-0 p-0 m-0 overflow-hidden">
                                <ScrollArea className="h-full w-full">
                                    <div className="px-6 py-4" ref={mainRef}>
                                        <div className="space-y-0">
                                            {content.items.map((item, index) => (
                                                <ItemCard key={index} item={item} index={index}/>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 min-h-0 p-0 m-0 overflow-hidden">
                                <ScrollArea className="h-full w-full">
                                    <div className="px-6 py-4">
                                        <div className="space-y-6">
                                            {previousVersions.map((version, versionIndex) => (
                                                <div key={version.version} className="pb-6 last:pb-0">
                                                    <div className="mb-3 border-b pb-1">
                                                        <h3 className="font-medium">v{version.version} - {version.title}</h3>
                                                        <div
                                                            className="flex items-center text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0"/>
                                                            <time dateTime={version.releaseDate}>
                                                                {new Date(version.releaseDate).toLocaleDateString()}
                                                            </time>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-0 text-sm">
                                                        {version.items.slice(0, 3).map((item, index) => (
                                                            <ItemCard
                                                                key={`${version.version}-${index}`}
                                                                item={item}
                                                                index={index + versionIndex}
                                                            />
                                                        ))}

                                                        {version.items.length > 3 && (
                                                            <div className="pl-6 text-muted-foreground text-sm">
                                                                + {version.items.length - 3} more changes
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="px-6 py-4" ref={mainRef}>
                                <div className="space-y-0">
                                    {content.items.map((item, index) => (
                                        <ItemCard key={index} item={item} index={index}/>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between items-center border-t p-4 flex-shrink-0">
                    <div className="hidden sm:block text-xs text-muted-foreground">
                        Thanks for using Changerawr! We hope you enjoy our latest release :)
                    </div>
                    <Button
                        onClick={handleClose}
                        className="w-full sm:w-auto"
                        disabled={!canClose}
                    >
                        {canClose ? (
                            <>Got it <ArrowRight className="ml-2 h-4 w-4"/></>
                        ) : (
                            <>Wait {countdown}s <ArrowRight className="ml-2 h-4 w-4"/></>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default WhatsNewModal