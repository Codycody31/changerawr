// components/setup/steps/team-step.tsx
'use client';

import React, {useCallback, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {toast} from '@/hooks/use-toast';
import {Check, Clock, Copy, Download, ExternalLink, FileText, Mail, Plus, Trash2, Users} from 'lucide-react';
import {cn} from '@/lib/utils';
import {TeamImportModal} from '@/components/setup/TeamImportModal';

interface TeamInviteStepProps {
    onNext: () => void;
    onBack: () => void;
    onSkip?: () => void;
}

interface Invitation {
    id: string;
    email: string;
    name?: string;
    token: string;
    link: string;
    expiresAt: Date;
    used: boolean;
}

interface TeamInviteState {
    currentEmail: string;
    currentName: string;
    invitations: Invitation[];
    isGenerating: boolean;
    allLinksGenerated: boolean;
    copiedLinks: Set<string>;
}

export function TeamStep({onNext, onSkip}: TeamInviteStepProps) {
    const [state, setState] = useState<TeamInviteState>({
        currentEmail: '',
        currentName: '',
        invitations: [],
        isGenerating: false,
        allLinksGenerated: false,
        copiedLinks: new Set()
    });

    const [showImportModal, setShowImportModal] = useState(false);

    // Email validation
    const isValidEmail = useCallback((email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }, []);

    // Check if email already exists
    const emailExists = useCallback((email: string): boolean => {
        return state.invitations.some(inv =>
            inv.email.toLowerCase() === email.toLowerCase()
        );
    }, [state.invitations]);

    // Generate invitation link
    const generateInvitationLink = useCallback(async (email: string, name?: string): Promise<Invitation | null> => {
        try {
            const response = await fetch('/api/setup/invitations', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: email.trim(),
                    name: name?.trim(),
                    role: 'STAFF' // Always STAFF for team invitations
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to generate invitation');
            }

            const data = await response.json();

            return {
                id: data.id,
                email: email.trim(),
                name: name?.trim(),
                token: data.token,
                link: `${window.location.origin}/register/${data.token}`,
                expiresAt: new Date(data.expiresAt),
                used: false
            };
        } catch (error) {
            console.error('Error generating invitation:', error);
            toast({
                title: "Generation failed",
                description: error instanceof Error ? error.message : "Failed to generate invitation link",
                variant: "destructive"
            });
            return null;
        }
    }, []);

    // Add single invitation
    const handleAddInvitation = useCallback(async () => {
        const email = state.currentEmail.trim();
        const name = state.currentName.trim();

        if (!email) {
            toast({
                title: "Email required",
                description: "Please enter an email address",
                variant: "destructive"
            });
            return;
        }

        if (!isValidEmail(email)) {
            toast({
                title: "Invalid email",
                description: "Please enter a valid email address",
                variant: "destructive"
            });
            return;
        }

        if (emailExists(email)) {
            toast({
                title: "Email already added",
                description: "This email has already been added to the list",
                variant: "destructive"
            });
            return;
        }

        setState(prev => ({...prev, isGenerating: true}));

        const invitation = await generateInvitationLink(email, name);

        if (invitation) {
            setState(prev => ({
                ...prev,
                invitations: [...prev.invitations, invitation],
                currentEmail: '',
                currentName: '',
                isGenerating: false
            }));

            toast({
                title: "Invitation created! 🦖",
                description: `Link generated for ${email}`,
            });
        } else {
            setState(prev => ({...prev, isGenerating: false}));
        }
    }, [state.currentEmail, state.currentName, isValidEmail, emailExists, generateInvitationLink]);

    // Remove invitation
    const handleRemoveInvitation = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            invitations: prev.invitations.filter(inv => inv.id !== id)
        }));
    }, []);

    // Copy single link
    const handleCopyLink = useCallback(async (invitation: Invitation) => {
        try {
            await navigator.clipboard.writeText(invitation.link);
            setState(prev => ({
                ...prev,
                copiedLinks: new Set([...prev.copiedLinks, invitation.id])
            }));

            toast({
                title: "Link copied! 📋",
                description: `Invitation link for ${invitation.email} copied to clipboard`,
            });

            // Reset copied state after 2 seconds
            setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    copiedLinks: new Set([...prev.copiedLinks].filter(id => id !== invitation.id))
                }));
            }, 2000);
        } catch {
            toast({
                title: "Copy failed",
                description: "Failed to copy link to clipboard",
                variant: "destructive"
            });
        }
    }, []);

    // Copy all links
    const handleCopyAllLinks = useCallback(async () => {
        if (state.invitations.length === 0) return;

        const allLinks = state.invitations
            .map(inv => `${inv.email}: ${inv.link}`)
            .join('\n');

        try {
            await navigator.clipboard.writeText(allLinks);
            toast({
                title: "All links copied! 🎉",
                description: `${state.invitations.length} invitation links copied to clipboard`,
            });
        } catch {
            toast({
                title: "Copy failed",
                description: "Failed to copy links to clipboard",
                variant: "destructive"
            });
        }
    }, [state.invitations]);

    // Export as CSV
    const handleExportCSV = useCallback(() => {
        if (state.invitations.length === 0) return;

        const csvContent = [
            'email,name,link,expires',
            ...state.invitations.map(inv =>
                `"${inv.email}","${inv.name || ''}","${inv.link}","${inv.expiresAt.toLocaleDateString()}"`
            )
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'team-invitations.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "Export complete! 📤",
            description: "Team invitations exported as CSV",
        });
    }, [state.invitations]);

    // Handle bulk import from modal
    const handleBulkImport = useCallback(async (emailData: Array<{ email: string; name?: string }>) => {
        setState(prev => ({...prev, isGenerating: true}));

        const results = await Promise.all(
            emailData.map(data => generateInvitationLink(data.email, data.name))
        );

        const successfulInvitations = results.filter(Boolean) as Invitation[];

        setState(prev => ({
            ...prev,
            invitations: [...prev.invitations, ...successfulInvitations],
            isGenerating: false
        }));

        toast({
            title: "Bulk import complete! 🦖",
            description: `${successfulInvitations.length} invitation links generated`,
        });
    }, [generateInvitationLink]);
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && state.currentEmail.trim()) {
            e.preventDefault();
            handleAddInvitation();
        }
    }, [state.currentEmail, handleAddInvitation]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* Header with T-Rex theme */}
            <motion.div
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                className="text-center space-y-4"
            >
                <div className="text-6xl">🦖</div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Don&apos;t Go Solo!</h1>
                    <p className="text-lg text-muted-foreground">
                        Even T-Rex&apos;s knew teamwork beats tiny arms!
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t let small arms hold you back - invite your pack!
                    </p>
                </div>
            </motion.div>

            {/* Add Invitation Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5"/>
                        Create Invitations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Input
                                type="email"
                                placeholder="team@company.com"
                                value={state.currentEmail}
                                onChange={(e) => setState(prev => ({...prev, currentEmail: e.target.value}))}
                                onKeyPress={handleKeyPress}
                                disabled={state.isGenerating}
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Name (optional)"
                                value={state.currentName}
                                onChange={(e) => setState(prev => ({...prev, currentName: e.target.value}))}
                                onKeyPress={handleKeyPress}
                                disabled={state.isGenerating}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddInvitation}
                            disabled={!state.currentEmail.trim() || state.isGenerating}
                            className="flex-1"
                        >
                            {state.isGenerating ? (
                                <>
                                    <motion.div
                                        animate={{rotate: 360}}
                                        transition={{duration: 1, repeat: Infinity, ease: "linear"}}
                                        className="w-4 h-4 mr-2"
                                    >
                                        ⚙️
                                    </motion.div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2"/>
                                    Generate Link
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setShowImportModal(true)}
                            disabled={state.isGenerating}
                        >
                            <FileText className="w-4 h-4 mr-2"/>
                            Import List
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Generated Invitations */}
            <AnimatePresence>
                {state.invitations.length > 0 && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                🎉 Your pack is ready! Share these links:
                            </h3>
                            <Badge variant="secondary">
                                {state.invitations.length} invitation{state.invitations.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>

                        {/* Bulk actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyAllLinks}
                                className="flex-1"
                            >
                                <Copy className="w-4 h-4 mr-2"/>
                                Copy All Links
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                            >
                                <Download className="w-4 h-4 mr-2"/>
                                Export CSV
                            </Button>
                        </div>

                        {/* Individual invitation cards */}
                        <div className="space-y-3">
                            {state.invitations.map((invitation, index) => (
                                <motion.div
                                    key={invitation.id}
                                    initial={{opacity: 0, x: -20}}
                                    animate={{opacity: 1, x: 0}}
                                    transition={{delay: index * 0.1}}
                                >
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Mail className="w-4 h-4 text-muted-foreground"/>
                                                        <span className="font-medium truncate">
                              {invitation.name || invitation.email}
                            </span>
                                                        {invitation.name && (
                                                            <span className="text-sm text-muted-foreground">
                                ({invitation.email})
                              </span>
                                                        )}
                                                    </div>

                                                    <div
                                                        className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3"/>
                                                            Expires: {invitation.expiresAt.toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3"/>
                                                            STAFF access
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="mt-2 p-2 bg-muted rounded text-xs font-mono truncate">
                                                        {invitation.link}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 ml-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCopyLink(invitation)}
                                                        className={cn(
                                                            "transition-colors",
                                                            state.copiedLinks.has(invitation.id) && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                        )}
                                                    >
                                                        {state.copiedLinks.has(invitation.id) ? (
                                                            <Check className="w-4 h-4"/>
                                                        ) : (
                                                            <Copy className="w-4 h-4"/>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRemoveInvitation(invitation.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Separator/>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
                {onSkip && (
                    <Button variant="ghost" onClick={onSkip}>
                        Skip for Now
                    </Button>
                )}

                <div className="flex gap-2">
                    <Button onClick={onNext}>
                        Continue →
                    </Button>
                </div>
            </div>

            {/* How to Share Instructions */}
            {state.invitations.length > 0 && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg"
                >
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                        📋 How to Share Your Links:
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• Copy each link and send to your team members</li>
                        <li>• They&apos;ll create accounts and join your project automatically</li>
                        <li>• Links expire in 7 days for security</li>
                        <li>• Each person gets STAFF access to create and edit entries</li>
                    </ul>
                </motion.div>
            )}

            {/* Import Modal */}
            <TeamImportModal
                open={showImportModal}
                onOpenChange={setShowImportModal}
                onImport={handleBulkImport}
                existingEmails={state.invitations.map(inv => inv.email)}
            />
        </div>
    );
}