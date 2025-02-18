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
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    FileText,
    Plus,
    ArrowRight,
    Activity,
    Settings,
    Clock,
    Layout,
    BookOpen,
    ChevronRight,
    Star,
} from 'lucide-react'
import { formatDistanceToNow } from "date-fns"
import type { DashboardStats, ProjectPreview, Activity as DashboardActivity } from '@/lib/types/dashboard'

export default function DashboardPage() {
    const { user } = useAuth()

    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await fetch('/api/dashboard/stats')
            if (!response.ok) throw new Error('Failed to fetch dashboard stats')
            return response.json()
        }
    })

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-dot-pattern">
            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Welcome Banner */}
                    <Card className="bg-gradient-to-r from-purple-50 via-white to-blue-50 dark:from-purple-950/20 dark:via-background dark:to-blue-950/20 border-none shadow-xl">
                        <CardContent className="p-8">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
                                    <p className="text-muted-foreground text-lg">
                                        Ready to document your next big update?
                                    </p>
                                </div>
                                {/*<Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" asChild>*/}
                                {/*    <Link href="/projects/changelog/new">*/}
                                {/*        <Zap className="mr-2 h-5 w-5" />*/}
                                {/*        New Update*/}
                                {/*    </Link>*/}
                                {/*</Button>*/}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Quick Access */}
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-full">
                            <CardHeader>
                                <CardTitle>Quick Access</CardTitle>
                                <CardDescription>Your most active projects</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {stats?.projectPreviews.map((project: ProjectPreview) => (
                                        <Link
                                            key={project.id}
                                            href={project.id.startsWith('placeholder') ? '/dashboard/projects/new' : `/dashboard/projects/${project.id}`}
                                        >
                                            <div className="group relative overflow-hidden rounded-lg border p-4 hover:border-primary/50 transition-all duration-200">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 flex items-center justify-center">
                                                        <Layout className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium group-hover:text-primary transition-colors">
                                                            {project.name}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {project.id.startsWith('placeholder')
                                                                ? 'Create a new project'
                                                                : `${project.changelogCount} updates • Last updated ${formatDistanceToNow(new Date(project.lastUpdated))} ago`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats Overview */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                        <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{stats?.totalProjects || 0}</CardTitle>
                                        <CardDescription>Active Projects</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-2">
                                    <Button variant="ghost" className="w-full justify-between" asChild>
                                        <Link href="/dashboard/projects">
                                            View All Projects
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{stats?.totalChangelogs || 0}</CardTitle>
                                        <CardDescription>Total Updates</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            {/*<CardContent>*/}
                            {/*    <div className="mt-2">*/}
                            {/*        <Button variant="ghost" className="w-full justify-between" asChild>*/}
                            {/*            <Link href="/changelog">*/}
                            {/*                View History*/}
                            {/*                <ArrowRight className="h-4 w-4" />*/}
                            {/*            </Link>*/}
                            {/*        </Button>*/}
                            {/*    </div>*/}
                            {/*</CardContent>*/}
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                        <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Quick Actions</CardTitle>
                                        <CardDescription>Common tasks</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Button variant="ghost" className="w-full justify-start" asChild>
                                        <Link href="/dashboard/projects/new">
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Project
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start" asChild>
                                        <Link href="/dashboard/settings">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="col-span-full">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        <CardTitle>Recent Activity</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-4">
                                        {stats?.recentActivity?.map((activity: DashboardActivity, i: number) => (
                                            <motion.div
                                                key={activity.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="mt-1">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm">{activity.message}</p>
                                                    <Link
                                                        href={`/projects/${activity.projectId}`}
                                                        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1"
                                                    >
                                                        {activity.projectName}
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}