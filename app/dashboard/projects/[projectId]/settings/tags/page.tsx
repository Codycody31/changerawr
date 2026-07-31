'use client'

import {use} from 'react'
import TagManagement from '@/components/project/settings/TagManagement'

interface TagsSettingsPageProps {
    params: Promise<{ projectId: string }>
}

export default function TagsSettingsPage({params}: TagsSettingsPageProps) {
    const {projectId} = use(params)

    return <TagManagement projectId={projectId}/>
}
