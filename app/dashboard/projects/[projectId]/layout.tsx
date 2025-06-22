'use client'

import {useQuery} from '@tanstack/react-query'
import {useParams} from 'next/navigation'
import {ProjectSidebar} from '@/components/project/ProjectSidebar'
import {Skeleton} from '@/components/ui/skeleton'
import React from "react";

export default function ProjectLayout({
                                          children,
                                      }: {
    children: React.ReactNode
}) {
    const params = useParams()
    const projectId = params.projectId as string

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {data: project, isLoading} = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`)
            if (!response.ok) throw new Error('Failed to fetch project')
            return response.json()
        }
    })

    return (
        <div className="flex h-full">
            {isLoading ? (
                <div className="min-w-[260px] max-w-[280px] h-full border-r">
                    <div className="p-4 border-b">
                        <Skeleton className="h-8 w-36"/>
                    </div>
                    <div className="p-4 space-y-3">
                        {Array.from({length: 4}).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full"/>
                        ))}
                    </div>
                </div>
            ) : (
                <ProjectSidebar projectId={projectId}/>
            )}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    )
}