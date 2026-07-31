'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Shows a count of pending (+ resubmitted) changelog requests in the sidebar.
 * Uses the same React Query cache as the Management component so that approving/
 * rejecting from the management page immediately refreshes the badge.
 */
export function PendingRequestsBadge() {
    const { data = 0 } = useQuery<number>({
        queryKey: ['pending-requests-count'],
        queryFn: async () => {
            const res = await fetch('/api/changelog/requests', { cache: 'no-store' })
            if (!res.ok) return 0
            const data = await res.json()
            if (!Array.isArray(data)) return 0
            return data.filter((r: { status: string }) =>
                r.status === 'PENDING' || r.status === 'CHANGES_REQUESTED_PENDING'
            ).length
        },
        staleTime: 2 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
    })

    if (!data) return null

    return (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none shrink-0">
            {data > 99 ? '99+' : data}
        </span>
    )
}
