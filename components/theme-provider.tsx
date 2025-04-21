'use client'

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useAuth } from "@/context/auth"

// Script to be injected in the document head
const themeScript = `
  let theme = 'light'; // Default theme
  const auth = document.cookie.includes('accessToken=');
  
  if (auth) {
    // Check localStorage first for cached theme
    const cachedTheme = localStorage.getItem('theme');
    if (cachedTheme) {
      theme = cachedTheme;
    }
  }
  
  document.documentElement.classList.toggle('dark', theme === 'dark');
  
  // Add a small transition delay to prevent flash during theme change
  document.documentElement.style.transition = "background-color 0.2s ease-in-out";
`;

export function ThemeProvider({
                                  children,
                                  ...props
                              }: React.ComponentProps<typeof NextThemesProvider>) {
    const { user } = useAuth()
    const [userTheme, setUserTheme] = React.useState<string | undefined>(
        typeof window !== 'undefined' ? localStorage.getItem('theme') || 'light' : 'light'
    )
    const [isLoading, setIsLoading] = React.useState(true)

    // Fetch user settings only if authenticated and no cached theme
    React.useEffect(() => {
        const fetchUserTheme = async () => {
            if (user && !localStorage.getItem('theme')) {
                try {
                    setIsLoading(true)
                    const response = await fetch('/api/auth/settings')
                    if (response.ok) {
                        const settings = await response.json()
                        setUserTheme(settings.theme)
                        localStorage.setItem('theme', settings.theme)
                    }
                } catch (error) {
                    console.error('Failed to fetch theme settings:', error)
                } finally {
                    setIsLoading(false)
                }
            } else {
                setIsLoading(false)
            }
        }

        fetchUserTheme()
    }, [user])

    // Listen for storage changes to detect theme changes from other tabs
    React.useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'theme' && event.newValue) {
                setUserTheme(event.newValue)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    // Check for theme changes every time userTheme updates
    React.useEffect(() => {
        if (userTheme && !isLoading) {
            localStorage.setItem('theme', userTheme)
        }
    }, [userTheme, isLoading])

    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: themeScript,
                }}
            />
            <NextThemesProvider
                {...props}
                defaultTheme="light"
                forcedTheme={userTheme}
                enableSystem={false}
                attribute="class"
                disableTransitionOnChange
            >
                {children}
            </NextThemesProvider>
        </>
    )
}