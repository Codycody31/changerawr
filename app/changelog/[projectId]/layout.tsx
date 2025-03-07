import { Metadata } from 'next'
import React from "react";

interface ChangelogLayoutProps {
    params: Promise<{ projectId: string }>
    children: React.ReactNode
}

export async function generateMetadata(
    { params }: ChangelogLayoutProps
): Promise<Metadata> {
    const { projectId } = await params

    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
        alternates: {
            types: {
                'application/rss+xml': `/api/changelog/${projectId}/rss.xml`,
            },
        },
    }
}

export default function ChangelogLayout({ children }: ChangelogLayoutProps) {
    return (
        <div className="container mx-auto py-8">
            {children}
        </div>
    )
}