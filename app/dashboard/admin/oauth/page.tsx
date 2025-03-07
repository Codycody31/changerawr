'use client'

import React, {JSX, useState} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Loader2,
    KeyRound,
    Fingerprint,
    Copy,
    Settings,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/auth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define the form schema for OAuth provider
const providerFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    baseUrl: z.string().url('Must be a valid URL'),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    scopes: z.string().refine(value => {
        const scopes = value.split(',').map(s => s.trim()).filter(Boolean);
        return scopes.length > 0;
    }, {
        message: 'At least one scope is required'
    }),
    enabled: z.boolean().default(true),
    isDefault: z.boolean().default(false)
});

type ProviderFormValues = z.infer<typeof providerFormSchema>;

// Add type for providers
interface OAuthProvider {
    id: string;
    name: string;
    authorizationUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    enabled: boolean;
    isDefault: boolean;
}

// Provider logo component that handles placeholders
const ProviderLogo: React.FC<{ providerName: string }> = ({ providerName }) => {
    // Map known providers to predefined SVG placeholders
    const knownProviders: Record<string, JSX.Element> = {
        'easypanel': (
            <div className="w-10 h-10 rounded-md bg-transparent flex items-center justify-center text-primary">
                <svg height="310" width="310" fill="none" viewBox="0 0 310 310" xmlns="http://www.w3.org/2000/svg">
                    <rect height="310" width="310" fill="url(#paint0_linear_3064_30643)" rx="79.2222"/>
                    <g filter="url(#filter0_di_3064_30643)">
                        <path d="M171.445 131.475C168.064 127.549 163.14 125.291 157.958 125.291H96.9979L113.357 85.8796C116.115 79.2351 122.602 74.9043 129.796 74.9043L181.204 74.9043C186.354 74.9044 191.251 77.1347 194.632 81.0194L229.195 120.74C233.646 125.855 234.804 133.053 232.183 139.306L214.503 181.477L171.445 131.475ZM138.438 178.501C141.82 182.442 146.753 184.709 151.946 184.709H213.172L196.557 224.2C193.779 230.802 187.314 235.096 180.151 235.096H128.681C123.531 235.096 118.634 232.865 115.253 228.981L80.7119 189.285C76.2499 184.158 75.098 176.936 77.7432 170.675L95.5501 128.523L138.438 178.501Z" fill="url(#paint1_linear_3064_30643)" fillRule="evenodd"/>
                    </g>
                    <defs>
                        <filter height="192.191" id="filter0_di_3064_30643" width="189.228" x="62.3398" y="62.9043" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood result="BackgroundImageFix" floodOpacity="0"/>
                            <feGaussianBlur stdDeviation="8"/>
                            <feGaussianBlur stdDeviation="2"/>
                            <feBlend result="effect1_dropShadow_3064_30643" in2="BackgroundImageFix"/>
                            <feBlend result="shape" in="SourceGraphic" in2="effect1_dropShadow_3064_30643"/>
                            <feBlend result="effect2_innerShadow_3064_30643" in2="shape"/>
                        </filter>
                        <linearGradient id="paint0_linear_3064_30643" gradientUnits="userSpaceOnUse" x1="92.3325" x2="312.451" y1="-71.1962" y2="484.052">
                            <stop stopColor="#0BA864"/>
                            <stop offset="1" stopColor="#19BFBF"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_3064_30643" gradientUnits="userSpaceOnUse" x1="154.954" x2="154.954" y1="74.9043" y2="235.096">
                            <stop stopColor="white"/>
                            <stop offset="1" stopColor="#D4E8D5"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        ),
        'github': (
            <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
            </div>
        ),
        'google': (
            <div className="w-10 h-10 rounded-md bg-white border flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4" />
                </svg>
            </div>
        ),
        'auth0': (
            <div className="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-orange-500"></div>
            </div>
        ),
        'okta': (
            <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                </svg>
            </div>
        )
    };

    // Normalize provider name for lookup
    const normalizedName = providerName.toLowerCase();

    // Return known provider logo or generate a default
    return knownProviders[normalizedName] || (
        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-secondary-foreground">
            <span className="text-lg font-semibold">{providerName.substring(0, 2).toUpperCase()}</span>
        </div>
    );
};

