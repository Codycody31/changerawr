'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Fingerprint, Lock, Loader2, Shield, CheckCircle2 } from 'lucide-react'
import { ErrorAlert } from '@/components/ui/error-alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    startAuthentication,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/auth'

const passwordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

type PasswordForm = z.infer<typeof passwordSchema>

export default function TwoFactorPage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [secondFactorType, setSecondFactorType] = useState<'password' | 'passkey' | null>(null)
    const [sessionToken, setSessionToken] = useState<string | null>(null)
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const passwordForm = useForm<PasswordForm>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: ''
        }
    })

    useEffect(() => {
        // Get 2FA details from session storage
        const token = sessionStorage.getItem('2faSessionToken')
        const type = sessionStorage.getItem('2faType') as 'password' | 'passkey' | null

        if (!token || !type) {
            router.push('/login')
            return
        }

        setSessionToken(token)
        setSecondFactorType(type)
        setSupportsWebAuthn(browserSupportsWebAuthn())

        // Clear session storage
        sessionStorage.removeItem('2faSessionToken')
        sessionStorage.removeItem('2faType')
    }, [router])

    // Redirect to dashboard when user is authenticated
    useEffect(() => {
        if (user && !authLoading) {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    const handlePasswordSubmit = async (data: PasswordForm) => {
        if (!sessionToken) return

        try {
            setError('')
            setIsLoading(true)

            const response = await fetch('/api/auth/login/second-factor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionToken,
                    secondFactorPassword: data.password
                }),
                credentials: 'include'
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            // Success
            setIsSuccess(true)

            // Force refresh the page to update auth context
            window.location.href = '/dashboard'
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed')
            passwordForm.reset()
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasskeyVerification = async () => {
        if (!sessionToken) return

        try {
            setError('')
            setIsLoading(true)

            // Get passkey options
            const optionsResponse = await fetch('/api/auth/passkeys/authenticate/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            })

            if (!optionsResponse.ok) {
                throw new Error('Failed to get authentication options')
            }

            const { options, challenge } = await optionsResponse.json()

            // Start WebAuthn authentication
            const authenticationResponse = await startAuthentication(options)

            // Verify with server
            const verifyResponse = await fetch('/api/auth/login/second-factor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionToken,
                    passkeyResponse: authenticationResponse,
                    challenge,
                    passkeyVerified: true
                }),
                credentials: 'include'
            })

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            // Success
            setIsSuccess(true)

            // Force refresh the page to update auth context
            window.location.href = '/dashboard'
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed')
        } finally {
            setIsLoading(false)
        }
    }

    if (!secondFactorType || !sessionToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <Card className="border-2 shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
                        <CardDescription>
                            {secondFactorType === 'password'
                                ? 'Enter your password to complete sign in'
                                : 'Verify with your passkey to complete sign in'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <AnimatePresence mode="wait">
                            {isSuccess ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="py-8 text-center"
                                >
                                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Authentication Successful</h3>
                                    <p className="text-muted-foreground">Redirecting to dashboard...</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    {error && <ErrorAlert message={error} />}

                                    {secondFactorType === 'password' ? (
                                        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="password">Password</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        {...passwordForm.register('password')}
                                                        placeholder="Enter your password"
                                                        autoComplete="current-password"
                                                        disabled={isLoading}
                                                        className="pl-10"
                                                    />
                                                </div>
                                                {passwordForm.formState.errors.password && (
                                                    <p className="text-sm text-destructive">
                                                        {passwordForm.formState.errors.password.message}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={isLoading}
                                                size="lg"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="mr-2 h-4 w-4" />
                                                        Verify Password
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-lg bg-muted text-center">
                                                <Fingerprint className="h-8 w-8 mx-auto mb-2 text-primary" />
                                                <p className="text-sm text-muted-foreground">
                                                    Use your security key or biometric authentication to continue
                                                </p>
                                            </div>
                                            <Button
                                                onClick={handlePasskeyVerification}
                                                className="w-full"
                                                disabled={isLoading || !supportsWebAuthn}
                                                size="lg"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Fingerprint className="mr-2 h-4 w-4" />
                                                        Verify with Passkey
                                                    </>
                                                )}
                                            </Button>
                                            {!supportsWebAuthn && (
                                                <p className="text-sm text-center text-destructive">
                                                    Your browser doesn&apos;t support passkeys
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">or</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => router.push('/login')}
                                        disabled={isLoading}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Login
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    This extra step helps keep your account secure
                </p>
            </motion.div>
        </div>
    )
}