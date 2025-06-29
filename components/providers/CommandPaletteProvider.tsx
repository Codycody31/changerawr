'use client';

import { useCommandPalette } from '@/hooks/useCommandPalette';
import React from "react";
import ChangelogCommandPalette from "@/components/CommandPalette";

interface CommandPaletteProviderProps {
    children: React.ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
    const { isOpen, close } = useCommandPalette();

    return (
        <>
            {children}
            <ChangelogCommandPalette isOpen={isOpen} onClose={close} />
        </>
    );
}