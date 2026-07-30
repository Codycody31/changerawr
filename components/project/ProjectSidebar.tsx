// /components/project/ProjectSidebar.tsx

'use client'

import React, {useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useQuery} from '@tanstack/react-query'
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LayoutDashboard,
    Settings,
    FileText,
    ExternalLink,
    Plus,
    Clock,
    Bookmark,
    Eye,
    Star,
    Code,
    History,
    UserSquare2,
    PenTool,
    MailIcon,
    Rss,
    Menu,
    type LucideIcon,
    ChartNoAxesCombined,
    Globe,
    Key
} from 'lucide-react';
import {SiGithub} from '@icons-pack/react-simple-icons';
import {Button} from '@/components/ui/button'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Separator} from '@/components/ui/separator'
import {Skeleton} from '@/components/ui/skeleton'
import {Badge} from '@/components/ui/badge'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from '@/components/ui/sheet'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {cn} from '@/lib/utils'
import {formatDistanceToNow} from 'date-fns'
import {useBookmarks} from '@/hooks/useBookmarks'
import {useSidebarOverride} from '@/context/sidebar-override'
import {DynamicIcon} from '@/components/ui/icon-picker'
import {FolderKanban} from 'lucide-react'

interface NavItemProps {
    href: string
    icon: LucideIcon
    label: string
    active?: boolean
    external?: boolean
    badge?: string
    disabled?: boolean
    collapsed?: boolean
    accentColor?: string | null
}

interface ChangelogEntry {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    publishedAt: string | null
    version: string | null
}

interface ChangelogData {
    entries: ChangelogEntry[]
    totalCount: number
}

interface Project {
    id: string
    name: string
    color: string | null
    icon: string | null
    isPublic: boolean
}

interface ProjectBadgeProps {
    color: string | null | undefined
    icon: string | null | undefined
    className?: string
}

function ProjectBadge({color, icon, className}: ProjectBadgeProps) {
    return (
        <div
            className={cn('flex shrink-0 items-center justify-center rounded-lg border', className)}
            style={{
                backgroundColor: color ? `${color}1a` : undefined,
                borderColor: color ? `${color}40` : undefined,
                color: color || undefined,
            }}
        >
            <DynamicIcon name={icon} fallback={FolderKanban} className="h-4 w-4"/>
        </div>
    )
}

