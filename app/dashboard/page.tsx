'use client'

import {useAuth} from '@/context/auth'
import {useQuery} from '@tanstack/react-query'
import Link from 'next/link'
import {motion} from 'framer-motion'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader
} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Badge} from "@/components/ui/badge"
import {
    FileText,
    Plus,
    ArrowRight,
    Activity,
    Settings,
    Sparkles,
    BookOpen,
    ChevronRight,
    Code,
    LayoutDashboard,
    TrendingUp,
    Target,
    PenTool
} from 'lucide-react'
import {formatDistanceToNow} from "date-fns"
import type {
    DashboardStats,
    ProjectPreview,
    Activity as DashboardActivity
} from '@/lib/types/dashboard'
import {getGravatarUrl} from "@/lib/utils/gravatar"
import React from "react"

const fadeIn = {
    initial: {opacity: 0, y: 10},
    animate: {opacity: 1, y: 0},
    exit: {opacity: 0, y: -10}
}

const container = {
    hidden: {opacity: 0},
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
}

const changelogMessages = [
    "You're doing rawrsome with these updates!",
    "Your users can't wait to see what's new!",
    "Every update tells a story, what'll be yours?",
    "Your changelog is looking pawsitively amazing",
    "Time to share your latest masterpiece",
    "Your users are rooting for your next announcement",
    "What incredible thing did you build today?",
    "Your updates deserve their moment to shine",
    "Ready to make your users' day?",
    "Your changelog is about to get a whole lot cooler",
    "Another day, another reason to celebrate your work",
    "Your users love hearing from you - what's the news?",
    "Time to turn your hard work into happy users",
    "Your updates are the highlight of someone's day",
    "Ready to share something rawrsome?",
    "Your users are pawsing for your next update",
    "What amazing thing are you shipping today?",
    "Your changelog is hungry for fresh content",
    "Time to roar about your latest achievement",
    "Your users are on the edge of their seats",
    "Another brilliant update waiting to be shared",
    "Your changelog game is getting stronger",
    "Ready to drop some knowledge on your users?",
    "Your updates are about to make waves",
    "Time to unleash your creative genius",
    "Your users trust you to keep them in the loop",
    "What's your next big reveal?",
    "Your changelog is your stage - time to perform",
    "Ready to turn code into celebration?",
    "Your users are your biggest fans - give them news!",
    "Another day, another chance to impress",
    "Your updates are pure magic waiting to happen",
    "Time to share the fruits of your labor",
    "Your changelog is calling your name",
    "Ready to make your mark on the world?",
    "Your users appreciate your transparency",
    "What story will your changelog tell today?",
    "Your updates are like presents for your users",
    "Time to show off your incredible work",
    "Your changelog is your victory journal",
    "Ready to turn features into fanfare?",
    "Your users are counting on your updates",
    "Another opportunity to shine brightly",
    "Your changelog is your user's favorite read",
    "Time to transform silence into celebration",
    "Your updates are your signature on the world",
    "Ready to make your users smile?",
    "Your changelog is your digital megaphone",
    "Another chance to exceed expectations",
    "Your users are your partners in this journey",
    "What incredible news are you sharing today?",
    "Your updates are conversations waiting to happen",
    "Time to bridge the gap between you and your users",
    "Your changelog is your professional storytelling",
    "Ready to turn development into delight?",
    "Your users value your communication",
    "Another update, another reason to be proud",
    "Your changelog is your transparency window",
    "Time to let your work speak for itself",
    "Your updates are investments in user happiness",
    "Ready to make your changelog un-fur-gettable?",
    "Your users are eager for your latest news",
    "Another day to document your awesomeness",
    "Your changelog is your professional diary",
    "Time to share your development journey",
    "Your updates are breadcrumbs of progress",
    "Ready to turn commits into conversations?",
    "Your users appreciate your dedication",
    "Another chance to build trust through transparency",
    "Your changelog is your user relationship builder",
    "Time to celebrate your coding victories",
    "Your updates are proof of your commitment",
    "Ready to make your users feel valued?",
    "Your changelog is your digital handshake",
    "Another opportunity to show you care",
    "Your users are invested in your success",
    "What exciting development are you announcing?",
    "Your updates are your brand ambassadors",
    "Time to turn features into friendships",
    "Your changelog is your professional pulse",
    "Ready to share your latest breakthrough?",
    "Your users deserve to celebrate with you",
    "Another update, another step forward together",
    "Your changelog is your user's compass",
    "Time to turn progress into praise",
    "Your updates are your legacy in motion",
    "Ready to make your changelog claw-some?",
    "Your users are your most important audience",
    "Another day to strengthen user bonds",
    "Your changelog is your trust-building tool",
    "Time to share your development poetry",
    "Your updates are your professional heartbeat",
    "Ready to turn code into community?",
    "Your users are cheering for your success",
    "Another chance to exceed user expectations",
    "Your changelog is your digital autobiography",
    "Time to celebrate progress with your people",
    "Your updates are your user's roadmap",
    "Ready to make your changelog roar-some?",
    "Your users are your development partners",
    "Another opportunity to inspire through transparency",
    "Your changelog is your professional signature",
    "Time to turn development into changelogs",
    "Your updates are your commitment made visible",
    "Ready to share your latest user gift?",
    "Your users are waiting for your next chapter",
    "Another day to build through communication",
    "Your changelog is your user's favorite newsletter",
    "Time to turn features into lasting relationships",
    "CHORE: Un-hardcode the copyright year"
];

