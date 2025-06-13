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
import {ExternalLink, Link as LinkIcon} from 'lucide-react';
import Link from 'next/link';
import type {ReferrerAnalytics} from '@/lib/types/analytics';

interface ReferrerAnalyticsTableProps {
    referrers: ReferrerAnalytics[];
}

// Get a nice icon/emoji for different referrer types
const getReferrerIcon = (referrer: string): string => {
    if (referrer === 'Direct' || referrer === '(direct)') return '🔗';
    if (referrer.includes('google')) return '🔍';
    if (referrer.includes('twitter') || referrer.includes('x.com')) return '🐦';
    if (referrer.includes('facebook')) return '📘';
    if (referrer.includes('linkedin')) return '💼';
    if (referrer.includes('reddit')) return '🤖';
    if (referrer.includes('github')) return '⚡';
    if (referrer.includes('discord')) return '💬';
    if (referrer.includes('slack')) return '💌';
    if (referrer.includes('email') || referrer.includes('mailto')) return '📧';
    return '🌐';
};

// Clean up referrer display name
const cleanReferrerName = (referrer: string): string => {
    if (referrer === 'Direct' || referrer === '(direct)') return 'Direct Traffic';

    try {
        const url = new URL(referrer);
        const hostname = url.hostname.replace('www.', '');

        // Special cases for better display
        const displayNames: Record<string, string> = {
            'google.com': 'Google Search',
            'google.co.uk': 'Google Search (UK)',
            'bing.com': 'Bing Search',
            'duckduckgo.com': 'DuckDuckGo',
            'twitter.com': 'Twitter',
            'x.com': 'X (Twitter)',
            'facebook.com': 'Facebook',
            'linkedin.com': 'LinkedIn',
            'reddit.com': 'Reddit',
            'github.com': 'GitHub',
            'stackoverflow.com': 'Stack Overflow',
            'discord.com': 'Discord',
            'slack.com': 'Slack',
            'medium.com': 'Medium',
            'dev.to': 'DEV Community',
            'hashnode.com': 'Hashnode',
            'youtube.com': 'YouTube',
        };

        return displayNames[hostname] || hostname;
    } catch {
        return referrer;
    }
};

// Determine if referrer is external and can be linked to
const isExternalReferrer = (referrer: string): boolean => {
    return referrer !== 'Direct' &&
        referrer !== '(direct)' &&
        referrer.startsWith('http');
};

export function ReferrerAnalyticsTable({referrers}: ReferrerAnalyticsTableProps) {
    // Calculate percentages
    const totalViews = referrers.reduce((sum, referrer) => sum + referrer.count, 0);
    const referrersWithPercentage = referrers.map(referrer => ({
        ...referrer,
        percentage: totalViews > 0 ? (referrer.count / totalViews) * 100 : 0,
        displayName: cleanReferrerName(referrer.referrer),
        icon: getReferrerIcon(referrer.referrer),
        isExternal: isExternalReferrer(referrer.referrer)
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
                        <LinkIcon className="h-5 w-5"/>
                        Top Referrers
                    </CardTitle>
                    <CardDescription>
                        Where your visitors are coming from
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {referrersWithPercentage.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <p>No referrer data available</p>
                            <p className="text-sm mt-2">Traffic sources will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Visits</TableHead>
                                        <TableHead className="text-right">Share</TableHead>
                                        <TableHead className="w-24">Distribution</TableHead>
                                        <TableHead className="w-20">Link</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referrersWithPercentage.map((referrer, index) => (
                                        <motion.tr
                                            key={referrer.referrer}
                                            variants={rowVariants}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{referrer.icon}</span>
                                                    <div>
                                                        <div className="font-medium">{referrer.displayName}</div>
                                                        {index === 0 && (
                                                            <Badge variant="secondary" className="text-xs mt-1">
                                                                Top Source
                                                            </Badge>
                                                        )}
                                                        {referrer.referrer === 'Direct' && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Bookmarks, URL bar, apps
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {referrer.count.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-mono">
                                                    {referrer.percentage.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={referrer.percentage}
                                                        className="h-2"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {referrer.isExternal ? (
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link
                                                            href={referrer.referrer}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <ExternalLink className="h-3 w-3"/>
                                                            <span className="sr-only">Visit source</span>
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <div className="h-8 w-8 flex items-center justify-center">
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>

                            {totalViews > 0 && (
                                <div
                                    className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                                    <span>Total Referral Traffic</span>
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