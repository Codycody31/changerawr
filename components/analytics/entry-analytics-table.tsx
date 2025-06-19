'use client';

import {motion} from 'framer-motion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {Button} from '@/components/ui/button';
import {FileText, ExternalLink, Eye, Users} from 'lucide-react';
import Link from 'next/link';
import type {EntryAnalytics} from '@/lib/types/analytics';

interface EntryAnalyticsTableProps {
    entries: EntryAnalytics[];
    projectId: string;
}

export function EntryAnalyticsTable({entries, projectId}: EntryAnalyticsTableProps) {
    // Calculate percentages based on total views
    const totalViews = entries.reduce((sum, entry) => sum + entry.views, 0);
    const entriesWithPercentage = entries.map(entry => ({
        ...entry,
        percentage: totalViews > 0 ? (entry.views / totalViews) * 100 : 0
    }));

    const containerVariants = {
        initial: {opacity: 0, y: 20},
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.05
            }
        }
    };

    const rowVariants = {
        initial: {opacity: 0, x: -20},
        animate: {opacity: 1, x: 0}
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5"/>
                        Top Changelog Entries
                    </CardTitle>
                    <CardDescription>
                        Most viewed changelog entries in the selected period
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {entriesWithPercentage.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <p>No entry data available</p>
                            <p className="text-sm mt-2">Entry views will appear here once tracked</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Entry</TableHead>
                                        <TableHead className="text-center">Views</TableHead>
                                        <TableHead className="text-center">Visitors</TableHead>
                                        <TableHead className="text-center">Share</TableHead>
                                        <TableHead className="w-24">Performance</TableHead>
                                        <TableHead className="w-20">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entriesWithPercentage.map((entry, index) => (
                                        <motion.tr
                                            key={entry.entryId}
                                            variants={rowVariants}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="max-w-md">
                                                <div className="space-y-1">
                                                    <div className="font-medium truncate pr-4" title={entry.title}>
                                                        {entry.title}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {index === 0 && (
                                                            <Badge variant="default" className="text-xs">
                                                                🔥 Most Popular
                                                            </Badge>
                                                        )}
                                                        {index < 3 && index > 0 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Top {index + 1}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Eye className="h-3 w-3 text-muted-foreground"/>
                                                    <span className="font-mono font-medium">
                            {entry.views.toLocaleString()}
                          </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Users className="h-3 w-3 text-muted-foreground"/>
                                                    <span className="font-mono font-medium">
                            {entry.uniqueVisitors.toLocaleString()}
                          </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-mono">
                                                    {entry.percentage.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={entry.percentage}
                                                        className="h-2"
                                                    />
                                                    <div className="text-xs text-muted-foreground">
                                                        {((entry.uniqueVisitors / entry.views) * 100).toFixed(0)}%
                                                        unique
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link
                                                        href={`/changelog/${projectId}#${entry.entryId}`}
                                                        target="_blank"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ExternalLink className="h-3 w-3"/>
                                                        <span className="sr-only">View entry</span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>

                            {totalViews > 0 && (
                                <div
                                    className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                                    <span>Total Entry Views</span>
                                    <span className="font-mono font-medium">
                    {totalViews.toLocaleString()}
                  </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}