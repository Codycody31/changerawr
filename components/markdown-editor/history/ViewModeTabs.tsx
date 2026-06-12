'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {Code2, Eye, GitCompare, UserCheck} from 'lucide-react';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {cn} from '@/lib/utils';

export type DetailViewMode = 'diff' | 'preview' | 'raw' | 'blame';

export interface ViewModeTabsProps {
    value: DetailViewMode;
    onChange: (value: DetailViewMode) => void;
    showBlame?: boolean;
}

const MODES: { value: DetailViewMode; label: string; icon: React.ElementType }[] = [
    {value: 'diff', label: 'Diff', icon: GitCompare},
    {value: 'preview', label: 'Preview', icon: Eye},
    {value: 'raw', label: 'Raw source', icon: Code2},
    {value: 'blame', label: 'Blame', icon: UserCheck},
];

/** Compact icon switcher for the history detail pane: diff, rendered preview, raw source, and (optionally) blame. */
export function ViewModeTabs({value, onChange, showBlame}: ViewModeTabsProps) {
    const modes = showBlame ? MODES : MODES.filter((mode) => mode.value !== 'blame');

    return (
        <TooltipProvider delayDuration={300}>
            <Tabs value={value} onValueChange={(next) => onChange(next as DetailViewMode)}>
                <TabsList variant="outline" size="sm" className="h-8 gap-0.5 p-0.5">
                    {modes.map(({value: modeValue, label, icon: Icon}) => (
                        <React.Fragment key={modeValue}>
                            {modeValue === 'blame' && <div aria-hidden className="mx-0.5 h-4 w-px bg-border"/>}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger
                                        value={modeValue}
                                        className={cn(
                                            'relative z-0 h-7 w-7 p-0',
                                            'data-[state=active]:border-transparent data-[state=active]:bg-transparent'
                                        )}
                                    >
                                        {value === modeValue && (
                                            <motion.div
                                                layoutId="view-mode-active"
                                                className="absolute inset-0 rounded-md border border-border bg-background shadow-sm"
                                                transition={{type: 'spring', duration: 0.3, bounce: 0.2}}
                                            />
                                        )}
                                        <Icon className="relative z-10 h-3.5 w-3.5"/>
                                        <span className="sr-only">{label}</span>
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{label}</TooltipContent>
                            </Tooltip>
                        </React.Fragment>
                    ))}
                </TabsList>
            </Tabs>
        </TooltipProvider>
    );
}
