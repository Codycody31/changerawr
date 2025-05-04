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
import { ArrowLeft, User, Fingerprint } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ErrorAlert } from '@/components/ui/error-alert'
import { useQuery } from '@tanstack/react-query'
import Link from "next/link";
import {
    startAuthentication,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

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

interface OAuthProvider {
    id: string;
    name: string;
    enabled: boolean;
    isDefault: boolean;
}

interface ProviderLogoProps {
    providerName: string;
    size?: "sm" | "md" | "lg";
}

// Provider logo component that handles placeholders
const ProviderLogo: React.FC<ProviderLogoProps> = ({ providerName, size = "md" }) => {
    // Calculate size classes based on the size prop
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-10 h-10"
    };

    const iconSizes = {
        sm: 14,
        md: 18,
        lg: 20
    };

    // Normalize provider name for lookup
    const normalizedName = providerName.toLowerCase();

    // Render provider logo based on the name
    if (normalizedName === 'easypanel') {
        return (
            <div className={`${sizeClasses[size]} rounded-md flex items-center justify-center text-primary`}>
                <svg width="100%" height="100%" viewBox="0 0 84 83" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_3198_32507)">
                        <path d="M40.4278 56.5316C37.7545 56.5316 35.2145 55.3644 33.4736 53.3358L11.3931 27.6051L2.22541 49.3065C0.863584 52.5302 1.45665 56.2479 3.75384 58.8878L21.5371 79.3243C23.2775 81.3246 25.7988 82.4727 28.45 82.4727H54.9487C58.6367 82.4727 61.965 80.262 63.3953 76.8631L71.9496 56.5316H40.4278Z" fill="url(#paint0_linear_3198_32507)"/>
                        <path d="M43.5229 25.941C46.1906 25.941 48.7259 27.1035 50.4666 29.125L72.6346 54.8677L81.7368 33.1564C83.0861 29.9374 82.4897 26.2312 80.1984 23.5981L62.4038 3.14831C60.6635 1.14828 58.1423 2.83976e-05 55.491 2.58119e-05L29.0241 0C25.3203 -3.61217e-06 21.9806 2.22967 20.5606 5.65052L12.1382 25.941H43.5229Z" fill="url(#paint1_linear_3198_32507)"/>
                    </g>
                    <defs>
                        <linearGradient id="paint0_linear_3198_32507" x1="38.7226" y1="24.3596" x2="39.2942" y2="94.996" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0BA864"/>
                            <stop offset="1" stopColor="#19BFBF"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_3198_32507" x1="50.7816" y1="-3.24546" x2="51.3544" y2="67.3909" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0BA864"/>
                            <stop offset="1" stopColor="#19BFBF"/>
                        </linearGradient>
                        <clipPath id="clip0_3198_32507">
                            <rect width="100%" height="100%" fill="white"/>
                        </clipPath>
                    </defs>
                </svg>
            </div>
        );
    } else if (normalizedName === 'github') {
        return (
            <div className={`${sizeClasses[size]} rounded-md bg-slate-900 flex items-center justify-center text-white`}>
                <svg viewBox="0 0 24 24" width={iconSizes[size]} height={iconSizes[size]} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
            </div>
        );
    } else if (normalizedName === 'google') {
        return (
            <div className={`${sizeClasses[size]} rounded-md bg-white border flex items-center justify-center`}>
                <svg viewBox="0 0 24 24" width={iconSizes[size]} height={iconSizes[size]}>
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4" />
                </svg>
            </div>
        );
    } else if (normalizedName === 'auth0') {
        return (
            <div className={`${sizeClasses[size]} rounded-md bg-orange-50 flex items-center justify-center`}>
                <div className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-6 h-6"} rounded-full bg-orange-500`}></div>
            </div>
        );
    } else if (normalizedName === 'okta') {
        return (
            <div className={`${sizeClasses[size]} rounded-md bg-blue-50 flex items-center justify-center text-blue-600`}>
                <svg viewBox="0 0 24 24" width={iconSizes[size]} height={iconSizes[size]} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                </svg>
            </div>
        );
    } else {
        // Default fallback for unknown providers
        return (
            <div className={`${sizeClasses[size]} rounded-md bg-secondary flex items-center justify-center text-secondary-foreground`}>
                <span className={size === "sm" ? "text-xs font-semibold" : size === "md" ? "text-sm font-semibold" : "text-lg font-semibold"}>
                    {providerName.substring(0, 2).toUpperCase()}
                </span>
            </div>
        );
    }
};

