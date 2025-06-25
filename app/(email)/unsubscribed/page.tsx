'use client';

import {JSX, Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {motion} from 'framer-motion';
import {CheckCircle} from 'lucide-react';

function UnsubscribedContent(): JSX.Element {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const containerVariants = {
        hidden: {opacity: 0},
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: {y: 20, opacity: 0},
        visible: {
            y: 0,
            opacity: 1,
            transition: {type: 'spring', stiffness: 300, damping: 24}
        }
    };

    const iconVariants = {
        hidden: {scale: 0.8, opacity: 0},
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
            className="max-w-md w-full"
        >
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <motion.div
                    variants={iconVariants}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle className="w-8 h-8 text-green-600"/>
                </motion.div>

                <motion.h1
                    variants={itemVariants}
                    className="text-2xl font-bold text-gray-900 mb-4"
                >
                    Successfully Unsubscribed
                </motion.h1>

                {email && (
                    <motion.p
                        variants={itemVariants}
                        className="text-gray-600 mb-6"
                    >
                        <strong>{email}</strong> has been unsubscribed from email notifications.
                    </motion.p>
                )}

                <motion.p
                    variants={itemVariants}
                    className="text-gray-600 mb-6"
                >
                    You will no longer receive email updates from this changelog.
                </motion.p>

                <motion.div
                    variants={itemVariants}
                    className="space-y-3"
                >
                    <p className="text-sm text-gray-500">
                        You can always resubscribe by visiting the changelog page.
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default function UnsubscribedPage(): JSX.Element {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <Suspense fallback={
                <div className="h-96 w-full max-w-md rounded-lg bg-white/30 backdrop-blur-sm animate-pulse"/>
            }>
                <UnsubscribedContent/>
            </Suspense>
        </div>
    );
}