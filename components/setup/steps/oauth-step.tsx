'use client';

import React, {useState, useEffect} from 'react';
import {SetupStep} from '@/components/setup/setup-step';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {useSetup} from '@/components/setup/setup-context';
import {toast} from '@/hooks/use-toast';
import {
    Shield,
    Copy,
    Zap,
    CheckCircle,
    AlertCircle,
    Settings,
    Loader2,
    Server,
    Wand2
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

interface OAuthStepProps {
    onNext: () => void;
    onBack: () => void;
}

interface AutoSetupStatus {
    available: boolean;
    connected: boolean;
    serverInfo: {
        serverUrl?: string;
        hasApiKey: boolean;
        isConfigured: boolean;
    };
    error?: string;
}

interface AutoSetupResult {
    success: boolean;
    client?: {
        id: string;
        name: string;
        clientId: string;
        redirectUri: string;
    };
    error?: string;
    details?: string;
}

export function OAuthStep({onNext, onBack}: OAuthStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {markStepCompleted, isStepCompleted} = useSetup();
    const isCompleted = isStepCompleted('oauth');

    // Auto setup state
    const [autoSetupStatus, setAutoSetupStatus] = useState<AutoSetupStatus | null>(null);
    const [isCheckingAutoSetup, setIsCheckingAutoSetup] = useState(true);
    const [autoSetupAppName, setAutoSetupAppName] = useState('');

    // Manual setup state
    const [enableOAuth, setEnableOAuth] = useState(false);
    const [providerType, setProviderType] = useState('easypanel');
    const [baseUrl, setBaseUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    // Setup mode
    const [setupMode, setSetupMode] = useState<'auto' | 'manual'>('auto');
    const [error, setError] = useState('');

    // Get the callback URL for the selected provider
    const getCallbackUrl = (provider: string) => {
        const baseUrl = typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
            : 'http://localhost:3000';
        return `${baseUrl}/api/auth/oauth/callback/${provider.toLowerCase()}`;
    };

    // Check auto setup availability on mount
    useEffect(() => {
        const checkAutoSetup = async () => {
            try {
                const response = await fetch('/api/setup/oauth/auto');
                if (response.ok) {
                    const data: AutoSetupStatus = await response.json();
                    setAutoSetupStatus(data);

                    // Pre-fill base URL if available
                    if (data.serverInfo.serverUrl) {
                        setBaseUrl(data.serverInfo.serverUrl);
                    }

                    // Default to manual if auto setup isn't available
                    if (!data.available) {
                        setSetupMode('manual');
                    }
                } else {
                    setAutoSetupStatus({
                        available: false,
                        connected: false,
                        serverInfo: {
                            hasApiKey: false,
                            isConfigured: false
                        },
                        error: 'Failed to check auto setup status'
                    });
                    setSetupMode('manual');
                }
            } catch (err) {
                console.error('Error checking auto setup:', err);
                setAutoSetupStatus({
                    available: false,
                    connected: false,
                    serverInfo: {
                        hasApiKey: false,
                        isConfigured: false
                    },
                    error: 'Network error'
                });
                setSetupMode('manual');
            } finally {
                setIsCheckingAutoSetup(false);
            }
        };

        checkAutoSetup();
    }, []);

    const handleAutoSetup = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/setup/oauth/auto', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    appName: autoSetupAppName.trim() || undefined,
                    persistent: true
                })
            });

            const result: AutoSetupResult = await response.json();

            if (!result.success) {
                throw new Error(result.details || result.error || 'Auto setup failed');
            }

            markStepCompleted('oauth');
            toast({
                title: 'Success! 🎉',
                description: `OAuth client "${result.client!.name}" created and configured automatically`,
            });

            onNext();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Auto setup failed';
            setError(errorMessage);
            toast({
                title: 'Auto Setup Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
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
                headers: {'Content-Type': 'application/json'},
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

            onNext();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        markStepCompleted('oauth');
        onNext();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied',
            description: 'Callback URL copied to clipboard',
        });
    };

    if (isCheckingAutoSetup) {
        return (
            <SetupStep
                title="Single Sign-On Setup"
                description="Checking automatic setup options..."
                icon={<Loader2 className="h-10 w-10 text-primary animate-spin"/>}
                onBack={onBack}
                hideFooter={true}
            >
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        Checking OAuth server connection...
                    </p>
                </div>
            </SetupStep>
        );
    }

    return (
        <SetupStep
            title="Single Sign-On Setup"
            description="Configure OAuth for single sign-on with your authentication provider"
            icon={<Shield className="h-10 w-10 text-primary"/>}
            onNext={isCompleted ? onNext : undefined}
            onBack={onBack}
            isLoading={isSubmitting}
            isComplete={isCompleted}
            hideFooter={!isCompleted}
        >
            <div className="space-y-6">
                {/* Setup Mode Selection */}
                <Tabs
                    value={setupMode}
                    onValueChange={(value) => setSetupMode(value as 'auto' | 'manual')}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                            value="auto"
                            disabled={!autoSetupStatus?.available}
                            className="flex items-center gap-2"
                        >
                            <Wand2 className="h-4 w-4"/>
                            Automatic
                            {autoSetupStatus?.available && autoSetupStatus.connected && (
                                <Badge variant="success" className="ml-1 h-4 text-xs">Ready</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-2">
                            <Settings className="h-4 w-4"/>
                            Manual
                        </TabsTrigger>
                        <TabsTrigger value="skip" className="flex items-center gap-2">
                            Skip Setup
                        </TabsTrigger>
                    </TabsList>

                    {/* Automatic Setup */}
                    <TabsContent value="auto" className="space-y-4">
                        {autoSetupStatus?.available ? (
                            <motion.div
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                className="space-y-4"
                            >
                                {/* Status Banner */}
                                <Alert hasIcon={false}
                                       className={autoSetupStatus.connected ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'}>
                                    <div className="flex items-center gap-2">
                                        {autoSetupStatus.connected ? (
                                            <CheckCircle className="h-4 w-4 text-green-600"/>
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-yellow-600"/>
                                        )}
                                        <AlertDescription className="font-medium">
                                            {autoSetupStatus.connected ? (
                                                'OAuth server connected and ready for automatic setup'
                                            ) : (
                                                `OAuth server configuration detected but ${autoSetupStatus.error || 'connection failed'}`
                                            )}
                                        </AlertDescription>
                                    </div>
                                </Alert>

                                {/* Server Info */}
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Server className="h-4 w-4"/>
                                        <span className="font-medium">OAuth Server Configuration</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Server URL:</span>
                                            <span
                                                className="font-mono">{autoSetupStatus.serverInfo.serverUrl || 'Not configured'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">API Key:</span>
                                            <Badge
                                                variant={autoSetupStatus.serverInfo.hasApiKey ? 'success' : 'destructive'}>
                                                {autoSetupStatus.serverInfo.hasApiKey ? 'Configured' : 'Missing'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Connection:</span>
                                            <Badge variant={autoSetupStatus.connected ? 'success' : 'destructive'}>
                                                {autoSetupStatus.connected ? 'Connected' : 'Failed'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {autoSetupStatus.connected && (
                                    <>
                                        {/* App Name Input */}
                                        <div className="space-y-2">
                                            <Label htmlFor="autoAppName">Application Name (Optional)</Label>
                                            <Input
                                                id="autoAppName"
                                                value={autoSetupAppName}
                                                onChange={(e) => setAutoSetupAppName(e.target.value)}
                                                placeholder="Changerawr Instance"
                                                className="h-12"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Custom name for your OAuth client. If empty, a unique name will be
                                                generated.
                                            </p>
                                        </div>

                                        {/* Auto Setup Info */}
                                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                                                <Zap className="h-4 w-4"/>
                                                What happens during automatic setup:
                                            </h4>
                                            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                                <li>• Creates OAuth client on your server automatically</li>
                                                <li>• Uses fixed redirect URI: <code
                                                    className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-xs">{getCallbackUrl('easypanel')}</code>
                                                </li>
                                                <li>• Configures required scopes: openid, profile, email</li>
                                                <li>• Sets up local OAuth provider configuration</li>
                                                <li>• No manual client creation or secret copying needed</li>
                                            </ul>
                                        </div>

                                        {/* Debug section for troubleshooting */}
                                        {process.env.NODE_ENV === 'development' && (
                                            <div className="bg-muted/30 rounded-lg p-3">
                                                <h4 className="text-sm font-medium mb-2">Debug Info:</h4>
                                                <div className="text-xs space-y-1">
                                                    <div>App Name: {autoSetupAppName || '(empty)'}</div>
                                                    <div>Server
                                                        URL: {autoSetupStatus.serverInfo.serverUrl || 'not set'}</div>
                                                    <div>Has API
                                                        Key: {autoSetupStatus.serverInfo.hasApiKey ? 'Yes' : 'No'}</div>
                                                    <div>Connected: {autoSetupStatus.connected ? 'Yes' : 'No'}</div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2"
                                                    onClick={async () => {
                                                        try {
                                                            const response = await fetch('/api/setup/oauth/debug');
                                                            const data = await response.json();
                                                            console.log('🦖 Debug info:', data);
                                                            toast({
                                                                title: "Debug info logged",
                                                                description: "Check browser console for details"
                                                            });
                                                        } catch (err) {
                                                            console.error('Debug failed:', err);
                                                        }
                                                    }}
                                                >
                                                    Get Debug Info
                                                </Button>
                                            </div>
                                        )}

                                        {/* Error Display */}
                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Auto Setup Button */}
                                        {!isCompleted && (
                                            <Button
                                                onClick={handleAutoSetup}
                                                disabled={isSubmitting}
                                                className="w-full"
                                                size="lg"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                        Setting up OAuth automatically...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="mr-2 h-4 w-4"/>
                                                        Set Up OAuth Automatically
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertDescription>
                                    Automatic setup is not available. Please ensure CHR_EPOA2_SERV_URL and
                                    CHR_EPOA2_SERV_API_KEY environment variables are configured.
                                </AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>

                    {/* Manual Setup */}
                    <TabsContent value="manual" className="space-y-4">
                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="enableOAuth"
                                    checked={enableOAuth}
                                    onCheckedChange={setEnableOAuth}
                                />
                                <Label htmlFor="enableOAuth">Enable Single Sign-On</Label>
                            </div>

                            <AnimatePresence>
                                {enableOAuth && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        transition={{duration: 0.3}}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="providerType">Provider</Label>
                                            <Select
                                                value={providerType}
                                                onValueChange={setProviderType}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a provider"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="easypanel">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                            Easypanel
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="pocketid">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                            PocketID
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                {providerType === 'easypanel'
                                                    ? 'OAuth provider for Easypanel authentication servers'
                                                    : providerType === 'pocketid'
                                                        ? 'OpenID Connect provider for PocketID authentication'
                                                        : 'Choose your authentication provider type'
                                                }
                                            </p>
                                        </div>

                                        {/* Callback URL Display */}
                                        <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                            <Label>Callback URL (Redirect URI)</Label>
                                            <div className="flex items-center gap-2">
                                                <code
                                                    className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto">
                                                    {getCallbackUrl(providerType)}
                                                </code>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(getCallbackUrl(providerType))}
                                                >
                                                    <Copy className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Configure your {providerType === 'pocketid' ? 'PocketID' : 'Easypanel'} server to use this URL as the redirect URI.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="baseUrl">
                                                {providerType === 'pocketid' ? 'PocketID Server URL' : 'Authentication Server URL'}
                                            </Label>
                                            <Input
                                                id="baseUrl"
                                                value={baseUrl}
                                                onChange={(e) => setBaseUrl(e.target.value)}
                                                placeholder={
                                                    providerType === 'pocketid'
                                                        ? 'https://id.yourserver.com'
                                                        : 'https://auth.example.com'
                                                }
                                                className="h-12"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {providerType === 'pocketid'
                                                    ? 'The base URL of your PocketID server instance.'
                                                    : 'The base URL of your authentication server.'
                                                }
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
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4"/>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {!isCompleted && (
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    size="lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Saving Configuration...
                                        </>
                                    ) : enableOAuth ? (
                                        'Save OAuth Configuration'
                                    ) : (
                                        'Skip OAuth Setup'
                                    )}
                                </Button>
                            )}
                        </form>
                    </TabsContent>

                    {/* Skip Setup */}
                    <TabsContent value="skip" className="space-y-4">
                        <Alert>
                            <AlertDescription>
                                You can skip OAuth setup for now and configure it later in the admin settings.
                                Users will need to create accounts manually without single sign-on.
                            </AlertDescription>
                        </Alert>

                        {!isCompleted && (
                            <Button
                                onClick={handleSkip}
                                variant="outline"
                                className="w-full"
                                size="lg"
                            >
                                Skip OAuth Setup
                            </Button>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </SetupStep>
    );
}