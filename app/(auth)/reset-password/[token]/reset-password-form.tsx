'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
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

// Password schema with requirements
const passwordSchema = z
    .object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

type ResetPasswordForm = z.infer<typeof passwordSchema>;

export default function ResetPasswordForm({ token }: { token: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<ResetPasswordForm>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    // Validate token on page load
    useEffect(() => {
        const validateToken = async () => {
            try {
                const response = await fetch(`/api/auth/reset-password/${token}`);
                const data = await response.json();

                if (response.ok && data.valid) {
                    setIsValidToken(true);
                    if (data.email) {
                        setUserEmail(data.email);
                    }
                } else {
                    setErrorMessage(data.message || 'Invalid or expired reset token');
                }
            } catch {
                setErrorMessage('Failed to validate reset token');
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const onSubmit = async (data: ResetPasswordForm) => {
        try {
            const response = await fetch(`/api/auth/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: data.password,
                    confirmPassword: data.confirmPassword,
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to reset password');
            }

            setIsSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="container flex h-screen w-screen flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Validating reset token...</p>
                </div>
            </div>
        );
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

            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                <Card className="border shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">
                            {isSuccess ? 'Password reset' : 'Create new password'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {isSuccess
                                ? 'Your password has been reset successfully'
                                : isValidToken
                                    ? `Set a new password for ${userEmail || 'your account'}`
                                    : 'Reset link error'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center text-center space-y-4"
                            >
                                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Password reset successful</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        You can now log in with your new password
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Redirecting to login page...
                                    </p>
                                </div>
                            </motion.div>
                        ) : isValidToken ? (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            {...form.register('password')}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className="pr-10"
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={togglePasswordVisibility}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                    {form.formState.errors.password && (
                                        <p className="text-sm text-destructive flex items-center mt-1">
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            {form.formState.errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm password</Label>
                                    <Input
                                        id="confirmPassword"
                                        {...form.register('confirmPassword')}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="transition-all"
                                        autoComplete="new-password"
                                    />
                                    {form.formState.errors.confirmPassword && (
                                        <p className="text-sm text-destructive flex items-center mt-1">
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            {form.formState.errors.confirmPassword.message}
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
                                            Resetting password...
                                        </span>
                                    ) : (
                                        'Reset password'
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="rounded-full bg-destructive/10 p-3">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <div>
                                    <p className="font-medium">Invalid reset link</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {errorMessage || 'This password reset link is invalid or has expired.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {!isValidToken && !isSuccess && (
                        <CardFooter className="flex justify-center">
                            <Button
                                variant="outline"
                                asChild
                            >
                                <Link href="/forgot-password">
                                    Request a new reset link
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}