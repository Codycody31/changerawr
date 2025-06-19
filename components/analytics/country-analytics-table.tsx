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
import {Globe} from 'lucide-react';
import type {CountryAnalytics} from '@/lib/types/analytics';

interface CountryAnalyticsTableProps {
    countries: CountryAnalytics[];
}

// Country code to flag emoji mapping
const getCountryFlag = (countryName: string): string => {
    const countryFlags: Record<string, string> = {
        'United States': '🇺🇸',
        'United Kingdom': '🇬🇧',
        'Canada': '🇨🇦',
        'Germany': '🇩🇪',
        'France': '🇫🇷',
        'Japan': '🇯🇵',
        'Australia': '🇦🇺',
        'Netherlands': '🇳🇱',
        'Brazil': '🇧🇷',
        'India': '🇮🇳',
        'China': '🇨🇳',
        'Russia': '🇷🇺',
        'Spain': '🇪🇸',
        'Italy': '🇮🇹',
        'South Korea': '🇰🇷',
        'Mexico': '🇲🇽',
        'Poland': '🇵🇱',
        'Sweden': '🇸🇪',
        'Norway': '🇳🇴',
        'Denmark': '🇩🇰',
        'Finland': '🇫🇮',
        'Switzerland': '🇨🇭',
        'Austria': '🇦🇹',
        'Belgium': '🇧🇪',
        'Ireland': '🇮🇪',
        'Portugal': '🇵🇹',
        'Czech Republic': '🇨🇿',
        'Hungary': '🇭🇺',
        'Romania': '🇷🇴',
        'Bulgaria': '🇧🇬',
        'Croatia': '🇭🇷',
        'Slovakia': '🇸🇰',
        'Slovenia': '🇸🇮',
        'Estonia': '🇪🇪',
        'Latvia': '🇱🇻',
        'Lithuania': '🇱🇹',
        'Local': '🏠',
        'Unknown': '🌍',
    };

    return countryFlags[countryName] || '🌍';
};

export function CountryAnalyticsTable({countries}: CountryAnalyticsTableProps) {
    // Calculate percentages
    const totalViews = countries.reduce((sum, country) => sum + country.count, 0);
    const countriesWithPercentage = countries.map(country => ({
        ...country,
        percentage: totalViews > 0 ? (country.count / totalViews) * 100 : 0
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
                        <Globe className="h-5 w-5"/>
                        Top Countries
                    </CardTitle>
                    <CardDescription>
                        Geographic distribution of your audience
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {countriesWithPercentage.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <p>No geographic data available</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Country</TableHead>
                                        <TableHead className="text-right">Views</TableHead>
                                        <TableHead className="text-right">Share</TableHead>
                                        <TableHead className="w-24">Distribution</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {countriesWithPercentage.map((country, index) => (
                                        <motion.tr
                                            key={country.country}
                                            variants={rowVariants}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="flex items-center gap-3">
                                                <span className="text-lg">{getCountryFlag(country.country)}</span>
                                                <div>
                                                    <div className="font-medium">{country.country}</div>
                                                    {index === 0 && (
                                                        <Badge variant="secondary" className="text-xs mt-1">
                                                            Top Market
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {country.count.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-mono">
                                                    {country.percentage.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={country.percentage}
                                                        className="h-2"
                                                    />
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>

                            {totalViews > 0 && (
                                <div
                                    className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                                    <span>Total Views</span>
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