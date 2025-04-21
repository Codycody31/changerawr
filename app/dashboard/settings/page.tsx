'use client'

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Moon, Sun, Save, ArrowLeft, Bell, Lock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Define the Settings type
interface UserSettings {
    id: string;
    userId: string;
    theme: string;
    enableNotifications?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [needsRefresh, setNeedsRefresh] = useState(false);
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Store initial theme for comparison
    const [initialTheme, setInitialTheme] = useState(theme);

    // State to store fetched settings
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    // Local state for form values
    const [formState, setFormState] = useState({
        name: user?.name || '',
        theme: theme || 'light',
        enableNotifications: true
    });

    // Fetch current settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                setIsFetching(true);
                const response = await fetch('/api/auth/settings');
                if (response.ok) {
                    const data = await response.json();
                    setUserSettings(data);
                    setFormState(prev => ({
                        ...prev,
                        name: user?.name || '',
                        theme: data.theme || theme || 'light',
                        enableNotifications: data.enableNotifications !== undefined
                            ? data.enableNotifications
                            : true
                    }));
                    setInitialTheme(data.theme || theme || 'light');
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setIsFetching(false);
            }
        }

        if (user) {
            fetchSettings();
        }
    }, [user, theme]);

    // Track if form has changes by comparing against initial values
    const hasChanges =
        formState.name !== user?.name ||
        formState.theme !== initialTheme ||
        formState.enableNotifications !== userSettings?.enableNotifications;

    // Handle theme toggle
    const handleThemeToggle = (newTheme: string) => {
        setFormState(prev => ({ ...prev, theme: newTheme }));
        // Flag that will need a refresh if saving a different theme
        setNeedsRefresh(newTheme !== initialTheme);
    };

    // Handle name change
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, name: e.target.value }));
    };

    // Handle notification toggle
    const handleNotificationToggle = (checked: boolean) => {
        setFormState(prev => ({ ...prev, enableNotifications: checked }));
    };

    // Handle password reset request
    const handlePasswordReset = async () => {
        setIsResettingPassword(true);
        try {
            const response = await fetch('/api/auth/reset-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to request password reset');
            }

            await response.json();

            toast({
                title: 'Password reset email sent',
                description: 'Check your email for a link to reset your password.',
            });

            setIsResetDialogOpen(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Handle save
    const handleSave = async () => {
        if (!hasChanges) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formState.name,
                    theme: formState.theme,
                    enableNotifications: formState.enableNotifications
                }),
            });

            if (!response.ok) throw new Error('Failed to update settings');

            // Save theme to localStorage
            if (formState.theme !== initialTheme) {
                localStorage.setItem('theme', formState.theme);
            }

            // Show toast with appropriate message
            if (needsRefresh) {
                toast({
                    title: 'Theme updated',
                    description: 'Refresh the page to apply your new theme.',
                    action: (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>
                    ),
                });
            } else {
                toast({
                    title: 'Settings saved',
                    description: 'Your settings have been updated successfully.',
                });
            }

            // Update initial values
            setInitialTheme(formState.theme);
            setNeedsRefresh(false);

            // Refresh for non-theme changes
            if (!needsRefresh) {
                router.refresh();
            }

        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="pb-16 md:pb-0">
            <form
                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                className="container max-w-2xl px-4 md:px-6 space-y-6 md:space-y-8"
            >
                {/* Header section */}
                <div className="sticky top-0 z-10 bg-background pt-4 pb-2 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mr-2 md:hidden"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage your account settings and preferences.
                            </p>
                        </div>
                    </div>

                    <AnimatePresence>
                        {hasChanges && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full sm:w-auto"
                            >
                                <Button
                                    type="submit"
                                    disabled={!hasChanges || isLoading}
                                    className="w-full sm:min-w-[100px]"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Theme selection card */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">Appearance</CardTitle>
                        <CardDescription>
                            Choose your preferred theme.
                            {formState.theme !== initialTheme && (
                                <p className="text-amber-500 dark:text-amber-400 mt-1 text-sm font-medium">
                                    Save and refresh the page to apply theme changes.
                                </p>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <ThemeButton
                                isActive={formState.theme === 'light'}
                                onClick={() => handleThemeToggle('light')}
                                icon={<Sun className="h-5 w-5" />}
                                name="Light"
                            />
                            <ThemeButton
                                isActive={formState.theme === 'dark'}
                                onClick={() => handleThemeToggle('dark')}
                                icon={<Moon className="h-5 w-5" />}
                                name="Dark"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notification settings card */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">Notifications</CardTitle>
                        <CardDescription>
                            Manage your notification preferences.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Email Notifications</p>
                                    <p className="text-sm text-muted-foreground">
                                        Receive email notifications for important events like request approvals.
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={formState.enableNotifications}
                                onCheckedChange={handleNotificationToggle}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Profile card */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">Profile</CardTitle>
                        <CardDescription>
                            Update your profile information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
                            <Input
                                id="name"
                                value={formState.name}
                                onChange={handleNameChange}
                                placeholder="Enter your display name"
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                value={user?.email}
                                disabled
                                className="h-10 bg-muted cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Your email address cannot be changed.
                            </p>
                        </div>

                        <Separator className="my-4" />

                        {/* Password Reset Section */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium flex items-center">
                                        <Lock className="h-4 w-4 mr-1" />
                                        Password
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Reset your account password via email.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsResetDialogOpen(true)}
                                >
                                    Reset Password
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Reset Dialog */}
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                This will send a password reset link to your email address: {user?.email}
                            </DialogDescription>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            For security reasons, you will be logged out of all devices after resetting your password.
                        </p>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsResetDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePasswordReset}
                                disabled={isResettingPassword}
                            >
                                {isResettingPassword ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : 'Send Reset Link'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Mobile fixed save button */}
                {isMobile && hasChanges && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
                        <Button
                            type="submit"
                            disabled={!hasChanges || isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}

// A component for theme selection buttons
function ThemeButton({
                         isActive,
                         onClick,
                         icon,
                         name
                     }: {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    name: string;
}) {
    return (
        <Button
            type="button"
            variant={isActive ? "default" : "outline"}
            className="w-full relative h-14 justify-start px-5"
            onClick={onClick}
        >
            <div className="flex items-center">
                <div className="mr-3">
                    {icon}
                </div>
                <span className="font-medium">{name}</span>
            </div>

            {isActive && (
                <span className="absolute right-3 text-xs bg-primary-foreground text-primary px-2 py-1 rounded-full">
                    Active
                </span>
            )}
        </Button>
    );
}