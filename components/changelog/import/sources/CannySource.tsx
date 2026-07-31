'use client';

import { useState } from 'react';
import { Key, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { CannyLogo } from '@/lib/services/projects/uploading/providers/canny/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { ValidatedEntry } from '@/lib/types/projects/importing';

interface CannySourceProps {
    onImport: (entries: ValidatedEntry[]) => void;
    disabled?: boolean;
}

export function CannySource({ onImport, disabled }: CannySourceProps) {
    const { toast } = useToast();

    const [apiKey, setApiKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [validationError, setValidationError] = useState('');
    const [includeLabels, setIncludeLabels] = useState(true);
    const [includePostTags, setIncludePostTags] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('published');
    const [maxEntries, setMaxEntries] = useState(50);
    const [isImporting, setIsImporting] = useState(false);

    const validateApiKey = async () => {
        if (!apiKey.trim()) { setValidationError('Please enter an API key'); return; }
        setIsValidating(true);
        setValidationError('');
        try {
            const res = await fetch('/api/projects/import/canny/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });
            const result = await res.json();
            if (result.valid) {
                setIsValid(true);
                toast({ title: 'API key validated', description: 'Successfully connected to Canny.' });
            } else {
                setIsValid(false);
                setValidationError(result.error || 'Invalid API key');
            }
        } catch {
            setIsValid(false);
            setValidationError('Failed to validate API key');
        } finally {
            setIsValidating(false);
        }
    };

    const handleImport = async () => {
        if (!isValid) return;
        setIsImporting(true);
        try {
            const res = await fetch('/api/projects/import/canny/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, includeLabels, includePostTags, statusFilter, maxEntries })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch from Canny');
            }
            const data = await res.json();
            if (!data.success || !Array.isArray(data.entries)) throw new Error('Invalid response from Canny API');
            if (data.entries.length === 0) {
                toast({ title: 'No entries found', description: 'No changelog entries found with current filters.', variant: 'destructive' });
                return;
            }
            onImport(data.entries);
            toast({ title: 'Canny entries loaded', description: `Found ${data.entries.length} entries.` });
        } catch (error) {
            toast({
                title: 'Import failed',
                description: error instanceof Error ? error.message : 'Failed to fetch entries from Canny.',
                variant: 'destructive'
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <CannyLogo size={36} rounded="xl" />
                <div>
                    <p className="font-semibold text-sm">Canny</p>
                    <p className="text-xs text-muted-foreground">Import published changelog entries from your Canny account</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Key className="h-4 w-4" />
                        API Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="canny-api-key" className="text-sm">Canny API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                id="canny-api-key"
                                type="password"
                                placeholder="Enter your Canny API key"
                                value={apiKey}
                                onChange={(e) => { setApiKey(e.target.value); setIsValid(null); setValidationError(''); }}
                                disabled={disabled}
                            />
                            <Button
                                onClick={validateApiKey}
                                disabled={!apiKey.trim() || isValidating || disabled}
                                variant="outline"
                                className="shrink-0"
                            >
                                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
                            </Button>
                        </div>
                        {isValid === true && (
                            <div className="flex items-center gap-1.5 text-green-600 text-xs">
                                <CheckCircle className="h-3.5 w-3.5" /> API key is valid
                            </div>
                        )}
                        {isValid === false && (
                            <div className="flex items-center gap-1.5 text-destructive text-xs">
                                <XCircle className="h-3.5 w-3.5" /> {validationError}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Find your API key in Canny Settings → API. It&apos;s only used for this import.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Import Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Entry Status</Label>
                        <RadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} disabled={disabled}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="published" id="canny-published" />
                                <Label htmlFor="canny-published" className="text-sm">Published only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="canny-all" />
                                <Label htmlFor="canny-all" className="text-sm">All entries</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="canny-labels" checked={includeLabels} onCheckedChange={(c) => setIncludeLabels(!!c)} disabled={disabled} />
                                <Label htmlFor="canny-labels" className="text-sm">Include Canny labels as tags</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="canny-post-tags" checked={includePostTags} onCheckedChange={(c) => setIncludePostTags(!!c)} disabled={disabled} />
                                <Label htmlFor="canny-post-tags" className="text-sm">Include feature request tags</Label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="canny-max" className="text-sm font-medium">Maximum Entries</Label>
                        <Input
                            id="canny-max"
                            type="number"
                            min={1}
                            max={500}
                            value={maxEntries}
                            onChange={(e) => setMaxEntries(parseInt(e.target.value) || 50)}
                            disabled={disabled}
                            className="w-32"
                        />
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleImport}
                disabled={!isValid || isImporting || disabled}
                className="w-full"
                size="lg"
            >
                {isImporting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching from Canny...</>
                ) : (
                    <><Download className="h-4 w-4 mr-2" />Import from Canny</>
                )}
            </Button>
        </div>
    );
}
