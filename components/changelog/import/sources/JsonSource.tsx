'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { JsonImportOptions } from '@/lib/types/projects/importing';

interface JsonSourceProps {
    content: string;
    options: Partial<JsonImportOptions>;
    onContentChange: (content: string) => void;
    onOptionsChange: (options: Partial<JsonImportOptions>) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

const EXAMPLE = `[
  {
    "version": "1.2.0",
    "title": "Feature Release",
    "content": "Added new features and fixed bugs.",
    "date": "2024-01-15",
    "tags": ["feature", "improvement"]
  }
]`;

const GITHUB_EXAMPLE = `[
  {
    "tag_name": "v1.2.0",
    "name": "Version 1.2.0",
    "published_at": "2024-01-15T10:00:00Z",
    "body": "## Changes\\n- Added X\\n- Fixed Y"
  }
]`;

export function JsonSource({ content, options, onContentChange, onOptionsChange, onSubmit, disabled }: JsonSourceProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [activeExample, setActiveExample] = useState<'generic' | 'github' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.json$/i)) {
            alert('Please upload a .json file');
            return;
        }
        const text = await file.text();
        onContentChange(text);
    }, [onContentChange]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    }, [handleFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const loadExample = (type: 'generic' | 'github') => {
        onContentChange(type === 'github' ? GITHUB_EXAMPLE : EXAMPLE);
        setActiveExample(type);
    };

    return (
        <div className="space-y-4">
            <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                )}
            >
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileInput} className="hidden" />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium text-sm">Drop a .json file or click to upload</p>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or paste / type JSON</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Code className="h-4 w-4" />JSON Content</Label>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => loadExample('generic')}
                            disabled={disabled}>
                            Example
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => loadExample('github')}
                            disabled={disabled}>
                            GitHub format
                        </Button>
                    </div>
                </div>
                <Textarea
                    placeholder={EXAMPLE}
                    value={content}
                    onChange={(e) => { onContentChange(e.target.value); setActiveExample(null); }}
                    disabled={disabled}
                    className="min-h-[180px] font-mono text-xs leading-relaxed resize-y"
                />
                {activeExample && (
                    <p className="text-xs text-muted-foreground">
                        Showing {activeExample === 'github' ? 'GitHub Releases' : 'generic'} example — edit or replace with your data
                    </p>
                )}
            </div>

            {/* Column mapping */}
            <Collapsible open={showOptions} onOpenChange={setShowOptions}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2">
                        Column Mapping (optional)
                        {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                    <p className="text-xs text-muted-foreground">
                        Customize which JSON fields map to changelog fields. Leave blank to use defaults.
                        GitHub Releases format is auto-detected and doesn&apos;t need mapping.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'titleField', label: 'Title field', placeholder: 'title' },
                            { key: 'versionField', label: 'Version field', placeholder: 'version' },
                            { key: 'contentField', label: 'Content field', placeholder: 'content' },
                            { key: 'dateField', label: 'Date field', placeholder: 'date' },
                            { key: 'tagsField', label: 'Tags field', placeholder: 'tags' },
                            { key: 'tagSeparator', label: 'Tag separator', placeholder: ',' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key} className="space-y-1">
                                <Label className="text-xs">{label}</Label>
                                <Input
                                    className="h-8 text-xs font-mono"
                                    placeholder={placeholder}
                                    value={(options as Record<string, string>)[key] ?? ''}
                                    onChange={(e) => onOptionsChange({ ...options, [key]: e.target.value })}
                                    disabled={disabled}
                                />
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Button onClick={onSubmit} disabled={!content.trim() || disabled} className="w-full">
                Parse JSON
            </Button>
        </div>
    );
}
