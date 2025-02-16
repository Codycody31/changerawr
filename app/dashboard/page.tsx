'use client'

import { useAuth } from '@/context/auth'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
    const { user } = useAuth()

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Welcome back, {user?.name}
                    </h1>
                    <p className="text-muted-foreground">
                        Here&apos;s what&apos;s happening with your changelogs
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Changes</CardTitle>
                            <CardDescription>
                                Your most recent changelog entries
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                                <FileText className="h-4 w-4" />
                                <span>No recent changes</span>
                            </div>
                        </CardContent>
                    </Card>

                    {user?.role === 'ADMIN' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Team Activity</CardTitle>
                                <CardDescription>
                                    Recent activity from your team
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No recent team activity
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}