'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Gift, Star, CheckCircle, Bug, ArrowRight } from 'lucide-react'

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
}

const typeIcons = {
    feature: <Star className="h-4 w-4 text-yellow-500" />,
    improvement: <CheckCircle className="h-4 w-4 text-green-500" />,
    bugfix: <Bug className="h-4 w-4 text-red-500" />,
    other: <AlertCircle className="h-4 w-4 text-blue-500" />
}

const typeColors = {
    feature: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    improvement: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    bugfix: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    other: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ content, isOpen, onClose }) => {
    if (!content) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                            <Gift className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl">What&apos;s New in v{content.version}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Released on {new Date(content.releaseDate).toLocaleDateString()}
                            </p>
                            {content.description && (
                                <p className="text-sm text-muted-foreground pt-2">{content.description}</p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-grow my-4 pr-4 max-h-[50vh]">
                    <div className="space-y-6">
                        <AnimatePresence>
                            {content.items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="pb-4 last:pb-0"
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">{typeIcons[item.type]}</div>
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">{item.title}</h3>
                                                <Badge variant="outline" className={typeColors[item.type]}>
                                                    {item.type}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                <DialogFooter className="flex sm:justify-end border-t pt-4">
                    <Button onClick={onClose}>
                        Got it <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default WhatsNewModal