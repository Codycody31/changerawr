'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, RefreshCw, Download } from 'lucide-react'
import { compareVersions } from 'compare-versions'
import {appInfo} from "@/lib/app-info";

interface UpdateStatusProps {
    currentVersion: string
    onCheckUpdate?: () => Promise<string>
    onUpdate?: () => Promise<void>
    checkOnMount?: boolean
    autoCheckInterval?: number
}

type UpdateState = 'idle' | 'checking' | 'available' | 'no-update' | 'updating'

const UpdateStatus: React.FC<UpdateStatusProps> = ({
                                                       currentVersion,
                                                       onCheckUpdate = async () => currentVersion,
                                                       checkOnMount = false,
                                                       autoCheckInterval = 0,
                                                   }) => {
    const [state, setState] = useState<UpdateState>('idle')
    const [latestVersion, setLatestVersion] = useState<string>(currentVersion)
    const [checkCount, setCheckCount] = useState(0)

    // Easter egg: Shows a special message after checking 5 times
    const isEasterEggRevealed = checkCount >= 5

    const handleCheckUpdate = async () => {
        setState('checking')
        try {
            const newVersion = await onCheckUpdate()
            setLatestVersion(newVersion)

            if (compareVersions(newVersion, currentVersion) > 0) {
                setState('available')
            } else {
                setState('no-update')
            }

            // Increment check counter for easter egg
            setCheckCount(prev => prev + 1)
        } catch (error) {
            console.error('Failed to check for updates:', error)
            setState('idle')
        }
    }

    useEffect(() => {
        if (checkOnMount) {
            handleCheckUpdate()
        }
    }, [checkOnMount])

    useEffect(() => {
        if (autoCheckInterval > 0) {
            const interval = setInterval(handleCheckUpdate, autoCheckInterval)
            return () => clearInterval(interval)
        }
    }, [autoCheckInterval])

    return (
        <div className="flex flex-col items-center space-y-2">
            {state === 'idle' && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckUpdate}
                    className="flex items-center gap-1.5"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check for Updates
                </Button>
            )}

            {state === 'checking' && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="flex items-center gap-1.5"
                >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Checking...
                </Button>
            )}

            {state === 'no-update' && (
                <div className="flex flex-col items-center gap-1 text-sm">
                    <div className="flex items-center text-green-500 gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Up to date!</span>
                    </div>
                </div>
            )}

            {state === 'available' && (
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center text-amber-500 gap-1 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>
              Update available: v{latestVersion}
            </span>
                    </div>

                    {/* GitHub button */}
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => window.open(`${appInfo['repository']}`, '_blank')}
                        className="flex items-center gap-1.5 w-full"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download from GitHub
                    </Button>

                    <div className="text-xs text-muted-foreground mt-1">
                        Automatic updates are not available. Please follow the upgrade instructions.
                    </div>
                </div>
            )}

            {/* Easter Egg revealed after checking multiple times */}
            {isEasterEggRevealed && state !== 'checking' && (
                <div className="mt-3 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                     onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}>
                    🔑 You found a secret! Click for a surprise!
                </div>
            )}
        </div>
    )
}

export default UpdateStatus