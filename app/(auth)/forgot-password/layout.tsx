import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Forgot Password - Changerawr',
    description: 'Reset your password for Changerawr',
};

export default function ForgotPasswordLayout({
                                                 children,
                                             }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <div className="inline-block">
                        <h1 className="text-2xl font-bold">Changerawr</h1>
                    </div>
                </div>
                {children}
                <p className="text-center text-sm text-muted-foreground mt-8">
                    &copy; {new Date().getFullYear()} Changerawr. All rights reserved.
                </p>
            </div>
        </div>
    );
}