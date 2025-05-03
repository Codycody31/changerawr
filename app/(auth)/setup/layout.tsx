import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Setup - Changerawr',
    description: 'Initial system setup for Changerawr',
};

export default function SetupLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">{children}</div>
        </div>
    );
}