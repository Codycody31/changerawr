'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Users,
    FileText,
    Link as LinkIcon,
    Database,
    Activity,
    ChevronRight,
    ArrowRight,
    Sparkles,
} from 'lucide-react'

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UpdateStatus } from '@/lib/types/easypanel'

// Types for our dashboard data
interface AdminDashboardData {
    userCount: {
        total: number
        admins: number
        staff: number
    }
    systemHealth: {
        databaseConnected: boolean
        lastDataSync: string
    }
    changelog: {
        totalEntries: number
        entriesThisMonth: number
    }
    invitations: {
        total: number
        pending: number
    }
}

export default function AdminOverviewPage() {
    // Fetch admin dashboard data
    const { data: dashboardData, isLoading } = useQuery<AdminDashboardData>({
        queryKey: ['admin-dashboard'],
        queryFn: async () => {
            const response = await fetch('/api/admin/dashboard')
            if (!response.ok) throw new Error('Failed to fetch dashboard data')
            return response.json()
        }
    })

    const { data: updateStatus } = useQuery<UpdateStatus>({
        queryKey: ['update-status'],
        queryFn: async () => {
            const res = await fetch('/api/system/update-status', { cache: 'no-store' })
            if (!res.ok) throw new Error('Not available')
            return res.json()
        },
        retry: false,
    })

    // Quick Action items
    const quickActions = [
        {
            title: 'Manage Users',
            icon: Users,
            href: '/dashboard/admin/users',
            description: 'Add or modify user accounts'
        },
        {
            title: 'Audit Logs',
            icon: Activity,
            href: '/dashboard/admin/audit-logs',
            description: 'Review system activities'
        },
        {
            title: 'API Keys',
            icon: LinkIcon,
            href: '/dashboard/admin/api-keys',
            description: 'Manage API access'
        }
    ]

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((_, index) => (
                        <div
                            key={index}
                            className="h-24 bg-muted rounded-lg animate-pulse"
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>

                {/* Update banner */}
                {updateStatus?.available && (
                    <a
                        href="/dashboard/admin/about"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    >
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium flex-1">A new version is available</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                    </a>
                )}

                {/* Key Metrics Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Users Metric */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                                Users
                            </CardTitle>
                            <Badge variant="secondary">Total</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {dashboardData?.userCount.total ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Admins: {dashboardData?.userCount.admins ?? 0}
                                <span className="mx-1">|</span>
                                Staff: {dashboardData?.userCount.staff ?? 0}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Invitations Metric */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <LinkIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                                Invitations
                            </CardTitle>
                            <Badge variant="secondary">Pending</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {dashboardData?.invitations.pending ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Total: {dashboardData?.invitations.total ?? 0}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Changelog Metric */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                                Changelogs
                            </CardTitle>
                            <Badge variant="secondary">This Month</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {dashboardData?.changelog.entriesThisMonth ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Total: {dashboardData?.changelog.totalEntries ?? 0}
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Health Metric */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Database className="h-5 w-5 mr-2 text-muted-foreground" />
                                System Health
                            </CardTitle>
                            <Badge
                                variant={dashboardData?.systemHealth.databaseConnected ? "default" : "destructive"}
                            >
                                Status
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium">
                                {dashboardData?.systemHealth.databaseConnected
                                    ? "Operational"
                                    : "Connection Issues"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Last Sync: {dashboardData?.systemHealth.lastDataSync ?? 'N/A'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {quickActions.map((action) => (
                            <Button
                                key={action.title}
                                variant="outline"
                                className="w-full justify-between px-4 py-6 h-auto"
                                asChild
                            >
                                <a href={action.href}>
                                    <div className="flex items-center">
                                        <action.icon className="h-5 w-5 mr-3 text-muted-foreground" />
                                        <div className="text-left">
                                            <div className="font-medium">{action.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {action.description}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </a>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}