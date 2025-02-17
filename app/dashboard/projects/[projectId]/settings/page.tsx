'use client'

import {use, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {useToast} from '@/hooks/use-toast'
import {AlertTriangle, Loader2, Plus, Settings, Shield, Tag, X} from 'lucide-react'
import {DestructiveActionRequest} from '@/components/changelog/RequestHandler'
import {useAuth} from '@/context/auth'

interface ProjectSettingsPageProps {
    params: Promise<{ projectId: string }>
}

interface ProjectSettings {
    id: string
    name: string
    isPublic: boolean
    allowAutoPublish: boolean
    requireApproval: boolean
    defaultTags: string[]
    updatedAt: string
}

export default function ProjectSettingsPage({params}: ProjectSettingsPageProps) {
    const {projectId} = use(params)
    const router = useRouter()
    const {toast} = useToast()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('general')
    const [newTag, setNewTag] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const {user} = useAuth()

    const {data: project, isLoading} = useQuery<ProjectSettings>({
        queryKey: ['project-settings', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/settings`)
            if (!response.ok) throw new Error('Failed to fetch settings')
            return response.json()
        }
    })

    const updateSettings = useMutation({
        mutationFn: async (data: Partial<ProjectSettings>) => {
            const response = await fetch(`/api/projects/${projectId}/settings`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            })
            if (!response.ok) throw new Error('Failed to update settings')
            return response.json()
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['project-settings', projectId], data)
            toast({title: 'Success', description: 'Settings updated successfully'})
        }
    })

    const deleteProject = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to delete project')
        },
        onSuccess: () => {
            toast({title: 'Success', description: 'Project deleted successfully'})
            router.push('/dashboard/projects')
        },
        onSettled: () => {
            setIsDeleting(false)
        }
    })

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    const handleUpdate = (field: keyof ProjectSettings, value: unknown) => {
        updateSettings.mutate({[field]: value})
    }

    const handleAddTag = (e?: React.KeyboardEvent<HTMLInputElement>) => {
        if (e && e.key !== 'Enter') return
        if (newTag.trim()) {
            const updatedTags = Array.from(new Set([...project.defaultTags, newTag.trim()]))
            updateSettings.mutate({defaultTags: updatedTags})
            setNewTag('')
        }
    }

    const handleTagDeletion = (tag: string) => {
        if (user?.role === 'ADMIN') {
            const updatedTags = project.defaultTags.filter(t => t !== tag)
            handleUpdate('defaultTags', updatedTags)
        }
    }

    const tabs = [
        {id: 'general', label: 'General', icon: Settings},
        {id: 'access', label: 'Access', icon: Shield},
        {id: 'tags', label: 'Tags', icon: Tag},
        {id: 'danger', label: 'Danger', icon: AlertTriangle, className: 'text-destructive'}
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>
                                Basic project configuration and details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input
                                        id="name"
                                        value={project.name}
                                        onChange={(e) => handleUpdate('name', e.target.value)}
                                        className="max-w-md"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'access':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Settings</CardTitle>
                            <CardDescription>
                                Configure visibility and permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <Label>Public Access</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Make changelog visible without authentication
                                        </p>
                                    </div>
                                    <Switch
                                        checked={project.isPublic}
                                        onCheckedChange={(checked) => handleUpdate('isPublic', checked)}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <Label>Auto-Publish</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Automatically publish new entries
                                        </p>
                                    </div>
                                    <Switch
                                        checked={project.allowAutoPublish}
                                        onCheckedChange={(checked) => handleUpdate('allowAutoPublish', checked)}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <Label>Require Approval</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Require admin approval for new entries
                                        </p>
                                    </div>
                                    <Switch
                                        checked={project.requireApproval}
                                        onCheckedChange={(checked) => handleUpdate('requireApproval', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'tags':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Default Tags</CardTitle>
                            <CardDescription>
                                Manage default tags for changelog entries
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="relative flex-1 max-w-sm">
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Add new tag..."
                                        />
                                    </div>
                                    <Button
                                        onClick={() => handleAddTag()}
                                        disabled={!newTag.trim()}
                                    >
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Add Tag
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {project.defaultTags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-3 py-1"
                                        >
                                            <Tag className="h-3 w-3"/>
                                            {tag}
                                            {user?.role === 'ADMIN' ? (
                                                <button
                                                    onClick={() => handleTagDeletion(tag)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            ) : (
                                                <DestructiveActionRequest
                                                    projectId={projectId}
                                                    action="DELETE_TAG"
                                                    targetId={tag}
                                                    targetName={tag}
                                                />
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'danger':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>
                                Destructive actions that require approval
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="rounded-md border border-destructive p-4">
                                    <h4 className="font-medium mb-2">Delete Project</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Permanently remove this project and all its data
                                    </p>
                                    {user?.role === 'ADMIN' ? (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">Delete Project</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the project and all associated
                                                        data.
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={() => {
                                                            setIsDeleting(true)
                                                            deleteProject.mutate()
                                                        }}
                                                        disabled={isDeleting}
                                                    >
                                                        {isDeleting ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                                Deleting...
                                                            </>
                                                        ) : (
                                                            'Delete Project'
                                                        )}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    ) : (
                                        <DestructiveActionRequest
                                            projectId={projectId}
                                            action="DELETE_PROJECT"
                                            onSuccess={() => router.push('/dashboard/projects')}

                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-screen-xl px-4 py-4 md:py-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left sidebar */}
                    <div className="w-full md:w-64 shrink-0">
                        <h1 className="text-2xl font-bold mb-4">Settings</h1>
                        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0">
                            {tabs.map(({id, label, icon: Icon, className}) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                                        ${activeTab === id ? 'bg-secondary' : 'hover:bg-secondary/50'}
                                        ${className || 'text-foreground'}
                                        whitespace-nowrap
                                    `}
                                >
                                    <Icon className="h-4 w-4"/>
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Main content */}
                    <div className="flex-1">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    )
}