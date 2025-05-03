// components/setup/steps/oauth-step.tsx
'use client';

import React, { useState } from 'react';
import { SetupStep } from '@/components/setup/setup-step';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSetup } from '@/components/setup/setup-context';
import { toast } from '@/hooks/use-toast';
import { Shield, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

interface OAuthStepProps {
    onNext: () => void;
    onBack: () => void;
}

export function OAuthStep({ onNext, onBack }: OAuthStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { markStepCompleted, isStepCompleted } = useSetup();
    const isCompleted = isStepCompleted('oauth');

    const [enableOAuth, setEnableOAuth] = useState(false);
    const [providerType, setProviderType] = useState('easypanel');
    const [baseUrl, setBaseUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [error, setError] = useState('');

    // Get the callback URL based on window location
    const callbackUrl = typeof window !== 'undefined'
        ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/auth/oauth/callback/easypanel`
        : 'http://localhost:3000/api/auth/oauth/callback/easypanel';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!enableOAuth) {
            // Skip OAuth setup
            markStepCompleted('oauth');
            onNext();
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Validate inputs
            if (!baseUrl.trim() || !clientId.trim() || !clientSecret.trim()) {
                throw new Error('All fields are required');
            }

            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                throw new Error('Base URL must start with http:// or https://');
            }

            // Save OAuth provider configuration
            const response = await fetch('/api/setup/oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerType,
                    baseUrl,
                    clientId,
                    clientSecret
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to set up OAuth provider');
            }

            markStepCompleted('oauth');
            toast({
                title: 'Success',
                description: 'OAuth provider configured successfully',
            });

            // Proceed to next step
            onNext();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'Failed to configure OAuth provider',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied',
            description: 'Callback URL copied to clipboard',
        });
    };

    return (
        <SetupStep
            title="Single Sign-On Setup"
            description="Configure OAuth for single sign-on with your authentication provider"
            icon={<Shield className="h-10 w-10 text-primary" />}
            onNext={isCompleted ? onNext : undefined}
            onBack={onBack}
            isLoading={isSubmitting}
            isComplete={isCompleted}
            hideFooter={!isCompleted}
        >
            <form id="oauthForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="enableOAuth"
                        checked={enableOAuth}
                        onCheckedChange={setEnableOAuth}
                    />
                    <Label htmlFor="enableOAuth">Enable Single Sign-On</Label>
                </div>

                <motion.div
                    animate={{ height: enableOAuth ? 'auto' : 0, opacity: enableOAuth ? 1 : 0 }}
                    initial={false}
                    transition={{ duration: 0.3 }}
                    className={enableOAuth ? 'overflow-visible' : 'overflow-hidden'}
                >
                    {enableOAuth && (
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="providerType">Provider</Label>
                                <Select
                                    value={providerType}
                                    onValueChange={setProviderType}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easypanel">Easypanel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Display the callback URL */}
                            <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                <Label>Callback URL (Redirect URI)</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto">
                                        {callbackUrl}
                                    </code>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(callbackUrl)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Configure your OAuth server to use this URL as the redirect URI.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="baseUrl">Authentication Server URL</Label>
                                <Input
                                    id="baseUrl"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder="https://auth.example.com"
                                    className="h-12"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The base URL of your authentication server. This should be different from your Changerawr URL.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientId">Client ID</Label>
                                <Input
                                    id="clientId"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="client_id"
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientSecret">Client Secret</Label>
                                <Input
                                    id="clientSecret"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    type="password"
                                    placeholder="client_secret"
                                    className="h-12"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>

                {!isCompleted && (
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving Configuration...'
                                : enableOAuth
                                    ? 'Save OAuth Configuration'
                                    : 'Skip & Continue'}
                        </button>
                    </div>
                )}
            </form>
        </SetupStep>
    );
}