'use client';

import React, {useState, useMemo, useEffect} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {toast} from '@/hooks/use-toast';
import {
    Puzzle,
    Plus,
    Trash2,
    Download,
    ExternalLink,
    Package,
    CheckCircle,
    Clock,
    Search,
    Store,
    Github,
    Power,
    PowerOff,
    Tag,
    Upload,
    Settings2,
    Zap,
    Globe,
    Shield,
    Star,
    TrendingUp,
    Sparkles,
    Filter,
    AlertCircle,
    RefreshCcw,
    Book,
    History,
    Loader2,
    Link,
    Bug,
} from 'lucide-react';
import {format} from 'date-fns';
import {InstallExtensionDialog} from '@/components/extensions/InstallExtensionDialog';
import {UploadExtensionDialog} from '@/components/extensions/UploadExtensionDialog';
import {QuickInstallDialog} from '@/components/extensions/QuickInstallDialog';
import {RepairExtensionDialog} from '@/components/extensions/RepairExtensionDialog';
import {UpdateExtensionsDialog} from '@/components/extensions/UpdateExtensionsDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {cn} from '@/lib/utils';
import {renderMarkdownSync} from '@/lib/services/core/markdown/useCustomExtensions';
import {SearchableSelect} from '@/components/ui/searchable-select';
import {ColorPicker} from '@/components/changelog/editor/TagColorPicker';

interface Extension {
    id: string;
    name: string;
    displayName: string;
    version: string;
    author?: string;
    description?: string;
    category?: string;
    isBuiltIn: boolean;
    isEnabled: boolean;
    isLinked: boolean;
    sourceType: 'STORE' | 'CUSTOM' | 'BUILTIN';
    sourceUrl?: string;
    installedAt: string;
    updatedAt: string;
    latestVersion?: string;
    updateAvailable: boolean;
    isBroken?: boolean;
    icon?: string;
    invertIcon?: boolean;
    readme?: string;
}

interface StoreExtension {
    name: string;
    displayName: string;
    version: string;
    author: string;
    description: string;
    category: string;
    githubUrl: string;
    downloads?: number;
    rating?: number;
    featured?: boolean;
    storeName?: string;
    storeDisplayName?: string;
    readme?: string;
    changelog?: string;
    icon?: string;
    invertIcon?: boolean;
    settings?: Array<{
        key: string;
        label: string;
        description?: string;
        type: 'boolean' | 'string' | 'number' | 'select' | 'textarea' | 'color';
        defaultValue: string | number | boolean;
        options?: Array<{ label: string; value: string | number }>;
        min?: number;
        max?: number;
        placeholder?: string;
        required?: boolean;
    }>;
}

interface ExtensionStore {
    id: string;
    name: string;
    displayName: string;
    url: string;
    isBuiltIn: boolean;
    isEnabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
}

// Helper component to render extension icons
function ExtensionIcon({extension, size = 'medium'}: {
    extension: Extension | StoreExtension,
    size?: 'small' | 'medium' | 'large' | 'xlarge'
}) {
    const isBroken = 'isBroken' in extension && extension.isBroken;
    const isImageUrl = extension.icon?.startsWith('data:image') || extension.icon?.startsWith('http://') || extension.icon?.startsWith('https://') || extension.icon?.startsWith('/api/extensions');

    console.log(`[ExtensionIcon] ${extension.name}:`, {
        icon: extension.icon,
        isImageUrl,
        isBroken,
        extensionId: 'id' in extension ? extension.id : undefined
    });

    // Dynamically import Lucide icon if it's a string (icon name) and not an image URL
    const IconComponent = extension.icon && !isImageUrl ? React.lazy<React.FC<{ className?: string }>>((() =>
            import('lucide-react').then(module => ({
                default: (module[extension.icon as keyof typeof module] as any) || Puzzle
            })) as any
    )) : null;

    const sizeClasses = {
        small: 'h-6 w-6',
        medium: 'h-8 w-8',
        large: 'h-10 w-10',
        xlarge: 'h-12 w-12',
    };

    const containerClasses = {
        small: 'p-2.5',
        medium: 'p-3',
        large: 'p-3.5',
        xlarge: 'p-4',
    };

    return (
        <div className={cn(
            "rounded-xl h-fit transition-all duration-300",
            containerClasses[size],
            isBroken
                ? "bg-gradient-to-br from-red-500/20 to-red-600/10 ring-1 ring-red-500/30"
                : "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 ring-1 ring-primary/20"
        )}>
            {isBroken ? (
                <AlertCircle className={cn(sizeClasses[size], "text-red-500")}/>
            ) : isImageUrl ? (
                <img
                    src={extension.icon}
                    alt={extension.displayName}
                    className={cn(
                        sizeClasses[size],
                        extension.invertIcon && "dark:invert"
                    )}
                />
            ) : IconComponent ? (
                <React.Suspense fallback={<Puzzle className={cn(sizeClasses[size], "text-primary")}/>}>
                    <IconComponent className={cn(sizeClasses[size], "text-primary")}/>
                </React.Suspense>
            ) : (
                <Puzzle className={cn(sizeClasses[size], "text-primary")}/>
            )}
        </div>
    );
}

