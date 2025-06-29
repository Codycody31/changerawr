'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
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
    Brain,
    ArrowRight,
    Code2,
    FileText,
    ArrowLeft,
    Clock,
    Database,
    Activity,
    AlertCircle
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Slider} from '@/components/ui/slider';
import {ScrollArea} from '@/components/ui/scroll-area';
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

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
    aiModel: string | null;
}

interface GenerationOptions {
    method: 'recent' | 'between_tags' | 'between_commits';
    daysBack: number;
    fromRef: string;
    toRef: string;
    useAI: boolean;
    includeCodeAnalysis: boolean;
    maxCommitsToAnalyze: number;
    groupByType: boolean;
    includeCommitLinks: boolean;
}

interface GeneratedChangelog {
    content: string;
    version?: string;
    commitsCount: number;
    entriesCount: number;
    entries: Array<{
        category: string;
        description: string;
        impact?: string;
        technicalDetails?: string;
        files: string[];
        commit: string;
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
        codeAnalysis?: boolean;
        totalCommits?: number;
        analyzedCommits?: number;
        hasCodeAnalysis?: boolean;
        model?: string;
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
    includeCodeAnalysis: false,
    maxCommitsToAnalyze: 25,
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
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTags, setIsFetchingTags] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [copied, setCopied] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Data State
    const [tags, setTags] = useState<GitHubTag[]>([]);
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [result, setResult] = useState<GenerateResult | undefined>();
    const [aiSettings, setAiSettings] = useState<AISettings>({
        enableAIAssistant: false,
        aiApiKey: null,
        aiModel: 'copilot-zero'
    });

