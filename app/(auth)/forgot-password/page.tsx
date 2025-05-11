'use client';

import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlarmClock,
    Mail,
    RefreshCw,
    Copy,
    HelpCircle,
    MailCheck,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Email providers and their URLs
const emailProviders = {
    'gmail.com': 'https://mail.google.com',
    'outlook.com': 'https://outlook.live.com',
    'hotmail.com': 'https://outlook.live.com',
    'yahoo.com': 'https://mail.yahoo.com',
    'icloud.com': 'https://www.icloud.com/mail',
    'protonmail.com': 'https://mail.proton.me',
};

// Smart confetti function
const fireConfetti = (type: 'success' | 'resend' = 'success') => {
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

    if (type === 'success') {
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
    } else {
        // Simpler confetti for resend
        confetti({
            ...defaults,
            particleCount: isMobile ? 30 : 50,
            origin: { y: 0.6, x: 0.5 },
            gravity: 1.2
        });
    }
};

export default function ForgotPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [emailProvider, setEmailProvider] = useState<string | null>(null);
    const [lastTyped, setLastTyped] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isValid },
        reset,
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onChange',
    });

    const email = watch('email', '');

    // Handle countdown for resend functionality
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Detect email provider for quick link
    useEffect(() => {
        if (sentEmail) {
            const domain = sentEmail.split('@')[1]?.toLowerCase();
            const provider = domain && Object.keys(emailProviders).find(key =>
                domain === key || domain?.endsWith(`.${key}`)
            );

            setEmailProvider(provider || null);
        }
    }, [sentEmail]);

    // Handle email typing suggestions
    useEffect(() => {
        if (email && !isSubmitting && !isEmailSent) {
            setLastTyped(Date.now());
        }
    }, [email, isSubmitting, isEmailSent]);

    // Scroll to top when success view is shown
    useEffect(() => {
        if (isEmailSent && wrapperRef.current) {
            wrapperRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isEmailSent]);

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to request password reset');
            }

            // Set 60-second countdown for resend button
            setCountdown(60);
            setSentEmail(data.email);
            setIsEmailSent(true);

            // Smart confetti - delayed to match animation
            setTimeout(() => fireConfetti('success'), 200);

            toast({
                title: 'Reset Email Sent',
                description: 'Check your inbox for the password reset link',
                variant: 'success',
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Something went wrong');
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Something went wrong',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = () => {

        // Simpler confetti for resend
        setTimeout(() => fireConfetti('resend'), 100);

        onSubmit({ email: sentEmail });
    };

    const handleTryDifferentEmail = () => {
        setIsEmailSent(false);
        setError('');
        reset();
        setTimeout(() => {
            document.getElementById('email')?.focus();
        }, 300);
    };

    const copyToClipboard = () => {
        if (sentEmail) {
            navigator.clipboard.writeText(sentEmail);
            setIsCopied(true);
            toast({
                title: 'Copied',
                description: 'Email address copied to clipboard',
            });

            // Reset the copied state after 2 seconds
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const getEmailDomainSuggestion = () => {
        if (!email || email.includes('@') || Date.now() - lastTyped < 1000) return null;

        const commonDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
        return commonDomains[0]; // Suggest the first common domain
    };

    const suggestion = getEmailDomainSuggestion();

    return (
        <div ref={wrapperRef}>
            <AnimatePresence mode="wait">
                {isEmailSent ? (
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
                                    <MailCheck className="h-12 w-12 text-green-600 dark:text-green-400" strokeWidth={1.5} />
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
                            <h2 className="text-2xl font-bold mb-3">Check your inbox</h2>

                            <p className="text-muted-foreground mb-1">
                                We&apos;ve sent a password reset link to:
                            </p>
                            <div className="font-medium text-lg mb-1 break-all flex items-center justify-center gap-2">
                                <span>{sentEmail}</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={copyToClipboard}
                                            >
                                                {isCopied ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Copy email address</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            {emailProvider && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{
                                        opacity: 1,
                                        height: 'auto',
                                        transition: { delay: 0.4 }
                                    }}
                                    className="mb-8"
                                >
                                    <Button
                                        variant="outline"
                                        className="mt-2"
                                        onClick={() => window.open(emailProviders[emailProvider as keyof typeof emailProviders], '_blank')}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open {emailProvider.charAt(0).toUpperCase() + emailProvider.slice(1)}
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>

                        <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                transition: { delay: 0.5 }
                            }}
                        >
                            <Button
                                variant="outline"
                                onClick={handleResend}
                                disabled={countdown > 0}
                                className="w-full h-11 relative overflow-hidden group"
                            >
                                {countdown > 0 ? (
                                    <div className="flex items-center">
                                        <AlarmClock className="mr-2 h-4 w-4 animate-pulse" />
                                        <span>Resend in {countdown}s</span>
                                        <div
                                            className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-1000 ease-linear"
                                            style={{ width: `${(countdown / 60) * 100}%` }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                                        <span>Resend Email</span>
                                    </div>
                                )}
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={handleTryDifferentEmail}
                                className="w-full h-11"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Try a different email
                            </Button>

                            <div className="pt-6">
                                <Button
                                    variant="ghost"
                                    asChild
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <Link href="/login">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </Button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: 0.8 }}
                            className="mt-8 text-xs text-muted-foreground"
                        >
                            <p>Didn&apos;t receive the email? Check your spam folder or try another email address.</p>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <Card className="w-full shadow-lg border-t-4 border-t-primary overflow-hidden">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <motion.div
                                        className="text-center space-y-2"
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h1 className="text-2xl font-bold">Forgot Password</h1>
                                        <p className="text-sm text-muted-foreground">
                                            Enter your email address and we&apos;ll send you a link to reset your password
                                        </p>
                                    </motion.div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <Alert variant="destructive">
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                        <motion.div
                                            className="space-y-2"
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.1 }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="email">Email Address</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">Enter the email address you used to register</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    {...register('email')}
                                                    autoComplete="email"
                                                    autoFocus
                                                    className={`h-11 pl-10 pr-20 ${errors.email ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'} transition-all duration-200`}
                                                />

                                                {suggestion && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                const value = `${email}@${suggestion}`;
                                                                reset({ email: value });
                                                            }}
                                                        >
                                                            @{suggestion}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {errors.email && (
                                                    <motion.p
                                                        className="text-sm text-destructive flex items-center gap-1 mt-1"
                                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                                    >
                                                        <span className="inline-block">⚠️</span>
                                                        {errors.email.message}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>

                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.2 }}
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
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="mr-2 h-4 w-4" />
                                                        Send Reset Link
                                                    </>
                                                )}

                          {/*                      {isValid && !isSubmitting && (*/}
                          {/*                          <span className="absolute right-0 top-0 h-full w-12 -skew-x-12 overflow-hidden flex justify-center items-center">*/}
                          {/*  <motion.div*/}
                          {/*      className="bg-white/20 h-8 w-8 rounded-full"*/}
                          {/*      initial={{ x: -100 }}*/}
                          {/*      animate={{ x: 150 }}*/}
                          {/*      transition={{*/}
                          {/*          repeat: Infinity,*/}
                          {/*          duration: 2,*/}
                          {/*          ease: "easeInOut",*/}
                          {/*          repeatDelay: 1*/}
                          {/*      }}*/}
                          {/*  />*/}
                          {/*</span>*/}
                          {/*                      )}*/}
                                            </Button>
                                        </motion.div>
                                    </form>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-center pb-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
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
                )}
            </AnimatePresence>
        </div>
    );
}