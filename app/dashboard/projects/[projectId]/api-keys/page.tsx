'use client'

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
    Key,
    Plus,
    Trash2,
    Ban,
    Pencil,
    Copy,
    FileText,
    Shield,
    X,
    ExternalLink,
    Eye,
    EyeOff,
    Filter,
    Clock,
    CheckCircle2,
    Users,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import SDKShowcaseCompact from '@/components/admin/api/sdk-showcase-compact';
import { Badge } from '@/components/ui/badge';
import { PermissionsModal } from '@/components/admin/api/PermissionsModal';
import { PERMISSION_GROUPS } from '@/lib/api/permissions';
import { cn } from '@/lib/utils';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    lastUsed: string | null;
    createdAt: string;
    expiresAt: string | null;
    isRevoked: boolean;
    projectId: string | null;
    permissions: string[];
    isGlobal: boolean;
    userId: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newName: string) => Promise<void>;
    currentName: string;
}

function RenameDialog({ open, onOpenChange, onRename, currentName }: RenameDialogProps) {
    const [newName, setNewName] = useState(currentName);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === currentName) return;
        setIsSubmitting(true);
        try {
            await onRename(newName);
            onOpenChange(false);
        } catch {
            // handled by mutation
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename API Key</DialogTitle>
                    <DialogDescription>Enter a new name for your API key.</DialogDescription>
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!newName.trim() || newName === currentName || isSubmitting}>
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg mb-6"
        >
            <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                        <h4 className="font-medium text-amber-800 dark:text-amber-400">New API Key Created</h4>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-transparent"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                    Copy your API key now — for security reasons, you won&apos;t be able to view it again.
                </p>
                <div className="relative">
                    <div className="bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/30 rounded-md p-3 pr-20 font-mono text-sm break-all text-amber-800 dark:text-amber-300">
                        {keyData.key}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCopy(keyData.key)}
                        className="absolute top-2 right-2 h-8 bg-amber-100 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 hover:text-amber-900"
                    >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

