'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ValidatedEntry } from '@/lib/types/projects/importing';

interface CannyImportStepProps {
    onImport: (entries: ValidatedEntry[]) => void;
    isProcessing: boolean;
}

export function CannyImportStep({ onImport, isProcessing }: CannyImportStepProps) {
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
        if (!apiKey.trim()) {
            setValidationError('Please enter an API key');
            return;
        }

        setIsValidating(true);
        setValidationError('');

        try {
            const response = await fetch('/api/projects/import/canny/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });

            const result = await response.json();

            if (result.valid) {
                setIsValid(true);
                toast({
                    title: 'API key validated',
                    description: 'Successfully connected to Canny.'
                });
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
        if (!isValid) {
            toast({
                title: 'Invalid API key',
                description: 'Please validate your API key first.',
                variant: 'destructive'
            });
            return;
        }

        setIsImporting(true);

        try {
            const response = await fetch('/api/projects/import/canny/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    includeLabels,
                    includePostTags,
                    statusFilter,
                    maxEntries
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch from Canny');
            }

            const data = await response.json();

            if (!data.success || !data.entries || !Array.isArray(data.entries)) {
                throw new Error('Invalid response from Canny API');
            }

            if (data.entries.length === 0) {
                toast({
                    title: 'No entries found',
                    description: 'No changelog entries found in your Canny account with the current filters.',
                    variant: 'destructive'
                });
                return;
            }

            // Pass the validated entries to the parent
            onImport(data.entries);

            toast({
                title: 'Canny entries loaded',
                description: `Found ${data.entries.length} entries from Canny.`
            });

        } catch (error) {
            console.error('Canny import error:', error);
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold mt-4">Import from Canny</h3>
                <p className="text-muted-foreground">
                    Import your published changelog entries from Canny
                </p>
            </div>

            {/* API Key */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">Canny API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="Enter your Canny API key"
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setIsValid(null);
                                    setValidationError('');
                                }}
                                disabled={isProcessing}
                            />
                            <Button
                                onClick={validateApiKey}
                                disabled={!apiKey.trim() || isValidating || isProcessing}
                                variant="outline"
                            >
                                {isValidating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Validate'
                                )}
                            </Button>
                        </div>

                        {isValid === true && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                API key is valid
                            </div>
                        )}

                        {isValid === false && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <XCircle className="h-4 w-4" />
                                {validationError}
                            </div>
                        )}
                    </div>

                    <Alert icon={<Key className="h-4 w-4" />}>
                        <AlertDescription>
                            Find your API key in Canny Settings → API. Your key is only used for this import.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Options */}
            <Card>
                <CardHeader>
                    <CardTitle>Import Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Filter */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Entry Status</Label>
                        <RadioGroup
                            value={statusFilter}
                            onValueChange={(value: 'all' | 'published' | 'draft') => setStatusFilter(value)}
                            disabled={isProcessing}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="published" id="published" />
                                <Label htmlFor="published" className="text-sm">Published only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all" className="text-sm">All entries</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Tag Options */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Tag Options</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-labels"
                                    checked={includeLabels}
                                    onCheckedChange={(checked) => setIncludeLabels(!!checked)}
                                    disabled={isProcessing}
                                />
                                <Label htmlFor="include-labels" className="text-sm">
                                    Include Canny labels as tags
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-post-tags"
                                    checked={includePostTags}
                                    onCheckedChange={(checked) => setIncludePostTags(!!checked)}
                                    disabled={isProcessing}
                                />
                                <Label htmlFor="include-post-tags" className="text-sm">
                                    Include feature request tags
                                </Label>
                            </div>
                        </div>
                    </div>

                    {/* Max Entries */}
                    <div className="space-y-2">
                        <Label htmlFor="max-entries" className="text-sm font-medium">
                            Maximum Entries
                        </Label>
                        <Input
                            id="max-entries"
                            type="number"
                            min="1"
                            max="500"
                            value={maxEntries}
                            onChange={(e) => setMaxEntries(parseInt(e.target.value) || 50)}
                            disabled={isProcessing}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Import Button */}
            <div className="flex justify-center">
                <Button
                    onClick={handleImport}
                    disabled={!isValid || isImporting || isProcessing}
                    size="lg"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Fetching from Canny...
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4 mr-2" />
                            Import from Canny
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}