'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Github,
    Sparkles,
    Calendar,
    GitBranch,
    Tag,
    Loader2,
    Copy,
    Check,
    BookOpen,
    ExternalLink,
    Info,
    Zap
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface GitHubTag {
    name: string;
    sha: string;
}

interface GitHubRelease {
    name: string;
    tagName: string;
}

interface AISettings {
    enableAIAssistant: boolean;
    aiApiKey: string | null;
}

interface GenerationOptions {
    method: 'recent' | 'between_tags' | 'between_commits';
    daysBack: number;
    fromRef: string;
    toRef: string;
    useAI: boolean;
    groupByType: boolean;
    includeCommitLinks: boolean;
}

interface GeneratedChangelog {
    content: string;
    version?: string;
    commitsCount: number;
    sections: Array<{
        title: string;
        type: string;
        emoji?: string;
        commitsCount: number;
    }>;
}

interface GenerateResult {
    success: boolean;
    changelog?: GeneratedChangelog;
    metadata?: {
        method: string;
        generatedAt: string;
        repositoryUrl: string;
        fromRef?: string;
        toRef?: string;
        daysBack?: number;
    };
    error?: string;
    details?: string;
}

interface Props {
    projectId: string;
    onGenerated: (content: string, version?: string) => void;
    trigger?: React.ReactNode;
}

const DEFAULT_OPTIONS: GenerationOptions = {
    method: 'recent',
    daysBack: 7,
    fromRef: '',
    toRef: 'HEAD',
    useAI: false,
    groupByType: true,
    includeCommitLinks: true,
};

