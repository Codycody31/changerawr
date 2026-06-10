'use client'

import {useEffect} from 'react'
import {useParams} from 'next/navigation'
import {ProjectSidebar} from '@/components/project/ProjectSidebar'
import {useSidebarOverride} from '@/context/sidebar-override'
import React from "react";

export default function ProjectLayout({
                                          children,
                                      }: {
    children: React.ReactNode
}) {
    const params = useParams()
    const projectId = params.projectId as string
    const {setProjectSidebarActive} = useSidebarOverride()

    useEffect(() => {
        setProjectSidebarActive(true)
        return () => setProjectSidebarActive(false)
    }, [setProjectSidebarActive])

    return (
        <>
            <ProjectSidebar projectId={projectId}/>
            {children}
        </>
    )
}