function KeyRow({
    apiKey,
    isAdmin,
    onRename,
    onRevoke,
    onDelete,
}: {
    apiKey: ApiKey;
    isAdmin: boolean;
    onRename: (key: ApiKey) => void;
    onRevoke: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const isActive = !apiKey.isRevoked;

    return (
        <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group border-b last:border-0">
            {/* Status dot */}
            <div className={cn(
                "h-2 w-2 rounded-full flex-shrink-0 mt-0.5",
                isActive ? "bg-green-500" : "bg-muted-foreground/30"
            )} />

            {/* Key info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{apiKey.name}</span>
                    {apiKey.isRevoked ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Revoked</Badge>
                    ) : (
                        <Badge className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 hover:bg-green-500/10">Active</Badge>
                    )}
                    {apiKey.isGlobal ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            <Eye className="h-2.5 w-2.5 mr-1" />
                            Global
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                            <EyeOff className="h-2.5 w-2.5 mr-1" />
                            Private
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {isAdmin && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {apiKey.user.name || apiKey.user.email}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        Created {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    {apiKey.lastUsed ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Used {formatDistanceToNow(new Date(apiKey.lastUsed))} ago
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Never used
                        </span>
                    )}
                </div>
            </div>

            {/* Permission badge */}
            <Badge variant="secondary" className="text-xs flex-shrink-0 hidden sm:flex">
                {apiKey.permissions.length} perm{apiKey.permissions.length !== 1 ? 's' : ''}
            </Badge>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {isActive && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRename(apiKey)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Rename"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Rename</span>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    title="Revoke"
                                >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span className="sr-only">Revoke</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to revoke &ldquo;{apiKey.name}&rdquo;? This will immediately prevent any further use of this key.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => onRevoke(apiKey.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Revoke Key
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
                {apiKey.isRevoked && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to permanently delete &ldquo;{apiKey.name}&rdquo;? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(apiKey.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Delete Key
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    );
}

export default function ProjectApiKeysPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(PERMISSION_GROUPS.FULL_ACCESS);
    const [newKeyIsGlobal, setNewKeyIsGlobal] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{ key: string; id: string } | null>(null);
    const [renameKey, setRenameKey] = useState<ApiKey | null>(null);
    const [userFilter, setUserFilter] = useState<string>('all');

    const { data: systemConfig } = useQuery<{ adminOnlyApiKeyCreation: boolean }>({
        queryKey: ['system-config-api-keys'],
        queryFn: async () => {
            const response = await fetch('/api/admin/config');
            if (!response.ok) return { adminOnlyApiKeyCreation: false };
            return response.json();
        },
    });

    const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
        queryKey: ['project-api-keys', projectId, userFilter],
        queryFn: async () => {
            const url = new URL(`/api/projects/${projectId}/api-keys`, window.location.origin);
            if (userFilter !== 'all') url.searchParams.set('userId', userFilter);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error('Failed to fetch API keys');
            return response.json();
        },
        refetchInterval: 30000,
        staleTime: 15000,
    });

    const isAdmin = user?.role === 'ADMIN';
    const canCreateKeys = !systemConfig?.adminOnlyApiKeyCreation || isAdmin;

    const uniqueUsers = React.useMemo(() => {
        if (!apiKeys || !isAdmin) return [];
        const usersMap = new Map<string, { id: string; name: string | null; email: string }>();
        apiKeys.forEach(key => {
            if (!usersMap.has(key.userId)) usersMap.set(key.userId, key.user);
        });
        return Array.from(usersMap.values());
    }, [apiKeys, isAdmin]);

    const createApiKey = useMutation({
        mutationFn: async ({ name, permissions, isGlobal }: { name: string; permissions: string[]; isGlobal: boolean }) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, permissions, isGlobal }),
            });
            if (!response.ok) throw new Error('Failed to create API key');
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) =>
                old ? [...old, data] : [data]
            );
            setNewKeyData({ key: data.key, id: data.id });
            toast({ title: 'API Key Created', description: 'Your new API key has been created.' });
        },
    });

    const renameApiKey = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to rename API key');
            return response.json();
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);
            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) =>
                old?.map(key => key.id === id ? { ...key, name } : key)
            );
            return { previousKeys };
        },
        onError: (err, variables, context) => {
            if (context?.previousKeys) queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] }),
    });

    const revokeApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRevoked: true }),
            });
            if (!response.ok) throw new Error('Failed to revoke API key');
            return response.json();
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);
            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) =>
                old?.map(key => key.id === id ? { ...key, isRevoked: true } : key)
            );
            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] }),
    });

    const deleteApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete API key');
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);
            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) =>
                old?.filter(key => key.id !== id)
            );
            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] }),
    });

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        await createApiKey.mutate({ name: newKeyName, permissions: newKeyPermissions, isGlobal: newKeyIsGlobal });
        setNewKeyName('');
        setNewKeyPermissions(PERMISSION_GROUPS.FULL_ACCESS);
        setNewKeyIsGlobal(false);
        setIsCreateDialogOpen(false);
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast({ title: 'Copied', description: 'API key copied to clipboard.' });
    };

    const activeCount = apiKeys?.filter(k => !k.isRevoked).length ?? 0;
    const revokedCount = apiKeys?.filter(k => k.isRevoked).length ?? 0;

    if (isLoading) {
        return (
            <div className="container max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-28" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">API Keys</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage API keys for this project.
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <Button variant="outline" size="sm" className="h-9" asChild>
                        <Link href="/api-docs" className="flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            API Docs
                            <ExternalLink className="ml-1.5 h-3 w-3 opacity-60" />
                        </Link>
                    </Button>
                    {canCreateKeys && (
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Key
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Create New API Key</DialogTitle>
                                    <DialogDescription>Give your API key a name to identify its use.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateKey}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                placeholder="e.g., Production API Key"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Permissions</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsPermissionsModalOpen(true)}
                                                className="justify-start"
                                            >
                                                <Shield className="h-4 w-4 mr-2" />
                                                {newKeyPermissions.length} permission{newKeyPermissions.length !== 1 ? 's' : ''} selected
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="flex gap-3">
                                                {newKeyIsGlobal
                                                    ? <Eye className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    : <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                }
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="isGlobal" className="text-sm cursor-pointer font-medium">
                                                        Visible to Administrators
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {newKeyIsGlobal
                                                            ? 'Administrators can see and manage this key'
                                                            : 'Only you can see and manage this key'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                id="isGlobal"
                                                checked={newKeyIsGlobal}
                                                onCheckedChange={setNewKeyIsGlobal}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={!newKeyName.trim() || createApiKey.isPending}>
                                            {createApiKey.isPending ? 'Creating...' : 'Create Key'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {newKeyData && (
                    <NewKeyAlert keyData={newKeyData} onClose={() => setNewKeyData(null)} onCopy={handleCopyKey} />
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Keys list */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-medium">API Keys</CardTitle>
                                    {apiKeys && apiKeys.length > 0 && (
                                        <CardDescription className="mt-0.5">
                                            {activeCount} active{revokedCount > 0 ? `, ${revokedCount} revoked` : ''}
                                        </CardDescription>
                                    )}
                                </div>
                                {isAdmin && uniqueUsers.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <Select value={userFilter} onValueChange={setUserFilter}>
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue placeholder="Filter by user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Users</SelectItem>
                                                {uniqueUsers.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name || u.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        {apiKeys && apiKeys.length > 0 ? (
                            <div className="divide-y">
                                {apiKeys.map((key) => (
                                    <KeyRow
                                        key={key.id}
                                        apiKey={key}
                                        isAdmin={isAdmin}
                                        onRename={setRenameKey}
                                        onRevoke={(id) => revokeApiKey.mutate(id)}
                                        onDelete={(id) => deleteApiKey.mutate(id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                <div className="rounded-full p-4 bg-muted mb-4">
                                    <Key className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <h3 className="font-medium mb-1">No API keys yet</h3>
                                <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                                    {canCreateKeys
                                        ? 'Create an API key to start integrating with the Changerawr API.'
                                        : 'Only administrators can create API keys for this project. Contact an admin to request access.'
                                    }
                                </p>
                                {canCreateKeys && (
                                    <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Key
                                    </Button>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* SDK showcase */}
                <div className="lg:col-span-1">
                    <SDKShowcaseCompact />
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

            <PermissionsModal
                open={isPermissionsModalOpen}
                onOpenChange={setIsPermissionsModalOpen}
                selectedPermissions={newKeyPermissions}
                onSave={setNewKeyPermissions}
            />
        </div>
    );
}
