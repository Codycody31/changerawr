'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon, ChevronLeft, ChevronRight, Menu, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

// Type definitions
interface SidebarUser {
    id: string
    name: string | null
    email: string | null
    role: string
    avatar?: string
}

interface NavItem {
    href: string
    label: string
    icon: LucideIcon
    requiredRole?: string[]
}

interface NavSection {
    title: string
    items: NavItem[]
}

interface SidebarProps {
    user: SidebarUser
    sections: NavSection[]
    onLogout: () => Promise<void>
    brandName?: string
    brandHref?: string
    isExpanded: boolean
    setIsExpanded: (expanded: boolean) => void
    isVisible: boolean
    // setIsVisible: (visible: boolean) => void
}

// Desktop Sidebar Component
function DesktopSidebar({
                            user,
                            sections,
                            onLogout,
                            isExpanded,
                            setIsExpanded,
                            isVisible,
                            // setIsVisible,
                            brandName = "Changerawr",
                            brandHref = "/dashboard"
                        }: {
    user: SidebarUser
    sections: NavSection[]
    onLogout: () => Promise<void>
    isExpanded: boolean
    setIsExpanded: (expanded: boolean) => void
    isVisible: boolean
    // setIsVisible: (visible: boolean) => void
    brandName?: string
    brandHref?: string
}) {
    const pathname = usePathname()

    // Filter navigation items based on user role
    const filteredNavSections = sections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            !item.requiredRole || item.requiredRole.includes(user.role)
        )
    })).filter(section => section.items.length > 0)

    // Function to check if a route is active based on namespace
    const isRouteActive = (itemHref: string): boolean => {
        // Exact match for dashboard home
        if (itemHref === '/dashboard' && pathname === '/dashboard') {
            return true
        }

        // For other routes, check if current path starts with the item href
        // but make sure we don't match dashboard root for other routes
        if (itemHref !== '/dashboard' && pathname.startsWith(itemHref)) {
            return true
        }

        return false
    }

    const getUserInitial = () => {
        return user.name?.[0] || user.email?.[0] || '?'
    }

    return (
        <aside
            className={cn(
                "hidden md:flex fixed inset-y-0 left-0 z-40 bg-background border-r transition-all duration-300 ease-in-out flex-col",
                isVisible ? (isExpanded ? "w-64" : "w-16") : "w-0 overflow-hidden"
            )}
            data-expanded={isExpanded}
            data-visible={isVisible}
        >
            {isVisible && (
                <>
                    {/* Header with brand and controls */}
                    <div className="h-16 flex items-center justify-between border-b px-4 flex-shrink-0">
                        {isExpanded && (
                            <Link
                                href={brandHref}
                                className="text-xl font-bold truncate"
                            >
                                {brandName}
                            </Link>
                        )}
                        <div className={cn("flex items-center gap-1", isExpanded ? "" : "mx-auto")}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="flex-shrink-0"
                                onClick={() => setIsExpanded(!isExpanded)}
                                aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
                            >
                                {isExpanded ? (
                                    <ChevronLeft className="h-5 w-5"/>
                                ) : (
                                    <ChevronRight className="h-5 w-5"/>
                                )}
                            </Button>
                            {/*{isExpanded && (*/}
                            {/*    <Button*/}
                            {/*        variant="ghost"*/}
                            {/*        size="icon"*/}
                            {/*        className="flex-shrink-0"*/}
                            {/*        onClick={() => setIsVisible(false)}*/}
                            {/*        aria-label="Hide sidebar"*/}
                            {/*    >*/}
                            {/*        <PanelRightOpen className="h-4 w-4"/>*/}
                            {/*    </Button>*/}
                            {/*)}*/}
                        </div>
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
                                                        isExpanded ? "px-3 gap-3" : "justify-center",
                                                        isRouteActive(item.href)
                                                            ? "bg-secondary text-secondary-foreground"
                                                            : "hover:bg-secondary/50",
                                                        "group"
                                                    )}
                                                >
                                                    <item.icon className={cn(
                                                        "h-5 w-5 flex-shrink-0",
                                                        isRouteActive(item.href)
                                                            ? "text-secondary-foreground"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                    )} />
                                                    {isExpanded && (
                                                        <span className="truncate">{item.label}</span>
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

                    {/* User Profile Section */}
                    <div className="border-t p-4 flex-shrink-0">
                        {isExpanded ? (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="w-full flex items-center gap-3 p-2 hover:bg-secondary/50"
                                    >
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name || 'User avatar'}
                                            />
                                            <AvatarFallback>{getUserInitial()}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {user.name || 'Unnamed User'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.role}
                                            </p>
                                        </div>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <div className="flex flex-col items-center space-y-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage
                                                src={user.avatar}
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
                                                onClick={onLogout}
                                            >
                                                <LogOut className="h-4 w-4 mr-2"/>
                                                Logout
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-full h-10"
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={user.avatar}
                                                    alt={user.name || 'User avatar'}
                                                />
                                                <AvatarFallback>
                                                    {getUserInitial()}
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
                </>
            )}
        </aside>
    )
}

