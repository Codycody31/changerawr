// app/unsubscribed/page.tsx

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function UnsubscribedContent() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 300, damping: 24 }
        }
    };

    const iconVariants = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: 0.3,
                type: 'spring',
                stiffness: 200,
                damping: 20
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full"
        >
            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-md overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 to-emerald-600" />

                <CardContent className="pt-10 pb-8 px-8">
                    <motion.div
                        variants={iconVariants}
                        className="flex justify-center mb-8"
                    >
                        <div className="p-4 rounded-full bg-green-50 dark:bg-green-900/20">
                            <CheckCircle className="h-16 w-16 text-green-500" strokeWidth={1.5} />
                        </div>
                    </motion.div>

                    <motion.h1
                        variants={itemVariants}
                        className="text-3xl font-bold text-center mb-6"
                    >
                        You&apos;re Unsubscribed
                    </motion.h1>

                    <motion.div variants={itemVariants}>
                        {email ? (
                            <p className="text-lg text-center mb-4">
                                The email address <span className="font-semibold text-foreground px-1 py-0.5 bg-muted rounded">{email}</span> has been successfully removed from our notification list.
                            </p>
                        ) : (
                            <p className="text-lg text-center mb-4">
                                You&apos;ve been successfully removed from our notification list.
                            </p>
                        )}
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="mt-8"
                    >
                        <Separator className="mb-6" />
                        <p className="text-sm text-muted-foreground text-center">
                            Changed your mind? Contact our support team if you&apos;d like to resubscribe.
                        </p>
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function UnsubscribedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-background to-muted/50">
            <div className="w-full max-w-md">
                <Suspense fallback={
                    <div className="h-96 w-full rounded-lg bg-card/30 backdrop-blur-sm animate-pulse" />
                }>
                    <UnsubscribedContent />
                </Suspense>
            </div>
        </div>
    );
}