'use client';

import React from 'react';
import { SetupStep } from '@/components/setup/setup-step';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Bell, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// Use a type alias instead of an interface ( migration )
type CompletionStepProps = Record<string, never>;

export function CompletionStep({}: CompletionStepProps) {
    const router = useRouter();

    // Trigger confetti on mount
    React.useEffect(() => {
        // Only run in browser
        if (typeof window !== 'undefined') {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#16a34a', '#3b82f6', '#8b5cf6']
                });

                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#16a34a', '#3b82f6', '#8b5cf6']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();
        }
    }, []);

    return (
        <SetupStep
            title="Setup Complete!"
            description="Your system has been configured successfully"
            icon={
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 10,
                        delay: 0.2
                    }}
                >
                    <CheckCircle2 className="h-16 w-16 text-primary" />
                </motion.div>
            }
            hideFooter={true}
        >
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                >
                    <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                        <Bell className="h-6 w-6 mt-1 text-primary" />
                        <div>
                            <h3 className="font-medium">Next Steps</h3>
                            <p className="text-sm text-muted-foreground">
                                Log in to your admin account to start managing your changelogs
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 rounded-lg">
                        <p className="text-green-800 dark:text-green-300">
                            Your setup is complete! You can now access all features of Changerawr.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <Button
                        onClick={() => router.push('/login')}
                        className="w-full"
                        size="lg"
                    >
                        Go to Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>
            </div>
        </SetupStep>
    );
}