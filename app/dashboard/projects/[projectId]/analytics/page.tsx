'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'next/navigation';
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
    FileText,
    Download,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import {AnalyticsChart} from '@/components/analytics/analytics-chart';
import {AnalyticsMetricCard} from '@/components/analytics/analytics-metric-card';
import {CountryAnalyticsTable} from '@/components/analytics/country-analytics-table';
import {EntryAnalyticsTable} from '@/components/analytics/entry-analytics-table';
import {ReferrerAnalyticsTable} from '@/components/analytics/referrer-analytics-table';
import type {AnalyticsPeriod, ProjectAnalyticsData} from '@/lib/types/analytics';

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

export default function ProjectAnalyticsPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('30d');

    const {
        data: analyticsData,
        isLoading,
        error,
        refetch,
        isRefetching
    } = useQuery<{ success: boolean; data: ProjectAnalyticsData }>({
        queryKey: ['project-analytics', projectId, selectedPeriod],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/analytics?period=${selectedPeriod}`);
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            return response.json();
        },
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const handleExport = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/analytics/export?period=${selectedPeriod}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-${projectId}-${selectedPeriod}.csv`;
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
                                <BarChart4 className="h-12 w-12 mx-auto mb-4"/>
                                <h3 className="text-lg font-semibold">Failed to Load Analytics</h3>
                                <p className="text-muted-foreground">
                                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                                </p>
                            </div>
                            <Button onClick={() => refetch()} variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2"/>
                                Try Again
                            </Button>
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
                    <Button variant="ghost" size="sm" asChild>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BarChart4 className="h-8 w-8 text-primary"/>
                            Analytics
                        </h1>
                        {data && (
                            <p className="text-muted-foreground">
                                {data.projectName} • {data.period.toUpperCase()} Overview
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
                    {/* Metrics Overview */}
                    <motion.div variants={fadeIn} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <AnalyticsMetricCard
                            title="Total Views"
                            value={data.totalViews}
                            icon={Eye}
                            description="Page and entry views"
                        />
                        <AnalyticsMetricCard
                            title="Unique Visitors"
                            value={data.uniqueVisitors}
                            icon={Users}
                            description="Based on unique sessions"
                        />
                        <AnalyticsMetricCard
                            title="Countries"
                            value={data.topCountries.length}
                            icon={Globe}
                            description="Geographic reach"
                        />
                        <AnalyticsMetricCard
                            title="Top Entries"
                            value={data.topEntries.length}
                            icon={FileText}
                            description="Popular changelog entries"
                        />
                    </motion.div>

                    {/* Views Chart */}
                    <motion.div variants={fadeIn}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5"/>
                                    Views Over Time
                                </CardTitle>
                                <CardDescription>
                                    Daily views and unique visitors for the selected period
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AnalyticsChart data={data.dailyViews}/>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Data Tables */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <motion.div variants={fadeIn}>
                            <CountryAnalyticsTable countries={data.topCountries}/>
                        </motion.div>
                        <motion.div variants={fadeIn}>
                            <ReferrerAnalyticsTable referrers={data.topReferrers}/>
                        </motion.div>
                    </div>

                    {/* Top Entries */}
                    <motion.div variants={fadeIn}>
                        <EntryAnalyticsTable entries={data.topEntries} projectId={projectId}/>
                    </motion.div>
                </motion.div>
            ) : null}
        </div>
    );
}