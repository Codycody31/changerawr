'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import {
    ArrowRight,
    Loader2,
    CheckCircle2,
    Settings,
    User,
    Bell,
    Shield,
    Lock
} from 'lucide-react'

// Schema definitions
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
    isLast?: boolean
}

// Intro Animation Component
function IntroAnimation({ onComplete }: { onComplete: () => void }) {
    return (
        <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={onComplete}
        >
            <motion.div
                className="relative"
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.2, 1] }}
                transition={{
                    duration: 1.2,
                    times: [0, 0.7, 1],
                    ease: "easeOut"
                }}
            >
                <div className="bg-primary/10 p-8 rounded-full">
                    <Settings className="h-16 w-16 text-primary animate-spin-slow" />
                </div>
            </motion.div>
            <motion.h1
                className="mt-6 text-3xl font-bold text-primary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                Changerawr
            </motion.h1>
            <motion.p
                className="mt-2 text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                Let&apos;s get your system ready
            </motion.p>
        </motion.div>
    )
}

// Enhanced progress indicator with completed step animation
function StepIndicator({ currentStep, totalSteps, completedSteps }: {
    currentStep: number
    totalSteps: number
    completedSteps: number[]
}) {
    return (
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex justify-center items-center gap-2">
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <div key={index} className="flex items-center">
                        <div
                            className={`h-3 w-3 rounded-full transition-all duration-500 ${
                                completedSteps.includes(index)
                                    ? 'bg-primary scale-110'
                                    : index === currentStep
                                        ? 'bg-primary/80 w-6'
                                        : 'bg-muted'
                            }`}
                        />
                        {index < totalSteps - 1 && (
                            <div className={`w-12 h-0.5 mx-1 ${
                                completedSteps.includes(index) && completedSteps.includes(index + 1)
                                    ? 'bg-primary'
                                    : 'bg-muted'
                            }`} />
                        )}
                    </div>
                ))}
            </div>
            <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
            </p>
        </div>
    )
}

// Animated Card Wrapper Component
function AnimatedCard({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    )
}

// Welcome Step
function WelcomeStep({ onNext }: StepProps) {
    return (
        <AnimatedCard>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Welcome to Changerawr</CardTitle>
                    <CardDescription className="text-center text-lg">
                        Let&apos;s set up your system in just a few steps
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {[
                            { icon: User, title: 'Admin Account', desc: 'Create your administrator account' },
                            { icon: Settings, title: 'System Settings', desc: 'Configure your system preferences' },
                            { icon: Shield, title: 'Security', desc: 'Set up your security preferences' }
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="flex items-start space-x-4 p-6 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                            >
                                <item.icon className="h-6 w-6 mt-1 text-primary" />
                                <div>
                                    <h3 className="font-medium">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={onNext}
                        className="w-full"
                        size="lg"
                    >
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </AnimatedCard>
    )
}

// Admin Step
function AdminStep({ onNext }: StepProps) {
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
        <AnimatedCard>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Lock className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Create Admin Account</CardTitle>
                    <CardDescription>
                        Set up your administrator account to manage the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="adminForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                placeholder="John Doe"
                                autoComplete="name"
                                className="h-12"
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
                                className="h-12"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    {...register('password')}
                                    type="password"
                                    autoComplete="new-password"
                                    className="h-12"
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
                                    className="h-12"
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>
                    </form>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        form="adminForm"
                        disabled={isSubmitting}
                        className="w-full"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Creating Account...
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
        </AnimatedCard>
    )
}

// Settings Step
function SettingsStep({ onNext }: StepProps) {
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
        <AnimatedCard>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Settings className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>
                        Configure your system&apos;s default behavior
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="settingsForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="defaultInvitationExpiry">
                                    Invitation Expiry (days)
                                </Label>
                                <Input
                                    id="defaultInvitationExpiry"
                                    type="number"
                                    className="h-12"
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
                                    Max Entries per Project
                                </Label>
                                <Input
                                    id="maxChangelogEntriesPerProject"
                                    type="number"
                                    className="h-12"
                                    {...register('maxChangelogEntriesPerProject', { valueAsNumber: true })}
                                />
                                {errors.maxChangelogEntriesPerProject && (
                                    <p className="text-sm text-destructive">
                                        {errors.maxChangelogEntriesPerProject.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-6">
                            {[
                                {
                                    id: 'requireApprovalForChangelogs',
                                    label: 'Require Changelog Approval',
                                    description: 'Require approval for new changelog entries'
                                },
                                {
                                    id: 'enableAnalytics',
                                    label: 'Enable Analytics',
                                    description: 'Collect usage statistics and analytics'
                                },
                                {
                                    id: 'enableNotifications',
                                    label: 'Enable Notifications',
                                    description: 'Send notifications for important events'
                                }
                            ].map((setting) => (
                                <div key={setting.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>{setting.label}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {setting.description}
                                        </p>
                                    </div>
                                    <Switch {...register(setting.id as keyof SettingsFormValues)} />
                                </div>
                            ))}
                        </div>
                    </form>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        form="settingsForm"
                        disabled={isSubmitting}
                        className="w-full"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Saving Settings...
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
        </AnimatedCard>
    )
}

// Completion Step
function CompletionStep() {
    const router = useRouter()

    return (
        <AnimatedCard>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-center text-2xl">Setup Complete!</CardTitle>
                    <CardDescription className="text-center text-lg">
                        Your system has been configured successfully
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-4 p-6 bg-muted rounded-lg">
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
                        size="lg"
                    >
                        Go to Login
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </AnimatedCard>
    )
}

// Main Setup Page Component
export default function SetupPage() {
    const [showIntro, setShowIntro] = useState(true)
    const [currentStep, setCurrentStep] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<number[]>([])
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
            component: SettingsStep,
            title: 'System Settings'
        },
        {
            component: CompletionStep,
            title: 'Complete'
        }
    ]

    const handleStepComplete = (stepIndex: number) => {
        setCompletedSteps(prev => [...prev, stepIndex])
        setCurrentStep(stepIndex + 1)
    }

    const CurrentStepComponent = steps[currentStep].component

    // Add custom animation styles
    const styles = `
        @keyframes spin-slow {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }
        .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
        }
    `

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Card className="w-full max-w-md p-6">
                        <CardContent className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                            <p className="text-sm text-muted-foreground">Checking setup status...</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    if (!canSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
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
                </motion.div>
            </div>
        )
    }

    return (
        <>
            <style>{styles}</style>
            <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
                <AnimatePresence mode="wait">
                    {showIntro ? (
                        <IntroAnimation onComplete={() => setShowIntro(false)} />
                    ) : (
                        <motion.div
                            key="setup-content"
                            className="w-full flex flex-col items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StepIndicator
                                currentStep={currentStep}
                                totalSteps={steps.length}
                                completedSteps={completedSteps}
                            />
                            <CurrentStepComponent
                                onNext={() => handleStepComplete(currentStep)}
                                isLast={currentStep === steps.length - 1}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}