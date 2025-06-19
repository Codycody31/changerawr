// app/dashboard/admin/analytics/page.tsx
'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {
    BarChart4,
    Eye,
    Users,
    Globe,
    Building2,
    Download,
    RefreshCw,
    TrendingUp,
    Shield,
    Activity
} from 'lucide-react';
import {AnalyticsChart} from '@/components/analytics/analytics-chart';
import {AnalyticsMetricCard} from '@/components/analytics/analytics-metric-card';
import {CountryAnalyticsTable} from '@/components/analytics/country-analytics-table';
import {ReferrerAnalyticsTable} from '@/components/analytics/referrer-analytics-table';
import {ProjectAnalyticsTable} from '@/components/analytics/project-analytics-table';
import type {AnalyticsPeriod, SystemAnalyticsData} from '@/lib/types/analytics';

const fadeIn = {
    initial: {opacity: 0, y: 20},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.5}
};

const staggerChildren = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function AdminAnalyticsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('30d');

    const {
        data: analyticsData,
        isLoading,
        error,
        refetch,
        isRefetching
    } = useQuery<{ success: boolean; data: SystemAnalyticsData }>({
        queryKey: ['admin-analytics', selectedPeriod],
        queryFn: async () => {
            const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch analytics data');
            }
            return response.json();
        },
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const handleExport = async () => {
        try {
            const response = await fetch(`/api/admin/analytics/export?period=${selectedPeriod}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-analytics-${selectedPeriod}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Failed to export analytics:', error);
        }
    };

    if (error) {
        return (
            <div className="container max-w-7xl space-y-6 p-4 md:p-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="text-destructive">
                                {error.message.includes('not authorized') ? (
                                    <>
                                        <Shield className="h-12 w-12 mx-auto mb-4"/>
                                        <h3 className="text-lg font-semibold">Access Denied</h3>
                                        <p className="text-muted-foreground">
                                            You need admin privileges to view system analytics
                                        </p>
                                    </>
                                ) : error.message.includes('disabled') ? (
                                    <>
                                        <Activity className="h-12 w-12 mx-auto mb-4"/>
                                        <h3 className="text-lg font-semibold">Analytics Disabled</h3>
                                        <p className="text-muted-foreground">
                                            Analytics are currently disabled in system settings
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <BarChart4 className="h-12 w-12 mx-auto mb-4"/>
                                        <h3 className="text-lg font-semibold">Failed to Load Analytics</h3>
                                        <p className="text-muted-foreground">
                                            {error instanceof Error ? error.message : 'An unexpected error occurred'}
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2 justify-center">
                                <Button onClick={() => refetch()} variant="outline">
                                    <RefreshCw className="h-4 w-4 mr-2"/>
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const data = analyticsData?.data;

    return (
        <div className="container max-w-7xl space-y-6 p-4 md:p-8">
            {/* Header */}
            <motion.div
                variants={fadeIn}
                initial="initial"
                animate="animate"
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BarChart4 className="h-8 w-8 text-primary"/>
                            System Analytics
                        </h1>
                        {data && (
                            <p className="text-muted-foreground">
                                Platform-wide overview • {data.period.toUpperCase()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={selectedPeriod} onValueChange={(value: AnalyticsPeriod) => setSelectedPeriod(value)}>
                        <SelectTrigger className="w-32">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={isLoading || !data}
                    >
                        <Download className="h-4 w-4 mr-2"/>
                        Export
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`}/>
                        Refresh
                    </Button>
                </div>
            </motion.div>

            {isLoading ? (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({length: 4}).map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-4 w-24"/>
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-16 mb-2"/>
                                    <Skeleton className="h-3 w-20"/>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32"/>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-80 w-full"/>
                        </CardContent>
                    </Card>
                </div>
            ) : data ? (
                <motion.div
                    variants={staggerChildren}
                    initial="initial"
                    animate="animate"
                    className="space-y-6"
                >
                    {/* System Metrics Overview */}
                    <motion.div variants={fadeIn} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <AnalyticsMetricCard
                            title="Total Views"
                            value={data.totalViews}
                            icon={Eye}
                            description="System-wide page views"
                        />
                        <AnalyticsMetricCard
                            title="Unique Visitors"
                            value={data.uniqueVisitors}
                            icon={Users}
                            description="Across all projects"
                        />
                        <AnalyticsMetricCard
                            title="Active Projects"
                            value={data.topProjects.length}
                            icon={Building2}
                            description="Projects with views"
                        />
                        <AnalyticsMetricCard
                            title="Countries"
                            value={data.topCountries.length}
                            icon={Globe}
                            description="Global reach"
                        />
                    </motion.div>

                    {/* System Views Chart */}
                    <motion.div variants={fadeIn}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5"/>
                                    System-wide Views Over Time
                                </CardTitle>
                                <CardDescription>
                                    Combined views and visitors across all public projects
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AnalyticsChart data={data.dailyViews}/>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Top Projects Table */}
                    <motion.div variants={fadeIn}>
                        <ProjectAnalyticsTable projects={data.topProjects}/>
                    </motion.div>

                    {/* Geographic and Referrer Data */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <motion.div variants={fadeIn}>
                            <CountryAnalyticsTable countries={data.topCountries}/>
                        </motion.div>
                        <motion.div variants={fadeIn}>
                            <ReferrerAnalyticsTable referrers={data.topReferrers}/>
                        </motion.div>
                    </div>
                </motion.div>
            ) : null}
        </div>
    );
}