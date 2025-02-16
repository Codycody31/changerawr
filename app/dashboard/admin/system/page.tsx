'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/auth'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// Define the system configuration schema
const systemConfigSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30),
    requireApprovalForChangelogs: z.boolean(),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000),
    enableAnalytics: z.boolean(),
    enableNotifications: z.boolean(),
})

type SystemConfig = z.infer<typeof systemConfigSchema>

export default function SystemConfigPage() {
    const { user } = useAuth()
    const { toast } = useToast()

    // Fetch current system configuration
    const { data: config, isLoading } = useQuery<SystemConfig>({
        queryKey: ['system-config'],
        queryFn: async () => {
            const response = await fetch('/api/admin/config')
            if (!response.ok) throw new Error('Failed to fetch system configuration')
            return response.json()
        },
    })

    const form = useForm<SystemConfig>({
        resolver: zodResolver(systemConfigSchema),
        defaultValues: {
            defaultInvitationExpiry: 7,
            requireApprovalForChangelogs: true,
            maxChangelogEntriesPerProject: 100,
            enableAnalytics: true,
            enableNotifications: true,
        },
        values: config,
    })

    // Update system configuration
    const updateConfig = useMutation({
        mutationFn: async (data: SystemConfig) => {
            const response = await fetch('/api/admin/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!response.ok) throw new Error('Failed to update system configuration')
            return response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Configuration Updated',
                description: 'System configuration has been successfully updated.',
            })
        },
        onError: (error) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You do not have permission to access system configuration.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container max-w-4xl p-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>
                        Manage global system settings and defaults
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => updateConfig.mutate(data))} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="defaultInvitationExpiry"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Default Invitation Expiry (days)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Number of days before invitation links expire
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="requireApprovalForChangelogs"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">
                                                    Require Approval for Changelogs
                                                </FormLabel>
                                                <FormDescription>
                                                    Require admin approval before publishing changelog entries
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="maxChangelogEntriesPerProject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Changelog Entries per Project</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Maximum number of changelog entries allowed per project
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="enableAnalytics"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        Enable Analytics
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Collect and display analytics for changelog entries
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="enableNotifications"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        Enable Notifications
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Send notifications for changelog updates and approvals
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={updateConfig.isPending}
                                >
                                    {updateConfig.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}