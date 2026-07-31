'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { UpdateStatus } from '@/lib/types/easypanel'

/**
 * Small badge indicator that shows when an update is available
 * Only shows for admins who have access to the update API
 * Displays on sidebar About tab
 */
export const UpdateIndicatorBadge: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const response = await fetch('/api/system/update-status', {
                    cache: 'no-store'
                })

                if (!response.ok) {
                    // If not admin or error, silently fail
                    setLoading(false)
                    return
                }

                const data: UpdateStatus = await response.json()
                setUpdateAvailable(data.available)
            } catch {
                // Silently fail on error
            } finally {
                setLoading(false)
            }
        }

        checkForUpdates()

        // Refresh every hour
        const interval = setInterval(checkForUpdates, 60 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    // Only show if update is available
    if (!updateAvailable || loading) {
        return null
    }

    return (
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
    )
}