'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@prisma/client';

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isLoading: boolean
    testRefresh?: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes
const TEST_REFRESH_INTERVAL = 15 * 1000 // 15 seconds
const REFRESH_THRESHOLD = 0.8 // Refresh at 80% of token lifetime

export function AuthProvider({
                                 children,
                                 testRefresh = false
                             }: {
    children: React.ReactNode
    testRefresh?: boolean
}) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    // @ts-expect-error 1 arg but zero nw
    const refreshTimerRef = useRef<NodeJS.Timeout>()

    const refreshInterval = testRefresh ? TEST_REFRESH_INTERVAL : REFRESH_INTERVAL
    const timeUntilRefresh = refreshInterval * REFRESH_THRESHOLD

    const refreshToken = async () => {
        try {
            const refreshResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include', // Important for cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (refreshResponse.ok) {
                const { user: refreshedUser } = await refreshResponse.json()
                setUser(refreshedUser)
                return true
            }

            // If refresh fails, clear user state
            setUser(null)
            return false
        } catch (error) {
            console.error('Token refresh failed:', error)
            setUser(null)
            return false
        }
    }

    const scheduleTokenRefresh = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
        }

        refreshTimerRef.current = setTimeout(async () => {
            if (user) {
                const success = await refreshToken()
                if (success) {
                    scheduleTokenRefresh()
                } else {
                    await logout()
                }
            }
        }, timeUntilRefresh)
    }, [user, timeUntilRefresh])

    const checkAuthState = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include',
                cache: 'no-store'
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else {
                // If me endpoint fails, try to refresh token
                const success = await refreshToken()
                if (!success) {
                    setUser(null)
                }
            }
        } catch (error) {
            console.error('Authentication check failed:', error)
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            setIsLoading(true)
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current)
            }

            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            })
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            setUser(null)
            setIsLoading(false)
            router.push('/login')
        }
    }, [router])

    // Initial auth check
    useEffect(() => {
        checkAuthState()
    }, [checkAuthState])

    // Schedule refresh when user changes
    useEffect(() => {
        if (user) {
            scheduleTokenRefresh()
        }

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current)
            }
        }
    }, [user, scheduleTokenRefresh])

    const login = async (email: string, password: string) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            const { user: userData } = await response.json()
            setUser(userData)
            router.push('/dashboard')
        } catch (error) {
            console.error('Login error:', error)
            setUser(null)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isLoading,
                testRefresh
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}