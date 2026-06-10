'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ParseOverrides } from '@/lib/types/projects/importing';

interface AdvancedParseOptionsProps {
    overrides: ParseOverrides;
    onChange: (o: ParseOverrides) => void;
    onReparse: () => void;
    disabled?: boolean;
}

const LEVELS = [
    { value: null, label: 'Auto' },
    { value: 1,    label: '#'    },
    { value: 2,    label: '##'   },
    { value: 3,    label: '###'  },
    { value: 4,    label: '####' },
] as const;

// Internal regex patterns, never shown to the user
const CLEANUP_OPTIONS = [
    {
        id: 'color-tags',
        label: 'Color tags',
        example: '<c-ffffff>',
        pattern: '<c(?:-[0-9a-fA-F]{3,8}|[a-z])?>|</c>',
    },
    {
        id: 'html-tags',
        label: 'HTML tags',
        example: '<b>, <span>',
        pattern: '<[^>]+>',
    },
    {
        id: 'emoji',
        label: 'Emoji',
        example: '🚀 ✨',
        pattern: '^[\\p{Emoji}\\s]+',
    },
] as const;

export function AdvancedParseOptions({ overrides, onChange, onReparse, disabled }: AdvancedParseOptionsProps) {
    const stripPatterns = overrides.stripPatterns ?? [];
    const headerLevel = overrides.primaryHeaderLevel ?? null;

    const toggleCleanup = (pattern: string) => {
        const next = stripPatterns.includes(pattern)
            ? stripPatterns.filter(p => p !== pattern)
            : [...stripPatterns, pattern];
        onChange({ ...overrides, stripPatterns: next });
    };

    const hasOverrides =
        headerLevel !== null ||
        stripPatterns.length > 0 ||
        overrides.treatAsSingle;

    return (
        <div className="space-y-4 pt-1">
            {/* Header level */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                    Which heading marks a new version?
                </p>
                <div className="flex gap-1.5">
                    {LEVELS.map(({ value, label }) => (
                        <button
                            key={String(value)}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange({ ...overrides, primaryHeaderLevel: value })}
                            className={cn(
                                'px-3 py-1.5 rounded-md border text-xs font-mono transition-colors',
                                headerLevel === value
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cleanup */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                    Strip from header text
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {CLEANUP_OPTIONS.map(({ id, label, example, pattern }) => {
                        const active = stripPatterns.includes(pattern);
                        return (
                            <button
                                key={id}
                                type="button"
                                disabled={disabled}
                                title={`e.g. ${example}`}
                                onClick={() => toggleCleanup(pattern)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md border text-xs transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                                )}
                            >
                                {label}
                                <span className={cn(
                                    'ml-1.5 font-mono text-[10px]',
                                    active ? 'opacity-70' : 'opacity-50'
                                )}>
                                    {example}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Single entry */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                    onClick={() => onChange({ ...overrides, treatAsSingle: !overrides.treatAsSingle })}
                    className={cn(
                        'w-8 h-4 rounded-full transition-colors flex items-center px-0.5 cursor-pointer',
                        overrides.treatAsSingle ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                >
                    <div className={cn(
                        'w-3 h-3 rounded-full bg-white transition-transform',
                        overrides.treatAsSingle ? 'translate-x-4' : 'translate-x-0'
                    )} />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Import everything as a single entry
                </span>
            </label>

            {/* Re-parse */}
            <div className="flex items-center gap-2 pt-1">
                <Button
                    type="button"
                    size="sm"
                    variant={hasOverrides ? 'default' : 'outline'}
                    onClick={onReparse}
                    disabled={disabled}
                    className="gap-1.5"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-parse
                </Button>
                {hasOverrides && (
                    <button
                        type="button"
                        onClick={() => onChange({})}
                        disabled={disabled}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Reset to auto
                    </button>
                )}
            </div>
        </div>
    );
}
