'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatDetectionResult } from '@/lib/types/projects/importing';

interface DetectionPanelProps {
    detection: FormatDetectionResult;
    className?: string;
}

const FORMAT_LABELS: Record<string, string> = {
    keepachangelog: 'Keep a Changelog',
    github_releases: 'GitHub Releases',
    simple_version: 'Version headers',
    conventional_commits: 'Conventional commits',
    date_based: 'Date-based',
    flat_list: 'Flat list',
    simple: 'Simple',
    custom: 'Custom',
};

export function DetectionPanel({ detection, className }: DetectionPanelProps) {
    const [open, setOpen] = useState(false);
    const pct = Math.round(detection.confidence * 100);
    const level = detection.structure.detectedHeaderLevel;
    const count = detection.structure.estimatedEntryCount;

    const summary = [
        FORMAT_LABELS[detection.format] ?? detection.format,
        level && `H${level} headers`,
        count > 0 && `~${count} entries found`,
    ].filter(Boolean).join(' · ');

    const confidenceColor =
        pct >= 70 ? 'text-green-600 dark:text-green-400'
        : pct >= 40 ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-orange-500';

    return (
        <div className={cn('text-xs text-muted-foreground', className)}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
                <span>Detected: <span className="text-foreground font-medium">{summary}</span></span>
                <span className={cn('font-semibold', confidenceColor)}>({pct}%)</span>
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {open && detection.characteristics.length > 0 && (
                <ul className="mt-1.5 pl-2 space-y-0.5 border-l-2 border-muted">
                    {detection.characteristics.map((s, i) => (
                        <li key={i} className="leading-snug">{s}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
