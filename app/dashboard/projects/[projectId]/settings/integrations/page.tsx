'use client'

import {use} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {useProjectSettings} from '@/hooks/useProjectSettings'
import {
    ArrowRight,
    CheckCircle,
    Clock,
    Code,
    ExternalLink,
    Github,
    Globe,
    Lock,
    Mail,
    Puzzle,
    Rss,
    Slack,
    type LucideIcon,
} from 'lucide-react'

interface IntegrationsSettingsPageProps {
    params: Promise<{ projectId: string }>
}

type IntegrationAction =
    | { type: 'navigate'; label: string; path: string }
    | { type: 'external'; label: string; url: string }

interface IntegrationDefinition {
    id: string
    name: string
    description: string
    icon: LucideIcon
    status: 'stable' | 'beta'
    requiresPublic: boolean
    action: IntegrationAction
}

export default function IntegrationsSettingsPage({params}: IntegrationsSettingsPageProps) {
    const {projectId} = use(params)
    const router = useRouter()
    const {project, isLoading} = useProjectSettings(projectId)

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    // Integration definitions - organized for better scalability
    const integrations: IntegrationDefinition[] = [
        {
            id: 'widget',
            name: 'Changelog Widget',
            description: 'Embed a customizable widget into your website',
            icon: Code,
            status: 'stable',
            requiresPublic: true,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/integrations/widget`
            }
        },
        {
            id: 'email',
            name: 'Email Notifications',
            description: 'Send updates to subscribers via email',
            icon: Mail,
            status: 'stable',
            requiresPublic: false,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/integrations/email`
            }
        },
        {
            id: 'github',
            name: 'GitHub Integration',
            description: 'Use your GitHub data with changelogs',
            icon: Github,
            status: 'stable',
            requiresPublic: false,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/integrations/github`
            }
        },
        {
            id: 'rss',
            name: 'RSS Feed',
            description: 'Subscribe to changelog updates',
            icon: Rss,
            status: 'stable',
            requiresPublic: true,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/integrations/rss`
            }
        },
        {
            id: 'domains',
            name: 'Domains',
            description: 'Configure a custom domain for your public changelog',
            icon: Globe,
            status: 'stable',
            requiresPublic: true,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/domains`
            }
        },
        {
            id: 'slack',
            name: 'Slack',
            description: 'Post changelog updates to your Slack workspace',
            icon: Slack,
            status: 'stable',
            requiresPublic: false,
            action: {
                type: 'navigate',
                label: 'Configure',
                path: `/dashboard/projects/${projectId}/integrations/slack`
            }
        }
    ]

    const comingSoonIntegrations = ['Discord', 'Teams', 'Zapier', 'Webhook']
    const accentColor = project.color

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <Puzzle className="h-4 w-4 text-primary"/>
                    </div>
                    <CardTitle className="text-xl">Integrations</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                    Connect your changelog with external services and automation tools
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!project.isPublic && (
                    <Alert icon={<Lock className="h-4 w-4 text-amber-600 dark:text-amber-400"/>}
                           className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Some integrations require your project to be public. Enable public access to unlock all
                            features.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Available Integrations Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {integrations.map((integration) => {
                        const Icon = integration.icon
                        const isBlocked = integration.requiresPublic && !project.isPublic

                        return (
                            <Card
                                key={integration.id}
                                className={`group relative overflow-hidden transition-all duration-200 ${
                                    isBlocked
                                        ? 'border-dashed border-border/60 bg-muted/20 opacity-70'
                                        : accentColor
                                            ? 'border-border/50 bg-card hover:shadow-md hover:-translate-y-0.5'
                                            : 'border-border/50 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
                                }`}
                            >
                                {/* Accent line for active integrations */}
                                {!isBlocked && (
                                    <div
                                        className="h-0.5"
                                        style={{
                                            background: accentColor
                                                ? `linear-gradient(to right, ${accentColor}99, ${accentColor}30, transparent)`
                                                : undefined
                                        }}
                                    >
                                        {!accentColor && (
                                            <div className="h-full w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent"/>
                                        )}
                                    </div>
                                )}

                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {/* Header with icon and status */}
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`p-2 rounded-xl transition-colors shrink-0 ${
                                                    isBlocked
                                                        ? 'bg-muted/60 text-muted-foreground/60'
                                                        : !accentColor
                                                            ? 'bg-primary/10 text-primary group-hover:bg-primary/15 dark:bg-primary/20 dark:group-hover:bg-primary/25'
                                                            : ''
                                                }`}
                                                style={!isBlocked && accentColor ? {
                                                    backgroundColor: `${accentColor}1a`,
                                                    color: accentColor,
                                                } : undefined}
                                            >
                                                <Icon className="h-5 w-5"/>
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-foreground text-sm">{integration.name}</h3>
                                                    {integration.status === 'beta' && (
                                                        <Badge variant="outline"
                                                               className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800">
                                                            <Clock className="h-3 w-3 mr-1"/>
                                                            Beta
                                                        </Badge>
                                                    )}
                                                    {integration.status === 'stable' && (
                                                        <Badge variant="outline"
                                                               className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
                                                            <CheckCircle className="h-3 w-3 mr-1"/>
                                                            Stable
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {integration.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action area */}
                                        <div className="flex justify-end">
                                            {isBlocked ? (
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/60 rounded-lg border border-dashed w-full justify-center">
                                                    <Lock className="h-3.5 w-3.5"/>
                                                    <span>Public project required</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (integration.action.type === 'navigate') {
                                                            router.push(integration.action.path!)
                                                        } else if (integration.action.type === 'external') {
                                                            window.open(integration.action.url, '_blank')
                                                        }
                                                    }}
                                                    className="gap-2 w-full transition-all hover:shadow-sm bg-background hover:bg-accent"
                                                >
                                                    {integration.action.label}
                                                    {integration.action.type === 'external' ? (
                                                        <ExternalLink className="h-4 w-4"/>
                                                    ) : (
                                                        <ArrowRight className="h-4 w-4"/>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>

                                {/* Subtle overlay for blocked integrations */}
                                {isBlocked && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-background/30 pointer-events-none"/>
                                )}
                            </Card>
                        )
                    })}
                </div>

                {/* Coming Soon Section */}
                <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 rounded bg-muted">
                            <Clock className="h-3 w-3 text-muted-foreground"/>
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">Coming Soon</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {comingSoonIntegrations.map((name) => (
                            <div
                                key={name}
                                className="group flex items-center justify-center h-12 rounded-lg border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground font-medium transition-colors hover:bg-muted/40 hover:border-border"
                            >
                                {name}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
