'use client'

import { use } from 'react'
import { ChangelogEditor } from '@/components/changelog/ChangelogEditor'

interface NewChangelogPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default function NewChangelogEntryPage({ params }: NewChangelogPageProps) {
    const { projectId } = use(params)

    return <ChangelogEditor projectId={projectId} isNewChangelog={true} />
}