'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react'
import Link from 'next/link'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState('')
    const { toast } = useToast()

    const form = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    })

    const onSubmit = async (data: ForgotPasswordForm) => {
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send reset email')
            }

            setSubmittedEmail(data.email)
            setIsSubmitted(true)
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            })
        }
    }

    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <Link
                href="/login"
                className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
            </Link>

            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <Card className="border shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Reset password</CardTitle>
                        <CardDescription className="text-center">
                            {isSubmitted
                                ? "Check your email for a reset link"
                                : "Enter your email to receive a password reset link"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSubmitted ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center text-center space-y-4"
                            >
                                <div className="rounded-full bg-primary/10 p-3">
                                    <MailCheck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Check your email</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        We&apos;ve sent a password reset link to {submittedEmail}
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        {...form.register('email')}
                                        type="email"
                                        placeholder="name@example.com"
                                        className="transition-all"
                                        autoComplete="email"
                                        autoFocus
                                    />
                                    {form.formState.errors.email && (
                                        <p className="text-sm text-destructive flex items-center mt-1">
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            {form.formState.errors.email.message}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send reset link'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    {isSubmitted && (
                        <CardFooter className="flex justify-center">
                            <Button
                                variant="link"
                                onClick={() => {
                                    setIsSubmitted(false);
                                    form.reset();
                                }}
                            >
                                Try a different email
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    )
}