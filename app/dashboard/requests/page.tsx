'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Role } from '@prisma/client';
import { motion } from 'framer-motion';

// UI Components from shadcn
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    ArrowUpRight,
    AlertTriangle,
    FileText,
    Tag,
    Package,
    Send
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
interface RequestData {
    id: string;
    type: string;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
    project: {
        id: string;
        name: string;
    };
    ChangelogEntry?: {
        id: string;
        title: string;
    } | null;
    ChangelogTag?: {
        id: string;
        targetId: string;
    } | null;
    admin?: {
        id: string;
        name: string | null;
        email: string;
    } | null;
}

export default function RequestsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        // Only staff and admin can access this page
        if (user && user.role === Role.VIEWER) {
            router.push('/dashboard');
            toast({
                title: 'Access Denied',
                description: 'You do not have permission to view this page.',
                variant: 'destructive'
            });
            return;
        }

        async function fetchRequests() {
            try {
                setIsLoading(true);
                const response = await fetch('/api/requests');

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to fetch requests');
                }

                const data = await response.json();
                setRequests(data.requests);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(errorMessage);
                toast({
                    title: 'Error',
                    description: errorMessage,
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        }

        if (user) {
            fetchRequests();
        }
    }, [user, authLoading, router, toast]);

    // Filter requests based on active tab
    const filteredRequests = requests.filter(request => {
        if (activeTab === 'all') return true;
        return request.status.toLowerCase() === activeTab;
    });

    // Get request icon based on type
    const getRequestIcon = (type: string) => {
        switch (type) {
            case 'DELETE_ENTRY':
                return <FileText className="h-5 w-5 text-red-500" />;
            case 'DELETE_TAG':
                return <Tag className="h-5 w-5 text-amber-500" />;
            case 'DELETE_PROJECT':
                return <Package className="h-5 w-5 text-red-600" />;
            case 'ALLOW_PUBLISH':
                return <Send className="h-5 w-5 text-blue-500" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
        }
    };

    // Helper function to get the target name based on request type
    const getTargetName = (request: RequestData) => {
        if (request.type === 'DELETE_ENTRY' && request.ChangelogEntry) {
            return request.ChangelogEntry.title;
        } else if (request.type === 'DELETE_TAG' && request.ChangelogTag) {
            return request.ChangelogTag.targetId;
        } else if (request.type === 'DELETE_PROJECT') {
            return request.project.name;
        } else if (request.type === 'ALLOW_PUBLISH' && request.ChangelogEntry) {
            return request.ChangelogEntry.title;
        }
        return 'Unknown';
    };

    // Helper function to get human-readable request type
    const getReadableType = (type: string) => {
        switch (type) {
            case 'DELETE_ENTRY':
                return 'Delete Entry';
            case 'DELETE_TAG':
                return 'Delete Tag';
            case 'DELETE_PROJECT':
                return 'Delete Project';
            case 'ALLOW_PUBLISH':
                return 'Publish Entry';
            default:
                return type.replace(/_/g, ' ').toLowerCase();
        }
    };

    // Helper function to render status badge
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                    </Badge>
                );
            case 'APPROVED':
                return (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                        <CheckCircle className="mr-1 h-3 w-3" /> Approved
                    </Badge>
                );
            case 'REJECTED':
                return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                        <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
                        {status}
                    </Badge>
                );
        }
    };

    // Navigate to view project details
    const navigateToProject = (projectId: string) => {
        router.push(`/dashboard/projects/${projectId}`);
    };

    // Render admin info if request has been reviewed
    const renderReviewer = (request: RequestData) => {
        if (request.status === 'PENDING' || !request.admin) return null;

        const reviewerName = request.admin.name || request.admin.email;
        const initials = reviewerName
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        return (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                    <span className="text-muted-foreground">Reviewed by </span>
                    <span className="font-medium">{reviewerName}</span>
                    {request.reviewedAt && (
                        <span className="text-muted-foreground text-xs ml-1">
              ({formatDistanceToNow(new Date(request.reviewedAt), { addSuffix: true })})
            </span>
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Changelog Requests</h1>
                        <p className="text-muted-foreground mt-1">Track the status of your submitted requests</p>
                    </div>
                </div>
                <Separator className="my-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-8 w-2/3" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Changelog Requests</h1>
                        <p className="text-muted-foreground mt-1">Track the status of your submitted requests</p>
                    </div>
                </div>
                <Separator className="my-6" />
                <Alert variant="destructive" className="my-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
                <div className="flex justify-center mt-6">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
    const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Changelog Requests</h1>
                    <p className="text-muted-foreground mt-1">Track the status of your submitted requests</p>
                </div>
            </div>

            <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <div className="flex justify-between items-center mb-4">
                    <TabsList className="grid grid-cols-4 md:w-auto">
                        <TabsTrigger value="all" className="px-4">
                            All
                            <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="px-4">
                            Pending
                            {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="px-4">
                            Approved
                            {approvedCount > 0 && <Badge variant="secondary" className="ml-2">{approvedCount}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="px-4">
                            Rejected
                            {rejectedCount > 0 && <Badge variant="secondary" className="ml-2">{rejectedCount}</Badge>}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                    {filteredRequests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16 px-4 bg-muted/30 rounded-lg"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                {activeTab === 'pending' ? (
                                    <Clock className="h-8 w-8 text-muted-foreground" />
                                ) : activeTab === 'approved' ? (
                                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                                ) : activeTab === 'rejected' ? (
                                    <XCircle className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No {activeTab !== 'all' ? activeTab : ''} Requests Found</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                {activeTab === 'pending'
                                    ? "You don't have any pending requests awaiting approval."
                                    : activeTab === 'approved'
                                        ? "You don't have any approved requests yet."
                                        : activeTab === 'rejected'
                                            ? "You don't have any rejected requests."
                                            : "You haven't submitted any requests yet."}
                            </p>
                        </motion.div>
                    ) : (
                        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                            <div className="space-y-4">
                                {filteredRequests.map((request, index) => (
                                    <motion.div
                                        key={request.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-shadow"
                                              style={{
                                                  borderLeftColor: request.status === 'PENDING'
                                                      ? 'rgb(234 179 8)'
                                                      : request.status === 'APPROVED'
                                                          ? 'rgb(22 163 74)'
                                                          : 'rgb(220 38 38)'
                                              }}
                                        >
                                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-md bg-muted p-2">
                                                        {getRequestIcon(request.type)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-lg">
                                                                {getTargetName(request)}
                                                            </CardTitle>
                                                            {renderStatusBadge(request.status)}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {getReadableType(request.type)} in <span className="font-medium">{request.project.name}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {renderReviewer(request)}
                                            </CardContent>

                                            <CardFooter className="pt-0 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-primary"
                                                    onClick={() => navigateToProject(request.project.id)}
                                                >
                                                    View Project
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}