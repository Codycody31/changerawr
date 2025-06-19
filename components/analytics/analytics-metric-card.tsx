'use client';

import {motion} from 'framer-motion';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {TrendingUp, TrendingDown, Minus, type LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';

interface AnalyticsMetricCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    description?: string;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
    format?: 'number' | 'percentage' | 'currency';
    loading?: boolean;
}

export function AnalyticsMetricCard({
                                        title,
                                        value,
                                        icon: Icon,
                                        description,
                                        change,
                                        changeType,
                                        format = 'number',
                                        loading = false
                                    }: AnalyticsMetricCardProps) {
    const formatValue = (val: number) => {
        switch (format) {
            case 'percentage':
                return `${val.toFixed(1)}%`;
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(val);
            default:
                return val.toLocaleString();
        }
    };

    const getChangeIcon = () => {
        switch (changeType) {
            case 'increase':
                return TrendingUp;
            case 'decrease':
                return TrendingDown;
            default:
                return Minus;
        }
    };

    const getChangeColor = () => {
        switch (changeType) {
            case 'increase':
                return 'text-green-600 dark:text-green-400';
            case 'decrease':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-muted-foreground';
        }
    };

    const ChangeIcon = getChangeIcon();

    const cardVariants = {
        initial: {opacity: 0, y: 20},
        animate: {opacity: 1, y: 0},
        transition: {duration: 0.5}
    };

    const valueVariants = {
        initial: {scale: 0.8, opacity: 0},
        animate: {
            scale: 1,
            opacity: 1,
            transition: {delay: 0.2, duration: 0.3}
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <div className="h-4 w-4 bg-muted animate-pulse rounded"/>
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-20 bg-muted animate-pulse rounded mb-1"/>
                    <div className="h-3 w-32 bg-muted animate-pulse rounded"/>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover={{
                scale: 1.02,
                transition: {duration: 0.2}
            }}
        >
            <Card className={cn(
                "relative overflow-hidden",
                "hover:shadow-lg hover:shadow-primary/5 transition-all duration-300",
                "border-l-4 border-l-primary/20 hover:border-l-primary"
            )}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-primary"/>
                </CardHeader>
                <CardContent>
                    <motion.div
                        variants={valueVariants}
                        initial="initial"
                        animate="animate"
                        className="space-y-1"
                    >
                        <div className="text-2xl font-bold tracking-tight">
                            {formatValue(value)}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            {description && (
                                <p className="text-muted-foreground">{description}</p>
                            )}

                            {change !== undefined && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "gap-1 text-xs font-normal",
                                        getChangeColor()
                                    )}
                                >
                                    <ChangeIcon className="h-3 w-3"/>
                                    {Math.abs(change).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                    </motion.div>
                </CardContent>

                {/* Subtle background gradient */}
                <div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"/>
            </Card>
        </motion.div>
    );
}