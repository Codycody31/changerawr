'use client'

import React, {useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {
    ChevronLeft,
    ChevronRight,
    LogOut,
    Menu,
    Settings,
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
import {cn} from '@/lib/utils'

export interface NavItem {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    requiredRole?: string[]
}

export interface NavSection {
    title: string
    items: NavItem[]
}

export interface SidebarUser {
    id: string
    name?: string | null
    email?: string | null
    role: string
    avatar?: string
}

interface SidebarProps {
    user: SidebarUser
    sections: NavSection[]
    onLogout: () => Promise<void>
    className?: string
    brandName?: string
    brandHref?: string
    isExpanded: boolean
    setIsExpanded: (expanded: boolean) => void
}

// User Menu Component
function UserMenu({user, logout}: { user: SidebarUser; logout: () => Promise<void> }) {
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
                            src={user.avatar}
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

// Desktop Sidebar Component
function DesktopSidebar({
                            user,
                            sections,
                            onLogout,
                            isExpanded,
                            setIsExpanded,
                            brandName = "Changerawr",
                            brandHref = "/dashboard"
                        }: {
    user: SidebarUser
    sections: NavSection[]
    onLogout: () => Promise<void>
    isExpanded: boolean
    setIsExpanded: (expanded: boolean) => void
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
                            href={brandHref}
                            className="text-xl font-bold truncate"
                        >
                            {brandName}
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
                        <UserMenu user={user} logout={onLogout}/>
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
                                                src={user.avatar}
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
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
                            <div className="flex flex-col h-full">
                                <SheetHeader className="p-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <SheetTitle className="text-lg">Menu</SheetTitle>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-4">
                                        <div className="mb-6 flex flex-col space-y-1.5">
                                            <UserMenu user={user} logout={onLogout}/>
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
                                        onClick={onLogout}
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
                                        src={user.avatar}
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
                                        src={user.avatar}
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
                                        onClick={onLogout}
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

// Main Sidebar Component
function Sidebar({
                     user,
                     sections,
                     onLogout,
                     brandName,
                     brandHref,
                     isExpanded,
                     setIsExpanded
                 }: SidebarProps) {
    return (
        <>
            <DesktopSidebar
                user={user}
                sections={sections}
                onLogout={onLogout}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
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

export {Sidebar}