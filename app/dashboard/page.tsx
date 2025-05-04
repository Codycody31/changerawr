'use client'

import { useAuth } from '@/context/auth'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    Plus,
    ArrowRight,
    Activity,
    Settings,
    Clock,
    Sparkles,
    BookOpen,
    Rocket,
    ChevronRight,
    Code,
    Lightbulb,
    LayoutDashboard,
} from 'lucide-react'
import { formatDistanceToNow } from "date-fns"
import type { DashboardStats, ProjectPreview, Activity as DashboardActivity } from '@/lib/types/dashboard'
import {getGravatarUrl} from "@/lib/utils/gravatar";
import React from "react";

const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const changelogMessages = [
    "What's new in your product today?",
    "Time to document those amazing changes!",
    "Your users can't wait to see what's new",
    "Every update tells a story",
    "Document today, delight users tomorrow",
    "Great products deserve great changelogs"
];

export default function DashboardPage() {
    const { user } = useAuth()
    const randomMessage = changelogMessages[Math.floor(Math.random() * changelogMessages.length)];

    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await fetch('/api/dashboard/stats')
            if (!response.ok) throw new Error('Failed to fetch dashboard stats')
            return response.json()
        }
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4 text-center"
                >
                    <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse" />
                    <p className="text-lg font-medium text-muted-foreground">Loading your updates...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={container}
                    className="space-y-6"
                >
                    {/* Welcome Banner */}
                    <motion.div variants={fadeIn}>
                        <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-background to-secondary/10 shadow-lg">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 mb-2">
                                            <p className="h-5 w-5 text-primary" >🦖</p>
                                            <Badge variant="outline" className="bg-background/50 font-normal">
                                                Changerawr
                                            </Badge>
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl font-bold">
                                            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                                        </h1>
                                        <p className="text-base text-muted-foreground">
                                            {randomMessage}
                                        </p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center justify-center">
                                        <Avatar className="h-16 w-16 border-2 border-background">
                                            <AvatarImage
                                                src={user?.email ? getGravatarUrl(user?.email, 160) : undefined}
                                                alt={user?.name || 'User avatar'}
                                            />
                                            <AvatarFallback>{user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Project Quick Access */}
                    <motion.div variants={fadeIn} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-primary" />
                                Recent Projects
                            </h2>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/dashboard/projects">View all</Link>
                            </Button>
                        </div>

                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {stats?.projectPreviews.map((project: ProjectPreview) => (
                                <motion.div key={project.id} variants={fadeIn}>
                                    <Link
                                        href={project.id.startsWith('placeholder') ? '/dashboard/projects/new' : `/dashboard/projects/${project.id}`}
                                    >
                                        <Card className="h-full overflow-hidden hover:shadow-md transition-all duration-200 hover:border-primary/50 group">
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <LayoutDashboard className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <Badge variant="outline" className="bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                        {project.changelogCount} updates
                                                    </Badge>
                                                </div>
                                                <CardTitle className="mt-3 text-lg group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </CardTitle>
                                                {!project.id.startsWith('placeholder') && (
                                                    <CardDescription className="flex items-center text-xs mt-1">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Updated {formatDistanceToNow(new Date(project.lastUpdated))} ago
                                                    </CardDescription>
                                                )}
                                            </CardHeader>
                                            <CardFooter className="p-4 pt-0 flex justify-end">
                                                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                            <motion.div variants={fadeIn}>
                                <Card className="h-full overflow-hidden border-dashed hover:border-primary/50 group">
                                    <Link href="/dashboard/projects/new">
                                        <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center gap-3 py-8">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Plus className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-medium group-hover:text-primary transition-colors">
                                                    Create New Project
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Start tracking changes
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Link>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div variants={fadeIn} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-100 dark:border-blue-800/30">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full py-6">
                                <BookOpen className="h-8 w-8 text-blue-500 dark:text-blue-400 mb-2" />
                                <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats?.totalProjects || 0}</h3>
                                <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Projects</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-100 dark:border-purple-800/30">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full py-6">
                                <FileText className="h-8 w-8 text-purple-500 dark:text-purple-400 mb-2" />
                                <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats?.totalChangelogs || 0}</h3>
                                <p className="text-sm text-purple-600/70 dark:text-purple-400/70">Changelogs</p>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2">
                            <CardContent className="p-4 flex flex-col h-full justify-center space-y-3 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                        <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" className="h-10 justify-start" asChild>
                                        <Link href="/dashboard/projects/new">
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Project
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-10 justify-start" asChild>
                                        <Link href="/dashboard/settings">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div variants={fadeIn}>
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Activity Feed</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <ScrollArea className="h-[280px] pr-4">
                                    <motion.div
                                        variants={container}
                                        initial="hidden"
                                        animate="show"
                                        className="space-y-3"
                                    >
                                        {stats?.recentActivity?.length ? (
                                            stats.recentActivity.map((activity: DashboardActivity) => (
                                                <motion.div
                                                    key={activity.id}
                                                    variants={fadeIn}
                                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted"
                                                >
                                                    <div className="mt-1 flex-shrink-0">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <Code className="h-4 w-4 text-primary" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm">{activity.message}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs font-normal bg-background/50">
                                                                {formatDistanceToNow(new Date(activity.timestamp))} ago
                                                            </Badge>
                                                            <Link
                                                                href={`/dashboard/projects/${activity.projectId}/`}
                                                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                            >
                                                                {activity.projectName}
                                                                <ArrowRight className="h-3 w-3" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[200px] text-center">
                                                <Activity className="h-12 w-12 text-muted-foreground/40 mb-2" />
                                                <p className="text-muted-foreground">No recent activity to show</p>
                                                <p className="text-xs text-muted-foreground/70 mt-1">
                                                    Activity will appear here as you make changes
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}