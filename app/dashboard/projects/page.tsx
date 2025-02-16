'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth'
import ProjectsPage from "@/components/project/ProjectSettingsPage";

interface PageProps {
    params: Promise<{ projectId: string }>
}

export default function SettingsPageWrapper({ params }: PageProps) {
    const router = useRouter()
    const { user } = useAuth()

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.push('/dashboard/projects')
        }
    }, [user, router])

    return <ProjectsPage/>
}