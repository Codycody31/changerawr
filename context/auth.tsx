'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@prisma/client';

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Check auth state on mount and whenever the component is re-rendered
    useEffect(() => {
        checkAuthState()
    }, [])

    async function checkAuthState() {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include', // Important for sending cookies
                cache: 'no-store' // Ensure fresh data
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else {
                // If me endpoint fails, try to refresh token
                const refreshResponse = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    cache: 'no-store'
                })

                if (refreshResponse.ok) {
                    const { user: refreshedUser } = await refreshResponse.json()
                    setUser(refreshedUser)
                } else {
                    // Clear user if refresh fails
                    setUser(null)
                }
            }
        } catch (error) {
            console.error('Authentication check failed:', error)
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    async function login(email: string, password: string) {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // Important for handling cookies
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            const { user: userData } = await response.json()

            // Update user state
            setUser(userData)

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (error) {
            console.error('Login error:', error)
            setUser(null)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    async function logout() {
        try {
            setIsLoading(true)
            // Attempt to invalidate server-side session
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            })
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            // Reset user state
            setUser(null)
            setIsLoading(false)

            // Redirect to login
            router.push('/login')
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isLoading
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