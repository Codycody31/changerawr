'use client'

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useAuth } from "@/context/auth"

// Theme sync component that handles user settings integration
function ThemeSync() {
    const { theme, setTheme } = useTheme()
    const { user, isLoading } = useAuth()
    const [hasSynced, setHasSynced] = React.useState(false)

    // Check if user is authenticated (not loading and has user)
    const isAuthenticated = !isLoading && !!user

    // Sync theme with user settings when authenticated
    React.useEffect(() => {
        async function syncTheme() {
            if (!isAuthenticated || !user || hasSynced) return

            try {
                const response = await fetch('/api/auth/settings')
                if (response.ok) {
                    const settings = await response.json()
                    if (settings.theme && settings.theme !== theme) {
                        setTheme(settings.theme)
                    }
                }
            } catch (error) {
                console.error('Failed to sync theme from user settings:', error)
            } finally {
                setHasSynced(true)
            }
        }

        syncTheme()
    }, [isAuthenticated, user, theme, setTheme, hasSynced])

    // Save theme changes to user settings when authenticated
    React.useEffect(() => {
        async function saveTheme() {
            if (!isAuthenticated || !user || !hasSynced || !theme) return

            try {
                await fetch('/api/auth/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme })
                })
            } catch (error) {
                console.error('Failed to save theme to user settings:', error)
            }
        }

        // Debounce theme saves
        const timeoutId = setTimeout(saveTheme, 500)
        return () => clearTimeout(timeoutId)
    }, [theme, isAuthenticated, user, hasSynced])

    return null
}

export function ThemeProvider({
                                  children,
                                  ...props
                              }: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            {...props}
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
            storageKey="theme"
        >
            <ThemeSync />
            {children}
        </NextThemesProvider>
    )
}

// Custom hook for theme with loading state
export function useThemeWithLoading() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return {
        theme,
        setTheme,
        resolvedTheme,
        isLoading: !mounted
    }
}