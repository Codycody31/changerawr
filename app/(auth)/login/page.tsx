'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { ArrowLeft, User } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ErrorAlert } from '@/components/ui/error-alert'

const emailSchema = z.object({
    email: z.string().email('Please enter a valid email')
})

const passwordSchema = z.object({
    password: z.string().min(8, 'Please check your password')
})

type EmailForm = z.infer<typeof emailSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface UserPreview {
    name: string | null
    email: string
    avatarUrl: string
}

export default function LoginPage() {
    const { login, user, isLoading } = useAuth()
    const router = useRouter()
    const [error, setError] = useState('')
    const [step, setStep] = useState<'email' | 'password'>('email')
    const [userPreview, setUserPreview] = useState<UserPreview | null>(null)

    const emailForm = useForm<EmailForm>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            email: ''
        }
    })

    const passwordForm = useForm<PasswordForm>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: ''
        }
    })

    useEffect(() => {
        if (user && !isLoading) {
            router.push('/dashboard')
        }
    }, [user, isLoading, router])

    const onEmailSubmit = async (data: EmailForm) => {
        try {
            setError('')
            const response = await fetch('/api/auth/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email.toLowerCase() })
            })

            if (!response.ok) {
                throw new Error('Authentication failed')
            }

            const userData = await response.json()
            setUserPreview(userData)
            setStep('password')
        } catch (err: unknown) {
            setError('Unable to find your account')
            console.log(err)
        }
    }

    const onPasswordSubmit = async (data: PasswordForm) => {
        try {
            setError('')
            if (!userPreview) return

            await login(userPreview.email, data.password)
        } catch (err: unknown) {
            setError('Authentication failed')
            console.log(err)
            passwordForm.reset()
        }
    }

    const handleBack = () => {
        setStep('email')
        setError('')
        passwordForm.reset()
        emailForm.reset()
        setUserPreview(null)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm p-8"
            >
                <AnimatePresence mode="wait">
                    {step === 'email' ? (
                        <motion.div
                            key="email"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2 text-center">
                                <h1 className="text-3xl font-bold tracking-tighter">
                                    Sign in to Changerawr
                                </h1>
                                <p className="text-gray-500">
                                    Enter your email to get started
                                </p>
                            </div>

                            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        {...emailForm.register('email')}
                                        type="email"
                                        placeholder="you@example.com"
                                        className="transition-all"
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>

                                <AnimatePresence>
                                    {error && <ErrorAlert message={error} />}
                                </AnimatePresence>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={emailForm.formState.isSubmitting}
                                >
                                    {emailForm.formState.isSubmitting ? (
                                        <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking...
                    </span>
                                    ) : (
                                        'Continue'
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="password"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <Button
                                variant="ghost"
                                className="p-0 h-auto text-gray-500 hover:text-gray-900"
                                onClick={handleBack}
                            >
                                <ArrowLeft size={16} className="mr-2" />
                                Back
                            </Button>

                            <div className="flex flex-col items-center space-y-4">
                                <Avatar className="h-20 w-20 rounded-lg">
                                    <AvatarImage
                                        src={userPreview?.avatarUrl}
                                        alt={userPreview?.name || "User avatar"}
                                    />
                                    <AvatarFallback className="rounded-lg">
                                        <User className="h-10 w-10" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 text-center">
                                    <h2 className="text-xl font-semibold">
                                        Welcome back{userPreview?.name ? `, ${userPreview.name}` : ''}
                                    </h2>
                                    <p className="text-sm text-gray-500">{userPreview?.email}</p>
                                </div>
                            </div>

                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        {...passwordForm.register('password')}
                                        type="password"
                                        placeholder="••••••••"
                                        className="transition-all"
                                        autoComplete="current-password"
                                        autoFocus
                                    />
                                </div>

                                <AnimatePresence>
                                    {error && <ErrorAlert message={error} />}
                                </AnimatePresence>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={passwordForm.formState.isSubmitting}
                                >
                                    {passwordForm.formState.isSubmitting ? (
                                        <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </span>
                                    ) : (
                                        'Sign in'
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}