// Mobile Navigation Component
function MobileNav({
                       user,
                       sections,
                       onLogout,
                       brandName = "Changerawr",
                       brandHref = "/dashboard"
                   }: {
    user: SidebarUser;
    sections: NavSection[];
    onLogout: () => Promise<void>;
    brandName?: string;
    brandHref?: string;
}) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    // Filter navigation items based on user role
    const filteredNavSections = sections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            !item.requiredRole || item.requiredRole.includes(user.role)
        )
    })).filter(section => section.items.length > 0)

    // Function to check if a route is active based on namespace
    const isRouteActive = (itemHref: string): boolean => {
        // Exact match for dashboard home
        if (itemHref === '/dashboard' && pathname === '/dashboard') {
            return true
        }

        // For other routes, check if current path starts with the item href
        // but make sure we don't match dashboard root for other routes
        if (itemHref !== '/dashboard' && pathname.startsWith(itemHref)) {
            return true
        }

        return false
    }

    const getUserInitial = () => {
        return user.name?.[0] || user.email?.[0] || '?'
    }

    const logout = async () => {
        setIsOpen(false)
        await onLogout()
    }

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md z-50 border-b">
            <div className="flex items-center justify-between px-4 h-full">
                <Link href={brandHref} className="text-xl font-semibold">
                    {brandName}
                </Link>

                <div className="flex items-center gap-2">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5"/>
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-80 p-0">
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="flex items-center gap-3 p-6 border-b">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name || 'User avatar'}
                                        />
                                        <AvatarFallback>{getUserInitial()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">
                                            {user.name || 'Unnamed User'}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {user.email || 'No email'}
                                        </p>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            {user.role}
                                        </p>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 overflow-y-auto p-6">
                                    {filteredNavSections.map((section, sectionIndex) => (
                                        <div key={sectionIndex} className="mb-6">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                                {section.title}
                                            </p>
                                            <div className="space-y-1">
                                                {section.items.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2 rounded-md transition-colors",
                                                            isRouteActive(item.href)
                                                                ? "bg-secondary text-secondary-foreground"
                                                                : "hover:bg-secondary/50"
                                                        )}
                                                    >
                                                        <item.icon className="h-5 w-5 text-muted-foreground" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>

                                {/* Footer Actions */}
                                <div className="border-t p-6 space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        asChild
                                    >
                                        <Link href="/dashboard/settings" onClick={() => setIsOpen(false)}>
                                            <Settings className="h-4 w-4 mr-2"/>
                                            Settings
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start"
                                        onClick={logout}
                                    >
                                        <LogOut className="h-4 w-4 mr-2"/>
                                        Logout
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}

// Main Sidebar Component
function Sidebar({
                     user,
                     sections,
                     onLogout,
                     brandName,
                     brandHref,
                     isExpanded,
                     setIsExpanded,
                     isVisible,
                     // setIsVisible
                 }: SidebarProps) {
    return (
        <>
            <DesktopSidebar
                user={user}
                sections={sections}
                onLogout={onLogout}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                isVisible={isVisible}
                // setIsVisible={setIsVisible}
                brandName={brandName}
                brandHref={brandHref}
            />
            <MobileNav
                user={user}
                sections={sections}
                onLogout={onLogout}
                brandName={brandName}
                brandHref={brandHref}
            />
        </>
    )
}

export { Sidebar, type SidebarUser, type NavSection, type NavItem }