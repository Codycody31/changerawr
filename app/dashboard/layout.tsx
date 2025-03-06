'use client'

import React, {useEffect, useState} from 'react'
import Link from 'next/link'
import {usePathname, useRouter} from 'next/navigation'
import {useAuth} from '@/context/auth'
import {
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    FileText,
    Folder,
    Fingerprint,
    Key,
    LayoutGrid,
    Loader2,
    LogOut,
    Menu,
    ServerCog,
    Settings,
    Shield,
    Users,
} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from '@/components/ui/dialog'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from '@/components/ui/tooltip'
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,} from "@/components/ui/sheet"
import {getGravatarUrl} from '@/lib/utils/gravatar'
import {cn} from '@/lib/utils'
import {User} from "@prisma/client";

// Navigation Configuration
const NAV_SECTIONS = [
    {
        title: "Main",
        items: [
            {
                href: "/dashboard",
                label: "Dashboard",
                icon: LayoutGrid,
                requiredRole: ['ADMIN', 'STAFF']
            },
            {
                href: "/dashboard/projects",
                label: "Projects",
                icon: Folder,
                requiredRole: ['ADMIN', 'STAFF']
            }
        ]
    },
    {
        title: "Admin",
        items: [
            {
                href: "/dashboard/admin",
                label: "Overview",
                icon: Shield,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/users",
                label: "User Management",
                icon: Users,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/oauth",
                label: "OAuth Providers",
                icon: Fingerprint,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/api-keys",
                label: "API Keys",
                icon: Key,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/audit-logs",
                label: "Audit Logs",
                icon: FileText,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/requests",
                label: "Requests",
                icon: ClipboardCheck,
                requiredRole: ['ADMIN']
            },
            {
                href: "/dashboard/admin/system",
                label: "System Config",
                icon: ServerCog,
                requiredRole: ['ADMIN']
            },
        ]
    },
    {
        title: "Account",
        items: [
            {
                href: "/dashboard/settings",
                label: "Settings",
                icon: Settings,
                requiredRole: ['ADMIN', 'STAFF']
            }
        ]
    }
]

// User Menu Component
function UserMenu({user, logout}: { user: User; logout: () => Promise<void> }) {
    const getUserInitial = () => {
        if (user.name) return user.name[0].toUpperCase()
        if (user.email) return user.email[0].toUpperCase()
        return '?'
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="flex items-center p-2 hover:bg-accent rounded-md transition-colors cursor-pointer">
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={user.email ? getGravatarUrl(user.email, 80) : undefined}
                            alt={user.name || 'User avatar'}
                        />
                        <AvatarFallback>{getUserInitial()}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3 text-left">
                        <p className="text-sm font-semibold truncate">
                            {user.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.email || 'No email'}
                        </p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>My Account</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage
                            src={user.email ? getGravatarUrl(user.email, 160) : undefined}
                            alt={user.name || 'User avatar'}
                        />
                        <AvatarFallback>{getUserInitial()}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <p className="font-semibold">{user.name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>
                        <p className="text-xs uppercase text-muted-foreground mt-1">
                            {user.role || 'Unknown Role'}
                        </p>
                    </div>
                    <div className="flex w-full space-x-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            asChild
                        >
                            <Link href="/dashboard/settings">
                                <Settings className="h-4 w-4 mr-2"/>
                                Settings
                            </Link>
                        </Button>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={logout}
                        >
                            <LogOut className="h-4 w-4 mr-2"/>
                            Logout
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Sidebar Component
function Sidebar({
                     user,
                     logout,
                     isExpanded,
                     setIsExpanded
                 }: {
    user: User;
    logout: () => Promise<void>;
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
}) {
    const pathname = usePathname()

    // Filter navigation items based on user role
    const filteredNavSections = NAV_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.requiredRole.includes(user.role)
        )
    })).filter(section => section.items.length > 0)

    return (
        <aside
            className={cn(
                "hidden md:flex fixed inset-y-0 left-0 z-40 bg-background border-r transition-all duration-300 ease-in-out",
                isExpanded ? "w-64" : "w-16"
            )}
            data-expanded={isExpanded}
        >
            <div className="flex flex-col w-full">
                {/* Header */}
                <div className="h-16 flex items-center justify-between border-b px-4">
                    {isExpanded && (
                        <Link
                            href="/dashboard"
                            className="text-xl font-bold truncate"
                        >
                            Changerawr
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("", isExpanded ? "" : "mx-auto")}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <ChevronLeft className="h-5 w-5"/>
                        ) : (
                            <ChevronRight className="h-5 w-5"/>
                        )}
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {filteredNavSections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-4">
                            {isExpanded && (
                                <p className="text-xs text-muted-foreground px-4 mb-2">
                                    {section.title}
                                </p>
                            )}
                            {section.items.map((item) => (
                                <TooltipProvider key={item.href}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center p-2 transition-colors",
                                                    isExpanded ? "px-4" : "justify-center",
                                                    pathname === item.href
                                                        ? "bg-accent text-accent-foreground"
                                                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0"/>
                                                {isExpanded && (
                                                    <span className="ml-3 text-sm truncate">
                                                        {item.label}
                                                    </span>
                                                )}
                                            </Link>
                                        </TooltipTrigger>
                                        {!isExpanded && (
                                            <TooltipContent side="right">
                                                {item.label}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User Section */}
                <div className="border-t p-2">
                    {isExpanded ? (
                        <UserMenu user={user} logout={logout}/>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-full h-auto py-2"
                                        onClick={() => setIsExpanded(true)}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={user.email ? getGravatarUrl(user.email, 80) : undefined}
                                                alt={user.name || 'User avatar'}
                                            />
                                            <AvatarFallback>
                                                {user.name?.[0] || user.email?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    Expand to view profile
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        </aside>
    )
}

// Mobile Navigation Component
function MobileNav({user, logout}: { user: User; logout: () => Promise<void> }) {
    const pathname = usePathname()

    // Filter navigation items based on user role
    const filteredNavSections = NAV_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.requiredRole.includes(user.role)
        )
    })).filter(section => section.items.length > 0)

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md z-50 border-b">
            <div className="flex items-center justify-between px-4 h-full">
                <Link href="/dashboard" className="text-xl font-semibold">
                    Changerawr
                </Link>

                <div className="flex items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5"/>
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Navigation</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4">
                                {filteredNavSections.map((section, sectionIndex) => (
                                    <div key={sectionIndex} className="mb-4">
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {section.title}
                                        </p>
                                        {section.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center p-2 rounded-md transition-colors mb-1",
                                                    pathname === item.href
                                                        ? "bg-accent text-accent-foreground"
                                                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 mr-3"/>
                                                <span className="text-sm">
                                                    {item.label}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <UserMenu user={user} logout={logout}/>
                </div>
            </div>
        </header>
    )
}

// Loading Component
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4"/>
            </div>
        </div>
    )
}

// Main Layout Component
export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const {user, isLoading, logout} = useAuth()
    const [isExpanded, setIsExpanded] = useState(true)

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    // Show loading screen while checking auth
    if (isLoading) {
        return <LoadingScreen/>
    }

    // Redirect to login if no user
    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                user={user}
                logout={logout}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
            />
            <MobileNav user={user} logout={logout}/>

            <main
                className={cn(
                    "pt-16 md:pt-0 transition-all duration-300",
                    "md:ml-16",
                    isExpanded ? "md:ml-64" : "md:ml-16"
                )}
            >
                <div className="p-4 md:p-8 mx-auto max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    )
}