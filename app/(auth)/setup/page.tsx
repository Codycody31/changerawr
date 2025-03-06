'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ErrorAlert } from '@/components/ui/error-alert'
import {
    ArrowRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Settings,
    User,
    Bell,
    Shield,
    Copy
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Define the schema for each step
const adminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

const settingsSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30).default(7),
    requireApprovalForChangelogs: z.boolean().default(true),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000).default(100),
    enableAnalytics: z.boolean().default(true),
    enableNotifications: z.boolean().default(true),
})

type AdminFormValues = z.infer<typeof adminSchema>
type SettingsFormValues = z.infer<typeof settingsSchema>

interface StepProps {
    onNext: () => void
    onBack?: () => void
    isFirst?: boolean
    isLast?: boolean
}

// Step 1: Welcome
function WelcomeStep({ onNext }: StepProps) {
    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-center">Welcome to Changerawr</CardTitle>
                <CardDescription className="text-center">
                    Let&apos;s get your system set up in just a few steps
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                        <User className="h-6 w-6 mt-1 text-primary" />
                        <div>
                            <h3 className="font-medium">Admin Account</h3>
                            <p className="text-sm text-muted-foreground">
                                Create your administrator account
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                        <Settings className="h-6 w-6 mt-1 text-primary" />
                        <div>
                            <h3 className="font-medium">System Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure your system preferences
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                        <Shield className="h-6 w-6 mt-1 text-primary" />
                        <div>
                            <h3 className="font-medium">Security</h3>
                            <p className="text-sm text-muted-foreground">
                                Set up your security preferences
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={onNext}
                    className="w-full"
                >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}

// Step 2: Admin Account
function AdminStep({ onNext, onBack }: StepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema)
    })

    const onSubmit = async (data: AdminFormValues) => {
        try {
            const response = await fetch('/api/setup/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                throw new Error('Failed to create admin account')
            }

            onNext()
        } catch (error) {
            console.error('Setup error:', error)
        }
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Create Admin Account</CardTitle>
                <CardDescription>
                    Set up your administrator account to manage the system
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form id="adminForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="John Doe"
                            autoComplete="name"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            {...register('email')}
                            type="email"
                            placeholder="admin@company.com"
                            autoComplete="email"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            {...register('password')}
                            type="password"
                            autoComplete="new-password"
                        />
                        {errors.password && (
                            <p className="text-sm text-destructive">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            {...register('confirmPassword')}
                            type="password"
                            autoComplete="new-password"
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                        )}
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button
                    type="submit"
                    form="adminForm"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        <>
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}