    // Form State
    const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setResult(undefined);
            setError(undefined);
            setCopied(false);
            setCurrentStep(1);
        } else {
            setOptions(DEFAULT_OPTIONS);
            setResult(undefined);
            setError(undefined);
            setCurrentStep(1);
        }
    }, [isOpen]);

    // Load initial data
    const loadInitialData = useCallback(async () => {
        await Promise.all([
            loadAISettings(),
            loadTagsAndReleases()
        ]);
    }, [projectId]);

    const loadAISettings = async () => {
        try {
            // Fetch encrypted settings
            const response = await fetch('/api/ai/settings');
            if (response.ok) {
                const data = await response.json();

                let decryptedApiKey: string | null = null;

                // If AI is enabled and we have an encrypted API key, decrypt it
                if (data.enableAIAssistant && data.aiApiKey) {
                    try {
                        const decryptResponse = await fetch('/api/ai/decrypt', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ encryptedToken: data.aiApiKey }),
                        });

                        if (decryptResponse.ok) {
                            const decryptData = await decryptResponse.json();
                            decryptedApiKey = decryptData.decryptedKey;
                        } else {
                            console.error('Failed to decrypt API key:', decryptResponse.statusText);
                        }
                    } catch (decryptError) {
                        console.error('Error decrypting API key:', decryptError);
                    }
                }

                setAiSettings({
                    enableAIAssistant: data.enableAIAssistant || false,
                    aiApiKey: decryptedApiKey,
                    aiModel: data.aiDefaultModel || 'copilot-zero'
                });

                if (!data.enableAIAssistant || !decryptedApiKey) {
                    setOptions(prev => ({...prev, useAI: false}));
                }
            }
        } catch (err) {
            console.error('Failed to load AI settings:', err);
            setAiSettings({enableAIAssistant: false, aiApiKey: null, aiModel: 'copilot-zero'});
            setOptions(prev => ({...prev, useAI: false}));
        }
    };

    const loadTagsAndReleases = async () => {
        try {
            setIsFetchingTags(true);
            setError(undefined);

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
            setError(undefined);
            setResult(undefined);

            const validationError = validateOptions();
            if (validationError) {
                throw new Error(validationError);
            }

            const response = await fetch(`/api/projects/${projectId}/integrations/github/generate`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...options,
                    aiModel: aiSettings.aiModel,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || `Request failed (${response.status})`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Generation was not successful');
            }

            setResult(data);
            setCurrentStep(3);

            // Trigger confetti on successful generation
            confetti({
                particleCount: 100,
                spread: 70,
                origin: {y: 0.6},
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

    const validateOptions = (): string | undefined => {
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

        return undefined;
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

            confetti({
                particleCount: 150,
                spread: 100,
                origin: {y: 0.5},
                colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            });

            setTimeout(() => {
                onGenerated(result.changelog?.content ?? '', result.changelog?.version);
            }, 800);
        }
    };

    const updateOptions = (updates: Partial<GenerationOptions>) => {
        setOptions(prev => ({...prev, ...updates}));
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
        <TooltipProvider>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" className="gap-2">
                            <Github className="h-4 w-4"/>
                            Generate from GitHub
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent className="max-w-screen max-h-screen w-screen h-screen p-0 border-0 bg-background">
                    <DialogTitle className="sr-only">
                        Generate Changelog from GitHub - Step {currentStep} of 3
                    </DialogTitle>
                    {/* Redirecting Overlay */}
                    <AnimatePresence>
                        {isRedirecting && (
                            <motion.div
                                initial={{opacity: 0}}
                                animate={{opacity: 1}}
                                exit={{opacity: 0}}
                                className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
                            >
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            Creating Your Changelog
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Preparing your content...
                                        </p>
                                    </div>
                                    <motion.div
                                        animate={{scale: [1, 1.1, 1]}}
                                        transition={{duration: 2, repeat: Infinity}}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <motion.div
                                            animate={{y: [0, -10, 0]}}
                                            transition={{duration: 0.6, repeat: Infinity, delay: 0}}
                                            className="w-2 h-2 bg-blue-500 rounded-full"
                                        />
                                        <motion.div
                                            animate={{y: [0, -10, 0]}}
                                            transition={{duration: 0.6, repeat: Infinity, delay: 0.2}}
                                            className="w-2 h-2 bg-purple-500 rounded-full"
                                        />
                                        <motion.div
                                            animate={{y: [0, -10, 0]}}
                                            transition={{duration: 0.6, repeat: Infinity, delay: 0.4}}
                                            className="w-2 h-2 bg-green-500 rounded-full"
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex h-full">
                        {/* Sidebar */}
                        <div className="w-80 border-r bg-muted/20 flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Github className="h-5 w-5 text-primary"/>
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold">GitHub Generator</h1>
                                        <p className="text-sm text-muted-foreground">Transform commits into
                                            changelog</p>
                                    </div>
                                </div>

                                {/* Progress Steps */}
                                <div className="space-y-3">
                                    {[
                                        {step: 1, label: 'Source', icon: GitBranch},
                                        {step: 2, label: 'Options', icon: Sparkles},
                                        {step: 3, label: 'Results', icon: BookOpen}
                                    ].map(({step, label, icon: Icon}) => (
                                        <div
                                            key={step}
                                            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                                                currentStep === step
                                                    ? 'bg-primary/10 text-primary'
                                                    : currentStep > step
                                                        ? 'text-green-600'
                                                        : 'text-muted-foreground'
                                            }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                                    currentStep > step
                                                        ? 'bg-green-100 border-green-500 text-green-600'
                                                        : currentStep === step
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-muted-foreground/30 text-muted-foreground'
                                                }`}>
                                                {currentStep > step ? (
                                                    <Check className="h-4 w-4"/>
                                                ) : (
                                                    <Icon className="h-4 w-4"/>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Current Step Info */}
                            <ScrollArea className="flex-1">
                                <div className="p-6">
                                    <AnimatePresence mode="wait">
                                        {currentStep === 1 && (
                                            <motion.div
                                                key="step1-info"
                                                initial={{opacity: 0, y: 10}}
                                                animate={{opacity: 1, y: 0}}
                                                exit={{opacity: 0, y: -10}}
                                                className="space-y-4"
                                            >
                                                <h3 className="font-semibold text-primary">Choose Source Method</h3>
                                                <div className="space-y-3 text-sm text-muted-foreground">
                                                    <div className="p-3 bg-background rounded-lg border">
                                                        <div className="font-medium text-foreground mb-1">Recent Commits
                                                        </div>
                                                        <div>Analyze commits from the last N days</div>
                                                    </div>
                                                    <div className="p-3 bg-background rounded-lg border">
                                                        <div className="font-medium text-foreground mb-1">Between Tags</div>
                                                        <div>Compare changes between releases</div>
                                                    </div>
                                                    <div className="p-3 bg-background rounded-lg border">
                                                        <div className="font-medium text-foreground mb-1">Between Commits
                                                        </div>
                                                        <div>Specify exact commit range</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStep === 2 && (
                                            <motion.div
                                                key="step2-info"
                                                initial={{opacity: 0, y: 10}}
                                                animate={{opacity: 1, y: 0}}
                                                exit={{opacity: 0, y: -10}}
                                                className="space-y-4"
                                            >
                                                <h3 className="font-semibold text-primary">Configure Options</h3>
                                                <div className="space-y-3">
                                                    <div className="p-3 bg-background rounded-lg border">
                                                        <div className="font-medium text-foreground mb-2">Current Settings
                                                        </div>
                                                        <div className="space-y-2 text-sm text-muted-foreground">
                                                            <div className="flex justify-between">
                                                                <span>AI Enhancement:</span>
                                                                <span
                                                                    className={options.useAI ? 'text-green-600' : 'text-orange-600'}>
                                                                    {options.useAI ? 'Enabled' : 'Disabled'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Code Analysis:</span>
                                                                <span
                                                                    className={options.includeCodeAnalysis ? 'text-green-600' : 'text-muted-foreground'}>
                                                                    {options.includeCodeAnalysis ? 'Yes' : 'No'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Group by Type:</span>
                                                                <span
                                                                    className={options.groupByType ? 'text-green-600' : 'text-muted-foreground'}>
                                                                    {options.groupByType ? 'Yes' : 'No'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStep === 3 && result && (
                                            <motion.div
                                                key="step3-info"
                                                initial={{opacity: 0, y: 10}}
                                                animate={{opacity: 1, y: 0}}
                                                exit={{opacity: 0, y: -10}}
                                                className="space-y-4"
                                            >
                                                <h3 className="font-semibold text-primary">Generation Complete</h3>
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="text-center p-3 bg-primary/5 rounded-lg">
                                                            <div
                                                                className="text-xl font-bold text-primary">{result.changelog?.commitsCount || 0}</div>
                                                            <div className="text-xs text-muted-foreground">Commits</div>
                                                        </div>
                                                        <div
                                                            className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                                            <div
                                                                className="text-xl font-bold text-green-600">{result.changelog?.entriesCount || 0}</div>
                                                            <div className="text-xs text-muted-foreground">Entries</div>
                                                        </div>
                                                    </div>

                                                    {result.changelog?.version && (
                                                        <div
                                                            className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                                            <div
                                                                className="text-sm font-semibold text-blue-600">{result.changelog.version}</div>
                                                            <div className="text-xs text-muted-foreground">Suggested
                                                                Version
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2 text-xs text-muted-foreground">
                                                        {result.metadata?.hasCodeAnalysis && (
                                                            <div className="flex items-center gap-2">
                                                                <Database className="h-3 w-3 text-green-600"/>
                                                                <span
                                                                    className="text-green-600">Deep analysis enabled</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3 w-3"/>
                                                            <span>Generated just now</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>

                            {/* Footer Actions */}
                            <div className="p-6 border-t space-y-3">
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
                                        className="w-full gap-2"
                                        size="lg"
                                    >
                                        {currentStep === 2 ? (
                                            isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-4 w-4"/>
                                                    Generate Changelog
                                                </>
                                            )
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRight className="h-4 w-4"/>
                                            </>
                                        )}
                                    </Button>
                                )}

                                {currentStep === 3 && result && (
                                    <Button
                                        onClick={handleUseChangelog}
                                        className="w-full gap-2"
                                        disabled={isRedirecting}
                                        size="lg"
                                    >
                                        {isRedirecting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <BookOpen className="h-4 w-4"/>
                                                Use Changelog
                                            </>
                                        )}
                                    </Button>
                                )}

                                {currentStep > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        className="w-full gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4"/>
                                        Back
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Error Alert */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="p-4 border-b bg-destructive/5 flex-shrink-0"
                                    >
                                        <Alert variant="destructive" className="border-destructive/30">
                                            <AlertCircle className="h-4 w-4"/>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Step Content */}
                            <ScrollArea className="flex-1">
                                <div className="p-8">
                                    <AnimatePresence mode="wait">
                                        {/* Step 1: Source Selection */}
                                        {currentStep === 1 && (
                                            <motion.div
                                                key="step1"
                                                initial={{opacity: 0, x: 20}}
                                                animate={{opacity: 1, x: 0}}
                                                exit={{opacity: 0, x: -20}}
                                                className="space-y-8"
                                            >
                                                <div>
                                                    <h2 className="text-2xl font-bold mb-2">Choose Your Source</h2>
                                                    <p className="text-muted-foreground">Select how to gather commits for
                                                        your changelog</p>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6">
                                                    {[
                                                        {
                                                            value: 'recent' as const,
                                                            title: 'Recent Commits',
                                                            icon: Calendar,
                                                            description: 'Last N days of commits'
                                                        },
                                                        {
                                                            value: 'between_tags' as const,
                                                            title: 'Between Tags',
                                                            icon: Tag,
                                                            description: 'Compare two releases'
                                                        },
                                                        {
                                                            value: 'between_commits' as const,
                                                            title: 'Between Commits',
                                                            icon: GitBranch,
                                                            description: 'Specific commit range'
                                                        }
                                                    ].map((method) => {
                                                        const Icon = method.icon;
                                                        const isSelected = options.method === method.value;

                                                        return (
                                                            <motion.div
                                                                key={method.value}
                                                                whileHover={{scale: 1.02}}
                                                                whileTap={{scale: 0.98}}
                                                            >
                                                                <Card
                                                                    className={`cursor-pointer transition-all h-32 ${
                                                                        isSelected
                                                                            ? 'border-primary bg-primary/5 shadow-lg'
                                                                            : 'hover:border-primary/30 hover:shadow-md'
                                                                    }`}
                                                                    onClick={() => updateOptions({method: method.value})}
                                                                >
                                                                    <CardContent
                                                                        className="p-4 h-full flex flex-col items-center justify-center text-center">
                                                                        <div
                                                                            className="p-3 rounded-full mb-3 bg-primary/10">
                                                                            <Icon className="h-6 w-6 text-primary"/>
                                                                        </div>
                                                                        <div
                                                                            className="font-semibold mb-1">{method.title}</div>
                                                                        <div
                                                                            className="text-sm text-muted-foreground">{method.description}</div>
                                                                        {isSelected && (
                                                                            <Check className="h-5 w-5 text-primary mt-2"/>
                                                                        )}
                                                                    </CardContent>
                                                                </Card>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Method Configuration */}
                                                <div>
                                                    <AnimatePresence mode="wait">
                                                        {options.method === 'recent' && (
                                                            <motion.div
                                                                key="recent"
                                                                initial={{opacity: 0, y: 20}}
                                                                animate={{opacity: 1, y: 0}}
                                                                exit={{opacity: 0, y: -20}}
                                                            >
                                                                <Card>
                                                                    <CardHeader>
                                                                        <CardTitle className="flex items-center gap-2">
                                                                            <Clock className="h-5 w-5"/>
                                                                            Days to look back
                                                                        </CardTitle>
                                                                    </CardHeader>
                                                                    <CardContent className="space-y-6">
                                                                        <div
                                                                            className="text-center p-8 bg-muted/50 rounded-lg">
                                                                            <span
                                                                                className="text-6xl font-bold text-primary">{options.daysBack}</span>
                                                                            <span
                                                                                className="text-2xl text-muted-foreground ml-2">days</span>
                                                                        </div>
                                                                        <Slider
                                                                            value={[options.daysBack]}
                                                                            onValueChange={(value) => updateOptions({daysBack: value[0]})}
                                                                            min={1}
                                                                            max={365}
                                                                            step={1}
                                                                            className="w-full"
                                                                        />
                                                                        <div
                                                                            className="flex justify-between text-sm text-muted-foreground">
                                                                            <span>1 day</span>
                                                                            <span>365 days</span>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </motion.div>
                                                        )}

                                                        {options.method === 'between_tags' && (
                                                            <motion.div
                                                                key="tags"
                                                                initial={{opacity: 0, y: 20}}
                                                                animate={{opacity: 1, y: 0}}
                                                                exit={{opacity: 0, y: -20}}
                                                            >
                                                                <Card>
                                                                    <CardHeader>
                                                                        <CardTitle className="flex items-center gap-2">
                                                                            <Tag className="h-5 w-5"/>
                                                                            Select Tag Range
                                                                        </CardTitle>
                                                                    </CardHeader>
                                                                    <CardContent>
                                                                        {isFetchingTags ? (
                                                                            <div
                                                                                className="flex items-center justify-center py-12">
                                                                                <div className="text-center">
                                                                                    <Loader2
                                                                                        className="h-8 w-8 animate-spin mx-auto mb-4 text-primary"/>
                                                                                    <p className="text-muted-foreground">Loading
                                                                                        tags and releases...</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : tags.length === 0 && releases.length === 0 ? (
                                                                            <Alert>
                                                                                <AlertDescription>
                                                                                    No tags or releases found in the
                                                                                    repository. Create some tags or releases
                                                                                    first.
                                                                                </AlertDescription>
                                                                            </Alert>
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 gap-6">
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-base">From
                                                                                        Tag/Release</Label>
                                                                                    <Select
                                                                                        value={options.fromRef}
                                                                                        onValueChange={(value) => updateOptions({fromRef: value})}
                                                                                    >
                                                                                        <SelectTrigger className="h-12">
                                                                                            <SelectValue
                                                                                                placeholder="Select starting point"/>
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {releases.map(release => (
                                                                                                <SelectItem
                                                                                                    key={`release-from-${release.tagName}`}
                                                                                                    value={release.tagName}>
                                                                                                    📦 {release.name} ({release.tagName})
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                            {tags.map(tag => (
                                                                                                <SelectItem
                                                                                                    key={`tag-from-${tag.name}`}
                                                                                                    value={tag.name}>
                                                                                                    🏷️ {tag.name}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-base">To
                                                                                        Tag/Release</Label>
                                                                                    <Select
                                                                                        value={options.toRef}
                                                                                        onValueChange={(value) => updateOptions({toRef: value})}
                                                                                    >
                                                                                        <SelectTrigger className="h-12">
                                                                                            <SelectValue
                                                                                                placeholder="Select ending point"/>
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="HEAD">🔥
                                                                                                Latest (HEAD)</SelectItem>
                                                                                            {releases.map(release => (
                                                                                                <SelectItem
                                                                                                    key={`release-to-${release.tagName}`}
                                                                                                    value={release.tagName}>
                                                                                                    📦 {release.name} ({release.tagName})
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                            {tags.map(tag => (
                                                                                                <SelectItem
                                                                                                    key={`tag-to-${tag.name}`}
                                                                                                    value={tag.name}>
                                                                                                    🏷️ {tag.name}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </CardContent>
                                                                </Card>
                                                            </motion.div>
                                                        )}

                                                        {options.method === 'between_commits' && (
                                                            <motion.div
                                                                key="commits"
                                                                initial={{opacity: 0, y: 20}}
                                                                animate={{opacity: 1, y: 0}}
                                                                exit={{opacity: 0, y: -20}}
                                                            >
                                                                <Card>
                                                                    <CardHeader>
                                                                        <CardTitle className="flex items-center gap-2">
                                                                            <GitBranch className="h-5 w-5"/>
                                                                            Specify Commit Range
                                                                        </CardTitle>
                                                                    </CardHeader>
                                                                    <CardContent className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-6">
                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="fromCommit"
                                                                                       className="text-base">From
                                                                                    Commit/Branch</Label>
                                                                                <Input
                                                                                    id="fromCommit"
                                                                                    value={options.fromRef}
                                                                                    onChange={(e) => updateOptions({fromRef: e.target.value})}
                                                                                    placeholder="abc123... or branch-name"
                                                                                    className="h-12"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="toCommit"
                                                                                       className="text-base">To
                                                                                    Commit/Branch</Label>
                                                                                <Input
                                                                                    id="toCommit"
                                                                                    value={options.toRef}
                                                                                    onChange={(e) => updateOptions({toRef: e.target.value})}
                                                                                    placeholder="def456... or main"
                                                                                    className="h-12"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Use commit SHAs (full or short) or branch names.
                                                                            Leave &ldquo;To&rdquo; as &ldquo;main&rdquo; or &ldquo;HEAD&rdquo; for
                                                                            latest.
                                                                        </p>
                                                                    </CardContent>
                                                                </Card>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Step 2: AI & Options */}
                                        {currentStep === 2 && (
                                            <motion.div
                                                key="step2"
                                                initial={{opacity: 0, x: 20}}
                                                animate={{opacity: 1, x: 0}}
                                                exit={{opacity: 0, x: -20}}
                                                className="space-y-8"
                                            >
                                                <div>
                                                    <h2 className="text-2xl font-bold mb-2">Configure Options</h2>
                                                    <p className="text-muted-foreground">Customize how your changelog will
                                                        be generated</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    {/* AI Enhancement */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <Brain className="h-5 w-5"/>
                                                                AI Enhancement
                                                            </CardTitle>
                                                            <CardDescription>
                                                                Improve commit messages and categorization with AI
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="space-y-6">
                                                            <div
                                                                className="flex items-center justify-between p-4 border rounded-lg">
                                                                <div className="space-y-1">
                                                                    <Label className="text-base font-medium">Enable AI
                                                                        Processing</Label>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Uses advanced AI to enhance commit analysis
                                                                    </p>
                                                                    {!aiSettings.enableAIAssistant && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            AI assistant not configured
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <Switch
                                                                    checked={options.useAI}
                                                                    disabled={!aiSettings.enableAIAssistant || !aiSettings.aiApiKey}
                                                                    onCheckedChange={(checked) => updateOptions({useAI: checked})}
                                                                    className="scale-125"
                                                                />
                                                            </div>

                                                            {options.useAI && aiSettings.enableAIAssistant && (
                                                                <motion.div
                                                                    initial={{opacity: 0, height: 0}}
                                                                    animate={{opacity: 1, height: 'auto'}}
                                                                    className="space-y-4"
                                                                >
                                                                    <Separator/>

                                                                    <div
                                                                        className="flex items-center justify-between p-4 border rounded-lg">
                                                                        <div className="space-y-1">
                                                                            <Label
                                                                                className="text-base font-medium flex items-center gap-2">
                                                                                <Code2 className="h-4 w-4"/>
                                                                                Deep Code Analysis
                                                                            </Label>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                Analyze file changes for better
                                                                                categorization
                                                                            </p>
                                                                        </div>
                                                                        <Switch
                                                                            checked={options.includeCodeAnalysis}
                                                                            onCheckedChange={(checked) => updateOptions({includeCodeAnalysis: checked})}
                                                                            className="scale-125"
                                                                        />
                                                                    </div>

                                                                    {options.includeCodeAnalysis && (
                                                                        <motion.div
                                                                            initial={{opacity: 0, height: 0}}
                                                                            animate={{opacity: 1, height: 'auto'}}
                                                                            className="p-4 bg-muted/30 rounded-lg space-y-4"
                                                                        >
                                                                            <Label className="text-base">Maximum Commits to
                                                                                Analyze</Label>
                                                                            <div className="space-y-3">
                                                                                <div
                                                                                    className="flex items-center justify-between">
                                                                                    <span
                                                                                        className="text-2xl font-bold text-primary">{options.maxCommitsToAnalyze}</span>
                                                                                    <Badge variant="outline">
                                                                                        {options.maxCommitsToAnalyze <= 10 ? 'Fast' :
                                                                                            options.maxCommitsToAnalyze <= 30 ? 'Balanced' : 'Thorough'}
                                                                                    </Badge>
                                                                                </div>
                                                                                <Slider
                                                                                    value={[options.maxCommitsToAnalyze]}
                                                                                    onValueChange={(value) => updateOptions({maxCommitsToAnalyze: value[0]})}
                                                                                    min={5}
                                                                                    max={100}
                                                                                    step={5}
                                                                                    className="w-full"
                                                                                />
                                                                                <div
                                                                                    className="flex justify-between text-xs text-muted-foreground">
                                                                                    <span>5 (faster)</span>
                                                                                    <span>100 (more detailed)</span>
                                                                                </div>
                                                                            </div>
                                                                            <Alert icon={<Activity className="h-4 w-4"/>}>
                                                                                <AlertDescription>
                                                                                    Higher values provide more detail but
                                                                                    take longer to process.
                                                                                </AlertDescription>
                                                                            </Alert>
                                                                        </motion.div>
                                                                    )}
                                                                </motion.div>
                                                            )}

                                                            {!aiSettings.enableAIAssistant && (
                                                                <Alert>
                                                                    <Info className="h-4 w-4"/>
                                                                    <AlertDescription>
                                                                        AI assistant is not configured. Contact your
                                                                        administrator to enable AI features.
                                                                    </AlertDescription>
                                                                </Alert>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Formatting Options */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <FileText className="h-5 w-5"/>
                                                                Format Settings
                                                            </CardTitle>
                                                            <CardDescription>
                                                                Customize the changelog structure and style
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="space-y-6">
                                                            <div className="space-y-4">
                                                                <div
                                                                    className="flex items-center justify-between p-4 border rounded-lg">
                                                                    <div className="space-y-1">
                                                                        <Label className="text-base font-medium">Group by
                                                                            Type</Label>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Organize into Features, Bug Fixes, etc.
                                                                        </p>
                                                                    </div>
                                                                    <Switch
                                                                        checked={options.groupByType}
                                                                        onCheckedChange={(checked) => updateOptions({groupByType: checked})}
                                                                        className="scale-125"
                                                                    />
                                                                </div>

                                                                <div
                                                                    className="flex items-center justify-between p-4 border rounded-lg">
                                                                    <div className="space-y-1">
                                                                        <Label className="text-base font-medium">Include
                                                                            Commit Links</Label>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Add clickable GitHub commit links
                                                                        </p>
                                                                    </div>
                                                                    <Switch
                                                                        checked={options.includeCommitLinks}
                                                                        onCheckedChange={(checked) => updateOptions({includeCommitLinks: checked})}
                                                                        className="scale-125"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div
                                                                className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                                                <div className="flex items-start gap-3">
                                                                    <Check className="h-5 w-5 text-green-600 mt-0.5"/>
                                                                    <div className="space-y-1">
                                                                        <p className="font-medium text-green-900 dark:text-green-100">Active
                                                                            Features</p>
                                                                        <div
                                                                            className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                                                            {options.groupByType &&
                                                                                <p>✓ Grouped by change type</p>}
                                                                            {options.includeCommitLinks &&
                                                                                <p>✓ Clickable commit links</p>}
                                                                            {options.useAI &&
                                                                                <p>✓ AI-enhanced descriptions</p>}
                                                                            {options.includeCodeAnalysis &&
                                                                                <p>✓ Deep code analysis</p>}
                                                                            {!options.groupByType && !options.includeCommitLinks && !options.useAI && !options.includeCodeAnalysis && (
                                                                                <p className="text-muted-foreground">Basic
                                                                                    changelog generation</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Step 3: Results - FIXED SCROLLING SECTION */}
                                        {currentStep === 3 && result && (
                                            <motion.div
                                                key="step3"
                                                initial={{opacity: 0, x: 20}}
                                                animate={{opacity: 1, x: 0}}
                                                exit={{opacity: 0, x: -20}}
                                                className="space-y-6"
                                            >
                                                <div>
                                                    <h2 className="text-2xl font-bold mb-2">Generated Changelog</h2>
                                                    <p className="text-muted-foreground">Your changelog content is ready to
                                                        use</p>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                                                    {/* Content Preview */}
                                                    <Card className="lg:col-span-2 flex flex-col h-full">
                                                        <CardHeader className="flex-shrink-0">
                                                            <div className="flex items-center justify-between">
                                                                <CardTitle>Changelog Content</CardTitle>
                                                                <div className="flex gap-2">
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
                                                                                        <Check className="h-4 w-4"/>
                                                                                        Copied!
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Copy className="h-4 w-4"/>
                                                                                        Copy
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Copy to clipboard</TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="flex-1 p-3 relative overflow-hidden">
                                                            <ScrollArea className="h-full w-full">
                                                                <div className="p-3">
                                                                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-lg">
                                                                        {result.changelog?.content || 'Generated content will appear here...'}
                                                                    </pre>
                                                                </div>
                                                            </ScrollArea>
                                                            <div className="absolute bottom-6 right-6">
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {result.changelog?.content?.length || 0} chars
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    {/* Entries Preview - PROPERLY SCROLLABLE */}
                                                    <Card className="flex flex-col h-full">
                                                        <CardHeader className="flex-shrink-0">
                                                            <CardTitle className="text-lg">Entry Breakdown</CardTitle>
                                                            <CardDescription>
                                                                Overview of generated entries
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="flex-1 overflow-hidden p-0">
                                                            {result.changelog?.entries && result.changelog.entries.length > 0 ? (
                                                                <ScrollArea className="h-full w-full">
                                                                    <div className="p-4 space-y-3">
                                                                        {result.changelog.entries.map((entry, index) => (
                                                                            <div key={index}
                                                                                 className="p-3 border rounded-lg space-y-2 bg-background">
                                                                                <div
                                                                                    className="flex items-center justify-between">
                                                                                    <Badge variant="outline"
                                                                                           className="text-xs">{entry.category}</Badge>
                                                                                    <span
                                                                                        className="text-xs text-muted-foreground">#{entry.commit.slice(0, 7)}</span>
                                                                                </div>
                                                                                <p className="text-sm font-medium">{entry.description}</p>
                                                                                {entry.impact && (
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {entry.impact}
                                                                                    </p>
                                                                                )}
                                                                                {entry.files && entry.files.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                                                        {entry.files.slice(0, 3).map((file, fileIndex) => (
                                                                                            <Badge key={fileIndex}
                                                                                                   variant="secondary"
                                                                                                   className="text-xs px-1 py-0">
                                                                                                {file.split('/').pop()}
                                                                                            </Badge>
                                                                                        ))}
                                                                                        {entry.files.length > 3 && (
                                                                                            <Badge variant="secondary"
                                                                                                   className="text-xs px-1 py-0">
                                                                                                +{entry.files.length - 3} more
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </ScrollArea>
                                                            ) : (
                                                                <div className="flex-1 flex items-center justify-center p-6">
                                                                    <p className="text-sm text-muted-foreground text-center">
                                                                        No detailed entries available
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}