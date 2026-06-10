// app/layout.tsx
import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {AuthProvider} from '@/context/auth'
import './globals.css'
import React from "react";
import {ThemeProvider} from "@/components/theme-provider";
import {Toaster} from "@/components/ui/toaster";
import {Providers} from "@/app/dashboard/providers"
import {AmbientDinoLoader} from "@/components/AmbientDinoLoader";
import {CodeCopyButtonHandler} from "@/components/CodeCopyButtonHandler";

const inter = Inter({subsets: ['latin']})

export const metadata: Metadata = {
    title: 'Changerawr',
    description: 'Changelog management system',
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
                    <AmbientDinoLoader/>
                    <CodeCopyButtonHandler/>
                </Providers>
            </ThemeProvider>
        </AuthProvider>
        </body>
        </html>
    )
}