// Optional Step
function OAuthSetupStep({ onNext }: StepProps) {
    const [enableOAuth, setEnableOAuth] = useState(false);
    const [providerType, setProviderType] = useState('easypanel');
    const [baseUrl, setBaseUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Get the callback URL based on window location
    const callbackUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/auth/oauth/callback/easypanel`
        : `http://${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/easypanel`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!enableOAuth) {
            // Skip OAuth setup
            onNext();
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Validate inputs
            if (!baseUrl.trim() || !clientId.trim() || !clientSecret.trim()) {
                throw new Error('All fields are required');
            }

            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                throw new Error('Base URL must start with http:// or https://');
            }

            // Save OAuth provider configuration
            const response = await fetch('/api/setup/oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerType,
                    baseUrl,
                    clientId,
                    clientSecret
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to set up OAuth provider');
            }

            // Proceed to next step
            onNext();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Single Sign-On Setup</CardTitle>
                    <CardDescription>
                        Configure OAuth for single sign-on with your authentication provider
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="oauthForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="enableOAuth"
                                checked={enableOAuth}
                                onCheckedChange={setEnableOAuth}
                            />
                            <Label htmlFor="enableOAuth">Enable Single Sign-On</Label>
                        </div>

                        {enableOAuth && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="providerType">Provider</Label>
                                    <Select
                                        value={providerType}
                                        onValueChange={setProviderType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easypanel">Easypanel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Display the callback URL */}
                                <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                    <Label>Callback URL (Redirect URI)</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto">
                                            {callbackUrl}
                                        </code>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(callbackUrl);
                                                toast({
                                                    title: 'Copied',
                                                    description: 'Callback URL copied to clipboard.'
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Configure your OAuth server to use this URL as the redirect URI.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="baseUrl">Authentication Server URL</Label>
                                    <Input
                                        id="baseUrl"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="https://auth.example.com"
                                        className="h-12"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The base URL of your authentication server. This should be different from your Changerawr URL.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientId">Client ID</Label>
                                    <Input
                                        id="clientId"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="client_id"
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientSecret">Client Secret</Label>
                                    <Input
                                        id="clientSecret"
                                        value={clientSecret}
                                        onChange={(e) => setClientSecret(e.target.value)}
                                        type="password"
                                        placeholder="client_secret"
                                        className="h-12"
                                    />
                                </div>

                                {error && <ErrorAlert message={error} />}
                            </div>
                        )}
                    </form>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        form="oauthForm"
                        disabled={isSubmitting}
                        className="w-full"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Saving Configuration...
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

// Step 3: System Settings
function SettingsStep({ onNext, onBack }: StepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            defaultInvitationExpiry: 7,
            requireApprovalForChangelogs: true,
            maxChangelogEntriesPerProject: 100,
            enableAnalytics: true,
            enableNotifications: true,
        }
    })

    const onSubmit = async (data: SettingsFormValues) => {
        try {
            const response = await fetch('/api/setup/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to save settings')
            }

            onNext()
        } catch (error) {
            console.error('Settings error:', error)
        }
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                    Configure your system&apos;s default behavior
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form id="settingsForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="defaultInvitationExpiry">
                            Default Invitation Expiry (days)
                        </Label>
                        <Input
                            id="defaultInvitationExpiry"
                            type="number"
                            {...register('defaultInvitationExpiry', { valueAsNumber: true })}
                        />
                        {errors.defaultInvitationExpiry && (
                            <p className="text-sm text-destructive">
                                {errors.defaultInvitationExpiry.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxChangelogEntriesPerProject">
                            Max Changelog Entries per Project
                        </Label>
                        <Input
                            id="maxChangelogEntriesPerProject"
                            type="number"
                            {...register('maxChangelogEntriesPerProject', { valueAsNumber: true })}
                        />
                        {errors.maxChangelogEntriesPerProject && (
                            <p className="text-sm text-destructive">
                                {errors.maxChangelogEntriesPerProject.message}
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Require Changelog Approval</Label>
                                <p className="text-sm text-muted-foreground">
                                    Require approval for new changelog entries
                                </p>
                            </div>
                            <Switch {...register('requireApprovalForChangelogs')} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Analytics</Label>
                                <p className="text-sm text-muted-foreground">
                                    Collect usage statistics and analytics
                                </p>
                            </div>
                            <Switch {...register('enableAnalytics')} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send notifications for important events
                                </p>
                            </div>
                            <Switch {...register('enableNotifications')} />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button
                    type="submit"
                    form="settingsForm"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Settings...
                        </>
                    ) : (
                        <>
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}

// Step 4: Completion
function CompletionStep({}: StepProps) {
    const router = useRouter()

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <CheckCircle2 className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-center">Setup Complete!</CardTitle>
                <CardDescription className="text-center">
                    Your system has been configured successfully
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                        <Bell className="h-6 w-6 mt-1 text-primary" />
                        <div>
                            <h3 className="font-medium">Next Steps</h3>
                            <p className="text-sm text-muted-foreground">
                                Log in to your admin account to start managing your changelogs
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={() => router.push('/login')}
                    className="w-full"
                >
                    Go to Login
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}

// Progress indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="flex justify-center items-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all ${
                        index === currentStep
                            ? 'bg-primary w-4'
                            : index < currentStep
                                ? 'bg-primary'
                                : 'bg-muted'
                    }`}
                />
            ))}
        </div>
    )
}

// Main Setup Page Component
export default function SetupPage() {
    const [currentStep, setCurrentStep] = useState(0)
    const [error, setError] = useState<string>('')
    const [isChecking, setIsChecking] = useState(true)
    const [canSetup, setCanSetup] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const response = await fetch('/api/setup/status')
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to check setup status')
                }

                if (data.isComplete) {
                    router.replace('/login')
                    return
                }

                setCanSetup(true)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to check setup status')
            } finally {
                setIsChecking(false)
            }
        }

        checkSetup()
    }, [router])

    const steps = [
        {
            component: WelcomeStep,
            title: 'Welcome'
        },
        {
            component: AdminStep,
            title: 'Admin Account'
        },
        {
            component: OAuthSetupStep, // New OAuth setup step
            title: 'OAuth Setup'
        },
        {
            component: SettingsStep,
            title: 'System Settings'
        },
        {
            component: CompletionStep,
            title: 'Complete'
        }
    ]

    const CurrentStepComponent = steps[currentStep].component

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!canSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Setup Not Available</CardTitle>
                        <CardDescription>
                            The system has already been configured.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <Button asChild className="w-full">
                                <Link href="/login">Go to Login</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
            <StepIndicator currentStep={currentStep} totalSteps={steps.length}/>
            <CurrentStepComponent
                onNext={() => setCurrentStep((prev) => prev + 1)}
                onBack={() => setCurrentStep((prev) => prev - 1)}
                isFirst={currentStep === 0}
                isLast={currentStep === steps.length - 1}
            />
        </div>
    )
}