'use client'

import { useAuth } from '@/context/auth'
import { useRouter, usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/dashboard')
        }
    }, [user, isLoading, router, pathname])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/30 dark:bg-background">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/30">
            {children}
        </div>
    )
}