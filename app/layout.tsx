// app/layout.tsx
import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {AuthProvider} from '@/context/auth'
import './globals.css'
import React from "react";
import {ThemeProvider} from "@/components/theme-provider";
import {Toaster} from "@/components/ui/toaster";
import {Providers} from "@/app/dashboard/providers";

const inter = Inter({subsets: ['latin']})

export const metadata: Metadata = {
    title: 'Changerawr',
    description: 'Changelog management system',
}

// Start background services immediately when the module is imported
// This only runs on the server side (thanks SF)
if (typeof window === 'undefined') {
    import('@/app/startup').then(({startBackgroundServices}) => {
        startBackgroundServices();
    });
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
        <AuthProvider>
            <ThemeProvider>
                <Providers>
                    {children}
                    <Toaster/>
                </Providers>
            </ThemeProvider>
        </AuthProvider>
        </body>
        </html>
    )
}