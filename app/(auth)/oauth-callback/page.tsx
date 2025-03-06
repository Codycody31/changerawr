'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OAuthCallback() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Extract the redirect URL from the page content
        const handleOAuthRedirect = () => {
            try {
                // Get the JSON content from the pre-rendered response
                const jsonContent = document.getElementById('oauth-data')?.textContent

                if (jsonContent) {
                    const data = JSON.parse(jsonContent)
                    if (data.redirectTo) {
                        // Navigate to the redirect URL
                        router.push(data.redirectTo)
                        return
                    }
                }

                // Fallback to dashboard if no redirect found
                router.push('/dashboard')
            } catch (err) {
                console.error('OAuth redirect error:', err)
                setError('Failed to complete login')

                // Redirect to login with error after a brief delay
                setTimeout(() => {
                    router.push(`/login?error=${encodeURIComponent('Failed to complete OAuth login')}`)
                }, 2000)
            }
        }

        handleOAuthRedirect()
    }, [router])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            {error ? (
                <div className="text-center">
                    <p className="text-destructive">{error}</p>
                    <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
                </div>
            ) : (
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="mt-4">Completing login...</p>
                </div>
            )}
        </div>
    )
}