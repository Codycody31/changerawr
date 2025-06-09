'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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
    Info,
    Zap,
    Settings,
    Users,
    Brain,
    Target,
    ArrowRight,
    Code,
    Paintbrush2,
    Briefcase,
    MessageSquare,
    BarChart3,
    ArrowLeft
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
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

// Enhanced types
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
    aiModel: string | null;
}

interface EnhancedGenerationOptions {
    method: 'recent' | 'between_tags' | 'between_commits';
    daysBack: number;
    fromRef: string;
    toRef: string;
    useAI: boolean;
    aiOptions: {
        style: 'professional' | 'casual' | 'technical' | 'marketing';
        audience: 'developers' | 'users' | 'stakeholders' | 'mixed';
        includeImpact: boolean;
        includeTechnicalDetails: boolean;
        groupSimilarChanges: boolean;
        prioritizeByImportance: boolean;
        temperature: number;
        model: string;
    };
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
        description?: string;
        commitsCount: number;
        entries?: Array<{
            title: string;
            description: string;
            impact?: string;
            importance: number;
        }>;
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
        aiEnhanced?: boolean;
        aiGenerated?: boolean;
        style?: string;
        audience?: string;
        totalCommits?: number;
        processedCommits?: number;
    };
    error?: string;
    details?: string;
}

interface Props {
    projectId: string;
    onGenerated: (content: string, version?: string) => void;
    trigger?: React.ReactNode;
}

const DEFAULT_OPTIONS: EnhancedGenerationOptions = {
    method: 'recent',
    daysBack: 7,
    fromRef: '',
    toRef: 'HEAD',
    useAI: false,
    aiOptions: {
        style: 'professional',
        audience: 'mixed',
        includeImpact: true,
        includeTechnicalDetails: false,
        groupSimilarChanges: true,
        prioritizeByImportance: true,
        temperature: 0.7,
        model: 'copilot-zero'
    },
    groupByType: true,
    includeCommitLinks: true,
};

const STYLE_OPTIONS = [
    { value: 'professional', label: 'Professional', icon: Briefcase, description: 'Formal, business-ready language' },
    { value: 'casual', label: 'Casual', icon: MessageSquare, description: 'Friendly, conversational tone' },
    { value: 'technical', label: 'Technical', icon: Code, description: 'Developer-focused with details' },
    { value: 'marketing', label: 'Marketing', icon: Paintbrush2, description: 'Engaging, benefit-focused' }
] as const;

const AUDIENCE_OPTIONS = [
    { value: 'developers', label: 'Developers', icon: Code, description: 'Technical audience, code-focused' },
    { value: 'users', label: 'End Users', icon: Users, description: 'Non-technical users, benefit-focused' },
    { value: 'stakeholders', label: 'Stakeholders', icon: BarChart3, description: 'Business impact, high-level' },
    { value: 'mixed', label: 'Mixed Audience', icon: Target, description: 'Balanced for all audiences' }
] as const;

