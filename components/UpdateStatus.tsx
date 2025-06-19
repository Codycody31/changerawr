// components/UpdateStatus.tsx (Updated without redundant Easypanel info)

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, RefreshCw, Download, Zap, AlertTriangle } from 'lucide-react'
import { compareVersions } from 'compare-versions'
import { appInfo } from "@/lib/app-info"
import { UpdateStatus as UpdateStatusType } from '@/lib/types/easypanel'

interface UpdateStatusProps {
    currentVersion: string
    onCheckUpdate?: () => Promise<string>
    onUpdate?: () => Promise<void>
    checkOnMount?: boolean
    autoCheckInterval?: number
    showEasypanelInfo?: boolean
}

type UpdateState = 'idle' | 'checking' | 'available' | 'no-update' | 'updating' | 'error'

const UpdateStatus: React.FC<UpdateStatusProps> = ({
                                                       currentVersion,
                                                       onCheckUpdate,
                                                       onUpdate,
                                                       checkOnMount = false,
                                                       autoCheckInterval = 0,
                                                       showEasypanelInfo = false,
                                                   }) => {
    const [state, setState] = useState<UpdateState>('idle')
    const [latestVersion, setLatestVersion] = useState<string>(currentVersion)
    const [updateStatus, setUpdateStatus] = useState<UpdateStatusType | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchUpdateStatus = async (): Promise<UpdateStatusType> => {
        const response = await fetch('/api/system/update-status')
        if (!response.ok) {
            throw new Error(`Failed to fetch update status: ${response.statusText}`)
        }
        return response.json()
    }

    const performEasypanelUpdate = async (targetVersion: string): Promise<void> => {
        const response = await fetch('/api/system/perform-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ targetVersion }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.details || errorData.error || 'Update failed')
        }

        const result = await response.json()
        console.log('Update result:', result)
    }

    const handleCheckUpdate = async () => {
        setState('checking')
        setError(null)

        try {
            let newVersion = currentVersion
            let status: UpdateStatusType | null = null

            // If we have a custom check function, use it
            if (onCheckUpdate) {
                newVersion = await onCheckUpdate()
            } else {
                // Use our enhanced API
                status = await fetchUpdateStatus()
                newVersion = status.latestVersion
                setUpdateStatus(status)
            }

            setLatestVersion(newVersion)

            if (compareVersions(newVersion, currentVersion) > 0) {
                setState('available')
            } else {
                setState('no-update')
            }
        } catch (error) {
            console.error('Failed to check for updates:', error)
            setError(error instanceof Error ? error.message : 'Failed to check for updates')
            setState('error')
        }
    }

    const handleUpdate = async () => {
        setState('updating')
        setError(null)

        try {
            if (updateStatus?.canAutoUpdate && updateStatus.latestVersion) {
                // Use Easypanel auto-update
                await performEasypanelUpdate(updateStatus.latestVersion)
                // After successful update, the app will restart
                setTimeout(() => {
                    window.location.reload()
                }, 3000)
            } else if (onUpdate) {
                // Use custom update function
                await onUpdate()
                setState('no-update')
            } else {
                throw new Error('No update method available')
            }
        } catch (error) {
            console.error('Update failed:', error)
            setError(error instanceof Error ? error.message : 'Update failed')
            setState('error')
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
        <div className="flex flex-col items-center space-y-4">
            {/* Error Alert */}
            {error && (
                <Alert variant="destructive" className="w-full max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Easypanel Configuration Status - Only if showEasypanelInfo is true */}
            {showEasypanelInfo && updateStatus && (
                <Alert variant={updateStatus.easypanelConfigured ? "success" : "warning"} className="w-full max-w-md">
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                        {updateStatus.easypanelConfigured ? (
                            <span>
                                ✅ Easypanel configured - Automatic updates available
                            </span>
                        ) : (
                            <span>
                                ⚠️ Easypanel not configured - Manual updates only
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* Update Status Display */}
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

                {state === 'updating' && (
                    <div className="flex flex-col items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="flex items-center gap-1.5"
                        >
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Updating...
                        </Button>
                        <div className="text-xs text-muted-foreground text-center">
                            Please wait while the application is being updated.
                            <br />
                            The page will reload automatically.
                        </div>
                    </div>
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
                            <span>Update available: v{latestVersion}</span>
                        </div>

                        {updateStatus?.canAutoUpdate ? (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={handleUpdate}
                                className="flex items-center gap-1.5 w-full"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Auto-Update
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => window.open(`${appInfo['repository']}`, '_blank')}
                                className="flex items-center gap-1.5 w-full"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download from GitHub
                            </Button>
                        )}

                        <div className="text-xs text-muted-foreground mt-1 text-center">
                            {updateStatus?.canAutoUpdate ? (
                                'Automatic update will restart the application'
                            ) : (
                                'Manual update required - follow upgrade instructions'
                            )}
                        </div>
                    </div>
                )}

                {state === 'error' && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCheckUpdate}
                        className="flex items-center gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Check
                    </Button>
                )}
            </div>
        </div>
    )
}

export default UpdateStatus