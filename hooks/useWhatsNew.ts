'use client'

import { useState, useEffect } from 'react'
import { appInfo } from '@/lib/app-info'
import { compareVersions } from 'compare-versions'
import { WhatsNewContent } from '@/components/dashboard/WhatsNewModal'

const VERSION_STORAGE_KEY = 'changerawr-last-version'
const WHATS_NEW_ENDPOINT = 'https://dl.supers0ft.us/changerawr/whatsnew/'

export function useWhatsNew() {
    const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null)
    const [showWhatsNew, setShowWhatsNew] = useState(false)
    const [whatsNewContent, setWhatsNewContent] = useState<WhatsNewContent | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // On mount, check if we need to show the What's New modal
    useEffect(() => {
        // Only run on client-side
        if (typeof window === 'undefined') return

        // Get the last seen version from localStorage
        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
        setLastSeenVersion(storedVersion)

        // No stored version means first time user, or localStorage was cleared
        if (!storedVersion) {
            // Instead of setting to current version, set to a lower version to ensure modal shows
            // Using a very old version like '0.0.1' to ensure it's less than current app version
            localStorage.setItem(VERSION_STORAGE_KEY, '0.0.1')
            // Then fetch and show what's new content
            fetchWhatsNewContent(appInfo.version)
            return
        }

        // If the current version is newer than the stored version, fetch What's New content
        if (compareVersions(appInfo.version, storedVersion) > 0) {
            fetchWhatsNewContent(appInfo.version)
        }
    }, [])

    // Fetch What's New content from the API
    const fetchWhatsNewContent = async (version: string) => {
        setIsLoading(true)
        setError(null)

        try {
            // First try the external PHP endpoint
            const response = await fetch(`${WHATS_NEW_ENDPOINT}?version=${version}`, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                // Set a timeout in case the PHP endpoint is slow or unavailable
                signal: AbortSignal.timeout(5000)
            })

            if (!response.ok) {
                // If we get an error from the external endpoint, try the fallback
                throw new Error(`External API returned status: ${response.status}`)
            }

            const data = await response.json()

            // Validate the response structure
            if (!data.version || !data.releaseDate || !data.title || !Array.isArray(data.items)) {
                throw new Error('Invalid response format from external API')
            }

            setWhatsNewContent(data)
            setShowWhatsNew(true)
        } catch (externalError) {
            console.warn('Error fetching from external What\'s New API:', externalError)

            // Try the local fallback API
            try {
                const fallbackResponse = await fetch(`/api/system/whatsnew?version=${version}`)

                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback API returned status: ${fallbackResponse.status}`)
                }

                const fallbackData = await fallbackResponse.json()
                setWhatsNewContent(fallbackData)
                setShowWhatsNew(true)
            } catch (fallbackError) {
                console.error('Error fetching from fallback What\'s New API:', fallbackError)
                setError('Failed to fetch content from both primary and fallback sources')

                // Use default data for the current version as a last resort
                setWhatsNewContent(getDefaultWhatsNewData(version))
                setShowWhatsNew(true)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Close the modal and update the last seen version
    const closeWhatsNew = () => {
        setShowWhatsNew(false)
        // Update the last seen version in localStorage
        localStorage.setItem(VERSION_STORAGE_KEY, appInfo.version)
        setLastSeenVersion(appInfo.version)
    }

    // Manual trigger for What's New
    const manuallyShowWhatsNew = async () => {
        if (!whatsNewContent) {
            await fetchWhatsNewContent(appInfo.version)
        } else {
            setShowWhatsNew(true)
        }
    }

    // Provide fallback data in case both APIs fail
    const getDefaultWhatsNewData = (version: string): WhatsNewContent => {
        const now = new Date().toISOString().split('T')[0]

        return {
            version: version,
            releaseDate: now,
            title: `Changerawr ${version}`,
            description: "This is an update to the Changerawr application.",
            items: [
                {
                    title: "New Features",
                    description: "This version includes several new features and improvements.",
                    type: "improvement"
                }
            ]
        }
    }

    // Force a check for new content - useful if version is changed manually
    const checkForUpdates = () => {
        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)

        if (!storedVersion || compareVersions(appInfo.version, storedVersion) > 0) {
            fetchWhatsNewContent(appInfo.version)
        }
    }

    // Force the modal to show by setting a lower version
    const forceWhatsNewModal = () => {
        localStorage.setItem(VERSION_STORAGE_KEY, '0.0.1')
        fetchWhatsNewContent(appInfo.version)
        return true
    }

    return {
        showWhatsNew,
        whatsNewContent,
        isLoading,
        error,
        closeWhatsNew,
        manuallyShowWhatsNew,
        checkForUpdates,
        forceWhatsNewModal,
        lastSeenVersion,
        currentVersion: appInfo.version
    }
}

export default useWhatsNew