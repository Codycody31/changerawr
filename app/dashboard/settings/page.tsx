'use client'

import React from 'react';
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
import { Loader2, Moon, Sun, Save } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);

    // Store initial theme for comparison
    const [initialTheme] = React.useState(theme);

    // Local state for form values
    const [formState, setFormState] = React.useState({
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
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="container max-w-2xl p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your account settings and preferences.
                    </p>
                </div>
                <Button
                    type="submit"
                    disabled={!hasChanges || isLoading}
                    className="min-w-[100px]"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                        </>
                    )}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                        Choose your preferred theme.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant={theme === 'light' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => handleThemeToggle('light')}
                        >
                            <Sun className="mr-2 h-4 w-4" />
                            Light
                            {theme === 'light' &&
                                <span className="ml-2 text-xs bg-primary-foreground text-primary px-2 py-0.5 rounded-full">
                  Active
                </span>
                            }
                        </Button>
                        <Button
                            type="button"
                            variant={theme === 'dark' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => handleThemeToggle('dark')}
                        >
                            <Moon className="mr-2 h-4 w-4" />
                            Dark
                            {theme === 'dark' &&
                                <span className="ml-2 text-xs bg-primary-foreground text-primary px-2 py-0.5 rounded-full">
                  Active
                </span>
                            }
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Update your profile information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            value={formState.name}
                            onChange={handleNameChange}
                            placeholder="Enter your display name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={user?.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-sm text-muted-foreground">
                            Your email address cannot be changed.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}