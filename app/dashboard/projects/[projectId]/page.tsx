'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
    Settings,
    ExternalLink,
    Plus,
    FileText,
    ArrowRight,
    Check,
    XCircle,
    Clock,
    Edit,
    Eye,
    Code,
    Mail,
    PenTool,
    TagsIcon,
    Calendar as CalendarIcon,
    type LucideIcon
} from 'lucide-react'

interface ProjectPageProps {
    params: Promise<{ projectId: string }>
}

interface Tag {
    id: string
    name: string
}

interface ChangelogEntry {
    id: string
    title: string
    publishedAt: string | null
    version: string | null
    createdAt: string
    updatedAt: string
    tags?: Tag[]
}

interface Project {
    id: string
    name: string
    isPublic: boolean
    allowAutoPublish: boolean
    requireApproval: boolean
    changelog: {
        id: string
        entries: ChangelogEntry[]
    } | null
}

interface EntryCardProps {
    entry: ChangelogEntry
    projectId: string
}

interface FeatureCardProps {
    title: string
    description: string
    icon: LucideIcon
    href: string
    enabled?: boolean
    color?: string
}

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
};

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getStatusColor(isPublished: boolean) {
    return isPublished
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40"
        : "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40";
}

function EntryCard({ entry, projectId }: EntryCardProps) {
    const isPublished = !!entry.publishedAt;
    const statusColor = getStatusColor(isPublished);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="group overflow-hidden transition-all">
                <CardHeader className="p-4 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <Link
                                href={`/dashboard/projects/${projectId}/changelog/${entry.id}`}
                                className="group-hover:text-primary transition-colors"
                            >
                                <CardTitle className="text-lg font-medium">{entry.title}</CardTitle>
                            </Link>
                            <div className="flex flex-wrap gap-2 items-center text-xs">
                                {entry.version && (
                                    <Badge variant="outline" className="font-normal">
                                        {entry.version}
                                    </Badge>
                                )}
                                <Badge
                                    variant="outline"
                                    className={`${statusColor} border-0 font-normal`}
                                >
                                    {isPublished ? 'Published' : 'Draft'}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <Link href={`/dashboard/projects/${projectId}/changelog/${entry.id}`}>
                                    <Edit className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                    <div className="flex items-center text-xs text-muted-foreground gap-3 mt-1">
                        <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Updated {formatDate(entry.updatedAt)}</span>
                        </div>

                        {entry.tags && entry.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                                <TagsIcon className="h-3 w-3" />
                                <span>{entry.tags.map((t) => t.name).join(', ')}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-0 overflow-hidden">
                    <div className="w-full h-1 bg-muted">
                        <div className={`h-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: isPublished ? '100%' : '50%' }}></div>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

function ProjectStats({ project }: { project: Project }) {
    const totalEntries = project.changelog?.entries.length || 0;
    const publishedEntries = project.changelog?.entries.filter(entry => entry.publishedAt).length || 0;
    const draftEntries = totalEntries - publishedEntries;

    const publishedPercentage = totalEntries > 0 ? (publishedEntries / totalEntries) * 100 : 0;

    return (
        <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Changelog Stats
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Total Entries</span>
                        <Badge variant="outline" className="font-normal text-sm">
                            {totalEntries}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Published</span>
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{publishedEntries}</span>
                            </div>
                            <Progress value={publishedPercentage} className="h-2 bg-muted" />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Drafts</span>
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{draftEntries}</span>
                            </div>
                            <Progress value={100 - publishedPercentage} className="h-2 bg-muted" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FeatureCard({
                         title,
                         description,
                         icon: Icon,
                         href,
                         enabled = true,
                         color = "text-primary"
                     }: FeatureCardProps) {
    return (
        <Card className={`h-full transition-all ${!enabled ? 'opacity-60' : 'hover:shadow-md'}`}>
            <Link href={enabled ? href : '#'} className={`block h-full ${!enabled ? 'cursor-not-allowed' : ''}`}>
                <CardContent className="p-6 h-full flex flex-col">
                    <div className={`h-10 w-10 rounded-full ${color} bg-primary/10 flex items-center justify-center mb-4`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg mb-2">{title}</CardTitle>
                    <CardDescription className="flex-grow">
                        {description}
                    </CardDescription>

                    <div className="flex mt-4 items-center text-sm">
                        {enabled ? (
                            <>
                                <span className="text-primary">Configure</span>
                                <ArrowRight className="ml-1 h-4 w-4 text-primary" />
                            </>
                        ) : (
                            <Badge variant="outline" className="border-amber-200 bg-amber-100/50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                                Requires Public Project
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Link>
        </Card>
    );
}

export default function ProjectPage({ params }: ProjectPageProps) {
    const { projectId } = use(params)

    const { data: project, isLoading } = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`)
            if (!response.ok) throw new Error('Failed to fetch project')
            return response.json()
        }
    })

    if (isLoading) {
        return (
            <div className="space-y-6 p-4 md:p-8">
                <div className="h-8 w-48 bg-muted rounded-md animate-pulse mb-4" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="h-48 bg-muted rounded-md animate-pulse" />
                    <div className="h-48 bg-muted rounded-md animate-pulse" />
                    <div className="h-48 bg-muted rounded-md animate-pulse" />
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
                <p className="text-muted-foreground mb-4">
                    The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
                </p>
                <Button asChild>
                    <Link href="/dashboard/projects">Back to Projects</Link>
                </Button>
            </div>
        )
    }

    const recentEntries = project.changelog?.entries.slice(0, 3) || [];

    // Quick check if a feature requires the project to be public
    const requiresPublic = (feature: string) => {
        return (feature === 'Widget' || feature === 'Public Page') && !project.isPublic;
    };

    return (
        <div className="container max-w-7xl space-y-6 p-4 md:p-8">
            {/* Project Header */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={fadeIn}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-background to-muted/60 p-4 rounded-xl border"
            >
                <div className="flex gap-4 items-center">
                    <Avatar className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-medium text-2xl border-2 border-primary/20">
                        <AvatarFallback>
                            {project.name.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">{project.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Badge variant={project.isPublic ? "default" : "secondary"}>
                                {project.isPublic ? "Public" : "Private"}
                            </Badge>
                            {project.changelog?.entries.length ? (
                                <span className="text-sm">
                                    {project.changelog.entries.length} entries
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
                    {project.isPublic && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/changelog/${project.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Public Page
                            </Link>
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/settings`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Link>
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/changelog/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Entry
                        </Link>
                    </Button>
                </div>
            </motion.div>

            {/* Project Status */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={fadeIn}
                className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            >
                <ProjectStats project={project} />

                <Card className="md:col-span-2 overflow-hidden h-full">
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                                Project Settings
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="text-xs h-8"
                            >
                                <Link href={`/dashboard/projects/${project.id}/settings`}>
                                    Edit Settings
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center ${project.isPublic ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {project.isPublic ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium">Public Access</span>
                                        <p className="text-xs text-muted-foreground">Show changelog to everyone</p>
                                    </div>
                                </div>
                                <Badge variant={project.isPublic ? "default" : "secondary"}>
                                    {project.isPublic ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center ${project.allowAutoPublish ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {project.allowAutoPublish ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium">Auto-publish</span>
                                        <p className="text-xs text-muted-foreground">Publish entries automatically</p>
                                    </div>
                                </div>
                                <Badge variant={project.allowAutoPublish ? "default" : "secondary"}>
                                    {project.allowAutoPublish ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center ${project.requireApproval ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {project.requireApproval ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium">Approval Required</span>
                                        <p className="text-xs text-muted-foreground">Require admin approval</p>
                                    </div>
                                </div>
                                <Badge variant={project.requireApproval ? "default" : "secondary"}>
                                    {project.requireApproval ? "Yes" : "No"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Integrations */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={fadeIn}
            >
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-semibold">Integrations & Features</h2>
                    <Separator className="flex-1" />
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                    <FeatureCard
                        title="Widget"
                        description="Embed a changelog widget on your website to showcase your updates to users."
                        icon={Code}
                        href={`/dashboard/projects/${project.id}/integrations/widget`}
                        enabled={!requiresPublic('Widget')}
                    />

                    <FeatureCard
                        title="Email Notifications"
                        description="Send changelog updates to subscribers via email when you publish new entries."
                        icon={Mail}
                        href={`/dashboard/projects/${project.id}/integrations/email`}
                        color="text-blue-600 dark:text-blue-400"
                    />

                    <FeatureCard
                        title="Public Page"
                        description="Share your changelog with users through a standalone, customizable public page."
                        icon={Eye}
                        href={`/changelog/${project.id}`}
                        enabled={!requiresPublic('Public Page')}
                        color="text-purple-600 dark:text-purple-400"
                    />
                </div>
            </motion.div>

            {/* Recent Entries */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={fadeIn}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">Recent Entries</h2>
                        <Badge variant="outline" className="font-normal">
                            {project.changelog?.entries.length || 0}
                        </Badge>
                    </div>

                    {project.changelog?.entries?.length ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/projects/${projectId}/changelog/`}>
                                <FileText className="h-4 w-4 mr-2"/>
                                View All
                            </Link>
                        </Button>
                    ) : null}
                </div>

                {project.changelog?.entries.length ? (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {recentEntries.map((entry) => (
                            <EntryCard key={entry.id} entry={entry} projectId={project.id} />
                        ))}
                    </div>
                ) : (
                    <Card className="bg-muted/30">
                        <CardContent className="p-12 text-center">
                            <div className="flex flex-col items-center">
                                <PenTool className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-medium text-lg mb-1">No entries yet</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                    Get started by creating your first changelog entry to keep your users up to date with your changes.
                                </p>
                                <Button asChild>
                                    <Link href={`/dashboard/projects/${project.id}/changelog/new`}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Entry
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </motion.div>
        </div>
    )
}