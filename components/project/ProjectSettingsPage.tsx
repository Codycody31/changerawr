'use client'

import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { Project as PrismaProject, Changelog, ChangelogEntry } from '@prisma/client'
import { useAuth } from '@/context/auth'

interface Project extends PrismaProject {
    changelog?: Changelog & {
        entries: ChangelogEntry[]
    }
}

export default function ProjectsPage() {
    const { user } = useAuth()

    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await fetch('/api/projects', {
                credentials: 'include',
            })
            if (!response.ok) throw new Error('Failed to fetch projects')
            return response.json()
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                <Link href="/dashboard/projects/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </Link>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Name</TableHead>
                            <TableHead>Latest Version</TableHead>
                            <TableHead>Changelog Entries</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : projects?.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/dashboard/projects/${project.id}`}
                                        className="hover:underline"
                                    >
                                        {project.name}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {project.changelog?.entries[0]?.version || 'No versions'}
                                </TableCell>
                                <TableCell>
                                    <Badge>
                                        {project.changelog?.entries.length || 0} entries
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(project.createdAt), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/dashboard/projects/${project.id}/changelog`}>
                                            <Button variant="outline" size="sm">
                                                Changelog
                                            </Button>
                                        </Link>
                                        {user?.role === 'ADMIN' && (
                                            <Link href={`/dashboard/projects/${project.id}/settings`}>
                                                <Button variant="ghost" size="sm">
                                                    Settings
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}