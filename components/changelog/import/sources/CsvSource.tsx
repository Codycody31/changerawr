'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Table, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { CsvImportOptions } from '@/lib/types/projects/importing';

interface CsvSourceProps {
    content: string;
    options: Partial<CsvImportOptions>;
    onContentChange: (content: string) => void;
    onOptionsChange: (options: Partial<CsvImportOptions>) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

const EXAMPLE = `version,title,date,content,tags
1.2.0,Feature Release,2024-01-15,"Added X, fixed Y and improved Z.",feature;improvement
1.1.0,Bug Fix Release,2024-01-01,Fixed critical authentication bug.,fix;security`;

export function CsvSource({ content, options, onContentChange, onOptionsChange, onSubmit, disabled }: CsvSourceProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
            alert('Please upload a .csv, .tsv, or .txt file');
            return;
        }
        const text = await file.text();
        onContentChange(text);
        // Auto-detect delimiter for TSV
        if (file.name.endsWith('.tsv')) {
            onOptionsChange({ ...options, delimiter: '\t' });
        }
    }, [options, onContentChange, onOptionsChange]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    }, [handleFile]);

    return (
        <div className="space-y-4">
            <div
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                )}
            >
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileInput} className="hidden" />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium text-sm">Drop a CSV file or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .tsv, .txt</p>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or paste CSV content</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Table className="h-4 w-4" />CSV Content</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => onContentChange(EXAMPLE)} disabled={disabled}>
                        Load example
                    </Button>
                </div>
                <Textarea
                    placeholder={EXAMPLE}
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    disabled={disabled}
                    className="min-h-[160px] font-mono text-xs leading-relaxed resize-y"
                />
            </div>

            <Collapsible open={showOptions} onOpenChange={setShowOptions}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2">
                        CSV Options
                        {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Delimiter</Label>
                            <Input
                                className="h-8 text-xs font-mono"
                                placeholder=","
                                value={options.delimiter ?? ','}
                                onChange={(e) => onOptionsChange({ ...options, delimiter: e.target.value || ',' })}
                                disabled={disabled}
                                maxLength={2}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Tag separator</Label>
                            <Input
                                className="h-8 text-xs font-mono"
                                placeholder=";"
                                value={options.tagSeparator ?? ';'}
                                onChange={(e) => onOptionsChange({ ...options, tagSeparator: e.target.value || ';' })}
                                disabled={disabled}
                                maxLength={2}
                            />
                        </div>
                        {[
                            { key: 'titleColumn', label: 'Title column', placeholder: 'title' },
                            { key: 'versionColumn', label: 'Version column', placeholder: 'version' },
                            { key: 'dateColumn', label: 'Date column', placeholder: 'date' },
                            { key: 'contentColumn', label: 'Content column', placeholder: 'content' },
                            { key: 'tagsColumn', label: 'Tags column', placeholder: 'tags' },
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
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="has-header"
                            checked={options.hasHeader ?? true}
                            onCheckedChange={(c) => onOptionsChange({ ...options, hasHeader: !!c })}
                            disabled={disabled}
                        />
                        <Label htmlFor="has-header" className="text-xs">First row is a header</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Column names match case-insensitively. Use the options above if your CSV uses different field names.
                    </p>
                </CollapsibleContent>
            </Collapsible>

            <Button onClick={onSubmit} disabled={!content.trim() || disabled} className="w-full">
                Parse CSV
            </Button>
        </div>
    );
}
