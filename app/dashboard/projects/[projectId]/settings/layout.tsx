'use client'

import {useParams, usePathname} from 'next/navigation'
import Link from 'next/link'
import {useProjectSettings} from '@/hooks/useProjectSettings'
import {DynamicIcon} from '@/components/ui/icon-picker'
import {AlertTriangle, FolderKanban, Palette, Puzzle, Settings, Shield, Tag, type LucideIcon} from 'lucide-react'
import {cn} from '@/lib/utils'

interface SettingsTab {
    id: string
    label: string
    icon: LucideIcon
    href: string
    className?: string
}

export default function ProjectSettingsLayout({children}: { children: React.ReactNode }) {
    const params = useParams()
    const projectId = params.projectId as string
    const pathname = usePathname()
    const {project, isLoading} = useProjectSettings(projectId)

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    const accentColor = project.color
    const basePath = `/dashboard/projects/${projectId}/settings`

    const tabs: SettingsTab[] = [
        {id: 'general', label: 'General', icon: Settings, href: basePath},
        {id: 'access', label: 'Access', icon: Shield, href: `${basePath}/access`},
        {id: 'theme', label: 'Theme', icon: Palette, href: `${basePath}/theme`},
        {id: 'integrations', label: 'Integrations', icon: Puzzle, href: `${basePath}/integrations`},
        {id: 'tags', label: 'Tags', icon: Tag, href: `${basePath}/tags`},
        {id: 'danger', label: 'Danger', icon: AlertTriangle, href: `${basePath}/danger`, className: 'text-destructive'}
    ]

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-screen-xl px-4 py-4 md:py-8">
                {/* Page header */}
                <div
                    className="flex items-center gap-3 mb-6 rounded-xl border p-4"
                    style={accentColor ? {
                        backgroundColor: `${accentColor}0d`,
                        borderColor: `${accentColor}30`,
                    } : undefined}
                >
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                            backgroundColor: accentColor ? `${accentColor}1a` : undefined,
                            borderColor: accentColor ? `${accentColor}40` : undefined,
                            color: accentColor || undefined,
                        }}
                    >
                        <DynamicIcon
                            name={project.icon}
                            fallback={FolderKanban}
                            className="h-5 w-5"
                        />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold leading-tight">Settings</h1>
                        <p className="text-sm text-muted-foreground truncate">{project.name}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Left nav */}
                    <div className="w-full md:w-56 shrink-0 md:sticky md:top-8">
                        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0">
                            {tabs.map(({id, label, icon: Icon, href, className}) => {
                                const isActive = href === basePath ? pathname === basePath : pathname.startsWith(href)
                                const useAccent = isActive && accentColor && !className

                                return (
                                    <Link
                                        key={id}
                                        href={href}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                                            isActive
                                                ? (useAccent ? "" : "bg-secondary")
                                                : "hover:bg-secondary/50",
                                            className || "text-foreground"
                                        )}
                                        style={useAccent ? {
                                            backgroundColor: `${accentColor}1a`,
                                            color: accentColor || undefined,
                                        } : undefined}
                                    >
                                        <Icon className="h-4 w-4"/>
                                        {label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Page content */}
                    <div className="flex-1 w-full min-w-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
