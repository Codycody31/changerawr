'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChangelogEditor } from '@/components/changelog/ChangelogEditor'
import { useEffect, useState } from 'react'

interface NewChangelogPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default function NewChangelogEntryPage({ params }: NewChangelogPageProps) {
    const { projectId } = use(params)
    const searchParams = useSearchParams()
    const [initialContent, setInitialContent] = useState<string>('')
    const [initialVersion, setInitialVersion] = useState<string>('')
    const [initialTitle, setInitialTitle] = useState<string>('')

    useEffect(() => {
        // Get content from URL parameter and decode it
        const contentParam = searchParams.get('content')
        const versionParam = searchParams.get('version')
        const titleParam = searchParams.get('title')

        if (contentParam) {
            try {
                const decodedContent = decodeURIComponent(escape(atob(contentParam)))
                console.log('decodedContent', decodedContent)
                setInitialContent(decodedContent)

                // If no title is provided, try to extract one from the content
                if (!titleParam && decodedContent) {
                    const titleMatch = decodedContent.match(/^#\s+(.+)/m)
                    if (titleMatch) {
                        setInitialTitle(titleMatch[1].trim())
                    }
                }
            } catch (error) {
                console.warn('Failed to decode content parameter:', error)
            }
        }

        if (versionParam) {
            setInitialVersion(versionParam)
        }

        if (titleParam) {
            setInitialTitle(titleParam)
        }
    }, [searchParams])

    return (
        <ChangelogEditor
            projectId={projectId}
            isNewChangelog={true}
            initialContent={initialContent}
            initialVersion={initialVersion}
            initialTitle={initialTitle}
        />
    )
}