// src/app/(auth)/register/[token]/page.tsx
'use client'

import { useEffect, useState, use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ErrorAlert } from '@/components/ui/error-alert'
import Link from 'next/link'

const registerSchema = z.object({
    name: z.string().min(2, 'Name is too short'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

type RegisterForm = z.infer<typeof registerSchema>

interface InvitationInfo {
    email: string
    role: string
    expiresAt: string
}

export default function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)
    const [error, setError] = useState('')
    const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    const form = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            password: '',
            confirmPassword: ''
        }
    })

    useEffect(() => {
        async function validateInvitation() {
            try {
                const response = await fetch(`/api/auth/invitation/${token}`)
                const data = await response.json()

                if (!response.ok) {
                    console.error('Invitation validation failed:', data)
                    throw new Error(data.message || 'Invalid invitation')
                }

                setInvitation(data)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('This invitation link is invalid or has expired')
                }
            } finally {
                setIsLoading(false)
            }
        }

        validateInvitation()
    }, [token])

    const onSubmit = async (data: RegisterForm) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    name: data.name,
                    password: data.password
                })
            })

            if (!response.ok) {
                throw new Error('Registration failed')
            }

            router.push('/login')
        } catch (err: unknown) {
            setError('Unable to complete registration')
            console.log(err)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-background">
                <div className="animate-pulse">Validating invitation...</div>
            </div>
        )
    }

    if (!invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-background">
                <div className="w-full max-w-sm p-8 space-y-4">
                    <ErrorAlert message={error} />
                    <div className="text-center">
                        <Link
                            href="/login"
                            className="text-sm text-gray-500 hover:text-gray-900"
                        >
                            Return to login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center dark:bg-background">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm p-8"
            >
                <div className="space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter">
                            Complete your registration
                        </h1>
                        <p className="text-gray-500">
                            Set up your account for {invitation.email}
                        </p>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full name</Label>
                            <Input
                                id="name"
                                {...form.register('name')}
                                type="text"
                                placeholder="Your name"
                                className="transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                {...form.register('password')}
                                type="password"
                                placeholder="••••••••"
                                className="transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm password</Label>
                            <Input
                                id="confirmPassword"
                                {...form.register('confirmPassword')}
                                type="password"
                                placeholder="••••••••"
                                className="transition-all"
                            />
                        </div>

                        {error && <ErrorAlert message={error} />}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? (
                                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
                            ) : (
                                'Create account'
                            )}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}