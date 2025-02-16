'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

// Fetch project name util function
async function fetchProjectName(projectId: string) {
    try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) return null
        const project = await response.json()
        return project.name
    } catch (error: unknown) {
        console.log(error)
        return null
    }
}

// Utility to humanize route segments
function humanizeSegment(segment: string) {
    return segment
        .replace(/-/g, ' ')
        .replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        )
}

export function Breadcrumbs() {
    const pathname = usePathname()
    const pathSegments = pathname.split('/').filter(segment => segment)

    // Check if we have a project ID in the path (assuming 25-char alphanumeric)
    const projectIdIndex = pathSegments.findIndex(segment =>
        /^[a-z0-9]{25}$/.test(segment)
    )

    // Custom hook to fetch project name if applicable
    const useProjectName = (projectId?: string) => {
        return useQuery({
            queryKey: ['project-name', projectId],
            queryFn: () => projectId ? fetchProjectName(projectId) : null,
            enabled: !!projectId,
        })
    }

    // Fetch project name if applicable
    const { data: projectName } = useProjectName(
        projectIdIndex !== -1 ? pathSegments[projectIdIndex] : undefined
    )

    return (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
            <ol className="flex items-center space-x-1 overflow-x-auto max-w-full">
                {pathSegments.map((segment, index) => {
                    const href = `/${pathSegments.slice(0, index + 1).join('/')}`
                    const isLast = index === pathSegments.length - 1

                    // Replace project ID with project name if available
                    const displaySegment =
                        projectName && index === projectIdIndex
                            ? projectName
                            : humanizeSegment(segment)

                    return (
                        <li
                            key={href}
                            className="flex items-center min-w-0 whitespace-nowrap"
                        >
                            {index > 0 && (
                                <ChevronRight
                                    className="h-4 w-4 mx-1 flex-shrink-0 text-gray-400"
                                    aria-hidden="true"
                                />
                            )}
                            <Link
                                href={href}
                                className={cn(
                                    "max-w-[200px] truncate transition-colors duration-200",
                                    isLast
                                        ? "text-foreground font-semibold cursor-default"
                                        : "text-muted-foreground hover:text-foreground hover:underline"
                                )}
                            >
                                {displaySegment}
                            </Link>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}