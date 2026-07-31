'use client'

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useToast} from '@/hooks/use-toast'
import type {RssFeedConfig} from '@/lib/services/changelog/rss'

export interface ProjectSettings {
    id: string
    name: string
    color: string | null
    icon: string | null
    isPublic: boolean
    allowAutoPublish: boolean
    requireApproval: boolean
    maintenanceMode: boolean
    maintenanceMessage: string | null
    allowIndexing: boolean
    enableRss: boolean
    rssItemLimit: number
    rssFullContent: boolean
    rssFeedConfig: RssFeedConfig | null
    defaultTags: string[]
    updatedAt: string
}

export function useProjectSettings(projectId: string) {
    const {toast} = useToast()
    const queryClient = useQueryClient()

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

    const handleUpdate = (field: keyof ProjectSettings, value: unknown) => {
        updateSettings.mutate({[field]: value})
    }

    return {project, isLoading, updateSettings, handleUpdate}
}
