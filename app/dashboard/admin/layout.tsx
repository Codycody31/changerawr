'use client'

import React from 'react';
import { useAuth } from '@/context/auth';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {Users, Key, Shield, Settings, FileText, ClipboardCheck} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {Toaster} from "@/components/ui/toaster";

const tabs = [
    {
        id: 'overview',
        label: 'Overview',
        icon: Shield,
        path: '/dashboard/admin',
        pattern: /^\/dashboard\/admin$/
    },
    {
        id: 'users',
        label: 'Users',
        icon: Users,
        path: '/dashboard/admin/users',
        pattern: /^\/dashboard\/admin\/users/
    },
    {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        path: '/dashboard/admin/api-keys',
        pattern: /^\/dashboard\/admin\/api-keys/
    },
    {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: FileText,
        path: '/dashboard/admin/audit-logs',
        pattern: /^\/dashboard\/admin\/audit-logs/
    },
    {
        id: 'requests',
        label: 'Requests',
        icon: ClipboardCheck,
        path: '/dashboard/admin/requests',
        pattern: /^\/dashboard\/admin\/requests/
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/dashboard/admin/system',
        pattern: /^\/dashboard\/admin\/system/
    }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    // Only admin can access this layout
    if (user?.role !== 'ADMIN') {
        return (
            <div className="container mx-auto p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You need administrator privileges to access this section.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-screen-xl px-4 py-4 md:py-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left sidebar */}
                    <div className="w-full md:w-64 shrink-0">
                        <h1 className="text-2xl font-bold mb-4">Admin</h1>
                        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0">
                            {tabs.map(({ id, label, icon: Icon, path }) => (
                                <Link
                                    key={id}
                                    href={path}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                                        ${pathname && new RegExp(tabs.find(t => t.id === id)?.pattern || '').test(pathname)
                                        ? 'bg-secondary'
                                        : 'hover:bg-secondary/50'}
                                        text-foreground
                                        whitespace-nowrap
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Main content */}
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {children}
                            <Toaster/>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}