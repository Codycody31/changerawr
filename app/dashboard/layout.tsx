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
    Info,
    X,
    Sparkles, Clock,
} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet"
import {getGravatarUrl} from '@/lib/utils/gravatar'
import {cn} from '@/lib/utils'
import {User} from "@prisma/client";
import {useMediaQuery} from '@/hooks/use-media-query'
import WhatsNewModal from '@/components/dashboard/WhatsNewModal'
import { useWhatsNew } from '@/hooks/useWhatsNew'

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
            },
            {
                href: "/dashboard/requests",
                label: "Requests",
                icon: Clock,
                requiredRole: ['STAFF']
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
                href: "/dashboard/admin/ai-settings",
                label: "AI Integration",
                icon: Sparkles,
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
            {
                href: "/dashboard/admin/about",
                label: "About",
                icon: Info,
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
                            onClick={() => {}}
                        >
                            <DialogClose asChild>
                                <Link href="/dashboard/settings">
                                    <Settings className="h-4 w-4 mr-2"/>
                                    Settings
                                </Link>
                            </DialogClose>
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
    const isTablet = useMediaQuery('(max-width: 1024px)')

    useEffect(() => {
        // Auto-collapse sidebar on tablet devices
        if (isTablet) {
            setIsExpanded(false)
        }
    }, [isTablet, setIsExpanded])

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
            <div className="flex flex-col w-full h-full">
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
                        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
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
                                <p className="text-xs font-medium text-muted-foreground px-4 mb-2">
                                    {section.title}
                                </p>
                            )}
                            {section.items.map((item) => (
                                <TooltipProvider key={item.href}>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center p-2 transition-colors rounded-md mx-2",
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
                <div className="border-t p-2 mt-auto">
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
                                        aria-label="Show user profile"
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
    const [isOpen, setIsOpen] = useState(false)

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
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5"/>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
                            <div className="flex flex-col h-full">
                                <SheetHeader className="p-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <SheetTitle className="text-lg">Menu</SheetTitle>
                                        <SheetClose asChild>
                                            <Button variant="ghost" size="icon">
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </SheetClose>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-4">
                                        <div className="mb-6 flex flex-col space-y-1.5">
                                            <UserMenu user={user} logout={logout}/>
                                        </div>

                                        {filteredNavSections.map((section, sectionIndex) => (
                                            <div key={sectionIndex} className="mb-6">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                    {section.title}
                                                </p>
                                                <div className="space-y-1">
                                                    {section.items.map((item) => (
                                                        <SheetClose key={item.href} asChild>
                                                            <Link
                                                                href={item.href}
                                                                className={cn(
                                                                    "flex items-center p-2 rounded-md transition-colors",
                                                                    pathname === item.href
                                                                        ? "bg-accent text-accent-foreground"
                                                                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                                                )}
                                                                onClick={() => setIsOpen(false)}
                                                            >
                                                                <item.icon className="h-5 w-5 mr-3"/>
                                                                <span className="text-sm font-medium">
                                                                    {item.label}
                                                                </span>
                                                            </Link>
                                                        </SheetClose>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 border-t mt-auto">
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
                        </SheetContent>
                    </Sheet>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
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
                                    <AvatarFallback>{user.name?.[0] || user.email?.[0] || '?'}</AvatarFallback>
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
                <p className="text-sm text-muted-foreground">Loading...</p>
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
    const pathname = usePathname()
    const {user, isLoading, logout} = useAuth()
    const [sidebarExpanded, setSidebarExpanded] = useState(true)
    const isMobile = useMediaQuery('(max-width: 768px)')
    const isTablet = useMediaQuery('(max-width: 1024px)')

    // What's New modal state
    const {
        showWhatsNew,
        whatsNewContent,
        closeWhatsNew,
        isLoading: isWhatsNewLoading
    } = useWhatsNew()

    // Set sidebar state based on screen size
    useEffect(() => {
        if (isTablet) {
            setSidebarExpanded(false)
        } else {
            setSidebarExpanded(true)
        }
    }, [isTablet])

    // Reset sidebar state when route changes on mobile
    useEffect(() => {
        if (isMobile) {
            // Any mobile-specific navigation handling can go here
        }
    }, [pathname, isMobile])

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    // Store sidebar state in localStorage
    useEffect(() => {
        if (!isTablet && !isMobile) {
            try {
                localStorage.setItem('sidebarExpanded', String(sidebarExpanded))
            } catch (error) {
                console.error('Error saving sidebar state:', error)
            }
        }
    }, [sidebarExpanded, isTablet, isMobile])

    // Load sidebar state from localStorage on initial load
    useEffect(() => {
        if (!isTablet && !isMobile) {
            try {
                const savedState = localStorage.getItem('sidebarExpanded')
                if (savedState !== null) {
                    setSidebarExpanded(savedState === 'true')
                }
            } catch (error) {
                console.error('Error loading sidebar state:', error)
            }
        }
    }, [isTablet, isMobile])

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
                isExpanded={sidebarExpanded}
                setIsExpanded={setSidebarExpanded}
            />
            <MobileNav user={user} logout={logout}/>

            <main
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    "pt-20 md:pt-4", // Add padding top for mobile nav bar
                    isMobile ? "" : (sidebarExpanded ? "md:ml-64" : "md:ml-16")
                )}
            >
                <div className="p-4 md:p-8 mx-auto max-w-7xl">
                    {children}
                </div>
            </main>

            {/* What's New Modal */}
            {!isWhatsNewLoading && (
                <WhatsNewModal
                    content={whatsNewContent}
                    isOpen={showWhatsNew}
                    onClose={closeWhatsNew}
                />
            )}
        </div>
    )
}