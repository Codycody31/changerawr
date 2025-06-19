'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth'
import {
    ClipboardCheck,
    FileText,
    Folder,
    Fingerprint,
    Key,
    LayoutGrid,
    Loader2,
    ServerCog,
    Settings,
    Shield,
    Users,
    Info,
    Sparkles,
    Clock, ChartNoAxesCombined,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import WhatsNewModal from '@/components/dashboard/WhatsNewModal'
import { useWhatsNew } from '@/hooks/useWhatsNew'
import { Sidebar, NavSection, SidebarUser } from '@/components/ui/sidebar'
import { getGravatarUrl } from '@/lib/utils/gravatar'

// Navigation Configuration
const NAV_SECTIONS: NavSection[] = [
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
                href: "/dashboard/admin/analytics",
                label: "Analytics",
                icon: ChartNoAxesCombined,
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

// Loading Component
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
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
    const { user, isLoading, logout } = useAuth()
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

    // Convert Prisma User to SidebarUser
    const sidebarUser: SidebarUser | null = user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.email ? getGravatarUrl(user.email, 80) : undefined
    } : null

    // Set sidebar state based on screen size
    useEffect(() => {
        if (isTablet) {
            setSidebarExpanded(false)
        } else {
            setSidebarExpanded(true)
        }
    }, [isTablet])

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
        return <LoadingScreen />
    }

    // Redirect to login if no user
    if (!user || !sidebarUser) {
        return null
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                user={sidebarUser}
                sections={NAV_SECTIONS}
                onLogout={logout}
                brandName="Changerawr"
                brandHref="/dashboard"
                isExpanded={sidebarExpanded}
                setIsExpanded={setSidebarExpanded}
            />

            <main
                className={cn(
                    "min-h-screen transition-all duration-300 ease-in-out",
                    // Mobile: always full width with top padding for mobile header
                    "pt-16 md:pt-0",
                    // Desktop: adjust margin based on sidebar state
                    !isMobile && (sidebarExpanded ? "md:ml-64" : "md:ml-16")
                )}
            >
                <div className="h-full p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
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