export default function EnhancedGitHubGenerateDialog({
                                                         projectId,
                                                         onGenerated,
                                                         trigger
                                                     }: Props) {
    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTags, setIsFetchingTags] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Data State
    const [tags, setTags] = useState<GitHubTag[]>([]);
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [aiSettings, setAiSettings] = useState<AISettings>({
        enableAIAssistant: false,
        aiApiKey: null,
        aiModel: null
    });

    // Form State
    const [options, setOptions] = useState<EnhancedGenerationOptions>(DEFAULT_OPTIONS);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setResult(null);
            setError(null);
            setCopied(false);
            setCurrentStep(1);
        } else {
            setOptions(DEFAULT_OPTIONS);
            setResult(null);
            setError(null);
            setCurrentStep(1);
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
                    aiApiKey: data.aiApiKey || null,
                    aiModel: data.aiModel || null
                });

                if (!data.enableAIAssistant || !data.aiApiKey) {
                    setOptions(prev => ({ ...prev, useAI: false }));
                }
            }
        } catch (err) {
            console.error('Failed to load AI settings:', err);
            setAiSettings({ enableAIAssistant: false, aiApiKey: null, aiModel: null, });
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
            setCurrentStep(3); // Move to results step

            // Trigger confetti on successful generation
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']
            });

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
            setIsRedirecting(true);

            // Trigger celebration confetti
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            });

            // Small delay to show confetti before redirect
            setTimeout(() => {
                onGenerated(result.changelog?.content ?? '', result.changelog?.version ?? '');
                // Don't close the modal - let the parent handle navigation
            }, 800);
        }
    };

    const updateOptions = (updates: Partial<EnhancedGenerationOptions>) => {
        setOptions(prev => ({ ...prev, ...updates }));
    };

    const updateAIOptions = (updates: Partial<EnhancedGenerationOptions['aiOptions']>) => {
        setOptions(prev => ({
            ...prev,
            aiOptions: { ...prev.aiOptions, ...updates }
        }));
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Github className="h-4 w-4" />
                        Generate Content
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-background">
                {/* Redirecting Modal Overlay */}
                <AnimatePresence>
                    {isRedirecting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
                        >
                            <div className="text-center space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        Creating Your Changelog
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Preparing your enhanced content...
                                    </p>
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                        className="w-2 h-2 bg-blue-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                        className="w-2 h-2 bg-purple-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                        className="w-2 h-2 bg-green-500 rounded-full"
                                    />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Github className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Generate Changelog Content</h1>
                                <p className="text-muted-foreground">Transform GitHub commits into polished changelog content</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-6 py-4 border-b bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-6">
                                {[
                                    { step: 1, label: 'Source', icon: GitBranch },
                                    { step: 2, label: 'Enhancement', icon: Sparkles },
                                    { step: 3, label: 'Results', icon: BookOpen }
                                ].map(({ step, label, icon: Icon }) => (
                                    <div
                                        key={step}
                                        className={`flex items-center gap-2 ${
                                            currentStep >= step ? 'text-primary' : 'text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                            currentStep > step
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : currentStep === step
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-muted-foreground/30'
                                        }`}>
                                            {currentStep > step ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Icon className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="font-medium">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <motion.div
                                className="bg-primary h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentStep / 3) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    {/* Error Alert */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 py-4 border-b bg-destructive/5"
                            >
                                <Alert variant="destructive" className="border-destructive/30">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex"
                                >

                                    {/* Left Panel - Method Selection */}
                                    <div className="w-1/2 p-8 border-r">
                                        <div className="space-y-6">
                                            <div>
                                                <h2 className="text-xl font-semibold mb-2">Choose Generation Method</h2>
                                                <p className="text-muted-foreground">Select how to gather commits for your changelog</p>
                                            </div>

                                            <div className="space-y-4">
                                                {[
                                                    {
                                                        value: 'recent' as const,
                                                        title: 'Recent Commits',
                                                        icon: Calendar,
                                                        description: 'Generate from commits in the last N days'
                                                    },
                                                    {
                                                        value: 'between_tags' as const,
                                                        title: 'Between Tags',
                                                        icon: Tag,
                                                        description: 'Generate between two tags or releases'
                                                    },
                                                    {
                                                        value: 'between_commits' as const,
                                                        title: 'Between Commits',
                                                        icon: GitBranch,
                                                        description: 'Generate between specific commits'
                                                    }
                                                ].map((method) => {
                                                    const Icon = method.icon;
                                                    const isSelected = options.method === method.value;

                                                    return (
                                                        <motion.div
                                                            key={method.value}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                        >
                                                            <div
                                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary/5'
                                                                        : 'border-muted hover:border-primary/30 hover:bg-muted/50'
                                                                }`}
                                                                onClick={() => updateOptions({ method: method.value })}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 bg-primary/10 rounded-lg">
                                                                        <Icon className="h-5 w-5 text-primary" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h3 className="font-medium">{method.title}</h3>
                                                                        <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="h-5 w-5 text-primary" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - Method Configuration */}
                                    <div className="w-1/2 p-8">
                                        <div className="space-y-6">
                                            <div>
                                                <h2 className="text-xl font-semibold mb-2">Configuration</h2>
                                                <p className="text-muted-foreground">Configure your selected method</p>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {options.method === 'recent' && (
                                                    <motion.div
                                                        key="recent"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        <div className="space-y-4">
                                                            <Label className="text-base">Days to look back</Label>
                                                            <div className="space-y-4">
                                                                <div className="px-4 py-2 bg-muted/50 rounded-lg">
                                                                    <div className="text-center">
                                                                        <span className="text-3xl font-bold text-primary">{options.daysBack}</span>
                                                                        <span className="text-lg text-muted-foreground ml-2">days</span>
                                                                    </div>
                                                                </div>
                                                                <Slider
                                                                    value={[options.daysBack]}
                                                                    onValueChange={(value) => updateOptions({ daysBack: value[0] })}
                                                                    min={1}
                                                                    max={365}
                                                                    step={1}
                                                                    className="w-full"
                                                                />
                                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                                    <span>1 day</span>
                                                                    <span>365 days</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Generate changelog from commits made in the last {options.daysBack} days
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {options.method === 'between_tags' && (
                                                    <motion.div
                                                        key="tags"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        {isFetchingTags ? (
                                                            <div className="flex items-center justify-center py-12">
                                                                <div className="text-center">
                                                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                                                                    <p className="text-muted-foreground">Loading tags and releases...</p>
                                                                </div>
                                                            </div>
                                                        ) : tags.length === 0 && releases.length === 0 ? (
                                                            <Alert>
                                                                <Info className="h-4 w-4" />
                                                                <AlertDescription>
                                                                    No tags or releases found in the repository. Create some tags or releases first.
                                                                </AlertDescription>
                                                            </Alert>
                                                        ) : (
                                                            <div className="space-y-4">
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
                                                    </motion.div>
                                                )}

                                                {options.method === 'between_commits' && (
                                                    <motion.div
                                                        key="commits"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        <div className="space-y-4">
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
                                                            <p className="text-sm text-muted-foreground">
                                                                Use commit SHAs (full or short) or branch names. Leave &ldquo;To&rdquo; as &ldquo;main&rdquo; or &ldquo;HEAD&rdquo; for latest.
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex"
                                >
                                    {/* Left Panel - AI Toggle */}
                                    <div className="w-1/2 p-8 border-r">
                                        <div className="space-y-6">
                                            <div>
                                                <h2 className="text-xl font-semibold mb-2">AI Enhancement</h2>
                                                <p className="text-muted-foreground">Enhance your changelog with AI-powered improvements</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* AI Toggle Card */}
                                                <div className="p-6 border rounded-lg">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                                    <Brain className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <Label htmlFor="useAI" className="text-lg font-medium">AI Processing</Label>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Rephrase and reorganize commits for clarity
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {!aiSettings.enableAIAssistant && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    AI assistant not configured
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Switch
                                                            id="useAI"
                                                            checked={options.useAI}
                                                            disabled={!aiSettings.enableAIAssistant || !aiSettings.aiApiKey}
                                                            onCheckedChange={(checked) => updateOptions({ useAI: checked })}
                                                            className="scale-125"
                                                        />
                                                    </div>

                                                    {options.useAI && (
                                                        <div className="pt-4 border-t space-y-4">
                                                            <div className="space-y-3">
                                                                <Label className="text-sm font-medium">Quick Settings</Label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {[
                                                                        { key: 'includeImpact', label: 'Impact Analysis' },
                                                                        { key: 'groupSimilarChanges', label: 'Smart Grouping' },
                                                                        { key: 'prioritizeByImportance', label: 'Priority Sort' },
                                                                        { key: 'includeTechnicalDetails', label: 'Tech Details' }
                                                                    ].map((feature) => (
                                                                        <div key={feature.key} className="flex items-center space-x-2">
                                                                            <Switch
                                                                                checked={options.aiOptions[feature.key as keyof typeof options.aiOptions] as boolean}
                                                                                onCheckedChange={(checked) =>
                                                                                    updateAIOptions({ [feature.key]: checked })
                                                                                }
                                                                                className="scale-75"
                                                                            />
                                                                            <Label className="text-xs">{feature.label}</Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Basic Options */}
                                                <div className="space-y-4">
                                                    <Label className="text-base font-medium">Basic Options</Label>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                                            <div>
                                                                <Label>Group by Type</Label>
                                                                <p className="text-xs text-muted-foreground">Organize into sections</p>
                                                            </div>
                                                            <Switch
                                                                checked={options.groupByType}
                                                                onCheckedChange={(checked) => updateOptions({ groupByType: checked })}
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                                            <div>
                                                                <Label>Include Commit Links</Label>
                                                                <p className="text-xs text-muted-foreground">Link to commits</p>
                                                            </div>
                                                            <Switch
                                                                checked={options.includeCommitLinks}
                                                                onCheckedChange={(checked) => updateOptions({ includeCommitLinks: checked })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - AI Configuration */}
                                    <div className="w-1/2 p-8">
                                        <AnimatePresence>
                                            {options.useAI ? (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    className="space-y-6"
                                                >
                                                    <div>
                                                        <h2 className="text-xl font-semibold mb-2">AI Configuration</h2>
                                                        <p className="text-muted-foreground">Customize how AI processes your content</p>
                                                    </div>

                                                    {/* Style Selection */}
                                                    <div className="space-y-4">
                                                        <Label className="text-base font-medium">Writing Style</Label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {STYLE_OPTIONS.map((style) => {
                                                                const Icon = style.icon;
                                                                const isSelected = options.aiOptions.style === style.value;

                                                                return (
                                                                    <motion.div
                                                                        key={style.value}
                                                                        whileHover={{ scale: 1.02 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                    >
                                                                        <div
                                                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                                                isSelected
                                                                                    ? 'border-primary bg-primary/5'
                                                                                    : 'border-muted hover:border-primary/30 hover:bg-muted/50'
                                                                            }`}
                                                                            onClick={() => updateAIOptions({ style: style.value })}
                                                                        >
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Icon className="h-4 w-4 text-primary" />
                                                                                <span className="font-medium text-sm">{style.label}</span>
                                                                                {isSelected && <Check className="h-3 w-3 text-primary ml-auto" />}
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground">{style.description}</p>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Audience Selection */}
                                                    <div className="space-y-4">
                                                        <Label className="text-base font-medium">Target Audience</Label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {AUDIENCE_OPTIONS.map((audience) => {
                                                                const Icon = audience.icon;
                                                                const isSelected = options.aiOptions.audience === audience.value;

                                                                return (
                                                                    <motion.div
                                                                        key={audience.value}
                                                                        whileHover={{ scale: 1.02 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                    >
                                                                        <div
                                                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                                                isSelected
                                                                                    ? 'border-primary bg-primary/5'
                                                                                    : 'border-muted hover:border-primary/30 hover:bg-muted/50'
                                                                            }`}
                                                                            onClick={() => updateAIOptions({ audience: audience.value })}
                                                                        >
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Icon className="h-4 w-4 text-primary" />
                                                                                <span className="font-medium text-sm">{audience.label}</span>
                                                                                {isSelected && <Check className="h-3 w-3 text-primary ml-auto" />}
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground">{audience.description}</p>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Temperature */}
                                                    <div className="space-y-3">
                                                        <Label className="text-base font-medium">AI Creativity</Label>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-muted-foreground">Conservative</span>
                                                                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{options.aiOptions.temperature}</span>
                                                                <span className="text-sm text-muted-foreground">Creative</span>
                                                            </div>
                                                            <Slider
                                                                value={[options.aiOptions.temperature]}
                                                                onValueChange={(value) => updateAIOptions({ temperature: value[0] })}
                                                                min={0.1}
                                                                max={1}
                                                                step={0.1}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center justify-center h-64"
                                                >
                                                    <div className="text-center">
                                                        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                        <h3 className="text-lg font-medium mb-2">Standard Processing</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            Enable AI enhancement to access advanced options
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 3 && result && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex"
                                >
                                    {/* Left Panel - Results Overview */}
                                    <div className="w-1/3 p-8 border-r">
                                        <div className="space-y-6">
                                            <div>
                                                <h2 className="text-xl font-semibold mb-2">Generation Complete</h2>
                                                <p className="text-muted-foreground">Your changelog content is ready</p>
                                            </div>

                                            {/* Stats */}
                                            <div className="space-y-4">
                                                <div className="p-4 bg-muted/30 rounded-lg">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold">Success!</h3>
                                                            <p className="text-sm text-muted-foreground">Content generated</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span>Commits processed:</span>
                                                            <span className="font-medium">{result.changelog?.commitsCount || 0}</span>
                                                        </div>
                                                        {result.changelog?.version && (
                                                            <div className="flex justify-between">
                                                                <span>Suggested version:</span>
                                                                <Badge variant="secondary" className="text-xs">{result.changelog.version}</Badge>
                                                            </div>
                                                        )}
                                                        {result.metadata?.aiGenerated && (
                                                            <>
                                                                <Separator />
                                                                <div className="flex justify-between">
                                                                    <span>AI Style:</span>
                                                                    <span className="font-medium capitalize">{result.metadata.style}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Target:</span>
                                                                    <span className="font-medium capitalize">{result.metadata.audience}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Sections */}
                                                {result.changelog?.sections && result.changelog.sections.length > 0 && (
                                                    <div className="space-y-3">
                                                        <Label className="text-base font-medium">Content Sections</Label>
                                                        <div className="space-y-2">
                                                            {result.changelog.sections.map((section, index) => (
                                                                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                                                    <div className="flex items-center gap-2">
                                                                        {section.emoji && <span>{section.emoji}</span>}
                                                                        <span className="text-sm font-medium">{section.title}</span>
                                                                    </div>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {section.commitsCount}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - Content Preview */}
                                    <div className="w-2/3 p-8">
                                        <div className="space-y-4 h-full flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-base font-medium">Generated Content</Label>
                                                <div className="flex gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
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
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy to clipboard</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            <div className="flex-1 relative">
                                                <Textarea
                                                    value={result.changelog?.content || ''}
                                                    readOnly
                                                    className="h-full resize-none font-mono text-sm border-muted"
                                                />
                                                <div className="absolute bottom-3 right-3">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {result.changelog?.content?.length || 0} chars
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {currentStep > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        className="gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                {currentStep < 3 && (
                                    <Button
                                        onClick={() => {
                                            if (currentStep === 2) {
                                                generateChangelog();
                                            } else {
                                                setCurrentStep(currentStep + 1);
                                            }
                                        }}
                                        disabled={isGenerateDisabled()}
                                        className="gap-2"
                                    >
                                        {currentStep === 2 ? (
                                            isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-4 w-4" />
                                                    Generate Content
                                                </>
                                            )
                                        ) : (
                                            <>
                                                Next
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                )}

                                {currentStep === 3 && result && (
                                    <Button
                                        onClick={handleUseChangelog}
                                        className="gap-2"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Use This Content
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}