'use client'

import React, { useState } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { Loader2, Moon, Sun, Save, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/use-media-query';

export default function SettingsPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Store initial theme for comparison
    const [initialTheme] = useState(theme);

    // Local state for form values
    const [formState, setFormState] = useState({
        name: user?.name || '',
        theme: theme || 'light'
    });

    // Track if form has changes by comparing against initial values
    const hasChanges =
        formState.name !== user?.name ||
        theme !== initialTheme;

    // Handle theme toggle
    const handleThemeToggle = (newTheme: string) => {
        setTheme(newTheme);
    };

    // Handle name change
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, name: e.target.value }));
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
                    theme: theme
                }),
            });

            if (!response.ok) throw new Error('Failed to update settings');

            toast({
                title: 'Settings saved',
                description: 'Your settings have been updated successfully.',
            });

            setTimeout(() => {
                router.refresh();
                window.location.reload();
            }, 300);

        } catch (error) {
            toast({
                title: 'Error',
                description: (error as Error).message,
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

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
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <ThemeButton
                                isActive={theme === 'light'}
                                onClick={() => handleThemeToggle('light')}
                                icon={<Sun className="h-5 w-5" />}
                                name="Light"
                            />
                            <ThemeButton
                                isActive={theme === 'dark'}
                                onClick={() => handleThemeToggle('dark')}
                                icon={<Moon className="h-5 w-5" />}
                                name="Dark"
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
                    </CardContent>
                </Card>

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

// A new component for theme selection buttons
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