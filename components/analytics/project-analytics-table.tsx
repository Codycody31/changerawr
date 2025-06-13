'use client';

import { motion } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, ExternalLink, Eye, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { ProjectAnalyticsSummary } from '@/lib/types/analytics';

interface ProjectAnalyticsTableProps {
    projects: ProjectAnalyticsSummary[];
}

export function ProjectAnalyticsTable({ projects }: ProjectAnalyticsTableProps) {
    // Calculate percentages based on total views
    const totalViews = projects.reduce((sum, project) => sum + project.views, 0);
    const projectsWithPercentage = projects.map(project => ({
        ...project,
        percentage: totalViews > 0 ? (project.views / totalViews) * 100 : 0
    }));

    const containerVariants = {
        initial: { opacity: 0, y: 20 },
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
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 }
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
                        <Building2 className="h-5 w-5" />
                        Top Projects
                    </CardTitle>
                    <CardDescription>
                        Most popular projects by views and engagement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projectsWithPercentage.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No project data available</p>
                            <p className="text-sm mt-2">Project analytics will appear here once tracked</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead className="text-center">Views</TableHead>
                                        <TableHead className="text-center">Visitors</TableHead>
                                        <TableHead className="text-center">Share</TableHead>
                                        <TableHead className="w-24">Performance</TableHead>
                                        <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectsWithPercentage.map((project, index) => (
                                        <motion.tr
                                            key={project.projectId}
                                            variants={rowVariants}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-medium border-2 border-primary/20">
                                                        <AvatarFallback className="text-xs bg-transparent">
                                                            {project.projectName.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{project.projectName}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {index === 0 && (
                                                                <Badge variant="default" className="text-xs">
                                                                    🏆 Top Performer
                                                                </Badge>
                                                            )}
                                                            {index < 3 && index > 0 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Top {index + 1}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-mono font-medium">
                            {project.views.toLocaleString()}
                          </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Users className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-mono font-medium">
                            {project.uniqueVisitors.toLocaleString()}
                          </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-mono">
                                                    {project.percentage.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={project.percentage}
                                                        className="h-2"
                                                    />
                                                    <div className="text-xs text-muted-foreground">
                                                        {project.views > 0 ? ((project.uniqueVisitors / project.views) * 100).toFixed(0) : 0}% unique
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link
                                                            href={`/dashboard/projects/${project.projectId}/analytics`}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <BarChart3 className="h-3 w-3" />
                                                            <span className="sr-only">View analytics</span>
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link
                                                            href={`/changelog/${project.projectId}`}
                                                            target="_blank"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            <span className="sr-only">View public page</span>
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>

                            {totalViews > 0 && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                                    <span>Total System Views</span>
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