function NavItem({href, icon: Icon, label, active, external, badge, disabled, collapsed, accentColor}: NavItemProps) {
    const activeStyle = active && accentColor
        ? {backgroundColor: `${accentColor}1a`, color: accentColor}
        : undefined

    if (collapsed) {
        const iconBox = (
            <div
                className={cn(
                    "flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-colors",
                    disabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : active
                            ? (accentColor ? "" : "bg-accent text-accent-foreground")
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                style={!disabled ? activeStyle : undefined}
            >
                <Icon className="h-4 w-4"/>
            </div>
        )

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {disabled ? (
                            <div>{iconBox}</div>
                        ) : (
                            <Link
                                href={href}
                                {...(external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
                            >
                                {iconBox}
                            </Link>
                        )}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs">
                            {label}
                            {disabled ? ' — requires public project' : badge ? ` (${badge})` : ''}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    if (disabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "flex items-center justify-between py-2 px-3 text-sm rounded-md",
                            "text-muted-foreground/50 bg-muted/20 cursor-not-allowed"
                        )}>
                            <div className="flex items-center">
                                <Icon className="mr-2 h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">{label}</span>
                            </div>
                            {badge && (
                                <Badge variant="outline" className="ml-2 text-xs opacity-50 flex-shrink-0">
                                    {badge}
                                </Badge>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Requires public project</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center justify-between py-2 px-3 text-sm rounded-md transition-colors group",
                active
                    ? (accentColor ? "font-medium" : "bg-accent text-accent-foreground font-medium")
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            style={activeStyle}
            {...(external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
        >
            <div className="flex items-center min-w-0">
                <Icon className="mr-2 h-4 w-4 flex-shrink-0"/>
                <span className="truncate">{label}</span>
            </div>
            {badge && (
                <Badge variant="outline" className="ml-2 text-xs bg-primary/5 group-hover:bg-primary/10 flex-shrink-0">
                    {badge}
                </Badge>
            )}
            {external && <ExternalLink className="ml-2 h-3 w-3 opacity-70 flex-shrink-0"/>}
        </Link>
    )
}

interface RecentChangelogProps {
    id: string
    projectId: string
    title: string
    date: string
    version?: string | null
    isPublished?: boolean
}

function RecentChangelog({
                             id,
                             projectId,
                             title,
                             date,
                             version,
                             isPublished
                         }: RecentChangelogProps) {
    const {toggleBookmark, isBookmarked} = useBookmarks({
        projectId,
        entryId: id
    });

    const handleBookmarkClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleBookmark(id, title, projectId);
    };

    return (
        <div className="group relative">
            <Link
                href={`/dashboard/projects/${projectId}/changelog/${id}`}
                className="block p-2 pr-10 hover:bg-accent/50 rounded-md transition-colors"
            >
                <div className="flex items-start gap-2">
                    <div
                        className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                            <h4 className="font-medium text-sm group-hover:text-primary transition-colors break-words line-clamp-2">
                                {title}
                                {!isPublished && (
                                    <Badge
                                        variant="outline"
                                        className="ml-1.5 inline-flex align-baseline h-5 px-1 text-xs bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                                    >
                                        Draft
                                    </Badge>
                                )}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1"/>
                                <span>{formatDistanceToNow(new Date(date))} ago</span>
                            </div>
                            {version && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                    {version}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
            <div className="absolute right-2 top-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleBookmarkClick}
                            >
                                <Star
                                    className={cn(
                                        "h-3.5 w-3.5",
                                        isBookmarked
                                            ? "text-amber-500 fill-amber-500"
                                            : "text-muted-foreground"
                                    )}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">{isBookmarked ? "Remove bookmark" : "Bookmark"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    )
}

interface BookmarkedChangelogProps {
    id: string
    projectId: string
    title: string
}

function BookmarkedChangelog({id, projectId, title}: BookmarkedChangelogProps) {
    const {removeBookmark} = useBookmarks({projectId});

    const handleRemoveBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await removeBookmark(id, projectId);
    };

    return (
        <div className="group relative">
            <Link
                href={`/dashboard/projects/${projectId}/changelog/${id}`}
                className="flex items-center gap-2 p-2 pr-10 hover:bg-accent/50 rounded-md text-sm transition-colors"
            >
                <Bookmark className="h-4 w-4 text-amber-500 flex-shrink-0"/>
                <span className="line-clamp-1 break-words">
                    {title}
                </span>
            </Link>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleRemoveBookmark}
                            >
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Remove bookmark</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    )
}

interface MobileProjectNavProps {
    projectId: string
    projectName: string | undefined
    projectColor?: string | null
    projectIcon?: string | null
    isPublic: boolean
    changelogCount: number
    pathname: string
    bookmarks: Array<{id: string; title: string}>
}

function MobileProjectNav({projectId, projectName, projectColor, projectIcon, isPublic, changelogCount, pathname, bookmarks}: MobileProjectNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const rssUrl = `/changelog/${projectId}/rss.xml`

    const isActive = (href: string) =>
        pathname === href ||
        (href !== `/dashboard/projects/${projectId}` && pathname.startsWith(href))

    const navItem = (href: string, icon: LucideIcon, label: string, opts?: {badge?: string; external?: boolean; disabled?: boolean}) => {
        if (opts?.disabled) return null
        const active = isActive(href)
        const Icon = icon
        return (
            <Link
                key={href}
                href={href}
                onClick={() => { if (!opts?.external) setIsOpen(false) }}
                {...(opts?.external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
                className={cn(
                    "flex items-center justify-between py-2 px-3 text-sm rounded-md transition-colors group min-h-[44px]",
                    active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
            >
                <div className="flex items-center min-w-0">
                    <Icon className="mr-2 h-4 w-4 flex-shrink-0"/>
                    <span className="truncate">{label}</span>
                </div>
                {opts?.badge && (
                    <Badge variant="outline" className="ml-2 text-xs bg-primary/5 flex-shrink-0">
                        {opts.badge}
                    </Badge>
                )}
                {opts?.external && <ExternalLink className="ml-2 h-3 w-3 opacity-70 flex-shrink-0"/>}
            </Link>
        )
    }

    return (
        <>
            {/* Top bar */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b z-50">
                <div className="flex items-center h-full px-2 gap-1">
                    <Link
                        href="/dashboard/projects"
                        className="flex items-center gap-0.5 h-9 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4"/>
                        <span>Projects</span>
                    </Link>

                    <span className="text-muted-foreground/40 text-xs flex-shrink-0">/</span>

                    <ProjectBadge color={projectColor} icon={projectIcon} className="h-7 w-7 flex-shrink-0"/>

                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                        {projectName || '…'}
                    </span>

                    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
                        <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                            <Plus className="h-4 w-4"/>
                            <span className="sr-only">New entry</span>
                        </Link>
                    </Button>

                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                <Menu className="h-4 w-4"/>
                                <span className="sr-only">Project navigation</span>
                            </Button>
                        </SheetTrigger>

                        {/* Sheet — mirrors the desktop sidebar content exactly */}
                        <SheetContent side="right" className="w-72 p-0 flex flex-col">
                            <SheetTitle className="sr-only">Project navigation</SheetTitle>

                            {/* Header: project name + new entry + rss */}
                            <div className="h-16 flex items-center justify-between border-b px-4 flex-shrink-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <ProjectBadge color={projectColor} icon={projectIcon} className="h-8 w-8"/>
                                    <h2 className="font-semibold truncate text-sm">{projectName || 'Project'}</h2>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {isPublic && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                            <Link href={rssUrl} target="_blank" rel="noopener noreferrer">
                                                <Rss className="h-4 w-4 text-orange-500"/>
                                                <span className="sr-only">RSS Feed</span>
                                            </Link>
                                        </Button>
                                    )}
                                    <Button size="sm" className="h-8 gap-1" asChild>
                                        <Link href={`/dashboard/projects/${projectId}/changelog/new`} onClick={() => setIsOpen(false)}>
                                            <Plus className="h-3.5 w-3.5"/>
                                            <span className="text-xs">New</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Scrollable nav — same structure as desktop sidebar */}
                            <ScrollArea className="flex-1">
                                <div className="py-4 px-3">
                                    {/* Main nav */}
                                    <nav className="space-y-1">
                                        {navItem(`/dashboard/projects/${projectId}`, LayoutDashboard, 'Overview')}
                                        {navItem(`/dashboard/projects/${projectId}/changelog`, FileText, 'All Changelogs', {
                                            badge: changelogCount > 0 ? changelogCount.toString() : undefined
                                        })}
                                        {navItem(`/changelog/${projectId}`, Eye, 'View Public Page', {
                                            external: true,
                                            disabled: !isPublic
                                        })}
                                    </nav>

                                    <Separator className="my-3"/>

                                    <div className="px-3 mb-2">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Integrations
                                        </h3>
                                    </div>

                                    <nav className="space-y-1">
                                        {navItem(`/dashboard/projects/${projectId}/integrations/widget`, Code, 'Widget', {disabled: !isPublic})}
                                        {navItem(`/dashboard/projects/${projectId}/integrations/email`, MailIcon, 'Email')}
                                        {navItem(`/dashboard/projects/${projectId}/integrations/github`, SiGithub as unknown as LucideIcon, 'GitHub')}
                                        {navItem(`/dashboard/projects/${projectId}/analytics`, ChartNoAxesCombined, 'Analytics')}
                                        {navItem(`/dashboard/projects/${projectId}/domains`, Globe, 'Domains', {disabled: !isPublic})}
                                        {navItem(`/dashboard/projects/${projectId}/api-keys`, Key, 'API Keys')}
                                    </nav>

                                    <Separator className="my-3"/>

                                    <nav className="space-y-1">
                                        {navItem(`/dashboard/projects/${projectId}/settings`, Settings, 'Settings')}
                                    </nav>

                                    {/* Private project warning */}
                                    {!isPublic && (
                                        <div className="px-3 py-2 mt-2">
                                            <Alert variant="warning" className="py-2 px-3">
                                                <AlertDescription className="text-xs">
                                                    Make this project public in settings to enable all features.
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {/* Bookmarks */}
                                    {bookmarks.length > 0 && (
                                        <>
                                            <Separator className="my-3"/>
                                            <div className="flex items-center mb-2 px-3">
                                                <Star className="h-4 w-4 text-amber-500 mr-1.5"/>
                                                <h3 className="text-xs font-semibold">Bookmarked</h3>
                                            </div>
                                            <nav className="space-y-1">
                                                {bookmarks.map((bookmark) => {
                                                    const bHref = `/dashboard/projects/${projectId}/changelog/${bookmark.id}`
                                                    const active = isActive(bHref)
                                                    return (
                                                        <Link
                                                            key={bookmark.id}
                                                            href={bHref}
                                                            onClick={() => setIsOpen(false)}
                                                            className="flex items-center gap-2 p-2 pr-3 hover:bg-accent/50 rounded-md text-sm transition-colors min-h-[44px]"
                                                        >
                                                            <Bookmark className={cn(
                                                                "h-4 w-4 flex-shrink-0",
                                                                active ? "text-primary" : "text-amber-500"
                                                            )}/>
                                                            <span className="line-clamp-1 break-words text-muted-foreground hover:text-foreground">
                                                                {bookmark.title}
                                                            </span>
                                                        </Link>
                                                    )
                                                })}
                                            </nav>
                                        </>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Footer */}
                            <div className="p-3 border-t flex items-center justify-between flex-shrink-0">
                                <Button variant="outline" className="justify-start text-xs h-8" asChild>
                                    <Link href="/dashboard/projects" onClick={() => setIsOpen(false)}>
                                        <ChevronLeft className="h-3.5 w-3.5 mr-1"/>
                                        All Projects
                                    </Link>
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    )
}

export function ProjectSidebar({projectId}: { projectId: string }) {
    const pathname = usePathname()
    const {bookmarks, isLoading: isLoadingBookmarks} = useBookmarks({projectId});
    const {isProjectSidebarCollapsed: collapsed, setProjectSidebarCollapsed} = useSidebarOverride()
    const [integrationsOpen, setIntegrationsOpen] = useState(true)

    // Fetch project details
    const {data: project, isLoading: isLoadingProject} = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`)
            if (!response.ok) throw new Error('Failed to fetch project')
            return response.json()
        }
    })

    // Fetch recent changelogs
    const {data: changelogData, isLoading: isLoadingChangelogs} = useQuery<ChangelogData>({
        queryKey: ['recent-changelogs', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog?limit=4`)
            if (!response.ok) throw new Error('Failed to fetch recent changelogs')
            return response.json()
        }
    })

    // Determine if project is public
    const isPublic = project?.isPublic || false;

    // Determine the changelog count
    const changelogCount = changelogData?.totalCount || 0;
    const publishedCount = changelogData?.entries?.filter((e) => e.publishedAt)?.length || 0;
    const draftCount = changelogData?.entries?.filter((e) => !e.publishedAt)?.length || 0;

    // Construct RSS feed URL
    const rssUrl = `/changelog/${projectId}/rss.xml`;

    // Project accent color used for branding active nav states
    const accentColor = project?.color || null;

    if (isLoadingProject) {
        return (
            <>
                <MobileProjectNav
                    projectId={projectId}
                    projectName={undefined}
                    projectColor={null}
                    projectIcon={null}
                    isPublic={false}
                    changelogCount={0}
                    pathname={pathname}
                    bookmarks={[]}
                />
                <div
                    className={cn(
                        "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r bg-background transition-all duration-300",
                        collapsed ? "w-16" : "w-64"
                    )}>
                    <div className="p-4 border-b flex items-center">
                        <Skeleton className={cn("h-8", collapsed ? "w-8" : "w-36")}/>
                    </div>
                    <div className="p-4 space-y-3">
                        {Array.from({length: 4}).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full"/>
                        ))}
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
        <MobileProjectNav
            projectId={projectId}
            projectName={project?.name}
            projectColor={project?.color}
            projectIcon={project?.icon}
            isPublic={isPublic}
            changelogCount={changelogCount}
            pathname={pathname}
            bookmarks={bookmarks}
        />
        <div
            className={cn(
                "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r bg-background transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}>
            {/* Project accent bar */}
            {accentColor && (
                <div className="h-1 w-full flex-shrink-0" style={{backgroundColor: accentColor}}/>
            )}

            {/* Collapse toggle */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setProjectSidebarCollapsed(!collapsed)}
                            className="absolute -right-3 top-6 z-50 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronLeft className="h-3.5 w-3.5"/>}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Header */}
            {collapsed ? (
                <div className="h-16 flex items-center justify-center border-b">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard/projects">
                                    <ProjectBadge color={project?.color} icon={project?.icon} className="h-9 w-9"/>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs">{project?.name || 'Project'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                <div className="h-16 flex items-center justify-between border-b p-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8 flex-shrink-0"
                        >
                            <Link href="/dashboard/projects">
                                <ChevronLeft className="h-4 w-4"/>
                                <span className="sr-only">Back to projects</span>
                            </Link>
                        </Button>
                        <ProjectBadge color={project?.color} icon={project?.icon} className="h-8 w-8"/>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h2 className="font-semibold truncate flex-1">{project?.name || 'Project'}</h2>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">{project?.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    className="h-8 gap-1 flex-shrink-0"
                                    asChild
                                >
                                    <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                        <Plus className="h-3.5 w-3.5"/>
                                        <span className="text-xs">New</span>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">Create a new changelog entry</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            {/* Navigation */}
            <ScrollArea className="flex-1">
                <div className={cn("py-4", collapsed ? "px-2" : "px-3")}>
                    {/* New entry shortcut (collapsed only) */}
                    {collapsed && (
                        <div className="mb-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={`/dashboard/projects/${projectId}/changelog/new`}
                                            className="flex items-center justify-center h-9 w-9 mx-auto rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            <Plus className="h-4 w-4"/>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p className="text-xs">New changelog entry</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    <nav className="space-y-1">
                        <NavItem
                            href={`/dashboard/projects/${projectId}`}
                            icon={LayoutDashboard}
                            label="Overview"
                            active={pathname === `/dashboard/projects/${projectId}`}
                            collapsed={collapsed}
                            accentColor={accentColor}
                        />

                        <NavItem
                            href={`/dashboard/projects/${projectId}/changelog`}
                            icon={FileText}
                            label="All Changelogs"
                            badge={changelogCount > 0 ? changelogCount.toString() : undefined}
                            active={
                                pathname.includes(`/dashboard/projects/${projectId}/changelog`) &&
                                !pathname.includes(`/new`)
                            }
                            collapsed={collapsed}
                            accentColor={accentColor}
                        />

                        <NavItem
                            href={`/changelog/${projectId}`}
                            icon={Eye}
                            label="View Public Page"
                            external={true}
                            disabled={!isPublic}
                            collapsed={collapsed}
                            accentColor={accentColor}
                        />
                    </nav>

                    <Separator className="my-3"/>

                    {collapsed ? (
                        <nav className="space-y-1">
                            <NavItem
                                href={`/dashboard/projects/${projectId}/integrations/widget`}
                                icon={Code}
                                label="Widget"
                                active={pathname.includes(`/dashboard/projects/${projectId}/integrations/widget`)}
                                disabled={!isPublic}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                            <NavItem
                                href={`/dashboard/projects/${projectId}/integrations/email`}
                                icon={MailIcon}
                                label="Email"
                                active={pathname.includes(`/dashboard/projects/${projectId}/integrations/email`)}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                            <NavItem
                                href={`/dashboard/projects/${projectId}/integrations/github`}
                                icon={SiGithub}
                                label="GitHub"
                                active={pathname.includes(`/dashboard/projects/${projectId}/integrations/github`)}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                            <NavItem
                                href={`/dashboard/projects/${projectId}/analytics`}
                                icon={ChartNoAxesCombined}
                                label="Analytics"
                                active={pathname.includes(`/dashboard/projects/${projectId}/analytics`)}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                            <NavItem
                                href={`/dashboard/projects/${projectId}/domains`}
                                icon={Globe}
                                label="Domains"
                                active={pathname.includes(`/dashboard/projects/${projectId}/domains`)}
                                disabled={!isPublic}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                            <NavItem
                                href={`/dashboard/projects/${projectId}/api-keys`}
                                icon={Key}
                                label="API Keys"
                                active={pathname.includes(`/dashboard/projects/${projectId}/api-keys`)}
                                collapsed={collapsed}
                                accentColor={accentColor}
                            />
                        </nav>
                    ) : (
                        <Collapsible open={integrationsOpen} onOpenChange={setIntegrationsOpen}>
                            <CollapsibleTrigger className="w-full flex items-center justify-between px-3 mb-2 group">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Integrations
                                </h3>
                                <ChevronDown className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                    !integrationsOpen && "-rotate-90"
                                )}/>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <nav className="space-y-1">
                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/integrations/widget`}
                                        icon={Code}
                                        label="Widget"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/integrations/widget`)}
                                        disabled={!isPublic}
                                        accentColor={accentColor}
                                    />

                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/integrations/email`}
                                        icon={MailIcon}
                                        label="Email"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/integrations/email`)}
                                        accentColor={accentColor}
                                    />
                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/integrations/github`}
                                        icon={SiGithub}
                                        label="GitHub"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/integrations/github`)}
                                        accentColor={accentColor}
                                    />
                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/analytics`}
                                        icon={ChartNoAxesCombined}
                                        label="Analytics"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/analytics`)}
                                        accentColor={accentColor}
                                    />
                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/domains`}
                                        icon={Globe}
                                        label="Domains"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/domains`)}
                                        disabled={!isPublic}
                                        accentColor={accentColor}
                                    />
                                    <NavItem
                                        href={`/dashboard/projects/${projectId}/api-keys`}
                                        icon={Key}
                                        label="API Keys"
                                        active={pathname.includes(`/dashboard/projects/${projectId}/api-keys`)}
                                        accentColor={accentColor}
                                    />
                                </nav>
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    <Separator className="my-3"/>

                    <nav className="space-y-1">
                        <NavItem
                            href={`/dashboard/projects/${projectId}/settings`}
                            icon={Settings}
                            label="Settings"
                            active={pathname === `/dashboard/projects/${projectId}/settings`}
                            collapsed={collapsed}
                            accentColor={accentColor}
                        />
                    </nav>
                </div>

                {/* Public Project Alert */}
                {!isPublic && !collapsed && (
                    <div className="px-3 py-2">
                        <Alert variant="warning" className="py-2 px-3">
                            <AlertDescription className="text-xs">
                                Make this project public in settings to enable all features.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Bookmarks Section */}
                {!collapsed && !isLoadingBookmarks && bookmarks.length > 0 && (
                    <div className="py-2 px-3 mt-2">
                        <div className="flex items-center mb-2">
                            <Star className="h-4 w-4 text-amber-500 mr-1.5"/>
                            <h3 className="text-xs font-semibold">Bookmarked</h3>
                        </div>

                        <div className="space-y-1">
                            {bookmarks.map((bookmark) => (
                                <BookmarkedChangelog
                                    key={bookmark.id}
                                    id={bookmark.id}
                                    projectId={projectId}
                                    title={bookmark.title}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Changelogs */}
                {!collapsed && (
                <div className="py-2 px-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                            <History className="h-4 w-4 text-primary mr-1.5"/>
                            <h3 className="text-xs font-semibold">Recent Updates</h3>
                        </div>
                        {changelogCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-6 text-xs"
                            >
                                <Link href={`/dashboard/projects/${projectId}/changelog`}>
                                    View all
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="space-y-1">
                        {isLoadingChangelogs ? (
                            Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="p-2">
                                    <Skeleton className="h-5 w-full mb-2"/>
                                    <Skeleton className="h-3 w-24"/>
                                </div>
                            ))
                        ) : changelogData?.entries && changelogData.entries.length > 0 ? (
                            changelogData.entries.map((changelog) => (
                                <RecentChangelog
                                    key={changelog.id}
                                    id={changelog.id}
                                    projectId={projectId}
                                    title={changelog.title}
                                    date={changelog.updatedAt || changelog.createdAt}
                                    version={changelog.version}
                                    isPublished={!!changelog.publishedAt}
                                />
                            ))
                        ) : (
                            <div className="py-6 text-center">
                                <PenTool className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2"/>
                                <p className="text-sm text-muted-foreground">No changelogs yet</p>
                                <Button
                                    variant="link"
                                    asChild
                                    className="mt-2 h-auto p-0"
                                >
                                    <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                        Create your first changelog
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Project Stats */}
                {!collapsed && changelogCount > 0 && (
                    <div className="py-2 px-3 mt-2">
                        <div className="flex items-center mb-2">
                            <UserSquare2 className="h-4 w-4 text-primary mr-1.5"/>
                            <h3 className="text-xs font-semibold">Project Stats</h3>
                        </div>

                        <div className="space-y-1 p-2 bg-muted/40 rounded-md">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Published entries</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs ? (
                                        <Skeleton className="h-3 w-8 inline-block"/>
                                    ) : publishedCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Draft entries</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs ? (
                                        <Skeleton className="h-3 w-8 inline-block"/>
                                    ) : draftCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Last updated</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs || !changelogData?.entries?.length ? (
                                        <Skeleton className="h-3 w-16 inline-block"/>
                                    ) : (
                                        formatDistanceToNow(new Date(changelogData.entries[0].updatedAt || changelogData.entries[0].createdAt)) + ' ago'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            {collapsed ? (
                <div className="p-3 border-t flex flex-col items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                                    <Link href="/dashboard/projects">
                                        <ChevronLeft className="h-3.5 w-3.5"/>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs">All Projects</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {isPublic && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                        <Link href={rssUrl} target="_blank" rel="noopener noreferrer">
                                            <Rss className="h-4 w-4 text-orange-500"/>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="text-xs">RSS Feed</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            ) : (
                <div className="p-3 border-t flex items-center justify-between">
                    <Button variant="outline" className="justify-start text-xs h-8" asChild>
                        <Link href="/dashboard/projects">
                            <ChevronLeft className="h-3.5 w-3.5 mr-1"/>
                            All Projects
                        </Link>
                    </Button>

                    {isPublic && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                        <Link href={rssUrl} target="_blank" rel="noopener noreferrer">
                                            <Rss className="h-4 w-4 text-orange-500"/>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">RSS Feed</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )}
        </div>
        </>
    )
}