export default function GitHubGenerateDialog({
                                                 projectId,
                                                 onGenerated,
                                                 trigger
                                             }: Props) {
    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTags, setIsFetchingTags] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Data State
    const [tags, setTags] = useState<GitHubTag[]>([]);
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [aiSettings, setAiSettings] = useState<AISettings>({
        enableAIAssistant: false,
        aiApiKey: null
    });

    // Form State
    const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setResult(null);
            setError(null);
            setCopied(false);
        } else {
            // Reset form when closing
            setOptions(DEFAULT_OPTIONS);
            setResult(null);
            setError(null);
        }
    }, [isOpen]);

    // Load AI settings and tags/releases
    const loadInitialData = useCallback(async () => {
        await Promise.all([
            loadAISettings(),
            loadTagsAndReleases()
        ]);
    }, [projectId]);

    const loadAISettings = async () => {
        try {
            const response = await fetch('/api/ai/settings');
            if (response.ok) {
                const data = await response.json();
                setAiSettings({
                    enableAIAssistant: data.enableAIAssistant || false,
                    aiApiKey: data.aiApiKey || null
                });

                // Disable AI option if not available
                if (!data.enableAIAssistant || !data.aiApiKey) {
                    setOptions(prev => ({ ...prev, useAI: false }));
                }
            }
        } catch (err) {
            console.error('Failed to load AI settings:', err);
            setAiSettings({ enableAIAssistant: false, aiApiKey: null });
            setOptions(prev => ({ ...prev, useAI: false }));
        }
    };

    const loadTagsAndReleases = async () => {
        try {
            setIsFetchingTags(true);
            setError(null);

            const response = await fetch(`/api/projects/${projectId}/integrations/github/tags`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || `Failed to load tags (${response.status})`);
            }

            const data = await response.json();
            setTags(data.tags || []);
            setReleases(data.releases || []);

        } catch (err) {
            console.error('Failed to load tags and releases:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load tags and releases';
            setError(errorMessage);
            setTags([]);
            setReleases([]);
        } finally {
            setIsFetchingTags(false);
        }
    };

    const generateChangelog = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setResult(null);

            // Validate options
            const validationError = validateOptions();
            if (validationError) {
                throw new Error(validationError);
            }

            const response = await fetch(`/api/projects/${projectId}/integrations/github/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || `Request failed (${response.status})`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Generation was not successful');
            }

            setResult(data);

        } catch (err) {
            console.error('Generation error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate changelog';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const validateOptions = (): string | null => {
        if (options.method === 'recent') {
            if (!options.daysBack || options.daysBack < 1 || options.daysBack > 365) {
                return 'Days back must be between 1 and 365';
            }
        }

        if (options.method === 'between_tags' || options.method === 'between_commits') {
            if (!options.fromRef || !options.toRef) {
                return 'Both from and to references are required';
            }
            if (options.fromRef === options.toRef) {
                return 'From and to references must be different';
            }
        }

        return null;
    };

    const copyToClipboard = async () => {
        if (!result?.changelog?.content) return;

        try {
            await navigator.clipboard.writeText(result.changelog.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const handleUseChangelog = () => {
        if (result?.changelog) {
            onGenerated(result.changelog.content, result.changelog.version);
            setIsOpen(false);
        }
    };

    // Update options helpers
    const updateOptions = (updates: Partial<GenerationOptions>) => {
        setOptions(prev => ({ ...prev, ...updates }));
    };

    const isGenerateDisabled = (): boolean => {
        if (isLoading || isFetchingTags) return true;

        if (options.method === 'recent') {
            return !options.daysBack || options.daysBack < 1;
        }

        if (options.method === 'between_tags' || options.method === 'between_commits') {
            return !options.fromRef || !options.toRef;
        }

        return false;
    };

    const getAIAvailabilityMessage = (): string => {
        if (!aiSettings.enableAIAssistant) {
            return 'AI assistant is not enabled in system settings';
        }
        if (!aiSettings.aiApiKey) {
            return 'AI API key is not configured in system settings';
        }
        return 'AI enhancement available';
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Github className="h-4 w-4" />
                        Generate from GitHub
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Github className="h-5 w-5" />
                        Generate Changelog from GitHub
                    </DialogTitle>
                    <DialogDescription>
                        Generate changelog content from your GitHub repository commits using various methods and AI enhancement.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Error Alert */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Generation Method */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium">Generation Method</Label>
                        <Tabs
                            value={options.method}
                            onValueChange={(value) => updateOptions({ method: value as GenerationOptions['method'] })}
                        >
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="recent" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Recent Commits
                                </TabsTrigger>
                                <TabsTrigger value="between_tags" className="gap-2">
                                    <Tag className="h-4 w-4" />
                                    Between Tags
                                </TabsTrigger>
                                <TabsTrigger value="between_commits" className="gap-2">
                                    <GitBranch className="h-4 w-4" />
                                    Between Commits
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="recent" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="daysBack">Days to look back</Label>
                                    <Input
                                        id="daysBack"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={options.daysBack || ''}
                                        onChange={(e) => updateOptions({
                                            daysBack: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="7"
                                        className="w-32"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Generate changelog from commits made in the last N days (1-365)
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="between_tags" className="space-y-4 mt-4">
                                {isFetchingTags ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Loading tags and releases...
                                    </div>
                                ) : tags.length === 0 && releases.length === 0 ? (
                                    <Alert variant="info">
                                        <AlertDescription>
                                            No tags or releases found in the repository. Create some tags or releases first.
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>From Tag/Release</Label>
                                            <Select
                                                value={options.fromRef}
                                                onValueChange={(value) => updateOptions({ fromRef: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select starting point" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {releases.map(release => (
                                                        <SelectItem key={`release-from-${release.tagName}`} value={release.tagName}>
                                                            📦 {release.name} ({release.tagName})
                                                        </SelectItem>
                                                    ))}
                                                    {tags.map(tag => (
                                                        <SelectItem key={`tag-from-${tag.name}`} value={tag.name}>
                                                            🏷️ {tag.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>To Tag/Release</Label>
                                            <Select
                                                value={options.toRef}
                                                onValueChange={(value) => updateOptions({ toRef: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select ending point" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="HEAD">🔥 Latest (HEAD)</SelectItem>
                                                    {releases.map(release => (
                                                        <SelectItem key={`release-to-${release.tagName}`} value={release.tagName}>
                                                            📦 {release.name} ({release.tagName})
                                                        </SelectItem>
                                                    ))}
                                                    {tags.map(tag => (
                                                        <SelectItem key={`tag-to-${tag.name}`} value={tag.name}>
                                                            🏷️ {tag.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="between_commits" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fromCommit">From Commit/Branch</Label>
                                        <Input
                                            id="fromCommit"
                                            value={options.fromRef}
                                            onChange={(e) => updateOptions({ fromRef: e.target.value })}
                                            placeholder="abc123... or branch-name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="toCommit">To Commit/Branch</Label>
                                        <Input
                                            id="toCommit"
                                            value={options.toRef}
                                            onChange={(e) => updateOptions({ toRef: e.target.value })}
                                            placeholder="def456... or main"
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Use commit SHAs (full or short) or branch names. Leave &ldquo;To&rdquo; as &ldquo;main&rdquo; or &quot;HEAD&quot; for latest.
                                </p>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <Separator />

                    {/* Generation Options */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium">Generation Options</Label>
                        <div className="space-y-3">
                            {/* AI Enhancement */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        <Label htmlFor="useAI">AI Enhancement</Label>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-3 w-3 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{getAIAvailabilityMessage()}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Use AI to improve and polish the generated changelog content
                                    </p>
                                    {!aiSettings.enableAIAssistant && (
                                        <p className="text-xs text-orange-600">
                                            AI assistant is not enabled in system settings
                                        </p>
                                    )}
                                </div>
                                <Switch
                                    id="useAI"
                                    checked={options.useAI}
                                    disabled={!aiSettings.enableAIAssistant || !aiSettings.aiApiKey}
                                    onCheckedChange={(checked) => updateOptions({ useAI: checked })}
                                />
                            </div>

                            {/* Group by Type */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label htmlFor="groupByType">Group by Type</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Organize commits into sections like Features, Bug Fixes, etc.
                                    </p>
                                </div>
                                <Switch
                                    id="groupByType"
                                    checked={options.groupByType}
                                    onCheckedChange={(checked) => updateOptions({ groupByType: checked })}
                                />
                            </div>

                            {/* Include Commit Links */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        <Label htmlFor="includeLinks">Include Commit Links</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Add clickable links to individual commits in the changelog
                                    </p>
                                </div>
                                <Switch
                                    id="includeLinks"
                                    checked={options.includeCommitLinks}
                                    onCheckedChange={(checked) => updateOptions({ includeCommitLinks: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={generateChangelog}
                            disabled={isGenerateDisabled()}
                            size="lg"
                            className="gap-2 min-w-48"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    Generate Changelog
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Results */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                <Separator />

                                {/* Result Summary */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Generated Changelog</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {result.changelog?.commitsCount || 0} commits processed
                                            {result.changelog?.version && ` • Suggested version: ${result.changelog.version}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={copyToClipboard}
                                            className="gap-2"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    Copy
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Sections Summary */}
                                {result.changelog?.sections && result.changelog.sections.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {result.changelog.sections.map((section, index) => (
                                            <Badge key={`section-${index}`} variant="secondary" className="gap-1">
                                                {section.emoji && <span>{section.emoji}</span>}
                                                {section.title}
                                                <span className="text-xs">({section.commitsCount})</span>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Generated Content */}
                                <div className="space-y-2">
                                    <Label>Generated Content</Label>
                                    <Textarea
                                        value={result.changelog?.content || ''}
                                        readOnly
                                        className="min-h-64 font-mono text-sm"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    {result?.changelog && (
                        <Button onClick={handleUseChangelog} className="gap-2">
                            <BookOpen className="h-4 w-4" />
                            Use This Changelog
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}