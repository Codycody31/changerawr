// app/dashboard/admin/system/email/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/auth'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    ExternalLink,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Send,
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert'

// Define the schema for system email configuration
const systemEmailSchema = z.object({
    enablePasswordReset: z.boolean(),
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.coerce.number().int().min(1).max(65535),
    smtpUser: z.string().default(''),
    smtpPassword: z.string().default(''),
    smtpSecure: z.boolean().default(true),
    systemEmail: z.string().email('Invalid email address'),
    testEmail: z.string().email('Invalid email address').optional().default(''),
});

type SystemEmailConfig = z.infer<typeof systemEmailSchema>;

export default function SystemEmailConfigPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [testState, setTestState] = useState<'idle' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Initialize form
    const form = useForm<SystemEmailConfig>({
        resolver: zodResolver(systemEmailSchema),
        defaultValues: {
            enablePasswordReset: false,
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            smtpSecure: true,
            systemEmail: '',
            testEmail: user?.email || '',
        },
    });

    // Fetch current configuration
    useEffect(() => {
        const fetchConfig = async () => {
            if (!user || user.role !== 'ADMIN') {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const response = await fetch('/api/admin/config/system-email');
                if (!response.ok) {
                    throw new Error('Failed to fetch system email configuration');
                }

                const data = await response.json();

                // Update form with fetched data
                form.reset({
                    enablePasswordReset: data.enablePasswordReset || false,
                    smtpHost: data.smtpHost || '',
                    smtpPort: data.smtpPort || 587,
                    smtpUser: data.smtpUser || '',
                    smtpPassword: '', // Don't fill password from API
                    smtpSecure: data.smtpSecure ?? true,
                    systemEmail: data.systemEmail || '',
                    testEmail: user?.email || '',
                });

            } catch (error) {
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to load configuration',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [user, form, toast]);

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Test email configuration
    const handleTestEmail = async () => {
        try {
            setIsTesting(true);
            setTestState('idle');
            setTestError('');

            // Validate form
            const isValid = await form.trigger(['smtpHost', 'smtpPort', 'systemEmail', 'testEmail']);
            if (!isValid) {
                setIsTesting(false);
                return;
            }

            const values = form.getValues();

            // Send test email
            const response = await fetch('/api/admin/config/system-email', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...values,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setTestState('error');
                setTestError(data.error || data.message || 'Failed to send test email');
                toast({
                    title: 'Test failed',
                    description: data.error || data.message || 'Failed to send test email',
                    variant: 'destructive',
                });
            } else {
                setTestState('success');
                toast({
                    title: 'Test successful',
                    description: 'Test email sent successfully',
                });
            }
        } catch (error) {
            setTestState('error');
            setTestError(error instanceof Error ? error.message : 'Unknown error');
            toast({
                title: 'Test failed',
                description: error instanceof Error ? error.message : 'Failed to send test email',
                variant: 'destructive',
            });
        } finally {
            setIsTesting(false);
        }
    };

    // Save configuration
    const onSubmit = async (data: SystemEmailConfig) => {
        try {
            setIsSaving(true);

            const response = await fetch('/api/admin/config/system-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update system email configuration');
            }

            toast({
                title: 'Configuration updated',
                description: 'System email configuration has been updated successfully',
            });
        } catch (error) {
            toast({
                title: 'Update failed',
                description: error instanceof Error ? error.message : 'Failed to update configuration',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Access control
    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You do not have permission to access system email configuration.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="container max-w-4xl px-4 md:px-6 py-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-16 md:pb-0">
            <div className="container max-w-4xl px-4 md:px-6 space-y-6 md:space-y-8">
                {/* Header section */}
                <div className="sticky top-0 z-10 bg-background pt-4 pb-2 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mr-2"
                            onClick={() => router.push('/dashboard/admin/system')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">System Email</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configure system email settings
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Configuration</CardTitle>
                            <CardDescription>
                                Configure SMTP settings for system emails like password reset
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    {/* Password Reset Toggle */}
                                    <FormField
                                        control={form.control}
                                        name="enablePasswordReset"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        Enable Password Reset
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Allow users to reset their passwords via email
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {/* SMTP Server */}
                                    <div className="grid gap-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="smtpHost"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>SMTP Host</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="smtp.example.com" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="smtpPort"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>SMTP Port</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="587"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="smtpUser"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>SMTP Username</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. smtp_778as78dnasy"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Optional if your SMTP server doesn&apos;t require authentication
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="smtpPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>SMTP Password</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder={field.value ? "••••••••" : "Enter password"}
                                                                    {...field}
                                                                    className="pr-10"
                                                                />
                                                            </FormControl>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                                onClick={togglePasswordVisibility}
                                                            >
                                                                {showPassword ? (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <FormDescription>
                                                            <span className="flex items-center gap-1">
                                                                <Lock className="h-3 w-3" />
                                                                Stored securely
                                                            </span>
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="smtpSecure"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            Use SSL/TLS
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Secure connection to mail server (recommended)
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="systemEmail"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>From Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="system@yourdomain.com"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        The email address that system emails will be sent from
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Test Email Field */}
                                        <div className="border rounded-md p-4 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">Test Configuration</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Send a test email to verify your configuration
                                                    </p>
                                                </div>

                                                <div className="flex gap-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="testEmail"
                                                        render={({ field }) => (
                                                            <FormItem className="w-full mb-0">
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="test@example.com"
                                                                        {...field}
                                                                        className="w-full sm:w-[200px]"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={handleTestEmail}
                                                                    disabled={isTesting}
                                                                >
                                                                    {isTesting ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Send className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Send test email</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            {/* Test result message */}
                                            {testState === 'success' && (
                                                <Alert variant="success" className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
                                                    <AlertTitle className="text-green-800 dark:text-green-400">Success</AlertTitle>
                                                    <AlertDescription className="text-green-700 dark:text-green-500">
                                                        Test email sent successfully. Please check your inbox.
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {testState === 'error' && (
                                                <Alert variant="destructive">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle>Failed to send test email</AlertTitle>
                                                    <AlertDescription>
                                                        {testError || 'There was an error sending the test email. Please check your configuration.'}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    </div>

                                    <Alert hasIcon={false} className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
                                        <AlertTitle className="text-amber-800 dark:text-amber-400">Important</AlertTitle>
                                        <AlertDescription className="text-amber-700 dark:text-amber-500">
                                            Email configuration is required for password reset functionality. It&apos;s recommended to test your configuration before enabling this feature.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isSaving || !form.formState.isDirty}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Save Configuration
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start border-t bg-muted/50 px-6 py-4">
                            <h3 className="text-sm font-medium">Resources</h3>
                            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                <li>
                                    <a
                                        href="https://nodemailer.com/smtp/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center hover:text-primary"
                                    >
                                        Nodemailer SMTP Configuration
                                        <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://support.google.com/mail/answer/7126229"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center hover:text-primary"
                                    >
                                        Gmail SMTP Settings
                                        <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                </li>
                            </ul>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}