export default function LoginPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { login, user, isLoading } = useAuth()
    const router = useRouter()
    const [error, setError] = useState('')
    const [step, setStep] = useState<'email' | 'password'>('email')
    const [userPreview, setUserPreview] = useState<UserPreview | null>(null)
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)

    // Fetch OAuth providers
    const { data: oauthProviders, isLoading: isLoadingProviders } = useQuery({
        queryKey: ['oauthProviders'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/auth/oauth/providers');
                if (!response.ok) return [];
                const data = await response.json();
                return data.providers;
            } catch (error) {
                console.error('Failed to fetch OAuth providers:', error);
                return [];
            }
        },
        staleTime: 60000 // 1 minute
    });

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
        setSupportsWebAuthn(browserSupportsWebAuthn());
    }, []);

    useEffect(() => {
        const handleOAuthRedirect = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const oauthComplete = searchParams.get('oauth_complete');

            if (oauthComplete === 'true') {
                try {
                    // Get redirectTo from URL or default to dashboard
                    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
                    router.push(redirectTo);
                } catch (err) {
                    console.error('OAuth redirect error:', err);
                    setError('Failed to complete login');
                }
            }
        };

        if (user && !isLoading) {
            router.push('/dashboard');
        } else {
            // Check for OAuth redirects only if not already logged in
            handleOAuthRedirect();
        }

        // Check for error in URL (typically from OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        if (errorParam) {
            setError(decodeURIComponent(errorParam));
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

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userPreview.email,
                    password: data.password
                }),
                credentials: 'include'
            });

            const responseData = await response.json();

            // Handle 2FA requirement
            if (response.status === 403 && responseData.requiresSecondFactor) {
                // Store the session token and redirect to 2FA page
                sessionStorage.setItem('2faSessionToken', responseData.sessionToken);
                sessionStorage.setItem('2faType', responseData.secondFactorType);
                router.push('/two-factor');
                return;
            }

            if (!response.ok) {
                throw new Error(responseData.error || 'Authentication failed');
            }

            // Regular login success
            router.push('/dashboard');
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed');
            passwordForm.reset();
        }
    };

    const handleBack = () => {
        setStep('email')
        setError('')
        passwordForm.reset()
        emailForm.reset()
        setUserPreview(null)
    }

    const handleOAuthLogin = (provider: OAuthProvider) => {
        // Create a URL-friendly version of the provider name
        const providerNameForUrl = provider.name
            .toLowerCase()
            .replace(/\s+/g, '') // Remove all whitespace
            .replace(/[^a-z0-9]/g, ''); // Remove any non-alphanumeric characters

        window.location.href = `/api/auth/oauth/authorize/${providerNameForUrl}?redirect=/dashboard`;
    };

    const handlePasskeyLogin = async () => {
        try {
            setError('');
            setIsAuthenticating(true);

            // Get authentication options
            const optionsResponse = await fetch('/api/auth/passkeys/authenticate/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userPreview?.email || emailForm.getValues('email') || undefined
                }),
            });

            if (!optionsResponse.ok) {
                throw new Error('Failed to get authentication options');
            }

            const { options, challenge } = await optionsResponse.json();

            // Start WebAuthn authentication
            const authenticationResponse = await startAuthentication(options);

            // Verify with server
            const verifyResponse = await fetch('/api/auth/passkeys/authenticate/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: authenticationResponse,
                    challenge,
                }),
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const verifyData = await verifyResponse.json();

            // Check if 2FA is required
            if (verifyData.requiresSecondFactor) {
                sessionStorage.setItem('2faSessionToken', verifyData.sessionToken);
                sessionStorage.setItem('2faType', verifyData.secondFactorType);
                router.push('/two-factor');
                return;
            }

            // Success - redirect to dashboard
            router.push('/dashboard');
        } catch (err) {
            console.error('Passkey login error:', err);
            setError(err instanceof Error ? err.message : 'Failed to authenticate with passkey');
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <div className="w-full max-w-sm p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
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

                                {/* Auth Options */}
                                {(supportsWebAuthn || (!isLoadingProviders && oauthProviders && oauthProviders.length > 0)) && (
                                    <>
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    Or continue with
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {/* Passkey Button */}
                                            {supportsWebAuthn && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={handlePasskeyLogin}
                                                    disabled={isAuthenticating}
                                                >
                                                    {isAuthenticating ? (
                                                        <span className="flex items-center gap-2">
                                                            <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                            Authenticating...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Fingerprint className="mr-2 h-4 w-4" />
                                                            Sign in with Passkey
                                                        </>
                                                    )}
                                                </Button>
                                            )}

                                            {/* OAuth Provider Buttons */}
                                            {!isLoadingProviders && oauthProviders && oauthProviders.map((provider: OAuthProvider) => (
                                                <Button
                                                    key={provider.id}
                                                    variant="outline"
                                                    type="button"
                                                    className="w-full relative pl-10"
                                                    onClick={() => handleOAuthLogin(provider)}
                                                >
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                        <ProviderLogo providerName={provider.name} size="md" />
                                                    </span>
                                                    Continue with {provider.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </>
                                )}
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
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-sm font-medium text-primary hover:underline"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
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

                                    {/* Show passkey option in password step too */}
                                    {supportsWebAuthn && (
                                        <>
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-background px-2 text-muted-foreground">
                                                        Or
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={handlePasskeyLogin}
                                                disabled={isAuthenticating}
                                            >
                                                {isAuthenticating ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        Authenticating...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <Fingerprint className="mr-2 h-4 w-4" />
                                                        Use Passkey Instead
                                                    </>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    )
}