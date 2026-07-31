'use client'

import {use, useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Switch} from '@/components/ui/switch'
import {Textarea} from '@/components/ui/textarea'
import {Alert, AlertDescription} from '@/components/ui/alert'
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
import {AlertTriangle, History, ListX, Loader2, Lock, Trash2, Wrench} from 'lucide-react'
import {DestructiveActionRequest} from '@/components/changelog/RequestHandler'
import {useAuth} from '@/context/auth'
import {useProjectSettings} from '@/hooks/useProjectSettings'

interface DangerSettingsPageProps {
    params: Promise<{ projectId: string }>
}

export default function DangerSettingsPage({params}: DangerSettingsPageProps) {
    const {projectId} = use(params)
    const router = useRouter()
    const {toast} = useToast()
    const {user} = useAuth()
    const queryClient = useQueryClient()
    const {project, handleUpdate, updateSettings} = useProjectSettings(projectId)
    const isAdmin = user?.role === 'ADMIN'
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDeletingEntries, setIsDeletingEntries] = useState(false)
    const [isDeletingHistory, setIsDeletingHistory] = useState(false)
    const [maintenanceMessage, setMaintenanceMessage] = useState('')

    useEffect(() => {
        setMaintenanceMessage(project?.maintenanceMessage ?? '')
    }, [project?.maintenanceMessage])

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

    const deleteAllEntries = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to delete changelog entries')
            return response.json() as Promise<{ entriesDeleted: number }>
        },
        onSuccess: ({entriesDeleted}) => {
            toast({
                title: 'Success',
                description: `Deleted ${entriesDeleted} changelog ${entriesDeleted === 1 ? 'entry' : 'entries'}`
            })
            queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]})
            queryClient.invalidateQueries({queryKey: ['changelog', projectId]})
        },
        onError: () => {
            toast({title: 'Error', description: 'Failed to delete changelog entries', variant: 'destructive'})
        },
        onSettled: () => {
            setIsDeletingEntries(false)
        }
    })

    const deleteAllHistory = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog/history`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to delete changelog history')
            return response.json() as Promise<{ revisionsDeleted: number }>
        },
        onSuccess: ({revisionsDeleted}) => {
            toast({
                title: 'Success',
                description: `Deleted ${revisionsDeleted} version history ${revisionsDeleted === 1 ? 'entry' : 'entries'}`
            })
            queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey[0]
                    return key === 'changelog-revisions' || key === 'changelog-revisions-count'
                }
            })
        },
        onError: () => {
            toast({title: 'Error', description: 'Failed to delete changelog history', variant: 'destructive'})
        },
        onSettled: () => {
            setIsDeletingHistory(false)
        }
    })

    return (
        <div className="space-y-4">
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                        <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400"/>
                    </div>
                    <CardTitle className="text-xl">Maintenance Mode</CardTitle>
                </div>
                <CardDescription>
                    Take this project&apos;s public changelog offline temporarily
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {!isAdmin && (
                    <Alert icon={<Lock className="h-4 w-4 text-amber-600 dark:text-amber-400"/>}
                           className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Only administrators can modify maintenance settings.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <Wrench className="h-4 w-4"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">Enable Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground">
                            Visitors will see a maintenance page instead of the changelog
                        </p>
                    </div>
                    <Switch
                        checked={Boolean(project?.maintenanceMode)}
                        onCheckedChange={(checked) => handleUpdate('maintenanceMode', checked)}
                        disabled={!isAdmin}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-tight">Maintenance Message</label>
                    <p className="text-xs text-muted-foreground">
                        Shown to visitors while maintenance mode is enabled. Leave blank to use the default message.
                    </p>
                    <Textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        disabled={!isAdmin}
                        placeholder="This changelog is temporarily unavailable while we perform maintenance. Please check back soon."
                        rows={3}
                        maxLength={2000}
                    />
                    {isAdmin && (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={updateSettings.isPending || maintenanceMessage === (project?.maintenanceMessage ?? '')}
                                onClick={() => handleUpdate('maintenanceMessage', maintenanceMessage || null)}
                            >
                                {updateSettings.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Message'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card className="border-destructive/40 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-destructive/10 dark:bg-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive"/>
                    </div>
                    <CardTitle className="text-xl text-destructive">Danger Zone</CardTitle>
                </div>
                <CardDescription>
                    Destructive actions that require approval
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                            <ListX className="h-4 w-4"/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">Delete All Entries</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently remove every changelog entry in this project
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {user?.role === 'ADMIN' ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete All Entries</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete all entries?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete every changelog entry in this
                                            project. The project and its settings will be kept.
                                            This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => {
                                                setIsDeletingEntries(true)
                                                deleteAllEntries.mutate()
                                            }}
                                            disabled={isDeletingEntries}
                                        >
                                            {isDeletingEntries ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    Deleting...
                                                </>
                                            ) : (
                                                'Delete All Entries'
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <DestructiveActionRequest
                                projectId={projectId}
                                action="DELETE_ALL_ENTRIES"
                            />
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                            <History className="h-4 w-4"/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">Delete All History</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently remove all saved version history for every entry
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {user?.role === 'ADMIN' ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete All History</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete all version history?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete every saved version history
                                            revision for every entry in this project. The entries
                                            themselves will be kept.
                                            This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => {
                                                setIsDeletingHistory(true)
                                                deleteAllHistory.mutate()
                                            }}
                                            disabled={isDeletingHistory}
                                        >
                                            {isDeletingHistory ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    Deleting...
                                                </>
                                            ) : (
                                                'Delete All History'
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <DestructiveActionRequest
                                projectId={projectId}
                                action="DELETE_ALL_HISTORY"
                            />
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                            <Trash2 className="h-4 w-4"/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">Delete Project</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently remove this project and all its data
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
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
        </div>
    )
}
