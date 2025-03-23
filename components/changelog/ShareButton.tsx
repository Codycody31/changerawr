'use client'

import { useState, useEffect } from 'react'
import { Share2, Check } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ShareButtonProps {
    url: string
    title?: string
    text?: string
}

export default function ShareButton({
                                        url,
                                        title = 'Changelog',
                                        text = 'Check out this project changelog'
                                    }: ShareButtonProps) {
    const [copied, setCopied] = useState(false)
    const [canUseNativeShare, setCanUseNativeShare] = useState(false)
    const { toast } = useToast()

    // Check if the Web Share API is available
    useEffect(() => {
        setCanUseNativeShare(
            typeof navigator !== 'undefined' &&
            !!navigator.share &&
            !!navigator.canShare
        )
    }, [])

    const handleShare = async () => {
        try {
            if (canUseNativeShare) {
                const shareData = { url, title, text }

                // Check if the data is shareable
                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData)
                    // toast({
                    //     title: "DEBUG",
                    //     description: "The navigator function was called successfully",
                    //     duration: 2000
                    // })
                    return
                }
            }

            // Fallback for browsers without Web Share API or if sharing fails
            await navigator.clipboard.writeText(url)
            setCopied(true)

            toast({
                title: "URL copied",
                description: "Changelog URL has been copied to clipboard",
                duration: 2000
            })

            // Reset copied state after 2 seconds
            setTimeout(() => {
                setCopied(false)
            }, 2000)
        } catch (error) {
            // User canceled or sharing failed
            console.error('Error sharing:', error)

            // Only try clipboard as fallback if it wasn't an abort
            if (error instanceof Error && error.name !== 'AbortError') {
                await navigator.clipboard.writeText(url)
                setCopied(true)

                toast({
                    title: "URL copied",
                    description: "Changelog URL has been copied to clipboard",
                    duration: 2000
                })

                // Reset copied state after 2 seconds
                setTimeout(() => {
                    setCopied(false)
                }, 2000)
            }
        }
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 p-0 h-auto"
                        onClick={handleShare}
                        aria-label="Share changelog"
                    >
                        {copied ? (
                            <Check className="w-5 h-5 text-green-500" />
                        ) : (
                            <Share2 className="w-5 h-5" />
                        )}
                        <span className="font-medium text-lg">
                            {copied ? 'Copied!' : 'Share'}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {canUseNativeShare ? 'Share this changelog' : 'Copy changelog URL'}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}