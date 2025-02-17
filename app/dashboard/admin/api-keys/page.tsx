'use client'

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { Key, Plus, Trash2, Ban, Pencil, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
            <DialogContent>
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
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-4 w-64 mt-2" />
                            </div>
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>
                                Manage API keys for accessing the Changerawr API.
                            </CardDescription>
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Key
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
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
                </CardHeader>
                <CardContent>
                    <AnimatePresence>
                        {newKeyData && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 p-4 bg-yellow-900 border border-yellow-700 rounded-lg"
                            >
                                <div className="flex flex-col space-y-2">
                                    <h4 className="font-medium text-yellow-100">New API Key Created</h4>
                                    <p className="text-sm text-yellow-200">
                                        Make sure to copy your API key now. You won&apos;t be able to see it again!
                                    </p>
                                    <div className="flex items-center gap-2 p-2 bg-yellow-800 border border-yellow-700 rounded">
                                        <code className="flex-1 font-mono text-sm text-yellow-100">
                                            {newKeyData.key}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyKey(newKeyData.key)}
                                            className="text-yellow-300 hover:text-yellow-400"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNewKeyData(null)}
                                        className="self-end text-yellow-300 border-yellow-300 hover:bg-yellow-800 hover:text-yellow-400"
                                    >
                                        Done
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {apiKeys?.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.name}</TableCell>
                                    <TableCell>{format(new Date(key.createdAt), 'PPP')}</TableCell>
                                    <TableCell>
                                        {key.lastUsed
                                            ? format(new Date(key.lastUsed), 'PPP')
                                            : 'Never used'}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                key.isRevoked
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}
                                        >
                                            {key.isRevoked ? 'Revoked' : 'Active'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!key.isRevoked && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setRenameKey(key)}
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to revoke &ldquo;{key.name}&rdquo;?
                                                                    This will immediately prevent any further use of this key.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => revokeApiKey.mutate(key.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
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
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to permanently delete &ldquo;{key.name}&rdquo;?
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteApiKey.mutate(key.id)}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Delete Key
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!apiKeys || apiKeys.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Key className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="font-medium mb-1">No API Keys</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
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
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <RenameDialog
                open={!!renameKey}
                onOpenChange={(open) => !open && setRenameKey(null)}
                currentName={renameKey?.name ?? ''}
                onRename={async (newName) => {
                    if (!renameKey) return;
                    await renameApiKey.mutateAsync({ id: renameKey.id, name: newName });
                }}
            />
        </motion.div>
    );
}