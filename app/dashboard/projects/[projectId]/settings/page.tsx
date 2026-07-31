'use client'

import {use} from 'react'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {useProjectSettings} from '@/hooks/useProjectSettings'
import {DynamicIcon, IconPicker} from '@/components/ui/icon-picker'
import {ColorPicker} from '@/components/changelog/editor/TagColorPicker'
import {FolderKanban, Settings} from 'lucide-react'

interface GeneralSettingsPageProps {
    params: Promise<{ projectId: string }>
}

export default function GeneralSettingsPage({params}: GeneralSettingsPageProps) {
    const {projectId} = use(params)
    const {project, isLoading, handleUpdate} = useProjectSettings(projectId)

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <Settings className="h-4 w-4 text-primary"/>
                    </div>
                    <CardTitle className="text-xl">General</CardTitle>
                </div>
                <CardDescription>
                    Basic information and branding for this project
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border"
                            style={{
                                backgroundColor: project.color ? `${project.color}1a` : undefined,
                                borderColor: project.color ? `${project.color}40` : undefined,
                                color: project.color || undefined,
                            }}
                        >
                            <DynamicIcon
                                name={project.icon}
                                fallback={FolderKanban}
                                className="h-8 w-8"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconPicker
                                value={project.icon}
                                onChange={(icon) => handleUpdate('icon', icon)}
                            />
                            <ColorPicker
                                value={project.color}
                                onChange={(color) => handleUpdate('color', color)}
                                minimal
                            />
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            value={project.name}
                            onChange={(e) => handleUpdate('name', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {project.icon || project.color
                                ? 'Custom icon and color are applied across the dashboard'
                                : 'Using default icon and color'}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
