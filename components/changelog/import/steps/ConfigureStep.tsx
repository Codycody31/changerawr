'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ImportStats } from '../components/ImportStats';
import type { ImportOptions, ImportPreview } from '@/lib/types/projects/importing';

interface ConfigureStepProps {
    options: ImportOptions;
    onChange: (o: ImportOptions) => void;
    preview: ImportPreview | null;
    onImport: () => void;
    onBack: () => void;
}

export function ConfigureStep({ options, onChange, preview, onImport, onBack }: ConfigureStepProps) {
    const set = <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) =>
        onChange({ ...options, [key]: value });

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-5"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strategy */}
                <div className="space-y-3 rounded-lg border p-4">
                    <div>
                        <p className="font-medium text-sm">Import Strategy</p>
                        <p className="text-xs text-muted-foreground">How to handle existing entries</p>
                    </div>
                    <RadioGroup
                        value={options.strategy}
                        onValueChange={(v: ImportOptions['strategy']) => set('strategy', v)}
                    >
                        {[
                            { value: 'merge', label: 'Merge', desc: 'Merge with existing entries' },
                            { value: 'append', label: 'Append', desc: 'Add after existing entries' },
                            { value: 'replace', label: 'Replace', desc: 'Replace all existing entries' },
                        ].map(({ value, label, desc }) => (
                            <div key={value} className="flex items-start space-x-2">
                                <RadioGroupItem value={value} id={`strategy-${value}`} className="mt-0.5" />
                                <Label htmlFor={`strategy-${value}`} className="space-y-0.5">
                                    <span className="text-sm font-medium">{label}</span>
                                    <span className="block text-xs text-muted-foreground">{desc}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <div className="flex items-center space-x-2 pt-1 border-t">
                        <Checkbox
                            id="preserve"
                            checked={options.preserveExistingEntries}
                            onCheckedChange={(c) => set('preserveExistingEntries', !!c)}
                        />
                        <Label htmlFor="preserve" className="text-xs">Preserve existing entries</Label>
                    </div>
                </div>

                {/* Conflict resolution */}
                <div className="space-y-3 rounded-lg border p-4">
                    <div>
                        <p className="font-medium text-sm">Conflict Resolution</p>
                        <p className="text-xs text-muted-foreground">When a version already exists</p>
                    </div>
                    <RadioGroup
                        value={options.conflictResolution}
                        onValueChange={(v: ImportOptions['conflictResolution']) => set('conflictResolution', v)}
                    >
                        {[
                            { value: 'skip', label: 'Skip', desc: 'Keep existing, skip import' },
                            { value: 'overwrite', label: 'Overwrite', desc: 'Replace existing with imported' },
                        ].map(({ value, label, desc }) => (
                            <div key={value} className="flex items-start space-x-2">
                                <RadioGroupItem value={value} id={`conflict-${value}`} className="mt-0.5" />
                                <Label htmlFor={`conflict-${value}`} className="space-y-0.5">
                                    <span className="text-sm font-medium">{label}</span>
                                    <span className="block text-xs text-muted-foreground">{desc}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    {preview && preview.duplicateVersions.length > 0 && (
                        <Alert variant="warning" className="py-2">
                            <AlertDescription className="text-xs">
                                Conflicts: {preview.duplicateVersions.map(v => <Badge key={v} variant="outline" className="text-xs mr-1">{v}</Badge>)}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Publishing */}
                <div className="space-y-3 rounded-lg border p-4">
                    <div>
                        <p className="font-medium text-sm">Publishing</p>
                        <p className="text-xs text-muted-foreground">Visibility of imported entries</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="publish"
                            checked={options.publishImportedEntries}
                            onCheckedChange={(c) => set('publishImportedEntries', !!c)}
                        />
                        <Label htmlFor="publish" className="text-sm">Publish entries immediately</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {options.publishImportedEntries
                            ? 'Entries will be publicly visible after import.'
                            : 'Entries will be saved as drafts.'}
                    </p>

                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium">Date Handling</p>
                        <RadioGroup
                            value={options.dateHandling}
                            onValueChange={(v: ImportOptions['dateHandling']) => set('dateHandling', v)}
                        >
                            {[
                                { value: 'preserve', label: 'Preserve original dates' },
                                { value: 'current', label: 'Use today\'s date' },
                                { value: 'sequence', label: 'Sequential (evenly spaced)' },
                            ].map(({ value, label }) => (
                                <div key={value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={value} id={`date-${value}`} />
                                    <Label htmlFor={`date-${value}`} className="text-xs">{label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                {/* Versions & Tags */}
                <div className="space-y-3 rounded-lg border p-4">
                    <div>
                        <p className="font-medium text-sm">Versions &amp; Tags</p>
                        <p className="text-xs text-muted-foreground">Additional metadata</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-version"
                            checked={options.autoGenerateVersions}
                            onCheckedChange={(c) => set('autoGenerateVersions', !!c)}
                        />
                        <Label htmlFor="auto-version" className="text-sm">Auto-generate missing versions</Label>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="default-tags" className="text-xs font-medium">
                            Default Tags <span className="font-normal text-muted-foreground">(comma-separated)</span>
                        </Label>
                        <Textarea
                            id="default-tags"
                            placeholder="imported, legacy"
                            value={options.defaultTags.join(', ')}
                            onChange={(e) =>
                                set('defaultTags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))
                            }
                            className="h-16 text-xs resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            {preview && (
                <div className="rounded-lg border p-4 space-y-3">
                    <p className="font-medium text-sm">Import Summary</p>
                    <ImportStats preview={preview} compact />
                    {options.defaultTags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            + {options.defaultTags.length} default tag{options.defaultTags.length !== 1 ? 's' : ''} will be applied to all entries
                        </p>
                    )}
                </div>
            )}

            {options.strategy === 'replace' && !options.preserveExistingEntries && (
                <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                        <strong>Warning:</strong> Replace strategy without &quot;preserve existing&quot; will permanently delete all current changelog entries before importing.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button
                    onClick={onImport}
                    disabled={!preview || preview.validEntries === 0}
                    className="min-w-32"
                >
                    Start Import
                </Button>
            </div>
        </motion.div>
    );
}
