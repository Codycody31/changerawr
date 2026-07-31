'use client'

import React from 'react';
import { useAuth } from '@/context/auth';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    if (user?.role !== 'ADMIN') {
        return (
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>
                        You need administrator privileges to access this section.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}
