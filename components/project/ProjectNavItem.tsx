import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ProjectNavItemProps {
    href: string
    icon: LucideIcon
    label: string
    isActive?: boolean
}

export function ProjectNavItem({
                                   href,
                                   icon: Icon,
                                   label,
                                   isActive
                               }: ProjectNavItemProps) {
    const pathname = usePathname()
    const isCurrentPath = isActive ?? pathname === href

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center py-2 px-3 text-sm rounded-md transition-colors",
                isCurrentPath
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
        >
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
        </Link>
    )
}