'use client'

import { use } from 'react'
import { ChangelogEditor } from '@/components/changelog/ChangelogEditor'

interface ChangelogPageProps {
    params: Promise<{
        projectId: string
        entryId?: string
    }>
}

export default function ChangelogEntryPage({ params }: ChangelogPageProps) {
    const { projectId, entryId } = use(params)

    return <ChangelogEditor projectId={projectId} entryId={entryId} />
}