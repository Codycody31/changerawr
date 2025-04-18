// components/subscription-form.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Check, Mail, AlertCircle } from 'lucide-react';

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const subscribeSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().optional(),
});

type SubscribeFormValues = z.infer<typeof subscribeSchema>;

interface SubscriptionFormProps {
    projectId: string;
    projectName: string;
}

export default function SubscriptionForm({ projectId, projectName }: SubscriptionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<SubscribeFormValues>({
        resolver: zodResolver(subscribeSchema),
        defaultValues: {
            email: '',
            name: '',
        },
    });

    const onSubmit = async (values: SubscribeFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    projectId,
                    subscriptionType: 'ALL_UPDATES',
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to subscribe');
            }

            setIsSuccess(true);
            form.reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to subscribe');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Subscribe to {projectName} Updates
                </CardTitle>
            </CardHeader>

            <CardContent>
                {isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-4"
                    >
                        <Check className="h-10 w-10 mx-auto mb-2 text-green-500" />
                        <h3 className="text-lg font-medium mb-1">Subscription Successful!</h3>
                        <p className="text-sm text-muted-foreground">
                            You will now receive updates for {projectName}.
                        </p>

                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setIsSuccess(false)}
                        >
                            Subscribe another email
                        </Button>
                    </motion.div>
                ) : (
                    <>
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="your@email.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Name" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                We'll personalize your notifications
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
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
                            </form>
                        </Form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}