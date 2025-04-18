// app/dashboard/projects/[projectId]/integrations/emails/subscribers/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CSVLink } from 'react-csv';

// UI Components
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';

// Icons
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    UserIcon,
    UsersIcon,
    MailIcon,
    BellIcon,
    BellOffIcon,
    CalendarIcon,
    EditIcon,
    UploadIcon,
    DownloadIcon,
    SearchIcon,
    FilterIcon,
    CheckIcon,
    RefreshCwIcon,
    ChevronDownIcon,
    UserPlusIcon,
    ClipboardIcon,
    SendIcon,
    InfoIcon,
    AlertCircleIcon,
    CheckCircleIcon,
    XIcon,
} from 'lucide-react';

// Form schema
const subscriberSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().optional(),
    subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES'),
});

// Bulk import schema
const bulkImportSchema = z.object({
    emails: z.string().min(1, 'Please enter at least one email'),
    subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES'),
});

// Filter schema
const filterSchema = z.object({
    searchTerm: z.string().optional(),
    subscriptionType: z.enum(['ALL', 'ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL'),
    sortBy: z.enum(['NEWEST', 'OLDEST', 'EMAIL_ASC', 'EMAIL_DESC']).default('NEWEST'),
    onlyActive: z.boolean().default(true),
});

type SubscriberFormValues = z.infer<typeof subscriberSchema>;
type BulkImportFormValues = z.infer<typeof bulkImportSchema>;
type FilterFormValues = z.infer<typeof filterSchema>;

type Subscriber = {
    id: string;
    email: string;
    name: string | null;
    subscriptionType: string;
    createdAt: string;
    lastEmailSentAt: string | null;
    isActive: boolean;
};

export default function SubscribersPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const projectId = params.projectId as string;

    // State
    const [selectedSubscriber, setSelectedSubscriber] = useState<string | null>(null);
    const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editSubscriber, setEditSubscriber] = useState<Subscriber | null>(null);
    const [activeTab, setActiveTab] = useState<string>("add");
    const [currentPage, setCurrentPage] = useState(1);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [importResults, setImportResults] = useState<{
        total: number;
        successful: number;
        failed: number;
        errors: string[];
    } | null>(null);

    // Forms
    const form = useForm<SubscriberFormValues>({
        resolver: zodResolver(subscriberSchema),
        defaultValues: {
            email: '',
            name: '',
            subscriptionType: 'ALL_UPDATES',
        },
    });

    const bulkImportForm = useForm<BulkImportFormValues>({
        resolver: zodResolver(bulkImportSchema),
        defaultValues: {
            emails: '',
            subscriptionType: 'ALL_UPDATES',
        },
    });

    const editForm = useForm<SubscriberFormValues>({
        resolver: zodResolver(subscriberSchema),
        defaultValues: {
            email: '',
            name: '',
            subscriptionType: 'ALL_UPDATES',
        },
    });

    const filterForm = useForm<FilterFormValues>({
        resolver: zodResolver(filterSchema),
        defaultValues: {
            searchTerm: '',
            subscriptionType: 'ALL',
            sortBy: 'NEWEST',
            onlyActive: true,
        },
    });

    // Initialize edit form when subscriber changes
    useEffect(() => {
        if (editSubscriber) {
            editForm.reset({
                email: editSubscriber.email,
                name: editSubscriber.name || '',
                subscriptionType: editSubscriber.subscriptionType as any,
            });
        }
    }, [editSubscriber, editForm]);

    // Extract filter values
    const filterValues = filterForm.watch();

    // Fetch project info
    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project');
            return response.json();
        },
    });

    // Fetch subscribers with filters
    const { data: subscribersData, isLoading, refetch } = useQuery({
        queryKey: ['subscribers', projectId, filterValues, currentPage],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.append('projectId', projectId);
            searchParams.append('page', currentPage.toString());

            if (filterValues.searchTerm) {
                searchParams.append('search', filterValues.searchTerm);
            }

            if (filterValues.subscriptionType !== 'ALL') {
                searchParams.append('type', filterValues.subscriptionType);
            }

            searchParams.append('sort', filterValues.sortBy);
            searchParams.append('active', filterValues.onlyActive.toString());

            const response = await fetch(`/api/subscribers?${searchParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch subscribers');
            return response.json();
        },
    });

    // Reset selected subscribers when subscribers list changes
    useEffect(() => {
        setSelectedSubscribers([]);
        setIsSelectAll(false);
    }, [subscribersData]);

    // Add subscriber mutation
    const addSubscriber = useMutation({
        mutationFn: async (data: SubscriberFormValues) => {
            const response = await fetch('/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    projectId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Added',
                description: 'The subscriber has been added successfully.',
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['subscribers', projectId] });
            form.reset();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Update subscriber mutation
    const updateSubscriber = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: SubscriberFormValues }) => {
            const response = await fetch(`/api/subscribers/${id}?projectId=${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Updated',
                description: 'The subscriber has been updated successfully.',
                variant: 'success',
            });
            setIsEditDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['subscribers', projectId] });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Delete subscriber mutation
    const deleteSubscriber = useMutation({
        mutationFn: async (subscriberId: string) => {
            const response = await fetch(`/api/subscribers/${subscriberId}?projectId=${projectId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Removed',
                description: 'The subscriber has been removed successfully.',
                variant: 'success',
            });
            setIsDeleteDialogOpen(false);
            setSelectedSubscriber(null);
            queryClient.invalidateQueries({ queryKey: ['subscribers', projectId] });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Bulk delete mutation
    const bulkDeleteSubscribers = useMutation({
        mutationFn: async (subscriberIds: string[]) => {
            const promises = subscriberIds.map(id =>
                fetch(`/api/subscribers/${id}?projectId=${projectId}`, {
                    method: 'DELETE',
                })
            );

            const results = await Promise.allSettled(promises);
            const failedCount = results.filter(result => result.status === 'rejected').length;

            if (failedCount > 0) {
                throw new Error(`Failed to delete ${failedCount} subscribers`);
            }

            return { success: true };
        },
        onSuccess: () => {
            toast({
                title: 'Subscribers Removed',
                description: `${selectedSubscribers.length} subscribers have been removed successfully.`,
                variant: 'success',
            });
            setIsBulkDeleteDialogOpen(false);
            setSelectedSubscribers([]);
            setIsSelectAll(false);
            queryClient.invalidateQueries({ queryKey: ['subscribers', projectId] });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Bulk import mutation
    const bulkImportSubscribers = useMutation({
        mutationFn: async (data: BulkImportFormValues) => {
            setIsImporting(true);
            setImportProgress(0);
            setImportResults(null);

            const emails = data.emails
                .split(/[\n,;]/)
                .map(email => email.trim())
                .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

            const total = emails.length;
            let successful = 0;
            let failed = 0;
            const errors: string[] = [];

            // Process in batches of 10
            const batchSize = 10;
            for (let i = 0; i < emails.length; i += batchSize) {
                const batch = emails.slice(i, i + batchSize);
                const promises = batch.map(async (email) => {
                    try {
                        const response = await fetch('/api/subscribers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email,
                                projectId,
                                subscriptionType: data.subscriptionType,
                            }),
                        });

                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to add subscriber');
                        }

                        successful++;
                    } catch (error) {
                        failed++;
                        errors.push(`${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                });

                await Promise.all(promises);
                setImportProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
            }

            return { total, successful, failed, errors };
        },
        onSuccess: (data) => {
            setImportResults(data);
            setIsImporting(false);

            if (data.failed === 0) {
                toast({
                    title: 'Import Successful',
                    description: `Successfully imported ${data.successful} subscribers.`,
                    variant: 'success',
                });
            } else {
                toast({
                    title: 'Import Completed with Errors',
                    description: `Imported ${data.successful} of ${data.total} subscribers. ${data.failed} failed.`,
                    variant: 'warning',
                });
            }

            queryClient.invalidateQueries({ queryKey: ['subscribers', projectId] });
        },
        onError: (error) => {
            setIsImporting(false);
            toast({
                title: 'Import Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Form submissions
    const onSubmit = (values: SubscriberFormValues) => {
        addSubscriber.mutate(values);
    };

    const onEditSubmit = (values: SubscriberFormValues) => {
        if (editSubscriber) {
            updateSubscriber.mutate({ id: editSubscriber.id, data: values });
        }
    };

    const onBulkImportSubmit = (values: BulkImportFormValues) => {
        bulkImportSubscribers.mutate(values);
    };

    const onFilterSubmit = () => {
        // This will trigger a refetch with the new filter values
        refetch();
    };

    // Event handlers
    const handleDeleteClick = (subscriberId: string) => {
        setSelectedSubscriber(subscriberId);
        setIsDeleteDialogOpen(true);
    };

    const handleEditClick = (subscriber: Subscriber) => {
        setEditSubscriber(subscriber);
        setIsEditDialogOpen(true);
    };

    const handleBulkDeleteClick = () => {
        if (selectedSubscribers.length === 0) {
            toast({
                title: 'No Subscribers Selected',
                description: 'Please select at least one subscriber to delete.',
                variant: 'warning',
            });
            return;
        }

        setIsBulkDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedSubscriber) {
            deleteSubscriber.mutate(selectedSubscriber);
        }
    };

    const handleConfirmBulkDelete = () => {
        if (selectedSubscribers.length > 0) {
            bulkDeleteSubscribers.mutate(selectedSubscribers);
        }
    };

    const handleCheckboxChange = (subscriberId: string) => {
        setSelectedSubscribers(prev =>
            prev.includes(subscriberId)
                ? prev.filter(id => id !== subscriberId)
                : [...prev, subscriberId]
        );
    };

    const handleSelectAllChange = () => {
        if (isSelectAll) {
            setSelectedSubscribers([]);
        } else {
            const allIds = subscribersData?.subscribers?.map((s: Subscriber) => s.id) || [];
            setSelectedSubscribers(allIds);
        }
        setIsSelectAll(!isSelectAll);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleCopyEmails = () => {
        if (!subscribersData?.subscribers?.length) return;

        const emails = selectedSubscribers.length > 0
            ? subscribersData.subscribers
                .filter((s: Subscriber) => selectedSubscribers.includes(s.id))
                .map((s: Subscriber) => s.email)
            : subscribersData.subscribers.map((s: Subscriber) => s.email);

        navigator.clipboard.writeText(emails.join(', '))
            .then(() => {
                toast({
                    title: 'Emails Copied',
                    description: `${emails.length} email addresses copied to clipboard.`,
                    variant: 'success',
                });
            })
            .catch(() => {
                toast({
                    title: 'Copy Failed',
                    description: 'Failed to copy emails to clipboard.',
                    variant: 'destructive',
                });
            });
    };

    // Helper functions
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSubscriptionTypeLabel = (type: string) => {
        switch (type) {
            case 'ALL_UPDATES':
                return 'All Updates';
            case 'MAJOR_ONLY':
                return 'Major Updates Only';
            case 'DIGEST_ONLY':
                return 'Digest Only';
            default:
                return type;
        }
    };

    const getSubscriptionTypeIcon = (type: string) => {
        switch (type) {
            case 'ALL_UPDATES':
                return <BellIcon className="h-3 w-3 mr-1" />;
            case 'MAJOR_ONLY':
                return <BellOffIcon className="h-3 w-3 mr-1" />;
            case 'DIGEST_ONLY':
                return <CalendarIcon className="h-3 w-3 mr-1" />;
            default:
                return null;
        }
    };

    const getCSVData = () => {
        if (!subscribersData?.subscribers) return [];

        const subscribers = selectedSubscribers.length > 0
            ? subscribersData.subscribers.filter((s: Subscriber) => selectedSubscribers.includes(s.id))
            : subscribersData.subscribers;

        return subscribers.map((s: Subscriber) => ({
            Email: s.email,
            Name: s.name || '',
            'Subscription Type': getSubscriptionTypeLabel(s.subscriptionType),
            'Subscribed On': formatDate(s.createdAt),
            'Last Email': s.lastEmailSentAt ? formatDate(s.lastEmailSentAt) : 'Never',
            'Active': s.isActive ? 'Yes' : 'No',
        }));
    };

    return (
        <div className="container max-w-4xl mx-auto py-6">
            <div className="flex items-center mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => router.push(`/dashboard/projects/${projectId}/integrations/email`)}
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Email Settings
                </Button>
                <h1 className="text-2xl font-bold ml-4">Subscriber Management</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="mb-8"
                >
                    <TabsList className="w-full">
                        <TabsTrigger value="add" className="flex-1">
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            Add Subscriber
                        </TabsTrigger>
                        <TabsTrigger value="import" className="flex-1">
                            <UploadIcon className="h-4 w-4 mr-2" />
                            Bulk Import
                        </TabsTrigger>
                        <TabsTrigger value="filter" className="flex-1">
                            <FilterIcon className="h-4 w-4 mr-2" />
                            Filters
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="add" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="user@example.com" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Name (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John Doe" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="subscriptionType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subscription Type</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select subscription type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ALL_UPDATES">
                                                                <div className="flex items-center">
                                                                    <BellIcon className="h-4 w-4 mr-2 text-primary" />
                                                                    All Updates
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="MAJOR_ONLY">
                                                                <div className="flex items-center">
                                                                    <BellOffIcon className="h-4 w-4 mr-2 text-amber-500" />
                                                                    Major Updates Only
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="DIGEST_ONLY">
                                                                <div className="flex items-center">
                                                                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />
                                                                    Digest Only
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Determines which types of updates the subscriber will receive
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                disabled={addSubscriber.isPending}
                                                className="w-full sm:w-auto"
                                            >
                                                {addSubscriber.isPending ? (
                                                    <>
                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlusIcon className="mr-2 h-4 w-4" />
                                                        Add Subscriber
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="import" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <Form {...bulkImportForm}>
                                    <form onSubmit={bulkImportForm.handleSubmit(onBulkImportSubmit)} className="space-y-4">
                                        <FormField
                                            control={bulkImportForm.control}
                                            name="emails"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Addresses</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Enter email addresses, one per line or comma/semicolon separated"
                                                            className="h-40"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Enter multiple email addresses separated by commas, semicolons, or new lines
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={bulkImportForm.control}
                                            name="subscriptionType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subscription Type</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select subscription type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ALL_UPDATES">
                                                                <div className="flex items-center">
                                                                    <BellIcon className="h-4 w-4 mr-2 text-primary" />
                                                                    All Updates
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="MAJOR_ONLY">
                                                                <div className="flex items-center">
                                                                    <BellOffIcon className="h-4 w-4 mr-2 text-amber-500" />
                                                                    Major Updates Only
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="DIGEST_ONLY">
                                                                <div className="flex items-center">
                                                                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />
                                                                    Digest Only
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Apply this subscription type to all imported subscribers
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {isImporting && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Importing...</span>
                                                    <span>{importProgress}%</span>
                                                </div>
                                                <Progress value={importProgress} />
                                            </div>
                                        )}

                                        {importResults && (
                                            <Alert variant={importResults.failed > 0 ? "warning" : "success"}>
                                                <div className="flex items-start">
                                                    {importResults.failed > 0 ? (
                                                        <AlertCircleIcon className="h-5 w-5 mr-2 mt-0.5" />
                                                    ) : (
                                                        <CheckCircleIcon className="h-5 w-5 mr-2 mt