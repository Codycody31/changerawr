'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, ExternalLink, Plus, BarChart, FileText, Cog } from 'lucide-react'

interface ProjectPageProps {
    params: Promise<{ projectId: string }>
}

interface Project {
    id: string
    name: string
    isPublic: boolean
    allowAutoPublish: boolean
    requireApproval: boolean
    changelog: {
        id: string
        entries: Array<{
            id: string
            title: string
            publishedAt: string | null
            version: string | null
        }>
    } | null
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
            <div className="animate-pulse">
                <div className="h-8 w-48 bg-muted rounded mb-4" />
                <div className="h-32 bg-muted rounded" />
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

    const latestChangelog = project.changelog?.entries[0]

    return (
        <div className="container max-w-7xl p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

                <div className="flex items-center gap-2">
                    {project.isPublic && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/changelog/${project.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Public Page
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/settings`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Changelog Entries
                                </CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {project.changelog?.entries.length ?? 0}
                                </div>
                                {latestChangelog && (
                                    <p className="text-xs text-muted-foreground">
                                        Latest: {latestChangelog.version || 'No version'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Settings
                                </CardTitle>
                                <Cog className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Auto-publish:</span>
                                        <Badge variant={project.allowAutoPublish ? "default" : "secondary"}>
                                            {project.allowAutoPublish ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Approval Required:</span>
                                        <Badge variant={project.requireApproval ? "default" : "secondary"}>
                                            {project.requireApproval ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Button className="w-full" asChild>
                                        <Link href={`/dashboard/projects/${project.id}/changelog/new`}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Entry
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Entries</CardTitle>
                            <CardDescription>
                                Latest changelog entries for this project
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {project.changelog?.entries.length ? (
                                <div className="space-y-4">
                                    {project.changelog.entries.slice(0, 5).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between py-2"
                                        >
                                            <div>
                                                <h3 className="font-medium">{entry.title}</h3>
                                                {entry.version && (
                                                    <Badge variant="outline" className="mt-1">
                                                        {entry.version}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/projects/${project.id}/changelog/${entry.id}`}>
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="font-medium mb-1">No entries yet</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Get started by creating your first changelog entry
                                    </p>
                                    <Button asChild>
                                        <Link href={`/dashboard/projects/${project.id}/changelog/new`}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Entry
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>
                                Changelog entry statistics and trends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="font-medium mb-1">Analytics Coming Soon</h3>
                                    <p className="text-sm text-muted-foreground">
                                        We&apos;re working on bringing you detailed analytics
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}