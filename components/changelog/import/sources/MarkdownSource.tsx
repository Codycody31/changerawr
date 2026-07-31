'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MarkdownSourceProps {
    content: string;
    onChange: (content: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

const SUPPORTED_FORMATS = ['Keep a Changelog', 'GitHub Releases', 'Custom Markdown', 'Plain Text'];

export function MarkdownSource({ content, onChange, onSubmit, disabled }: MarkdownSourceProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(md|txt|markdown)$/i)) {
            alert('Please upload a .md, .markdown, or .txt file');
            return;
        }
        const text = await file.text();
        onChange(text);
    }, [onChange]);

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

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) onChange(text);
        } catch {
            // Clipboard API not available — user can paste manually
        }
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-sm">Drop a file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .md, .markdown, .txt</p>
            </div>

            {/* Or paste */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or paste content</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Changelog Content
                    </label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handlePaste}
                        disabled={disabled}
                        className="h-7 text-xs gap-1"
                    >
                        <ClipboardPaste className="h-3 w-3" />
                        Paste from clipboard
                    </Button>
                </div>
                <Textarea
                    placeholder={`## [1.2.0] - 2024-01-15\n\n### Added\n- New feature A\n- New feature B\n\n### Fixed\n- Bug fix C`}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="min-h-[200px] font-mono text-xs leading-relaxed resize-y"
                />
                {content && (
                    <p className="text-xs text-muted-foreground">
                        {content.split('\n').length} lines · {content.length.toLocaleString()} characters
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">Supported:</span>
                {SUPPORTED_FORMATS.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                ))}
            </div>

            <Button onClick={onSubmit} disabled={!content.trim() || disabled} className="w-full">
                Parse Changelog
            </Button>
        </div>
    );
}
