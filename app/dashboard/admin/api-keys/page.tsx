'use client'

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
    Key,
    Plus,
    Trash2,
    Ban,
    Pencil,
    Copy,
    FileText,
    Code,
    ChevronRight,
    Shield,
    CheckCircle,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    lastUsed: string | null;
    createdAt: string;
    expiresAt: string | null;
    isRevoked: boolean;
}

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newName: string) => Promise<void>;
    currentName: string;
}

function RenameDialog({
                          open,
                          onOpenChange,
                          onRename,
                          currentName,
                      }: RenameDialogProps) {
    const [newName, setNewName] = useState(currentName);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === currentName) return;

        setIsSubmitting(true);
        try {
            await onRename(newName);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to rename API key:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename API Key</DialogTitle>
                    <DialogDescription>
                        Enter a new name for your API key.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-name">New Name</Label>
                            <Input
                                id="new-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Production API Key"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newName.trim() || newName === currentName || isSubmitting}
                        >
                            {isSubmitting ? 'Renaming...' : 'Rename'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function NewKeyAlert({ keyData, onClose, onCopy }: { keyData: { key: string; id: string }; onClose: () => void; onCopy: (key: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-amber-950/50 border border-amber-800/50 rounded-lg mb-6"
        >
            <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-500" />
                        <h4 className="font-medium text-amber-500">New API Key Created</h4>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-transparent"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-amber-400 mb-3">
                    Save your API key now. For security reasons, you won&apos;t be able to view it again.
                </p>

                <div className="relative">
                    <div className="bg-amber-950/60 border border-amber-800/30 rounded-md p-3 font-mono text-sm break-all text-amber-300">
                        {keyData.key}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCopy(keyData.key)}
                        className="absolute top-2 right-2 h-8 bg-amber-950/70 border-amber-800/50 text-amber-300 hover:bg-amber-900 hover:text-amber-200"
                    >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

function ReactSDKCard() {
    return (
        <Card className="bg-indigo-950 text-white overflow-hidden border-0 h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                        <Code className="h-5 w-5 mr-2 inline-block" />
                        React SDK
                    </CardTitle>
                </div>
                <CardDescription className="text-blue-200">
                    Integrate Changerawr into your React applications
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <p className="text-sm text-blue-100">
                    Our headless React SDK provides a powerful way to integrate Changerawr with complete UI freedom.
                </p>

                <div className="space-y-1">
                    <p className="text-xs text-blue-300 uppercase font-medium">INSTALLATION</p>
                    <div className="bg-slate-950 rounded-md overflow-hidden">
                        <div className="flex items-center px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                            <div className="flex space-x-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                            </div>
                            <div className="ml-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-slate-400 hover:text-white"
                                    onClick={() => {
                                        navigator.clipboard.writeText("npm install @changerawr/react");
                                        toast({
                                            title: 'Command Copied',
                                            description: 'The command has been copied to your clipboard.',
                                        });
                                    }}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-3 font-mono text-xs text-slate-300">
                            <code>npm install @changerawr/react</code>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-xs text-blue-300 uppercase font-medium">FEATURES</p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-100">Full TypeScript support</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-100">React hooks for all API endpoints</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-100">Optional UI components</span>
                        </li>
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="pt-1">
                <Button
                    className="w-full bg-indigo-900/40 hover:bg-indigo-800/60 text-white border-0"
                    asChild
                >
                    <a
                        href="https://github.com/changerawr/react"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                    >
                        View Documentation
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ApiKeysPage() {
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyData, setNewKeyData] = useState<{ key: string; id: string } | null>(null);
    const [renameKey, setRenameKey] = useState<ApiKey | null>(null);

    const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
        queryKey: ['api-keys'],
        queryFn: async () => {
            const response = await fetch('/api/admin/api-keys');
            if (!response.ok) throw new Error('Failed to fetch API keys');
            return response.json();
        },
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 15000, // Consider data stale after 15 seconds
    });

    const createApiKey = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to create API key');
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['api-keys'], (old: ApiKey[] | undefined) => {
                return old ? [...old, data] : [data];
            });
            setNewKeyData({ key: data.key, id: data.id });
            toast({
                title: 'API Key Created',
                description: 'The new API key has been created successfully.',
            });
        },
    });

    const renameApiKey = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const response = await fetch(`/api/admin/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to rename API key');
            return response.json();
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: ['api-keys'] });
            const previousKeys = queryClient.getQueryData(['api-keys']);

            queryClient.setQueryData(['api-keys'], (old: ApiKey[] | undefined) => {
                return old?.map(key =>
                    key.id === id ? { ...key, name } : key
                );
            });

            return { previousKeys };
        },
        onError: (err, variables, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['api-keys'], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        },
    });

    const revokeApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRevoked: true }),
            });
            if (!response.ok) throw new Error('Failed to revoke API key');
            return response.json();
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['api-keys'] });
            const previousKeys = queryClient.getQueryData(['api-keys']);

            queryClient.setQueryData(['api-keys'], (old: ApiKey[] | undefined) => {
                return old?.map(key =>
                    key.id === id ? { ...key, isRevoked: true } : key
                );
            });

            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['api-keys'], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        },
    });

    const deleteApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/api-keys/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete API key');
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['api-keys'] });
            const previousKeys = queryClient.getQueryData(['api-keys']);

            queryClient.setQueryData(['api-keys'], (old: ApiKey[] | undefined) => {
                return old?.filter(key => key.id !== id);
            });

            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['api-keys'], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        },
    });

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        await createApiKey.mutate(newKeyName);
        setNewKeyName('');
        setIsCreateDialogOpen(false);
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast({
            title: 'API Key Copied',
            description: 'The API key has been copied to your clipboard.',
        });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-slate-950">
                {/* Sidebar - Just a placeholder */}
                <div className="w-64 border-r border-slate-800 p-6">
                    <Skeleton className="h-8 w-32 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-6 w-full" />
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-8">
                    <div className="mb-6 flex justify-between items-center">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Main content area */}
            <div className="flex-1">
                <div className="max-w-screen-2xl mx-auto px-8 py-6">
                    {/* Page header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white">API Keys</h1>
                            <p className="text-slate-400 mt-1">
                                Create and manage your API keys for authentication.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            <Button variant="outline" size="sm" asChild className="h-9 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-900 hover:text-white">
                                <Link href="/api-docs">
                                    <FileText className="h-4 w-4 mr-2" />
                                    API Docs
                                </Link>
                            </Button>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-9 bg-white text-slate-900 hover:bg-slate-100">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Key
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Create New API Key</DialogTitle>
                                        <DialogDescription>
                                            Give your API key a name to help you identify its use.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateKey}>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">API Key Name</Label>
                                                <Input
                                                    id="name"
                                                    value={newKeyName}
                                                    onChange={(e) => setNewKeyName(e.target.value)}
                                                    placeholder="e.g., Production API Key"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={!newKeyName.trim()}>
                                                Create Key
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <AnimatePresence>
                        {newKeyData && (
                            <NewKeyAlert
                                keyData={newKeyData}
                                onClose={() => setNewKeyData(null)}
                                onCopy={handleCopyKey}
                            />
                        )}
                    </AnimatePresence>

                    {/* Main Content - Table and SDK Card */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* API Keys Card */}
                        <div className="flex-1">
                            <Card className="overflow-hidden border-slate-800 bg-slate-950 shadow-sm">
                                <CardHeader className="border-b border-slate-800 bg-slate-900/30 px-6 py-4">
                                    <CardTitle className="text-base font-medium text-slate-100">Your API Keys</CardTitle>
                                </CardHeader>

                                {/* API Keys Table */}
                                <div className="overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-6">
                                                Name
                                            </th>
                                            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-6">
                                                Created
                                            </th>
                                            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-6">
                                                Last Used
                                            </th>
                                            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-6">
                                                Status
                                            </th>
                                            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-6">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                        {apiKeys && apiKeys.length > 0 ? (
                                            apiKeys.map((key) => (
                                                <tr
                                                    key={key.id}
                                                    className="hover:bg-slate-900/30 transition-colors"
                                                >
                                                    <td className="py-4 px-6 text-sm font-medium text-slate-200">
                                                        {key.name}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-400">
                                                        {format(new Date(key.createdAt), 'PPP')}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-400">
                                                        {key.lastUsed
                                                            ? format(new Date(key.lastUsed), 'PPP')
                                                            : 'Never used'}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm">
                              <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      key.isRevoked
                                          ? 'bg-red-900/30 text-red-400'
                                          : 'bg-emerald-900/30 text-emerald-400'
                                  }`}
                              >
                                {key.isRevoked ? 'Revoked' : 'Active'}
                              </span>
                                                    </td>
                                                    <td className="py-2 px-6 text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!key.isRevoked && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setRenameKey(key)}
                                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                                                                    >
                                                                        <span className="sr-only">Rename</span>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-800/60"
                                                                            >
                                                                                <span className="sr-only">Revoke</span>
                                                                                <Ban className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    Are you sure you want to
                                                                                    revoke &ldquo;{key.name}&rdquo;?
                                                                                    This will immediately prevent any further use of
                                                                                    this key.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => revokeApiKey.mutate(key.id)}
                                                                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                                                >
                                                                                    Revoke Key
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </>
                                                            )}
                                                            {key.isRevoked && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-800/60"
                                                                        >
                                                                            <span className="sr-only">Delete</span>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to permanently
                                                                                delete &ldquo;{key.name}&rdquo;?
                                                                                This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => deleteApiKey.mutate(key.id)}
                                                                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                                            >
                                                                                Delete Key
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="bg-slate-900/50 rounded-full p-4 mb-4">
                                                            <Key className="h-8 w-8 text-slate-500" />
                                                        </div>
                                                        <h3 className="text-lg font-medium text-slate-200 mb-1">No API Keys</h3>
                                                        <p className="text-sm text-slate-400 mb-4 max-w-sm">
                                                            Create an API key to get started with the Changerawr API.
                                                        </p>
                                                        <Button
                                                            onClick={() => setIsCreateDialogOpen(true)}
                                                            size="sm"
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Create Key
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* React SDK Card - Right Sidebar */}
                        <div className="lg:w-80 xl:w-96">
                            <ReactSDKCard />
                        </div>
                    </div>
                </div>
            </div>

            <RenameDialog
                open={!!renameKey}
                onOpenChange={(open) => !open && setRenameKey(null)}
                currentName={renameKey?.name ?? ''}
                onRename={async (newName) => {
                    if (!renameKey) return;
                    await renameApiKey.mutateAsync({ id: renameKey.id, name: newName });
                }}
            />
        </div>
    );
}