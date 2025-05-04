'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
    Shield,
    Lock,
    Fingerprint,
    Info,
    AlertTriangle
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

type TwoFactorMode = 'NONE' | 'PASSKEY_PLUS_PASSWORD' | 'PASSWORD_PLUS_PASSKEY';

interface SecuritySettings {
    twoFactorMode: TwoFactorMode;
    hasPasskeys: boolean;
}

const securityModeDetails = {
    NONE: {
        title: 'Standard Security',
        description: 'Sign in with either password or passkey',
        icon: <Shield className="h-5 w-5" />,
        color: 'text-muted-foreground'
    },
    PASSKEY_PLUS_PASSWORD: {
        title: 'Passkey + Password',
        description: 'Passkey sign-in requires additional password verification',
        icon: <div className="flex gap-1">
            <Fingerprint className="h-5 w-5" />
            <Lock className="h-5 w-5" />
        </div>,
        color: 'text-primary'
    },
    PASSWORD_PLUS_PASSKEY: {
        title: 'Password + Passkey',
        description: 'Password sign-in requires additional passkey verification',
        icon: <div className="flex gap-1">
            <Lock className="h-5 w-5" />
            <Fingerprint className="h-5 w-5" />
        </div>,
        color: 'text-primary'
    }
};

// Helper function to safely get security mode details
const getSecurityModeDetails = (mode: TwoFactorMode | undefined | null) => {
    if (!mode || !(mode in securityModeDetails)) {
        return securityModeDetails.NONE;
    }
    return securityModeDetails[mode];
};

export function SecuritySettings() {
    const [settings, setSettings] = useState<SecuritySettings>({
        twoFactorMode: 'NONE',
        hasPasskeys: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingMode, setPendingMode] = useState<TwoFactorMode | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const [settingsResponse, passkeysResponse] = await Promise.all([
                fetch('/api/auth/security-settings'),
                fetch('/api/auth/passkeys')
            ]);

            if (!settingsResponse.ok || !passkeysResponse.ok) {
                throw new Error('Failed to fetch settings');
            }

            const settingsData = await settingsResponse.json();
            const passkeysData = await passkeysResponse.json();

            // Ensure twoFactorMode is valid
            const twoFactorMode = settingsData.twoFactorMode as TwoFactorMode | undefined;
            const validMode = twoFactorMode && twoFactorMode in securityModeDetails
                ? twoFactorMode
                : 'NONE';

            setSettings({
                twoFactorMode: validMode,
                hasPasskeys: passkeysData.passkeys?.length > 0
            });
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to load security settings',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = (newMode: TwoFactorMode) => {
        if (newMode === settings.twoFactorMode) return;

        // Check if user has passkeys before enabling 2FA modes
        if ((newMode === 'PASSKEY_PLUS_PASSWORD' || newMode === 'PASSWORD_PLUS_PASSKEY') && !settings.hasPasskeys) {
            toast({
                title: 'Passkey Required',
                description: 'Please add at least one passkey before enabling additional security',
                variant: 'destructive',
            });
            return;
        }

        setPendingMode(newMode);
        setShowConfirmDialog(true);
    };

    const confirmModeChange = async () => {
        if (!pendingMode) return;

        try {
            setIsSaving(true);
            const response = await fetch('/api/auth/security-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ twoFactorMode: pendingMode })
            });

            if (!response.ok) {
                throw new Error('Failed to update security settings');
            }

            setSettings(prev => ({ ...prev, twoFactorMode: pendingMode }));
            toast({
                title: 'Success',
                description: 'Security settings updated successfully',
            });
        } catch (error) {
            console.error('Failed to update security settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to update security settings',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
            setShowConfirmDialog(false);
            setPendingMode(null);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="animate-pulse">Loading security settings...</div>
                </CardContent>
            </Card>
        );
    }

    const currentModeDetails = getSecurityModeDetails(settings.twoFactorMode);

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Additional Security
                            </CardTitle>
                            <CardDescription>
                                Configure two-factor authentication for enhanced account security
                            </CardDescription>
                        </div>
                        {settings.twoFactorMode !== 'NONE' && (
                            <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                2FA Enabled
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Security Mode</label>
                            <Select
                                value={settings.twoFactorMode}
                                onValueChange={(value) => handleModeChange(value as TwoFactorMode)}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        <div className="flex items-center gap-2">
                                            <div className={currentModeDetails.color}>
                                                {currentModeDetails.icon}
                                            </div>
                                            <span>{currentModeDetails.title}</span>
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(securityModeDetails).map(([mode, details]) => (
                                        <SelectItem key={mode} value={mode}>
                                            <div className="flex items-center gap-3">
                                                <div className={details.color}>
                                                    {details.icon}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{details.title}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {details.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!settings.hasPasskeys && settings.twoFactorMode === 'NONE' && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Add a passkey first</p>
                                    <p className="text-sm text-muted-foreground">
                                        You need at least one passkey to enable additional security options
                                    </p>
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="font-medium">How it works</h4>

                            <motion.div
                                className="grid gap-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className={settings.twoFactorMode === 'PASSKEY_PLUS_PASSWORD' ? 'border-primary' : ''}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Fingerprint className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <h5 className="font-medium">Passkey + Password</h5>
                                                <p className="text-sm text-muted-foreground">
                                                    When you sign in with a passkey, you&apos;ll also need to enter your password
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className={settings.twoFactorMode === 'PASSWORD_PLUS_PASSKEY' ? 'border-primary' : ''}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Lock className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <h5 className="font-medium">Password + Passkey</h5>
                                                <p className="text-sm text-muted-foreground">
                                                    When you sign in with your password, you&apos;ll also need to use a passkey
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Update Security Settings</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            {pendingMode === 'NONE' ? (
                                <div className="space-y-4">
                                    <div>You&apos;re about to disable additional security on your account.</div>
                                    <div className="flex items-center gap-2 text-warning">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>This will reduce your account security</span>
                                    </div>
                                </div>
                            ) : pendingMode ? (
                                <div className="space-y-2">
                                    <div>You&apos;re about to enable {getSecurityModeDetails(pendingMode).title}.</div>
                                    <div>This will require additional verification when signing in.</div>
                                </div>
                            ) : (
                                <div>Updating security settings...</div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmModeChange}
                            disabled={isSaving}
                            className={pendingMode === 'NONE' ? 'bg-warning text-warning-foreground' : ''}
                        >
                            {isSaving ? 'Updating...' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}