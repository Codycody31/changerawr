'use client'

import {use} from 'react'
import {Switch} from '@/components/ui/switch'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {useAuth} from '@/context/auth'
import {useProjectSettings, type ProjectSettings} from '@/hooks/useProjectSettings'
import {Globe, Lock, Search, Shield, ShieldCheck, Zap, type LucideIcon} from 'lucide-react'

interface AccessSettingsPageProps {
    params: Promise<{ projectId: string }>
}

interface AccessSetting {
    key: keyof ProjectSettings
    icon: LucideIcon
    label: string
    description: string
}

const accessSettings: AccessSetting[] = [
    {
        key: 'isPublic',
        icon: Globe,
        label: 'Public Access',
        description: 'Make changelog visible without authentication'
    },
    {
        key: 'allowAutoPublish',
        icon: Zap,
        label: 'Auto-Publish',
        description: 'Automatically publish new entries'
    },
    {
        key: 'requireApproval',
        icon: ShieldCheck,
        label: 'Require Approval',
        description: 'Require admin approval for new entries'
    },
    {
        key: 'allowIndexing',
        icon: Search,
        label: 'Search Engine Indexing',
        description: 'Allow search engines to index this changelog'
    }
]

export default function AccessSettingsPage({params}: AccessSettingsPageProps) {
    const {projectId} = use(params)
    const {user} = useAuth()
    const {project, isLoading, handleUpdate} = useProjectSettings(projectId)

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    const isAdmin = user?.role === 'ADMIN'

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <Shield className="h-4 w-4 text-primary"/>
                    </div>
                    <CardTitle className="text-xl">Access</CardTitle>
                </div>
                <CardDescription>
                    Configure visibility and publishing permissions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {!isAdmin && (
                    <Alert icon={<Lock className="h-4 w-4 text-amber-600 dark:text-amber-400"/>}
                           className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Only administrators can modify access settings.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="divide-y rounded-lg border border-border/50">
                    {accessSettings.map(({key, icon: Icon, label, description}) => (
                        <div key={key} className="flex items-center gap-3 p-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 shrink-0">
                                <Icon className="h-4 w-4"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">{label}</p>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <Switch
                                checked={Boolean(project[key])}
                                onCheckedChange={(checked) => handleUpdate(key, checked)}
                                disabled={!isAdmin}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
