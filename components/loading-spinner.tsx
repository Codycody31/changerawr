'use client'

import { Loader2 } from 'lucide-react'

export function LoadingSpinner() {
    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    )
}