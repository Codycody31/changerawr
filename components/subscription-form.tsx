'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowRight, Check, AlertCircle, Mail, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Confetti from '@/components/ui/confetti';

const formSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().optional(),
    subscriptionType: z.enum(['DIGEST_ONLY', 'ALL_UPDATES', 'MAJOR_ONLY']).default('ALL_UPDATES'),
});

type SubscriptionFormValues = z.infer<typeof formSchema>;

interface Update {
    title: string;
    date: string;
}

interface SubscriptionWizardProps {
    projectId: string;
    projectName: string;
    recentUpdates?: Update[];
}

type Step = 'email' | 'name' | 'preferences' | 'success';

export default function SubscriptionWizard({
                                               projectId,
                                               projectName,
                                               recentUpdates = []
                                           }: SubscriptionWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>('email');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const formContainerRef = useRef<HTMLDivElement>(null);

    const form = useForm<SubscriptionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            name: '',
            subscriptionType: 'ALL_UPDATES',
        },
        mode: 'onChange',
    });

    const onSubmit = async (values: SubscriptionFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: values.email,
                    name: values.name,
                    projectId: projectId,
                    subscriptionType: values.subscriptionType
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to subscribe');
            }

            setCurrentStep('success');
            setShowConfetti(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to subscribe');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 'email') {
            const emailValue = form.getValues('email');
            const emailError = form.formState.errors.email;

            if (emailValue && !emailError) {
                setCurrentStep('name');
            } else {
                form.trigger('email');
            }
        } else if (currentStep === 'name') {
            setCurrentStep('preferences');
        }
    };

    const skipNameStep = () => {
        setCurrentStep('preferences');
    };

    const restartForm = () => {
        form.reset();
        setCurrentStep('email');
        setShowConfetti(false);
    };

    const getProgressBarWidth = () => {
        switch (currentStep) {
            case 'email': return 'w-1/3';
            case 'name': return 'w-2/3';
            case 'preferences': return 'w-full';
            case 'success': return 'w-full';
            default: return 'w-0';
        }
    };

    return (
        <div
            ref={formContainerRef}
            className="w-full rounded-lg overflow-hidden bg-[#131724] border border-[#1e2433] relative"
        >
            {showConfetti && <Confetti />}

            <div className="p-6 border-b border-[#1e2433] flex items-center gap-3">
                <div className="bg-[#1e293b] rounded-full p-2 flex items-center justify-center text-[#94a3b8]">
                    <Bell className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Stay updated with {projectName}</h2>
                    <p className="text-[#94a3b8] text-sm">
                        Subscribe to receive the latest changes and updates
                    </p>
                </div>
                <Badge className="ml-auto bg-[#131724] text-[#94a3b8] border-[#2e3446] hover:bg-[#1e293b]">
                    Changelog
                </Badge>
            </div>

            {/* Progress bar */}
            {currentStep !== 'success' && (
                <div className="w-full bg-[#1e2433] h-1">
                    <motion.div
                        className={`bg-[#5eead4] h-1`}
                        initial={{ width: '0%' }}
                        animate={{ width: getProgressBarWidth() }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}

            <div className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {currentStep === 'email' && (
                                <motion.div
                                    key="email-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Mail className="h-5 w-5 text-[#94a3b8]" />
                                            <h3 className="text-lg font-medium text-white">What&apos;s your email address?</h3>
                                        </div>

                                        {error && (
                                            <Alert className="mb-4 bg-[#2d1b19] border-[#582424] text-[#f87171]">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter your email address"
                                                            className="h-11 bg-[#0f1118] border-[#2e3446] focus-visible:ring-[#5eead4] focus-visible:ring-offset-[#131724] text-white placeholder:text-[#4b5563]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-[#f87171]" />
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="button"
                                            onClick={handleNext}
                                            className="w-full h-11 bg-[#5eead4] text-[#134e4a] hover:bg-[#2dd4bf] font-medium"
                                        >
                                            Continue
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'name' && (
                                <motion.div
                                    key="name-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white mb-2">Would you like to add your name?</h3>
                                        <p className="text-sm text-[#94a3b8] mb-4">This helps us personalize your notifications.</p>

                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Your name (optional)"
                                                            className="h-11 bg-[#0f1118] border-[#2e3446] focus-visible:ring-[#5eead4] focus-visible:ring-offset-[#131724] text-white placeholder:text-[#4b5563]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-[#f87171]" />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                onClick={skipNameStep}
                                                variant="outline"
                                                className="flex-1 bg-transparent border-[#2e3446] text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                                            >
                                                Skip
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleNext}
                                                className="flex-1 bg-[#5eead4] text-[#134e4a] hover:bg-[#2dd4bf] font-medium"
                                            >
                                                Continue
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'preferences' && (
                                <motion.div
                                    key="preferences-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white mb-2">How would you like to be notified?</h3>
                                        <p className="text-sm text-[#94a3b8] mb-4">Choose your preferred notification method.</p>

                                        <FormField
                                            control={form.control}
                                            name="subscriptionType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <div className="grid gap-3">
                                                            <button
                                                                type="button"
                                                                className={`flex items-center p-4 rounded-lg border ${
                                                                    field.value === 'ALL_UPDATES'
                                                                        ? 'bg-[#193a3a] border-[#5eead4]'
                                                                        : 'bg-[#0f1118] border-[#2e3446] hover:bg-[#171f2e]'
                                                                } transition-colors group`}
                                                                onClick={() => field.onChange('ALL_UPDATES')}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                                                    field.value === 'ALL_UPDATES'
                                                                        ? 'bg-[#5eead4] border-[#5eead4]'
                                                                        : 'border-[#4b5563] group-hover:border-[#94a3b8]'
                                                                }`}>
                                                                    {field.value === 'ALL_UPDATES' && (
                                                                        <Check className="h-3 w-3 text-[#134e4a]" />
                                                                    )}
                                                                </div>
                                                                <div className="ml-3 flex-1 text-left">
                                                                    <p className="font-medium text-white">All Updates</p>
                                                                    <p className="text-sm text-[#94a3b8]">Get notified about every change and update</p>
                                                                </div>
                                                                <Zap className={`h-6 w-6 ${
                                                                    field.value === 'ALL_UPDATES' ? 'text-[#5eead4]' : 'text-[#4b5563] group-hover:text-[#94a3b8]'
                                                                }`} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`flex items-center p-4 rounded-lg border ${
                                                                    field.value === 'MAJOR_ONLY'
                                                                        ? 'bg-[#193a3a] border-[#5eead4]'
                                                                        : 'bg-[#0f1118] border-[#2e3446] hover:bg-[#171f2e]'
                                                                } transition-colors group`}
                                                                onClick={() => field.onChange('MAJOR_ONLY')}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                                                    field.value === 'MAJOR_ONLY'
                                                                        ? 'bg-[#5eead4] border-[#5eead4]'
                                                                        : 'border-[#4b5563] group-hover:border-[#94a3b8]'
                                                                }`}>
                                                                    {field.value === 'MAJOR_ONLY' && (
                                                                        <Check className="h-3 w-3 text-[#134e4a]" />
                                                                    )}
                                                                </div>
                                                                <div className="ml-3 flex-1 text-left">
                                                                    <p className="font-medium text-white">Major Updates Only</p>
                                                                    <p className="text-sm text-[#94a3b8]">Only notify me about significant features and changes</p>
                                                                </div>
                                                                <CheckCircle2 className={`h-6 w-6 ${
                                                                    field.value === 'MAJOR_ONLY' ? 'text-[#5eead4]' : 'text-[#4b5563] group-hover:text-[#94a3b8]'
                                                                }`} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`flex items-center p-4 rounded-lg border ${
                                                                    field.value === 'DIGEST_ONLY'
                                                                        ? 'bg-[#193a3a] border-[#5eead4]'
                                                                        : 'bg-[#0f1118] border-[#2e3446] hover:bg-[#171f2e]'
                                                                } transition-colors group`}
                                                                onClick={() => field.onChange('DIGEST_ONLY')}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                                                    field.value === 'DIGEST_ONLY'
                                                                        ? 'bg-[#5eead4] border-[#5eead4]'
                                                                        : 'border-[#4b5563] group-hover:border-[#94a3b8]'
                                                                }`}>
                                                                    {field.value === 'DIGEST_ONLY' && (
                                                                        <Check className="h-3 w-3 text-[#134e4a]" />
                                                                    )}
                                                                </div>
                                                                <div className="ml-3 flex-1 text-left">
                                                                    <p className="font-medium text-white">Weekly Digest</p>
                                                                    <p className="text-sm text-[#94a3b8]">Receive a weekly summary of all updates</p>
                                                                </div>
                                                                <Clock className={`h-6 w-6 ${
                                                                    field.value === 'DIGEST_ONLY' ? 'text-[#5eead4]' : 'text-[#4b5563] group-hover:text-[#94a3b8]'
                                                                }`} />
                                                            </button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-[#f87171]" />
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-[#5eead4] text-[#134e4a] hover:bg-[#2dd4bf] font-medium mt-4"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    Subscribing...
                                                </>
                                            ) : (
                                                'Subscribe'
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'success' && (
                                <motion.div
                                    key="success-step"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, type: "spring", stiffness: 120 }}
                                    className="py-8 text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                                        className="bg-[#193a3a] rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center"
                                    >
                                        <Check className="h-10 w-10 text-[#4ade80]" />
                                    </motion.div>

                                    <h3 className="text-2xl font-medium mb-3 text-white">You&apos;re subscribed!</h3>
                                    <p className="text-[#94a3b8] mb-8 max-w-md mx-auto">
                                        Thank you for subscribing to {projectName} updates. You&apos;ll receive notifications based on your preferences.
                                    </p>

                                    <Button
                                        type="button"
                                        onClick={restartForm}
                                        className="bg-transparent border-[#2e3446] text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                                        variant="outline"
                                    >
                                        Subscribe another email
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </Form>
            </div>

            {recentUpdates.length > 0 && currentStep !== 'success' && (
                <div className="px-6 py-5 border-t border-[#1e2433] bg-[#0f1118]">
                    <h3 className="text-sm font-medium mb-4 text-white">Recent Updates</h3>
                    <ul className="space-y-4">
                        {recentUpdates.map((update, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="min-w-6 h-6 rounded-full bg-[#1e293b] flex items-center justify-center mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-[#5eead4]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{update.title}</p>
                                    <p className="text-xs text-[#94a3b8]">{update.date}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}