export default function OAuthProvidersPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<OAuthProvider | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<OAuthProvider | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    // Get all OAuth providers
    const { data: providers, isLoading } = useQuery({
        queryKey: ['oauth-providers'],
        queryFn: async () => {
            const response = await fetch('/api/admin/oauth/providers?includeAll=true');
            if (!response.ok) throw new Error('Failed to fetch OAuth providers');
            return response.json();
        }
    });

    // Create provider form
    const createForm = useForm<ProviderFormValues>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: {
            name: '',
            baseUrl: '',
            clientId: '',
            clientSecret: '',
            scopes: 'openid,profile,email',
            enabled: true,
            isDefault: false
        }
    });

    // Edit provider form
    const editForm = useForm<ProviderFormValues>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: {
            name: '',
            baseUrl: '',
            clientId: '',
            clientSecret: '',
            scopes: '',
            enabled: true,
            isDefault: false
        }
    });

    // Add provider mutation
    const addProvider = useMutation({
        mutationFn: async (data: ProviderFormValues) => {
            const response = await fetch('/api/admin/oauth/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    baseUrl: data.baseUrl,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    scopes: data.scopes.split(',').map(s => s.trim()).filter(Boolean),
                    enabled: data.enabled,
                    isDefault: data.isDefault
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
            toast({
                title: 'Provider Added',
                description: 'The OAuth provider has been added successfully.'
            });
            setIsAddDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Add Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Edit provider mutation
    const updateProvider = useMutation({
        mutationFn: async (data: ProviderFormValues & { id: string }) => {
            const response = await fetch(`/api/admin/oauth/providers/${data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    baseUrl: data.baseUrl,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    scopes: data.scopes.split(',').map(s => s.trim()).filter(Boolean),
                    enabled: data.enabled,
                    isDefault: data.isDefault
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
            toast({
                title: 'Provider Updated',
                description: 'The OAuth provider has been updated successfully.'
            });
            setIsEditDialogOpen(false);
            setSelectedProvider(null);
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Delete provider mutation
    const deleteProvider = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/oauth/providers/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
            toast({
                title: 'Provider Deleted',
                description: 'The OAuth provider has been deleted successfully.'
            });
            setProviderToDelete(null);
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Delete Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Handle create form submission
    const onCreateSubmit = (data: ProviderFormValues) => {
        addProvider.mutate(data);
    };

    // Handle edit form submission
    const onEditSubmit = (data: ProviderFormValues) => {
        if (!selectedProvider) return;
        updateProvider.mutate({ ...data, id: selectedProvider.id });
    };

    // Handle edit provider
    const handleEditProvider = (provider: OAuthProvider) => {
        setSelectedProvider(provider);
        // Extract base URL from auth URL
        const baseUrl = provider.authorizationUrl.split('/oauth/authorize')[0];

        // Initialize form with provider values
        editForm.reset({
            name: provider.name,
            baseUrl,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
            scopes: provider.scopes.join(','),
            enabled: provider.enabled,
            isDefault: provider.isDefault
        });

        setIsEditDialogOpen(true);
    };

    // Filter providers based on active tab
    const filteredProviders = providers?.providers?.filter((provider: OAuthProvider) => {
        if (activeTab === 'active') return provider.enabled;
        if (activeTab === 'disabled') return !provider.enabled;
        return true; // "all" tab
    });

    // Only allow admins to access this page
    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <X className="h-5 w-5" />
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You do not have permission to access OAuth provider settings.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Add Provider Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Add OAuth Provider
                        </DialogTitle>
                        <DialogDescription>
                            Configure a new OAuth provider for single sign-on.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <FormField
                                control={createForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Custom Provider" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            A descriptive name for the OAuth provider.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="baseUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Base URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://auth.example.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The base URL of the authentication server.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Callback URL section with improved styling */}
                            <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-sm font-medium">Callback URL</FormLabel>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/${createForm.watch('name')?.toLowerCase() || 'provider'}`;
                                            navigator.clipboard.writeText(url);
                                            toast({
                                                title: 'Copied to clipboard',
                                                description: 'Callback URL has been copied to your clipboard.'
                                            });
                                        }}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto text-muted-foreground">
                                        {`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/${createForm.watch('name')?.toLowerCase() || 'provider'}`}
                                    </code>
                                </div>
                                <FormDescription>
                                    Use this URL as the callback URL (redirect URI) in your OAuth provider configuration.
                                </FormDescription>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={createForm.control}
                                    name="clientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="client_id" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="clientSecret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client Secret</FormLabel>
                                            <FormControl>
                                                <Input placeholder="client_secret" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={createForm.control}
                                name="scopes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Scopes</FormLabel>
                                        <FormControl>
                                            <Input placeholder="openid,profile,email" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Comma-separated list of OAuth scopes.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={createForm.control}
                                    name="enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                            <div className="space-y-0.5">
                                                <FormLabel>Enabled</FormLabel>
                                                <FormDescription>
                                                    Allow users to sign in with this provider.
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

                                <FormField
                                    control={createForm.control}
                                    name="isDefault"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                            <div className="space-y-0.5">
                                                <FormLabel>Default Provider</FormLabel>
                                                <FormDescription>
                                                    Make this the default sign-in option.
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
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={addProvider.isPending}>
                                    {addProvider.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        'Add Provider'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Provider Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            Edit {selectedProvider?.name || 'OAuth Provider'}
                        </DialogTitle>
                        <DialogDescription>
                            Update the OAuth provider configuration.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Custom Provider" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            A descriptive name for the OAuth provider.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="baseUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Base URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://auth.example.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The base URL of the authentication server.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Callback URL section similar to add dialog */}
                            <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-sm font-medium">Callback URL</FormLabel>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const url = `${window.location.origin}/api/auth/oauth/callback/${editForm.watch('name')?.toLowerCase() || 'provider'}`;
                                            navigator.clipboard.writeText(url);
                                            toast({
                                                title: 'Copied to clipboard',
                                                description: 'Callback URL has been copied to your clipboard.'
                                            });
                                        }}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto text-muted-foreground">
                                        {`${window.location.origin}/api/auth/oauth/callback/${editForm.watch('name')?.toLowerCase() || 'provider'}`}
                                    </code>
                                </div>
                                <FormDescription>
                                    Use this URL as the callback URL (redirect URI) in your OAuth provider configuration.
                                </FormDescription>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name="clientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="client_id" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={editForm.control}
                                    name="clientSecret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client Secret</FormLabel>
                                            <FormControl>
                                                <Input placeholder="client_secret" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={editForm.control}
                                name="scopes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Scopes</FormLabel>
                                        <FormControl>
                                            <Input placeholder="openid,profile,email" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Comma-separated list of OAuth scopes.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name="enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                            <div className="space-y-0.5">
                                                <FormLabel>Enabled</FormLabel>
                                                <FormDescription>
                                                    Allow users to sign in with this provider.
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

                                <FormField
                                    control={editForm.control}
                                    name="isDefault"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                            <div className="space-y-0.5">
                                                <FormLabel>Default Provider</FormLabel>
                                                <FormDescription>
                                                    Make this the default sign-in option.
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
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateProvider.isPending}>
                                    {updateProvider.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Provider'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Provider Dialog */}
            <AlertDialog open={!!providerToDelete} onOpenChange={(isOpen) => !isOpen && setProviderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            Delete {providerToDelete?.name || 'OAuth Provider'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this OAuth provider? This action cannot be undone.
                            Users who previously signed in with this provider may lose access.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => providerToDelete && deleteProvider.mutate(providerToDelete.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteProvider.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">OAuth Providers</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage single sign-on providers for Changerawr
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="sm:self-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Provider
                </Button>
            </div>

            {/* Filter tabs */}
            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                    <TabsTrigger value="active" className="flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        <span>Active</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.filter((p: OAuthProvider) => p.enabled).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="disabled" className="flex items-center gap-1">
                        <X className="h-4 w-4" />
                        <span>Disabled</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.filter((p: OAuthProvider) => !p.enabled).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-1">
                        <Settings className="h-4 w-4" />
                        <span>All</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>

                <TabsContent value="disabled" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}

interface ProvidersListProps {
    providers: OAuthProvider[];
    isLoading: boolean;
    onEdit: (provider: OAuthProvider) => void;
    onDelete: (provider: OAuthProvider) => void;
    setIsAddDialogOpen: (open: boolean) => void;
}

const ProvidersList: React.FC<ProvidersListProps> = ({
                                                         providers,
                                                         isLoading,
                                                         onEdit,
                                                         onDelete,
                                                         setIsAddDialogOpen
                                                     }) => {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-muted"></div>
                                <div>
                                    <div className="h-6 w-24 bg-muted rounded"></div>
                                    <div className="h-4 w-32 bg-muted rounded mt-1"></div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 w-full bg-muted rounded my-2"></div>
                            <div className="h-4 w-3/4 bg-muted rounded my-2"></div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="h-9 w-20 bg-muted rounded"></div>
                            <div className="h-9 w-20 bg-muted rounded"></div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    }

    if (!providers?.length) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>No OAuth Providers</CardTitle>
                    <CardDescription>
                        Add an OAuth provider to enable single sign-on for your users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <div className="text-center">
                        <Fingerprint className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground max-w-md mb-6">
                            OAuth providers allow your users to sign in using their existing accounts from services like Google, GitHub, or custom identity providers.
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Provider
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
                {providers.map((provider: OAuthProvider) => (
                    <motion.div
                        key={provider.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className={!provider.enabled ? "opacity-80 border-dashed" : ""}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <ProviderLogo providerName={provider.name} />
                                    <div>
                                        <CardTitle className="flex items-center text-lg">
                                            {provider.name}
                                            {provider.isDefault && (
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    Default
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {provider.enabled ? (
                                                <span className="flex items-center text-green-600 text-xs">
                                                    <Check className="mr-1 h-3 w-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-muted-foreground text-xs">
                                                    <X className="mr-1 h-3 w-3" />
                                                    Disabled
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center">
                                        <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <span className="font-medium">Client ID:</span>
                                        <span className="ml-2 truncate text-muted-foreground">
                                            {provider.clientId.substring(0, 12)}...
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {provider.scopes.map((scope, index) => (
                                            <Badge key={index} variant="outline" className="text-xs font-normal">
                                                {scope}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        <a
                                            href={provider.authorizationUrl.split('/oauth/authorize')[0]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            View Provider
                                        </a>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(provider)}
                                >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onDelete(provider)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};