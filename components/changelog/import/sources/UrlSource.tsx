'use client';

import { useState } from 'react';
import { Globe, Github, Rss, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { UrlImportOptions } from '@/lib/types/projects/importing';

interface UrlSourceProps {
    options: Partial<UrlImportOptions>;
    onOptionsChange: (options: Partial<UrlImportOptions>) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

const EXAMPLE_URLS = [
    { label: 'GitHub Releases', icon: Github, url: 'https://api.github.com/repos/OWNER/REPO/releases', format: 'github_api' as const },
    { label: 'RSS Feed', icon: Rss, url: 'https://example.com/changelog.rss', format: 'rss' as const },
    { label: 'JSON Feed', icon: Globe, url: 'https://example.com/releases.json', format: 'json' as const },
];

export function UrlSource({ options, onOptionsChange, onSubmit, disabled }: UrlSourceProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const url = options.url ?? '';
    const format = options.format ?? 'auto';

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Source URL
                </Label>
                <Input
                    type="url"
                    placeholder="https://api.github.com/repos/owner/repo/releases"
                    value={url}
                    onChange={(e) => onOptionsChange({ ...options, url: e.target.value })}
                    disabled={disabled}
                    className="font-mono text-sm"
                />
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Supported sources</p>
                <div className="grid grid-cols-3 gap-2">
                    {EXAMPLE_URLS.map(({ label, icon: Icon, url: exUrl, format: exFormat }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => onOptionsChange({ ...options, url: exUrl, format: exFormat })}
                            disabled={disabled}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2">
                        Advanced Options
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Format</Label>
                        <RadioGroup
                            value={format}
                            onValueChange={(v) => onOptionsChange({ ...options, format: v as UrlImportOptions['format'] })}
                            disabled={disabled}
                            className="grid grid-cols-2 gap-2"
                        >
                            {[
                                { value: 'auto', label: 'Auto-detect' },
                                { value: 'github_api', label: 'GitHub API' },
                                { value: 'rss', label: 'RSS / Atom' },
                                { value: 'json', label: 'JSON' },
                            ].map(({ value, label }) => (
                                <div key={value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={value} id={`format-${value}`} />
                                    <Label htmlFor={`format-${value}`} className="text-sm">{label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Max entries</Label>
                        <Input
                            type="number"
                            min={1}
                            max={500}
                            className="h-8 text-sm"
                            value={options.maxEntries ?? 50}
                            onChange={(e) => onOptionsChange({ ...options, maxEntries: parseInt(e.target.value) || 50 })}
                            disabled={disabled}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                            GitHub Token <Badge variant="outline" className="text-xs">optional</Badge>
                        </Label>
                        <Input
                            type="password"
                            placeholder="ghp_... (for private repos or higher rate limits)"
                            value={options.githubToken ?? ''}
                            onChange={(e) => onOptionsChange({ ...options, githubToken: e.target.value })}
                            disabled={disabled}
                            className="font-mono text-xs"
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <p className="text-xs text-muted-foreground">
                Fetched server-side — no CORS issues.
                Supports GitHub Releases API, RSS/Atom feeds, and JSON arrays.
            </p>

            <Button
                onClick={onSubmit}
                disabled={!url.trim() || disabled}
                className="w-full"
            >
                <Globe className="h-4 w-4 mr-2" />
                Fetch &amp; Parse
            </Button>
        </div>
    );
}
