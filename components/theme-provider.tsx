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
`;

export function ThemeProvider({
                                  children,
                                  ...props
                              }: React.ComponentProps<typeof NextThemesProvider>) {
    const { user } = useAuth()
    const [userTheme, setUserTheme] = React.useState<string | undefined>(
        typeof window !== 'undefined' ? localStorage.getItem('theme') || 'light' : 'light'
    )

    // Fetch user settings only if authenticated and no cached theme
    React.useEffect(() => {
        const fetchUserTheme = async () => {
            if (user && !localStorage.getItem('theme')) {
                try {
                    const response = await fetch('/api/settings')
                    if (response.ok) {
                        const settings = await response.json()
                        setUserTheme(settings.theme)
                        localStorage.setItem('theme', settings.theme)
                    }
                } catch (error) {
                    console.error('Failed to fetch theme settings:', error)
                }
            }
        }

        fetchUserTheme()
    }, [user])

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