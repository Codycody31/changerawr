import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Two-Factor Authentication - Changerawr',
    description: 'Complete your sign in with two-factor authentication',
};

export default function TwoFactorLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return children;
}