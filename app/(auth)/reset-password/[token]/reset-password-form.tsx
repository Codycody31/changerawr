
'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import {
    Card,
    CardContent,
    CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

// Smart confetti function
const fireConfetti = () => {
    const isMobile = window.innerWidth < 768;
    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 0,
        disableForReducedMotion: true
    };

    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        // Only show minimal confetti for users who prefer reduced motion
        confetti({
            ...defaults,
            particleCount: 20,
            gravity: 1,
            origin: { y: 0.6, x: 0.5 }
        });
        return;
    }

    // Initial burst from the center
    confetti({
        ...defaults,
        particleCount: isMobile ? 50 : 100,
        origin: { y: 0.6, x: 0.5 }
    });

    // Create cannon effect
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: isMobile ? 25 : 50,
            angle: 60,
            spread: 50,
            origin: { x: 0, y: 0.6 }
        });

        confetti({
            ...defaults,
            particleCount: isMobile ? 25 : 50,
            angle: 120,
            spread: 50,
            origin: { x: 1, y: 0.6 }
        });
    }, 250);

    // Final smaller bursts
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: isMobile ? 15 : 30,
            angle: 90,
            gravity: 1.2,
            origin: { x: 0.5, y: 0.7 }
        });
    }, 400);
};

export default function ResetPasswordForm({ token }: { token: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const router = useRouter();
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting, isValid },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(passwordSchema),
        mode: "onChange",
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const password = watch('password', '');

    // Calculate password strength
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;

        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;

        // Character variety
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        // Normalize to a scale of 0-3
        setPasswordStrength(Math.min(3, Math.floor(strength / 2)));
    }, [password]);

    // Scroll to top when success view is shown
    useEffect(() => {
        if (isSuccess && wrapperRef.current) {
            wrapperRef.current.scrollIntoView({ behavior: 'smooth' });

            // Trigger confetti after a short delay
            setTimeout(() => fireConfetti(), 300);
        }
    }, [isSuccess]);

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
                    confirmPassword: data.confirmPassword, // Include confirmPassword
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to reset password');
            }

            setIsSuccess(true);

            toast({
                title: 'Success',
                description: 'Your password has been reset successfully',
                variant: 'success',
            });

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
    }
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Get strength label and color
    const getStrengthLabel = () => {
        if (!password) return '';
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        return labels[passwordStrength];
    };

    const getStrengthColor = () => {
        if (!password) return 'bg-muted';
        const colors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
        return colors[passwordStrength];
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 bg-muted/30 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">Validating reset token...</p>
            </div>
        );
    }

    return (
        <div ref={wrapperRef}>
            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 30
                            }
                        }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        className="w-full max-w-sm mx-auto text-center"
                    >
                        <motion.div
                            className="mb-8"
                            initial={{ scale: 0 }}
                            animate={{
                                scale: 1,
                                transition: {
                                    type: "spring",
                                    stiffness: 300,
                                    delay: 0.2
                                }
                            }}
                        >
                            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center mx-auto shadow-md">
                                <motion.div
                                    animate={{
                                        rotate: [0, 10, -10, 10, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        delay: 0.3
                                    }}
                                >
                                    <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: { delay: 0.3 }
                            }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Password Reset Complete</h2>

                            <p className="text-muted-foreground mb-6">
                                Your password has been successfully updated.
                                {userEmail && ` You can now log in to ${userEmail} with your new password.`}
                            </p>
                        </motion.div>

                        <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                transition: { delay: 0.4 }
                            }}
                        >
                            <Button
                                asChild
                                className="w-full h-11"
                            >
                                <Link href="/login">
                                    Continue to Login
                                </Link>
                            </Button>

                            <div className="pt-4">
                                <p className="text-sm text-muted-foreground">
                                    Redirecting to login page in 3 seconds...
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : isValidToken ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <Card className="w-full shadow-lg border-t-4 border-t-primary">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <motion.div
                                        className="text-center space-y-2"
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h1 className="text-2xl font-bold">Reset Password</h1>
                                        <p className="text-sm text-muted-foreground">
                                            Create a new password for {userEmail || 'your account'}
                                        </p>
                                    </motion.div>

                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                        <motion.div
                                            className="space-y-2"
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.1 }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="password">New Password</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">Password should be at least 8 characters. Strong passwords include uppercase letters, numbers, and symbols.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                                <Input
                                                    id="password"
                                                    {...register('password')}
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    className={`h-11 pl-10 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'} transition-all duration-200`}
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

                                            {/* Password strength indicator */}
                                            {password && (
                                                <div className="pt-1">
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <span>Password strength:</span>
                                                        <span className={
                                                            passwordStrength === 0 ? "text-destructive" :
                                                                passwordStrength === 1 ? "text-orange-500" :
                                                                    passwordStrength === 2 ? "text-yellow-500" :
                                                                        "text-green-500"
                                                        }>
                                                            {getStrengthLabel()}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                                        <div
                                                            className={`h-full ${getStrengthColor()} transition-all duration-300 ease-out`}
                                                            style={{ width: `${(passwordStrength + 1) * 25}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            <AnimatePresence>
                                                {errors.password && (
                                                    <motion.p
                                                        className="text-sm text-destructive flex items-center gap-1 mt-1"
                                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                                    >
                                                        <span className="inline-block">⚠️</span>
                                                        {errors.password.message}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>

                                        <motion.div
                                            className="space-y-2"
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.2 }}
                                        >
                                            <Label htmlFor="confirmPassword">Confirm password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="confirmPassword"
                                                    {...register('confirmPassword')}
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    className={`h-11 pl-10 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'} transition-all duration-200`}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                            <AnimatePresence>
                                                {errors.confirmPassword && (
                                                    <motion.p
                                                        className="text-sm text-destructive flex items-center gap-1 mt-1"
                                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                                    >
                                                        <span className="inline-block">⚠️</span>
                                                        {errors.confirmPassword.message}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>

                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.3 }}
                                        >
                                            <Button
                                                type="submit"
                                                className={`
                                                    w-full h-11 relative overflow-hidden
                                                    ${isValid ? 'bg-primary hover:bg-primary/90' : 'bg-primary/70'}
                                                    transition-all duration-300
                                                `}
                                                disabled={isSubmitting || !isValid}
                                            >
                                                {isSubmitting ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Resetting password...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="mr-2 h-4 w-4" />
                                                        Reset Password
                                                    </>
                                                )}

                                                {isValid && !isSubmitting && (
                                                    <span className="absolute right-0 top-0 h-full w-12 -skew-x-12 overflow-hidden flex justify-center items-center">
                                                        <motion.div
                                                            className="bg-white/20 h-8 w-8 rounded-full"
                                                            initial={{ x: -100 }}
                                                            animate={{ x: 150 }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 2,
                                                                ease: "easeInOut",
                                                                repeatDelay: 1
                                                            }}
                                                        />
                                                    </span>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </form>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-center pb-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Button
                                        variant="ghost"
                                        asChild
                                        size="sm"
                                        className="text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        <Link href="/login">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back to Login
                                        </Link>
                                    </Button>
                                </motion.div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full"
                    >
                        <Card className="w-full shadow-lg border-t-4 border-t-destructive">
                            <CardContent className="pt-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <AlertCircle className="h-10 w-10 text-destructive" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold">Invalid Reset Link</h2>
                                        <p className="text-muted-foreground">
                                            {errorMessage || 'This password reset link is invalid or has expired.'}
                                        </p>
                                    </div>

                                    <Alert variant="destructive" className="mt-4">
                                        <AlertDescription>
                                            Please request a new password reset link.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-center mt-2 pb-6">
                                <Button
                                    variant="default"
                                    asChild
                                >
                                    <Link href="/forgot-password">
                                        Request a new reset link
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}