export default function ExtensionsPage() {
    const [view, setView] = useState<'marketplace' | 'installed'>('marketplace');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStore, setSelectedStore] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'author' | 'recent'>('name');
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
    const [installedFilter, setInstalledFilter] = useState<'all' | 'enabled' | 'disabled' | 'broken' | 'updates'>('all');
    const [installDialogOpen, setInstallDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [showStoreDialog, setShowStoreDialog] = useState(false);
    const [selectedExtension, setSelectedExtension] = useState<StoreExtension | null>(null);
    const [quickInstalling, setQuickInstalling] = useState<StoreExtension | null>(null);
    const [repairing, setRepairing] = useState<StoreExtension | null>(null);
    const [updating, setUpdating] = useState<StoreExtension | null>(null);
    const [extensionToUninstall, setExtensionToUninstall] = useState<Extension | null>(null);
    const [extensionToConfigureSettings, setExtensionToConfigureSettings] = useState<Extension | null>(null);
    const [extensionForReadme, setExtensionForReadme] = useState<Extension | null>(null);
    const [extensionForChangelog, setExtensionForChangelog] = useState<Extension | null>(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updateCount, setUpdateCount] = useState(0);
    const [showBrokenExtensionsWarning, setShowBrokenExtensionsWarning] = useState(false);
    const queryClient = useQueryClient();

    // Initialize store
    React.useEffect(() => {
        const initializeStore = async () => {
            try {
                const listResponse = await fetch('/api/extensions/store/list');
                if (!listResponse.ok) return;
                const stores = await listResponse.json();
                if (stores.length === 0) {
                    await fetch('/api/extensions/store/init', {method: 'POST'});
                    queryClient.invalidateQueries({queryKey: ['extension-stores']});
                    queryClient.invalidateQueries({queryKey: ['store-extensions']});
                }
            } catch (err) {
                console.error('Failed to initialize store:', err);
            }
        };
        initializeStore();
    }, [queryClient]);

    const {data: extensions = []} = useQuery<Extension[]>({
        queryKey: ['extensions'],
        queryFn: async () => {
            const response = await fetch('/api/extensions/list');
            if (!response.ok) throw new Error('Failed to fetch extensions');
            return response.json();
        },
    });

    const {data: storeExtensions = [], isLoading: isLoadingStore} = useQuery<StoreExtension[]>({
        queryKey: ['store-extensions'],
        queryFn: async () => {
            const response = await fetch('/api/extensions/store');
            if (!response.ok) throw new Error('Failed to fetch store extensions');
            return response.json();
        },
        staleTime: 5 * 60 * 1000,
    });

    const {data: stores = []} = useQuery<ExtensionStore[]>({
        queryKey: ['extension-stores'],
        queryFn: async () => {
            const response = await fetch('/api/extensions/store/list');
            if (!response.ok) throw new Error('Failed to fetch stores');
            return response.json();
        },
    });

    // Check for broken extensions on load
    React.useEffect(() => {
        if (extensions && extensions.length > 0) {
            const brokenExtensions = extensions.filter(ext => ext.isBroken);
            if (brokenExtensions.length > 0) {
                // Only show warning once per session
                const hasShownWarning = sessionStorage.getItem('broken-extensions-warning-shown');
                if (!hasShownWarning) {
                    setShowBrokenExtensionsWarning(true);
                    sessionStorage.setItem('broken-extensions-warning-shown', 'true');
                }
            }
        }
    }, [extensions]);

    const uninstallMutation = useMutation({
        mutationFn: async (extensionId: string) => {
            const response = await fetch(`/api/extensions/${extensionId}`, {method: 'DELETE'});
            if (!response.ok) throw new Error('Failed to uninstall extension');
            return response.json();
        },
        onSuccess: () => {
            toast({title: 'Extension Uninstalled', description: 'The application will restart to apply changes.'});
            setTimeout(() => window.location.reload(), 5000);
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: async (extensionName: string) => {
            const response = await fetch('/api/extensions/unlink', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: extensionName}),
            });
            if (!response.ok) throw new Error('Failed to unlink extension');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['installed-extensions']});
            toast({title: 'Extension Unlinked', description: 'Restart dev server to see changes.'});
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async ({id, enabled}: { id: string; enabled: boolean }) => {
            const response = await fetch(`/api/extensions/${id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({isEnabled: enabled}),
            });
            if (!response.ok) throw new Error('Failed to update extension');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['extensions']});
            toast({title: 'Extension Updated'});
        },
    });

    const updateAllMutation = useMutation({
        mutationFn: async () => {
            // Count extensions with updates available
            const count = extensions.filter(e => e.updateAvailable).length;
            setUpdateCount(count);
            setShowUpdateDialog(true);
            return {count};
        },
    });

    const handleQuickInstall = (ext: StoreExtension) => {
        setQuickInstalling(ext);
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        storeExtensions.forEach(ext => {
            if (ext.category) cats.add(ext.category);
        });
        return Array.from(cats).sort();
    }, [storeExtensions]);

    const storeNames = useMemo(() => {
        const names = new Set<string>();
        storeExtensions.forEach(ext => {
            if (ext.storeName) names.add(ext.storeName);
        });
        return Array.from(names).sort();
    }, [storeExtensions]);

    const filteredStoreExtensions = useMemo(() => {
        let filtered = storeExtensions.filter(ext => {
            const matchesSearch = ext.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ext.author.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
            const matchesStore = selectedStore === 'all' || ext.storeName === selectedStore;
            const matchesFeatured = !showFeaturedOnly || ext.featured === true;
            return matchesSearch && matchesCategory && matchesStore && matchesFeatured;
        });

        // Sort extensions
        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.displayName.localeCompare(b.displayName);
            } else if (sortBy === 'author') {
                return a.author.localeCompare(b.author);
            }
            // 'recent' - keep original order from API
            return 0;
        });

        return filtered;
    }, [storeExtensions, searchQuery, selectedCategory, selectedStore, showFeaturedOnly, sortBy]);

    const filteredInstalledExtensions = useMemo(() => {
        return extensions.filter(ext => {
            const matchesSearch = ext.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ext.description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                installedFilter === 'all' ||
                (installedFilter === 'enabled' && ext.isEnabled) ||
                (installedFilter === 'disabled' && !ext.isEnabled) ||
                (installedFilter === 'broken' && ext.isBroken) ||
                (installedFilter === 'updates' && ext.updateAvailable);

            return matchesSearch && matchesFilter;
        });
    }, [extensions, searchQuery, installedFilter]);

    const installedNames = new Set(extensions.map(e => e.name));
    const featuredExtensions = filteredStoreExtensions.filter(ext => ext.featured === true);

    return (
        <div className="flex gap-6">
            {/* Compact Sidebar */}
            <aside className="w-56 space-y-4 shrink-0">
                {/* Navigation */}
                <div className="flex flex-col gap-2">
                    <Button
                        variant={view === 'marketplace' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setView('marketplace')}
                    >
                        <Store className="h-4 w-4 mr-2"/>
                        Marketplace
                        <Badge variant="secondary" className="ml-auto text-xs">{storeExtensions.length}</Badge>
                    </Button>
                    <Button
                        variant={view === 'installed' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setView('installed')}
                    >
                        <Package className="h-4 w-4 mr-2"/>
                        Installed
                        <Badge variant="secondary" className="ml-auto text-xs">{extensions.length}</Badge>
                    </Button>
                </div>

                {/* Compact Filters */}
                {view === 'marketplace' && (
                    <div className="space-y-3">
                        {/* Category Filter */}
                        {categories.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase">Category</Label>
                                <SearchableSelect
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                    placeholder="All Categories"
                                    searchPlaceholder="Search categories..."
                                    triggerClassName="h-9"
                                    items={[
                                        {value: 'all', label: `All (${storeExtensions.length})`},
                                        ...categories.map(cat => {
                                            const count = storeExtensions.filter(e => e.category === cat).length;
                                            return {
                                                value: cat,
                                                label: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`,
                                                searchValue: cat,
                                            };
                                        })
                                    ]}
                                />
                            </div>
                        )}

                        {/* Store Filter */}
                        {storeNames.length > 1 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase">Store</Label>
                                <SearchableSelect
                                    value={selectedStore}
                                    onValueChange={setSelectedStore}
                                    placeholder="All Stores"
                                    searchPlaceholder="Search stores..."
                                    triggerClassName="h-9"
                                    items={[
                                        {value: 'all', label: 'All Stores'},
                                        ...storeNames.map(store => ({
                                            value: store,
                                            label: store,
                                        }))
                                    ]}
                                />
                            </div>
                        )}

                        {/* Sort Filter */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground uppercase">Sort By</Label>
                            <SearchableSelect
                                value={sortBy}
                                onValueChange={(value) => setSortBy(value as typeof sortBy)}
                                placeholder="Sort by..."
                                searchPlaceholder="Search..."
                                triggerClassName="h-9"
                                items={[
                                    {value: 'name', label: 'Name'},
                                    {value: 'author', label: 'Author'},
                                    {value: 'recent', label: 'Recent'},
                                ]}
                            />
                        </div>

                        {/* Featured Toggle */}
                        <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                                id="featured-only"
                                checked={showFeaturedOnly}
                                onCheckedChange={(checked) => setShowFeaturedOnly(checked as boolean)}
                            />
                            <Label htmlFor="featured-only" className="text-sm cursor-pointer">Featured only</Label>
                        </div>
                    </div>
                )}

                {/* Installed Filters */}
                {view === 'installed' && (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground uppercase">Show</Label>
                            <SearchableSelect
                                value={installedFilter}
                                onValueChange={(value) => setInstalledFilter(value as typeof installedFilter)}
                                placeholder="All Extensions"
                                searchPlaceholder="Search..."
                                triggerClassName="h-9"
                                items={[
                                    {value: 'all', label: `All (${extensions.length})`},
                                    {
                                        value: 'enabled',
                                        label: `Enabled (${extensions.filter(e => e.isEnabled).length})`
                                    },
                                    {
                                        value: 'disabled',
                                        label: `Disabled (${extensions.filter(e => !e.isEnabled).length})`
                                    },
                                    ...(extensions.filter(e => e.isBroken).length > 0 ? [{
                                        value: 'broken' as const,
                                        label: `Broken (${extensions.filter(e => e.isBroken).length})`
                                    }] : []),
                                    ...(extensions.filter(e => e.updateAvailable).length > 0 ? [{
                                        value: 'updates' as const,
                                        label: `Updates (${extensions.filter(e => e.updateAvailable).length})`
                                    }] : []),
                                ]}
                            />
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                    <Button className="w-full shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => setInstallDialogOpen(true)}>
                        <Github className="h-4 w-4 mr-2"/>
                        Install from GitHub
                    </Button>
                    <Button variant="outline" className="w-full hover:bg-primary/5 transition-all duration-200"
                            onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2"/>
                        Upload Extension
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full hover:bg-primary/5 transition-all duration-200"
                        onClick={() => updateAllMutation.mutate()}
                        disabled={updateAllMutation.isPending || extensions.filter(e => e.updateAvailable).length === 0}
                    >
                        <RefreshCcw className={cn("h-4 w-4 mr-2", updateAllMutation.isPending && "animate-spin")}/>
                        Update All
                        {extensions.filter(e => e.updateAvailable).length > 0 && (
                            <Badge variant="secondary"
                                   className="ml-auto bg-blue-600/20 text-blue-700 dark:text-blue-400">
                                {extensions.filter(e => e.updateAvailable).length}
                            </Badge>
                        )}
                    </Button>
                    <Button variant="outline" className="w-full hover:bg-primary/5 transition-all duration-200"
                            onClick={() => setShowStoreDialog(true)}>
                        <Settings2 className="h-4 w-4 mr-2"/>
                        Manage Stores
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        {view === 'marketplace' ? 'Extension Marketplace' : 'Installed Extensions'}
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        {view === 'marketplace'
                            ? 'Discover and install powerful extensions to enhance your editor'
                            : 'Manage your installed extensions'}
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder={view === 'marketplace' ? 'Search marketplace...' : 'Search installed...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 shadow-sm border-border/50 focus:border-primary/50 transition-colors"
                    />
                </div>

                {view === 'marketplace' ? (
                    <div className="space-y-8">
                        {/* Featured Extensions */}
                        {featuredExtensions.length > 0 && !searchQuery && selectedCategory === 'all' && selectedStore === 'all' && !showFeaturedOnly && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary animate-pulse"/>
                                    <h2 className="text-2xl font-semibold">Featured Extensions</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {featuredExtensions.map(ext => {
                                        const isInstalled = installedNames.has(ext.name);
                                        return (
                                            <Card
                                                key={ext.name}
                                                className={cn(
                                                    "group cursor-pointer border-primary/30 transition-all duration-300 overflow-hidden",
                                                    "hover:shadow-xl hover:scale-[1.02] hover:border-primary/50",
                                                    "bg-gradient-to-br from-primary/5 via-background to-background"
                                                )}
                                                onClick={() => setSelectedExtension(ext)}
                                            >
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                                                <CardHeader className="relative pb-3">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <ExtensionIcon extension={ext} size="medium"/>
                                                        {isInstalled && (
                                                            <Badge variant="outline"
                                                                   className="gap-1 text-green-600 border-green-600/50 bg-green-50 dark:bg-green-950/30">
                                                                <CheckCircle className="h-3 w-3"/>
                                                                Installed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <CardTitle
                                                        className="text-xl group-hover:text-primary transition-colors duration-200">{ext.displayName}</CardTitle>
                                                    <CardDescription className="text-xs">by {ext.author} •
                                                        v{ext.version}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="relative">
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{ext.description}</p>
                                                    <Button
                                                        className={cn(
                                                            "w-full shadow-sm transition-all duration-200",
                                                            isInstalled ? "opacity-60" : "hover:shadow-md"
                                                        )}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuickInstall(ext);
                                                        }}
                                                        disabled={isInstalled}
                                                    >
                                                        {isInstalled ? (
                                                            <><CheckCircle className="h-4 w-4 mr-2"/>Already
                                                                Installed</>
                                                        ) : (
                                                            <><Download className="h-4 w-4 mr-2"/>Quick Install</>
                                                        )}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* All Extensions */}
                        <div className="space-y-4">
                            {!searchQuery && selectedCategory === 'all' && selectedStore === 'all' && !showFeaturedOnly && featuredExtensions.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5"/>
                                    <h2 className="text-2xl font-semibold">All Extensions</h2>
                                </div>
                            )}

                            {isLoadingStore ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full"/>)}
                                </div>
                            ) : filteredStoreExtensions.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredStoreExtensions.map(ext => {
                                        const isInstalled = installedNames.has(ext.name);
                                        return (
                                            <Card
                                                key={ext.name}
                                                className={cn(
                                                    "group transition-all duration-300 border-border/50",
                                                    "hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
                                                )}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex gap-5">
                                                        <ExtensionIcon extension={ext} size="large"/>
                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className="flex items-start justify-between gap-4 mb-3">
                                                                <div className="flex-1">
                                                                    <h3 className="text-xl font-semibold mb-1.5 group-hover:text-primary transition-colors duration-200">{ext.displayName}</h3>
                                                                    <p className="text-sm text-muted-foreground">by {ext.author} •
                                                                        v{ext.version}</p>
                                                                </div>
                                                                {isInstalled && (
                                                                    <Badge variant="outline"
                                                                           className="gap-1 text-green-600 border-green-600/50 bg-green-50 dark:bg-green-950/30">
                                                                        <CheckCircle className="h-3 w-3"/>
                                                                        Installed
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{ext.description}</p>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge variant="secondary"
                                                                       className="gap-1.5 bg-primary/10 hover:bg-primary/20 transition-colors">
                                                                    <Tag className="h-3 w-3"/>
                                                                    {ext.category}
                                                                </Badge>
                                                                {ext.storeDisplayName && (
                                                                    <Badge variant="outline" className="gap-1.5">
                                                                        <Store className="h-3 w-3"/>
                                                                        {ext.storeDisplayName}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 shrink-0">
                                                            <Button
                                                                onClick={() => handleQuickInstall(ext)}
                                                                disabled={isInstalled}
                                                                className={cn(
                                                                    "min-w-[140px] shadow-sm transition-all duration-200",
                                                                    !isInstalled && "hover:shadow-md"
                                                                )}
                                                            >
                                                                {isInstalled ? (
                                                                    <><CheckCircle
                                                                        className="h-4 w-4 mr-2"/>Installed</>
                                                                ) : (
                                                                    <><Download className="h-4 w-4 mr-2"/>Install</>
                                                                )}
                                                            </Button>
                                                            <Button variant="outline" size="sm"
                                                                    className="hover:bg-primary/5 transition-colors"
                                                                    asChild>
                                                                <a href={ext.githubUrl} target="_blank"
                                                                   rel="noopener noreferrer">
                                                                    <Github className="h-3 w-3 mr-2"/>
                                                                    Source
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="border-dashed">
                                    <CardContent className="py-16 text-center">
                                        <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40"/>
                                        <h3 className="text-lg font-semibold mb-2">No extensions found</h3>
                                        <p className="text-muted-foreground">Try a different search or category</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Installed View */
                    <div>
                        {filteredInstalledExtensions.length > 0 ? (
                            <div className="space-y-4">
                                {filteredInstalledExtensions.map(ext => (
                                    <Card
                                        key={ext.id}
                                        className={cn(
                                            "group transition-all duration-300 border-border/50",
                                            "hover:shadow-lg hover:border-primary/30",
                                            !ext.isEnabled && "opacity-60 hover:opacity-80",
                                            ext.isBroken && "border-red-500/40 bg-red-50/5 dark:bg-red-950/5"
                                        )}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex gap-5">
                                                <ExtensionIcon extension={ext} size="large"/>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div className="flex-1">
                                                            <h3
                                                                className="text-xl font-semibold mb-1.5 hover:text-primary cursor-pointer transition-colors duration-200"
                                                                onClick={() => setExtensionForReadme(ext)}
                                                            >
                                                                {ext.displayName}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                by {ext.author} • <button
                                                                className="hover:text-primary transition-colors hover:underline"
                                                                onClick={() => setExtensionForChangelog(ext)}
                                                            >
                                                                v{ext.version}
                                                            </button>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {ext.isBroken && (
                                                        <div
                                                            className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>
                                                            <span>Extension files are missing or corrupted. Please use the repair button.</span>
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                                                        {ext.description || 'No description available'}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {ext.category && (
                                                            <Badge variant="secondary"
                                                                   className="gap-1.5 bg-primary/10">
                                                                <Tag className="h-3 w-3"/>
                                                                {ext.category}
                                                            </Badge>
                                                        )}
                                                        {ext.isBuiltIn && (
                                                            <Badge variant="outline"
                                                                   className="gap-1.5 border-purple-500/50 text-purple-700 dark:text-purple-400">
                                                                <Shield className="h-3 w-3"/>
                                                                Built-in
                                                            </Badge>
                                                        )}
                                                        {ext.isBroken && (
                                                            <Badge variant="outline"
                                                                   className="gap-1.5 border-red-600/50 text-red-600 bg-red-50 dark:bg-red-950/30">
                                                                <AlertCircle className="h-3 w-3"/>
                                                                Broken
                                                            </Badge>
                                                        )}
                                                        {ext.isEnabled && !ext.isBroken && (
                                                            <Badge variant="outline"
                                                                   className="gap-1.5 border-green-600/50 text-green-600 bg-green-50 dark:bg-green-950/30">
                                                                <Zap className="h-3 w-3"/>
                                                                Active
                                                            </Badge>
                                                        )}
                                                        {ext.updateAvailable && !ext.isLinked && (
                                                            <Badge variant="outline"
                                                                   className="gap-1.5 border-blue-600/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30 animate-pulse">
                                                                <TrendingUp className="h-3 w-3"/>
                                                                Update Available
                                                            </Badge>
                                                        )}
                                                        {ext.isLinked && (
                                                            <Badge variant="outline"
                                                                   className="gap-1.5 border-orange-600/50 text-orange-600 bg-orange-50 dark:bg-orange-950/30">
                                                                <Link className="h-3 w-3"/>
                                                                Linked
                                                            </Badge>
                                                        )}
                                                        <span
                                                            className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3"/>
                              Installed {format(new Date(ext.installedAt), 'MMM d, yyyy')}
                            </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    {ext.isBroken && ext.sourceUrl && (
                                                        <Button
                                                            variant="default"
                                                            onClick={async () => {
                                                                // For linked extensions, re-link them
                                                                if (ext.isLinked && ext.sourceUrl) {
                                                                    try {
                                                                        const response = await fetch('/api/extensions/link', {
                                                                            method: 'POST',
                                                                            headers: {'Content-Type': 'application/json'},
                                                                            body: JSON.stringify({path: ext.sourceUrl}),
                                                                        });

                                                                        if (!response.ok) {
                                                                            const error = await response.json();
                                                                            toast({
                                                                                title: 'Failed to Re-link Extension',
                                                                                description: error.error || 'Failed to re-link extension',
                                                                                variant: 'destructive'
                                                                            });
                                                                            return;
                                                                        }

                                                                        toast({title: `Re-linked ${ext.displayName} successfully`});
                                                                        queryClient.invalidateQueries({queryKey: ['extensions']});
                                                                        queryClient.invalidateQueries({queryKey: ['store-extensions']});
                                                                    } catch (error) {
                                                                        toast({
                                                                            title: 'Failed to Re-link Extension',
                                                                            description: 'An error occurred while re-linking the extension',
                                                                            variant: 'destructive'
                                                                        });
                                                                    }
                                                                } else {
                                                                    // For GitHub extensions, use repair dialog
                                                                    const storeExt = storeExtensions.find(s => s.name === ext.name);
                                                                    if (storeExt) {
                                                                        setRepairing(storeExt);
                                                                    }
                                                                }
                                                            }}
                                                            className="min-w-[140px] bg-orange-600 hover:bg-orange-700 shadow-sm"
                                                        >
                                                            <AlertCircle className="h-4 w-4 mr-2"/>
                                                            {ext.isLinked ? 'Re-link' : 'Repair'}
                                                        </Button>
                                                    )}
                                                    {!ext.isBroken && ext.updateAvailable && ext.sourceUrl && !ext.isLinked && (
                                                        <Button
                                                            variant="default"
                                                            onClick={() => {
                                                                const storeExt = storeExtensions.find(s => s.name === ext.name);
                                                                if (storeExt) {
                                                                    setUpdating(storeExt);
                                                                }
                                                            }}
                                                            className="min-w-[140px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
                                                        >
                                                            <Download className="h-4 w-4 mr-2"/>
                                                            Update to v{ext.latestVersion}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant={ext.isEnabled ? 'outline' : 'default'}
                                                        onClick={() => toggleMutation.mutate({
                                                            id: ext.id,
                                                            enabled: !ext.isEnabled
                                                        })}
                                                        className="min-w-[140px] transition-all duration-200"
                                                        disabled={ext.isBroken}
                                                    >
                                                        {ext.isEnabled ? (
                                                            <><PowerOff className="h-4 w-4 mr-2"/>Disable</>
                                                        ) : (
                                                            <><Power className="h-4 w-4 mr-2"/>Enable</>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtensionToConfigureSettings(ext)}
                                                        className="hover:bg-primary/5 transition-colors"
                                                    >
                                                        <Settings2 className="h-4 w-4 mr-2"/>
                                                        Settings
                                                    </Button>
                                                    {ext.isLinked && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (ext.sourceUrl) {
                                                                    // Use changerawr:// protocol to open extension
                                                                    const protocolUrl = `changerawr://ext-open?path=${encodeURIComponent(ext.sourceUrl)}`;
                                                                    window.location.href = protocolUrl;
                                                                }
                                                            }}
                                                            className="hover:bg-primary/5 transition-colors border-orange-500/50"
                                                            title="Open in editor via Changerawr CLI"
                                                        >
                                                            <Bug className="h-4 w-4 mr-2"/>
                                                            Open in Editor
                                                        </Button>
                                                    )}
                                                    {!ext.isBuiltIn && !ext.isLinked && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setExtensionToUninstall(ext)}
                                                            className="hover:shadow-md transition-all duration-200"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2"/>
                                                            Uninstall
                                                        </Button>
                                                    )}
                                                    {ext.isLinked && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => unlinkMutation.mutate(ext.name)}
                                                            className="hover:shadow-md transition-all duration-200"
                                                            disabled={unlinkMutation.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2"/>
                                                            {unlinkMutation.isPending ? 'Unlinking...' : 'Unlink'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed">
                                <CardContent className="py-20 text-center">
                                    <Package className="h-20 w-20 mx-auto text-muted-foreground mb-6 opacity-40"/>
                                    <h3 className="text-xl font-semibold mb-3">No extensions installed</h3>
                                    <p className="text-muted-foreground mb-6 text-lg">Browse the marketplace to discover
                                        extensions</p>
                                    <Button onClick={() => setView('marketplace')} size="lg"
                                            className="shadow-md hover:shadow-lg transition-all duration-200">
                                        <Store className="h-4 w-4 mr-2"/>
                                        Browse Marketplace
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Extension Detail Modal */}
            {selectedExtension && (
                <ExtensionDetailModal
                    extension={selectedExtension}
                    isInstalled={installedNames.has(selectedExtension.name)}
                    onClose={() => setSelectedExtension(null)}
                    onInstall={() => handleQuickInstall(selectedExtension)}
                />
            )}

            {/* Store Management Dialog */}
            <StoreManagementDialog
                isOpen={showStoreDialog}
                onOpenChange={setShowStoreDialog}
                stores={stores}
            />

            {/* Install Dialog */}
            <InstallExtensionDialog
                isOpen={installDialogOpen}
                onOpenChange={setInstallDialogOpen}
                onInstall={async () => {
                    await queryClient.invalidateQueries({queryKey: ['extensions']});
                    return {} as any;
                }}
            />

            {/* Quick Install Dialog */}
            <QuickInstallDialog
                isOpen={!!quickInstalling}
                onOpenChange={() => setQuickInstalling(null)}
                githubUrl={quickInstalling?.githubUrl || ''}
                extensionName={quickInstalling?.displayName || ''}
                onComplete={() => {
                    queryClient.invalidateQueries({queryKey: ['extensions']});
                    queryClient.invalidateQueries({queryKey: ['store-extensions']});
                }}
            />

            {/* Repair Dialog */}
            <RepairExtensionDialog
                isOpen={!!repairing}
                onOpenChange={() => setRepairing(null)}
                githubUrl={repairing?.githubUrl || ''}
                extensionName={repairing?.displayName || ''}
                mode="repair"
                onComplete={() => {
                    queryClient.invalidateQueries({queryKey: ['extensions']});
                    queryClient.invalidateQueries({queryKey: ['store-extensions']});
                }}
            />

            {/* Update Dialog (Single Extension) */}
            <RepairExtensionDialog
                isOpen={!!updating}
                onOpenChange={() => setUpdating(null)}
                githubUrl={updating?.githubUrl || ''}
                extensionName={updating?.displayName || ''}
                mode="update"
                onComplete={() => {
                    queryClient.invalidateQueries({queryKey: ['extensions']});
                    queryClient.invalidateQueries({queryKey: ['store-extensions']});
                }}
            />

            {/* Update Extensions Dialog (Bulk) */}
            <UpdateExtensionsDialog
                isOpen={showUpdateDialog}
                onOpenChange={setShowUpdateDialog}
                extensionCount={updateCount}
                onComplete={() => {
                    queryClient.invalidateQueries({queryKey: ['extensions']});
                    queryClient.invalidateQueries({queryKey: ['store-extensions']});
                }}
            />

            {/* Upload Dialog */}
            <UploadExtensionDialog
                isOpen={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                onUpload={async (file) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    const response = await fetch('/api/extensions/upload', {
                        method: 'POST',
                        body: formData,
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Upload failed');
                    }
                    await queryClient.invalidateQueries({queryKey: ['extensions']});
                    toast({title: 'Extension Uploaded'});
                }}
                onLocalPath={async (path) => {
                    const response = await fetch('/api/extensions/link', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({path}),
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Link failed');
                    }
                    await queryClient.invalidateQueries({queryKey: ['extensions']});
                    toast({title: 'Extension Linked'});
                }}
            />

            {/* Extension Settings Dialog */}
            {extensionToConfigureSettings && (
                <ExtensionSettingsDialog
                    extension={extensionToConfigureSettings}
                    onClose={() => setExtensionToConfigureSettings(null)}
                    onSave={async (settings) => {
                        // Save settings via API
                        const response = await fetch(`/api/extensions/${extensionToConfigureSettings.id}/settings`, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({settings}),
                        });
                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to save settings');
                        }
                        toast({
                            title: 'Settings Saved',
                            description: 'Extension settings have been updated successfully.'
                        });
                        queryClient.invalidateQueries({queryKey: ['extensions']});
                        setExtensionToConfigureSettings(null);
                    }}
                />
            )}

            {/* Extension Info Dialog (README & CHANGELOG) */}
            {(extensionForReadme || extensionForChangelog) && (
                <ExtensionReadmeDialog
                    extension={extensionForReadme || extensionForChangelog!}
                    onClose={() => {
                        setExtensionForReadme(null);
                        setExtensionForChangelog(null);
                    }}
                />
            )}

            {/* Broken Extensions Warning Dialog */}
            <AlertDialog open={showBrokenExtensionsWarning} onOpenChange={setShowBrokenExtensionsWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="h-5 w-5"/>
                            Broken Extensions Detected
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                {extensions && (
                                    <>
                                        <p className="mb-3">
                                            {extensions.filter(ext => ext.isBroken).length} extension{extensions.filter(ext => ext.isBroken).length !== 1 ? 's' : ''} {extensions.filter(ext => ext.isBroken).length !== 1 ? 'have' : 'has'} missing
                                            or corrupted files:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 mb-4">
                                            {extensions
                                                .filter(ext => ext.isBroken)
                                                .map(ext => (
                                                    <li key={ext.id} className="text-sm">
                                                        <strong>{ext.displayName}</strong> ({ext.name})
                                                    </li>
                                                ))}
                                        </ul>
                                        <p className="text-sm">
                                            Use the <strong className="text-orange-600">Repair</strong> button on each
                                            extension to fix the issues, or uninstall them if no longer needed.
                                        </p>
                                    </>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => {
                                setShowBrokenExtensionsWarning(false);
                                setView('installed');
                            }}
                        >
                            View Broken Extensions
                        </AlertDialogAction>
                        <AlertDialogCancel>Dismiss</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Uninstall Confirmation Dialog */}
            <AlertDialog open={!!extensionToUninstall} onOpenChange={() => setExtensionToUninstall(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Uninstall Extension</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to uninstall <strong>{extensionToUninstall?.displayName}</strong>?
                            {extensionToUninstall?.isBroken
                                ? ' This will remove the broken extension from your database.'
                                : ' This will remove the extension and restart the application.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (extensionToUninstall) {
                                    uninstallMutation.mutate(extensionToUninstall.id);
                                    setExtensionToUninstall(null);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Uninstall
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function ExtensionDetailModal({extension, isInstalled, onClose, onInstall}: {
    extension: StoreExtension;
    isInstalled: boolean;
    onClose: () => void;
    onInstall: () => void;
}) {
    const [renderedReadme, setRenderedReadme] = React.useState<string>('');
    const [renderedChangelog, setRenderedChangelog] = React.useState<string>('');

    React.useEffect(() => {
        if (extension.readme) {
            import('@/lib/services/core/markdown/useCustomExtensions').then(({renderMarkdownSync}) => {
                setRenderedReadme(renderMarkdownSync(extension.readme!));
            });
        }
        if (extension.changelog) {
            import('@/lib/services/core/markdown/useCustomExtensions').then(({renderMarkdownSync}) => {
                setRenderedChangelog(renderMarkdownSync(extension.changelog!));
            });
        }
    }, [extension.readme, extension.changelog]);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        <ExtensionIcon extension={extension} size="xlarge"/>
                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{extension.displayName}</DialogTitle>
                            <DialogDescription className="mt-1">
                                by {extension.author} • Version {extension.version}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start border-b rounded-none bg-muted/30">
                        <TabsTrigger value="overview"
                                     className="data-[state=active]:bg-background">Overview</TabsTrigger>
                        {extension.readme && <TabsTrigger value="readme"
                                                          className="data-[state=active]:bg-background">README</TabsTrigger>}
                        {extension.changelog && <TabsTrigger value="changelog"
                                                             className="data-[state=active]:bg-background">CHANGELOG</TabsTrigger>}
                        {extension.settings && extension.settings.length > 0 && <TabsTrigger value="settings"
                                                                                             className="data-[state=active]:bg-background">Settings</TabsTrigger>}
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4">
                        <TabsContent value="overview" className="mt-0 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="gap-1.5 bg-primary/10">
                                    <Tag className="h-3 w-3"/>
                                    {extension.category}
                                </Badge>
                                {extension.storeDisplayName && (
                                    <Badge variant="outline" className="gap-1.5">
                                        <Store className="h-3 w-3"/>
                                        {extension.storeDisplayName}
                                    </Badge>
                                )}
                                {isInstalled && (
                                    <Badge variant="outline"
                                           className="gap-1.5 text-green-600 border-green-600/50 bg-green-50 dark:bg-green-950/30">
                                        <CheckCircle className="h-3 w-3"/>
                                        Installed
                                    </Badge>
                                )}
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <Book className="h-4 w-4"/>
                                    Description
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{extension.description}</p>
                            </div>

                            {extension.settings && extension.settings.length > 0 && (
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <Settings2 className="h-4 w-4"/>
                                        Configurable Settings
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        This extension has {extension.settings.length} configurable
                                        setting{extension.settings.length > 1 ? 's' : ''}.
                                        Check the Settings tab to configure them after installation.
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {extension.readme && (
                            <TabsContent value="readme" className="mt-0">
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{__html: renderedReadme}}
                                />
                            </TabsContent>
                        )}

                        {extension.changelog && (
                            <TabsContent value="changelog" className="mt-0">
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{__html: renderedChangelog}}
                                />
                            </TabsContent>
                        )}

                        {extension.settings && extension.settings.length > 0 && (
                            <TabsContent value="settings" className="mt-0">
                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
                                        {isInstalled
                                            ? "Configure these settings after the extension is active."
                                            : "These settings will be available after installation."}
                                    </div>
                                    {extension.settings.map((setting) => (
                                        <div key={setting.key}
                                             className="border rounded-lg p-4 hover:border-primary/30 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-sm">{setting.label}</h4>
                                                    {setting.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="text-xs">{setting.type}</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Default: <code
                                                className="bg-muted px-1.5 py-0.5 rounded">{String(setting.defaultValue)}</code>
                                            </div>
                                            {setting.options && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Options: {setting.options.map(opt => opt.label).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        )}
                    </div>
                </Tabs>

                <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={onInstall} disabled={isInstalled}
                            className="flex-1 shadow-sm hover:shadow-md transition-all duration-200">
                        {isInstalled ? (
                            <><CheckCircle className="h-4 w-4 mr-2"/>Already Installed</>
                        ) : (
                            <><Download className="h-4 w-4 mr-2"/>Install Extension</>
                        )}
                    </Button>
                    <Button variant="outline" className="hover:bg-primary/5 transition-colors" asChild>
                        <a href={extension.githubUrl} target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4 mr-2"/>
                            View Source
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StoreManagementDialog({isOpen, onOpenChange, stores}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    stores: ExtensionStore[];
}) {
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreDisplayName, setNewStoreDisplayName] = useState('');
    const [newStoreUrl, setNewStoreUrl] = useState('');
    const queryClient = useQueryClient();

    const addStoreMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/extensions/store', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: newStoreName,
                    displayName: newStoreDisplayName,
                    url: newStoreUrl,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add store');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({title: 'Store Added'});
            queryClient.invalidateQueries({queryKey: ['extension-stores']});
            queryClient.invalidateQueries({queryKey: ['store-extensions']});
            setNewStoreName('');
            setNewStoreDisplayName('');
            setNewStoreUrl('');
        },
        onError: (error: any) => {
            toast({title: 'Failed to Add Store', description: error.message, variant: 'destructive'});
        },
    });

    const deleteStoreMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/extensions/store/list?id=${id}`, {method: 'DELETE'});
            if (!response.ok) throw new Error('Failed to delete store');
            return response.json();
        },
        onSuccess: () => {
            toast({title: 'Store Removed'});
            queryClient.invalidateQueries({queryKey: ['extension-stores']});
            queryClient.invalidateQueries({queryKey: ['store-extensions']});
        },
    });

    const toggleStoreMutation = useMutation({
        mutationFn: async ({id, isEnabled}: { id: string; isEnabled: boolean }) => {
            const response = await fetch('/api/extensions/store/list', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id, isEnabled}),
            });
            if (!response.ok) throw new Error('Failed to update store');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['extension-stores']});
            queryClient.invalidateQueries({queryKey: ['store-extensions']});
        },
    });

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5"/>
                        Manage Extension Stores
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Add custom extension stores or manage existing ones
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-6">
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h3 className="font-semibold text-sm">Add New Store</h3>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Store ID</Label>
                                <Input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)}
                                       placeholder="my-store" className="text-sm"/>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Display Name</Label>
                                <Input value={newStoreDisplayName}
                                       onChange={(e) => setNewStoreDisplayName(e.target.value)}
                                       placeholder="My Extension Store" className="text-sm"/>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Store URL (extensions.json)</Label>
                                <Input value={newStoreUrl} onChange={(e) => setNewStoreUrl(e.target.value)}
                                       placeholder="https://example.com/extensions.json" className="text-sm font-mono"/>
                            </div>
                            <Button onClick={() => addStoreMutation.mutate()}
                                    disabled={!newStoreName || !newStoreDisplayName || !newStoreUrl || addStoreMutation.isPending}
                                    className="w-full" size="sm">
                                <Plus className="h-4 w-4 mr-2"/>
                                Add Store
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Configured Stores ({stores.length})</h3>
                        <div className="space-y-2">
                            {stores.map((store) => {
                                // Clean up the URL display for the official store
                                const displayUrl = store.isBuiltIn && store.url.includes('github.com/Changerawr/extension-store')
                                    ? 'https://github.com/Changerawr/extension-store'
                                    : store.url;

                                return (
                                    <div key={store.id}
                                         className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors bg-background">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium truncate">{store.displayName}</p>
                                                {store.isBuiltIn && <Badge variant="secondary"
                                                                           className="text-xs bg-purple-600/20 text-purple-700 dark:text-purple-400">Official</Badge>}
                                                {store.isEnabled ? (
                                                    <Badge variant="outline"
                                                           className="text-xs text-green-600 border-green-600/50 bg-green-50 dark:bg-green-950/30">Enabled</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground font-mono truncate">{displayUrl}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm"
                                                    onClick={() => toggleStoreMutation.mutate({
                                                        id: store.id,
                                                        isEnabled: !store.isEnabled
                                                    })}>
                                                {store.isEnabled ? <Power className="h-4 w-4 text-green-600"/> :
                                                    <PowerOff className="h-4 w-4 text-muted-foreground"/>}
                                            </Button>
                                            {!store.isBuiltIn && (
                                                <Button variant="ghost" size="sm"
                                                        onClick={() => deleteStoreMutation.mutate(store.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ExtensionSettingsDialog({extension, onClose, onSave}: {
    extension: Extension;
    onClose: () => void;
    onSave: (settings: Record<string, any>) => Promise<void>;
}) {
    const [extensionMeta, setExtensionMeta] = React.useState<any>(null);
    const [settings, setSettings] = React.useState<Record<string, any>>({});
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        // Load extension metadata to get settings schema
        const loadExtensionMeta = async () => {
            try {
                const response = await fetch(`/api/extensions/metadata/${extension.name}`);
                if (response.ok) {
                    const meta = await response.json();
                    setExtensionMeta(meta);

                    // Initialize settings with current values or defaults
                    const initialSettings: Record<string, any> = {};
                    if (meta.settings) {
                        meta.settings.forEach((setting: any) => {
                            initialSettings[setting.key] =
                                (extension as any).settings?.[setting.key] ?? setting.defaultValue;
                        });
                    }
                    setSettings(initialSettings);
                }
            } catch (error) {
                console.error('Failed to load extension metadata:', error);
            }
        };
        loadExtensionMeta();
    }, [extension]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(settings);
        } catch (error: any) {
            toast({
                title: 'Failed to Save Settings',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const renderSettingInput = (setting: any) => {
        const value = settings[setting.key];

        switch (setting.type) {
            case 'boolean':
                return (
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id={setting.key}
                            checked={value}
                            onCheckedChange={(checked) => setSettings({...settings, [setting.key]: checked})}
                            className="mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                            <Label htmlFor={setting.key}
                                   className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                            </Label>
                        </div>
                    </div>
                );

            case 'number':
                return (
                    <div className="space-y-2">
                        <Label htmlFor={setting.key}>
                            <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                        </Label>
                        <Input
                            id={setting.key}
                            type="number"
                            value={value}
                            onChange={(e) => setSettings({...settings, [setting.key]: Number(e.target.value)})}
                            min={setting.min}
                            max={setting.max}
                            placeholder={setting.placeholder}
                        />
                    </div>
                );

            case 'select':
                return (
                    <div className="space-y-2">
                        <Label htmlFor={setting.key}>
                            <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                        </Label>
                        <SearchableSelect
                            value={value !== undefined && value !== null ? String(value) : undefined}
                            onValueChange={(val) => setSettings({...settings, [setting.key]: val})}
                            placeholder="Select..."
                            items={setting.options?.map((opt: any) => ({
                                value: String(opt.value),
                                label: opt.label,
                            }))}
                        />
                    </div>
                );

            case 'textarea':
                return (
                    <div className="space-y-2">
                        <Label htmlFor={setting.key}>
                            <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                        </Label>
                        <textarea
                            id={setting.key}
                            value={value}
                            onChange={(e) => setSettings({...settings, [setting.key]: e.target.value})}
                            placeholder={setting.placeholder}
                            className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                        />
                    </div>
                );

            case 'color':
                return (
                    <div className="space-y-2">
                        <Label htmlFor={setting.key}>
                            <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                        </Label>
                        <ColorPicker
                            value={value}
                            onChange={(color) => setSettings({...settings, [setting.key]: color ?? ''})}
                            placeholder={setting.placeholder || '#000000'}
                        />
                    </div>
                );

            default: // string
                return (
                    <div className="space-y-2">
                        <Label htmlFor={setting.key}>
                            <span dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.label)}}/>
                        </Label>
                        <Input
                            id={setting.key}
                            type="text"
                            value={value}
                            onChange={(e) => setSettings({...settings, [setting.key]: e.target.value})}
                            placeholder={setting.placeholder}
                        />
                    </div>
                );
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5"/>
                        {extension.displayName} Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure the settings for this extension
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {extensionMeta?.settings && extensionMeta.settings.length > 0 ? (
                        extensionMeta.settings.map((setting: any) => (
                            <div key={setting.key}
                                 className="border rounded-lg p-4 hover:border-primary/30 transition-colors">
                                {renderSettingInput(setting)}
                                {setting.description && (
                                    <div className="text-xs text-muted-foreground mt-2 prose prose-sm max-w-none">
                                        <span
                                            dangerouslySetInnerHTML={{__html: renderMarkdownSync(setting.description)}}/>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <Settings2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4"/>
                            <p className="text-muted-foreground">
                                {extensionMeta ? 'This extension has no configurable settings.' : 'Loading settings...'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !extensionMeta?.settings}
                            className="flex-1 shadow-sm hover:shadow-md transition-all duration-200">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Extension README Dialog Component
// Unified Extension Info Dialog with README and CHANGELOG tabs
function ExtensionReadmeDialog({extension, onClose}: {
    extension: Extension;
    onClose: () => void;
}) {
    const [extensionMeta, setExtensionMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingReadme, setLoadingReadme] = useState(true);
    const [loadingChangelog, setLoadingChangelog] = useState(true);

    useEffect(() => {
        const loadExtensionMeta = async () => {
            try {
                setLoading(true);
                setLoadingReadme(true);
                setLoadingChangelog(true);

                // Try to get from local metadata API (which now reads README.md and CHANGELOG.md files)
                const response = await fetch(`/api/extensions/metadata/${extension.name}`);
                if (response.ok) {
                    const meta = await response.json();
                    setExtensionMeta(meta);

                    // Check what we got from local files
                    if (meta.readme) {
                        setLoadingReadme(false);
                    }
                    if (meta.changelog) {
                        setLoadingChangelog(false);
                    }
                }

                // If extension has sourceUrl (from GitHub) and we don't have README/CHANGELOG yet, fetch from GitHub
                if ((extension as any).sourceUrl) {
                    const sourceUrl = (extension as any).sourceUrl;
                    const rawBaseUrl = sourceUrl
                        .replace('github.com', 'raw.githubusercontent.com')
                        .replace(/\/$/, '') + '/main/';

                    // Fetch README if we don't have it
                    if (!extensionMeta?.readme) {
                        try {
                            const readmeResponse = await fetch(rawBaseUrl + 'README.md', {cache: 'no-store'});
                            if (readmeResponse.ok) {
                                const readme = await readmeResponse.text();
                                setExtensionMeta((prev: any) => ({...prev, readme}));
                            }
                        } catch (e) {
                            console.log('No README found online');
                        } finally {
                            setLoadingReadme(false);
                        }
                    }

                    // Fetch CHANGELOG if we don't have it
                    if (!extensionMeta?.changelog) {
                        try {
                            const changelogResponse = await fetch(rawBaseUrl + 'CHANGELOG.md', {cache: 'no-store'});
                            if (changelogResponse.ok) {
                                const changelog = await changelogResponse.text();
                                setExtensionMeta((prev: any) => ({...prev, changelog}));
                            }
                        } catch (e) {
                            console.log('No CHANGELOG found online');
                        } finally {
                            setLoadingChangelog(false);
                        }
                    }
                } else {
                    // No sourceUrl, so we're done trying to load
                    setLoadingReadme(false);
                    setLoadingChangelog(false);
                }
            } catch (error) {
                console.error('Failed to load extension metadata:', error);
                setLoadingReadme(false);
                setLoadingChangelog(false);
            } finally {
                setLoading(false);
            }
        };
        loadExtensionMeta();
    }, [extension]);

    const renderedReadme = extensionMeta?.readme ? renderMarkdownSync(extensionMeta.readme) : '';

    // Parse semantic versioning changelog
    const parseChangelog = (changelog: string): Array<{
        version: string;
        date: string;
        sections: Array<{ title: string; items: string[] }>;
    }> => {
        const versions: Array<{
            version: string;
            date: string;
            sections: Array<{ title: string; items: string[] }>;
        }> = [];

        const versionRegex = /##\s*\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/g;
        const matches = [...changelog.matchAll(versionRegex)];

        matches.forEach((match, index) => {
            const version = match[1];
            const date = match[2];
            const startIndex = match.index! + match[0].length;
            const endIndex = index < matches.length - 1 ? matches[index + 1].index! : changelog.length;
            const content = changelog.substring(startIndex, endIndex);

            const sectionRegex = /###\s*([^\n]+)\n((?:(?!###)[\s\S])*)/g;
            const sectionMatches = [...content.matchAll(sectionRegex)];

            const sections = sectionMatches.map(sMatch => {
                const title = sMatch[1].trim();
                const itemsText = sMatch[2].trim();
                const items = itemsText
                    .split('\n')
                    .filter(line => line.trim().startsWith('-'))
                    .map(line => line.trim().substring(1).trim());
                return {title, items};
            });

            versions.push({version, date, sections});
        });

        return versions;
    };

    const changelogVersions = extensionMeta?.changelog ? parseChangelog(extensionMeta.changelog) : [];
    const hasTimelineFormat = changelogVersions.length > 0;
    const renderedChangelog = extensionMeta?.changelog && !hasTimelineFormat ? renderMarkdownSync(extensionMeta.changelog) : '';

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        <ExtensionIcon extension={extension} size="xlarge"/>
                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{extension.displayName}</DialogTitle>
                            <DialogDescription className="mt-1">
                                by {extension.author} • Version {extension.version}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="readme" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start border-b rounded-none bg-muted/30">
                        <TabsTrigger value="readme"
                                     className="flex items-center gap-2 data-[state=active]:bg-background">
                            README
                            {loadingReadme && <Loader2 className="h-3 w-3 animate-spin"/>}
                        </TabsTrigger>
                        {(loadingChangelog || extensionMeta?.changelog) && (
                            <TabsTrigger value="changelog"
                                         className="flex items-center gap-2 data-[state=active]:bg-background">
                                CHANGELOG
                                {loadingChangelog && <Loader2 className="h-3 w-3 animate-spin"/>}
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4">
                        <TabsContent value="readme" className="mt-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </div>
                            ) : extensionMeta?.readme ? (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{__html: renderedReadme}}
                                />
                            ) : (
                                <div className="text-center py-12">
                                    <Book className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4"/>
                                    <p className="text-muted-foreground">No README available for this extension.</p>
                                </div>
                            )}
                        </TabsContent>

                        {(loadingChangelog || extensionMeta?.changelog) && (
                            <TabsContent value="changelog" className="mt-0">
                                {loadingChangelog ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                    </div>
                                ) : !extensionMeta?.changelog ? (
                                    <div className="text-center py-12">
                                        <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4"/>
                                        <p className="text-muted-foreground">No CHANGELOG available for this
                                            extension.</p>
                                    </div>
                                ) : hasTimelineFormat ? (
                                    <div className="space-y-6">
                                        {changelogVersions.map((versionData, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="shrink-0 w-32">
                                                    <div
                                                        className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-600/40 rounded-lg p-3 text-center shadow-sm">
                                                        <div
                                                            className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                                                            v{versionData.version}
                                                        </div>
                                                        <div
                                                            className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                                            {new Date(versionData.date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="border-l-2 border-yellow-600/30 pl-4 space-y-3">
                                                        {versionData.sections.map((section, sIdx) => (
                                                            <div key={sIdx}>
                                                                <h4 className="font-semibold text-sm mb-1.5">{section.title}</h4>
                                                                <ul className="space-y-1.5">
                                                                    {section.items.map((item, iIdx) => (
                                                                        <li key={iIdx}
                                                                            className="text-sm text-muted-foreground flex items-start gap-2">
                                                                            <span
                                                                                className="text-yellow-600 dark:text-yellow-500 shrink-0">•</span>
                                                                            <span>{item}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{__html: renderedChangelog}}
                                    />
                                )}
                            </TabsContent>
                        )}
                    </div>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
