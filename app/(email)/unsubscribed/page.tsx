// app/unsubscribed/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export default function UnsubscribedPage() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    return (
        <div className="container max-w-lg mx-auto py-20 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="border-2 bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6 text-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                            className="flex justify-center mb-6"
                        >
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </motion.div>

                        <h1 className="text-3xl font-bold mb-2">Successfully Unsubscribed</h1>

                        {email ? (
                            <p className="text-lg text-muted-foreground mb-4">
                                The email address <strong className="text-foreground">{email}</strong> has been unsubscribed from these notifications.
                            </p>
                        ) : (
                            <p className="text-lg text-muted-foreground mb-4">
                                You have been successfully unsubscribed from these notifications.
                            </p>
                        )}

                        <p className="text-sm mb-6">
                            If you unsubscribed by mistake or would like to resubscribe in the future, please contact the project administrator.
                        </p>
                    </CardContent>

                    <CardFooter className="justify-center pb-6">
                        <Link href="/" passHref>
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Return to Homepage
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}