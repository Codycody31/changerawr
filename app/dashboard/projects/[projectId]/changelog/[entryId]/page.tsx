'use client'

import { use } from 'react'
import { ChangelogEditor } from '@/components/changelog/ChangelogEditor'
import { DevToolsConsole } from '@/components/extensions/DevToolsConsole'

interface ChangelogPageProps {
    params: Promise<{
        projectId: string
        entryId?: string
    }>
}

export default function ChangelogEntryPage({ params }: ChangelogPageProps) {
    const { projectId, entryId } = use(params)

    return (
        <>
            <ChangelogEditor projectId={projectId} entryId={entryId} />
            <DevToolsConsole />
        </>
    )
}