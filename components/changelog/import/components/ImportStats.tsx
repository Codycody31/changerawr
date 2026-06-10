'use client';

import { CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import type { ImportPreview } from '@/lib/types/projects/importing';

interface ImportStatsProps {
    preview: ImportPreview;
    compact?: boolean;
}

export function ImportStats({ preview, compact }: ImportStatsProps) {
    const stats = [
        {
            label: 'Total',
            value: preview.totalEntries,
            icon: FileText,
            color: 'text-foreground'
        },
        {
            label: compact ? 'Valid' : 'Will import',
            value: preview.validEntries,
            icon: CheckCircle,
            color: 'text-green-600'
        },
        {
            label: compact ? 'Skip' : 'Will skip',
            value: preview.invalidEntries,
            icon: XCircle,
            color: 'text-destructive'
        },
        {
            label: 'Conflicts',
            value: preview.duplicateVersions.length,
            icon: AlertTriangle,
            color: 'text-yellow-500'
        }
    ];

    return (
        <div className={`grid gap-3 ${compact ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
            {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card text-center">
                    <stat.icon className={`h-5 w-5 mb-1 ${stat.color}`} />
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}