interface StatsCardProps {
    title: string
    value: number | string
    description: string
    icon: React.ComponentType<{ className?: string }>
}

const StatsCard: React.FC<StatsCardProps> = ({
                                                 title,
                                                 value,
                                                 description,
                                                 icon: Icon
                                             }) => (
    <Card className="transition-all duration-200 hover:shadow-md dark:hover:shadow-lg/20">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="text-2xl font-semibold">{value}</div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                    <Icon className="h-5 w-5 text-muted-foreground"/>
                </div>
            </div>
        </CardContent>
    </Card>
)

interface QuickActionProps {
    title: string
    description: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

const QuickAction: React.FC<QuickActionProps> = ({
                                                     title,
                                                     description,
                                                     href,
                                                     icon: Icon
                                                 }) => (
    <Card className="transition-all duration-200 hover:shadow-md dark:hover:shadow-lg/20 group cursor-pointer">
        <Link href={href}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                    <ChevronRight
                        className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"/>
                </div>
            </CardContent>
        </Link>
    </Card>
)

export default function DashboardPage() {
    const {user} = useAuth()
    const randomMessage = changelogMessages[Math.floor(Math.random() * changelogMessages.length)]

    const {data: stats, isLoading} = useQuery<DashboardStats>({
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
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="space-y-4 text-center"
                >
                    <Sparkles className="h-8 w-8 mx-auto text-primary animate-pulse"/>
                    <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
                </motion.div>
            </div>
        )
    }

    const totalEntries = stats?.projectPreviews?.reduce((acc, project) => acc + project.changelogCount, 0) || 0
    const activeProjects = stats?.projectPreviews?.filter(project => !project.id.startsWith('placeholder')).length || 0

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={container}
                    className="space-y-8"
                >
                    {/* Welcome Section */}
                    <motion.div variants={fadeIn}>
                        <Card
                            className="overflow-hidden border-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-lg">
                            <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:24px_24px]"/>
                            <CardContent className="relative p-8">
                                <div
                                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                    <div className="space-y-3 flex-1">
                                        <div className="inline-flex items-center gap-2 mb-1">
                                            <span className="text-xl">🦖</span>
                                            <Badge variant="glass" className="bg-white/20 text-white border-white/30">
                                                Changerawr
                                            </Badge>
                                        </div>
                                        <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                                            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                                        </h1>
                                        <p className="text-blue-100 max-w-md">
                                            {randomMessage}
                                        </p>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <Avatar className="h-16 w-16 border-2 border-white/30">
                                            <AvatarImage
                                                src={user?.email ? getGravatarUrl(user?.email, 160) : undefined}
                                                alt={user?.name || 'User avatar'}
                                            />
                                            <AvatarFallback className="text-lg font-semibold bg-white/20 text-white">
                                                {user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Stats Overview */}
                    <motion.div variants={fadeIn} className="space-y-4">
                        <h2 className="text-xl font-semibold">Overview</h2>
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                            <StatsCard
                                title="Projects"
                                value={stats?.totalProjects || 0}
                                description="Total projects"
                                icon={BookOpen}
                            />
                            <StatsCard
                                title="Entries"
                                value={totalEntries}
                                description="All changelog entries"
                                icon={FileText}
                            />
                            <StatsCard
                                title="Active"
                                value={activeProjects}
                                description="Currently active"
                                icon={Target}
                            />
                            <StatsCard
                                title="This Month"
                                value={stats?.recentActivity?.filter(activity => {
                                    const activityDate = new Date(activity.timestamp)
                                    const now = new Date()
                                    return activityDate.getMonth() === now.getMonth() &&
                                        activityDate.getFullYear() === now.getFullYear()
                                })?.length || 0}
                                description="Recent activity"
                                icon={TrendingUp}
                            />
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={fadeIn} className="space-y-4">
                        <h2 className="text-xl font-semibold">Quick Actions</h2>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                            <QuickAction
                                title="Create Project"
                                description="Start a new changelog project"
                                href="/dashboard/projects/new"
                                icon={Plus}
                            />
                            <QuickAction
                                title="Write Entry"
                                description="Add a changelog entry"
                                href="/dashboard/projects"
                                icon={PenTool}
                            />
                            <QuickAction
                                title="Settings"
                                description="Manage your account"
                                href="/dashboard/settings"
                                icon={Settings}
                            />
                        </div>
                    </motion.div>

                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Recent Projects */}
                        <motion.div variants={fadeIn} className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Recent Projects</h2>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/dashboard/projects" className="text-sm">
                                        View all
                                        <ArrowRight className="h-4 w-4 ml-1"/>
                                    </Link>
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {stats?.projectPreviews?.slice(0, 4).map((project: ProjectPreview, index) => (
                                    <motion.div
                                        key={project.id}
                                        variants={fadeIn}
                                        custom={index}
                                    >
                                        <Card
                                            className="group hover:shadow-md dark:hover:shadow-lg/20 transition-all duration-200 hover:border-primary/50">
                                            <Link
                                                href={project.id.startsWith('placeholder') ?
                                                    '/dashboard/projects/new' :
                                                    `/dashboard/projects/${project.id}`
                                                }
                                                className="block"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center">
                                                                <LayoutDashboard
                                                                    className="h-4 w-4 text-muted-foreground"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h3 className="font-medium group-hover:text-primary transition-colors">
                                                                    {project.name}
                                                                </h3>
                                                                <div
                                                                    className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                    <span>{project.changelogCount} entries</span>
                                                                    {!project.id.startsWith('placeholder') && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>
                                                                                {formatDistanceToNow(new Date(project.lastUpdated))} ago
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight
                                                            className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                                                    </div>
                                                </CardContent>
                                            </Link>
                                        </Card>
                                    </motion.div>
                                ))}

                                {/* Create New Project Card */}
                                <motion.div variants={fadeIn}>
                                    <Card
                                        className="border-dashed border-2 hover:border-primary/50 hover:bg-muted/20 transition-all duration-200 group">
                                        <Link href="/dashboard/projects/new">
                                            <CardContent className="p-4 flex items-center justify-center py-8">
                                                <div className="text-center space-y-2">
                                                    <div
                                                        className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center mx-auto group-hover:bg-muted transition-colors">
                                                        <Plus
                                                            className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                                            Create New Project
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Start tracking changes
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Link>
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Activity Feed */}
                        <motion.div variants={fadeIn} className="space-y-4">
                            <h2 className="text-xl font-semibold">Recent Activity</h2>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>
                                        Latest updates across your projects
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px] pr-3">
                                        <div className="space-y-3">
                                            {stats?.recentActivity?.length ? (
                                                stats.recentActivity.slice(0, 10).map((activity: DashboardActivity) => (
                                                    <motion.div
                                                        key={activity.id}
                                                        variants={fadeIn}
                                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                                    >
                                                        <div className="mt-0.5 flex-shrink-0">
                                                            <div
                                                                className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                                                                <Code className="h-3 w-3 text-muted-foreground"/>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <p className="text-sm font-medium leading-relaxed">{activity.message}</p>
                                                            <div
                                                                className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>{formatDistanceToNow(new Date(activity.timestamp))} ago</span>
                                                                <span>•</span>
                                                                <Link
                                                                    href={`/dashboard/projects/${activity.projectId}/`}
                                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                                >
                                                                    {activity.projectName}
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div
                                                    className="flex flex-col items-center justify-center h-[200px] text-center space-y-3">
                                                    <div
                                                        className="h-12 w-12 rounded-md bg-muted/50 flex items-center justify-center">
                                                        <Activity className="h-6 w-6 text-muted-foreground"/>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">No activity yet</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Activity will appear here as you make changes
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}