import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Clock, FileText } from 'lucide-react'

interface RecentChangelogItemProps {
    id: string
    projectId: string
    title: string
    updatedAt: string
}

export function RecentChangelogItem({
                                        id,
                                        projectId,
                                        title,
                                        updatedAt
                                    }: RecentChangelogItemProps) {
    return (
        <Link
            href={`/dashboard/projects/${projectId}/changelog/${id}`}
            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md text-sm transition-colors"
        >
            <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDistanceToNow(new Date(updatedAt))} ago</span>
                </div>
            </div>
        </Link>
    )
}