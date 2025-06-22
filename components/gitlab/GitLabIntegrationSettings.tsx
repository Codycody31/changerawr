import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gitlab,
    TestTube,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    EyeOff,
    Save,
    Trash2,
    Link,
    RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GitLabIntegration {
    enabled: boolean;
    repositoryUrl: string;
    defaultBranch: string;
    autoGenerate: boolean;
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    lastSyncAt: string | null;
    lastCommitSha: string | null;
    hasAccessToken: boolean;
}

interface RepositoryInfo {
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    defaultBranch: string;
    language: string;
    stargazersCount: number;
    forksCount: number;
}

interface TestResult {
    success: boolean;
    repository?: RepositoryInfo;
    user?: {
        username: string;
        id: number;
        avatarUrl: string;
    };
    error?: string;
}

const DEFAULT_SETTINGS: GitLabIntegration = {
    enabled: false,
    repositoryUrl: '',
    defaultBranch: 'main',
    autoGenerate: false,
    includeBreakingChanges: true,
    includeFixes: true,
    includeFeatures: true,
    includeChores: false,
    customCommitTypes: ['docs', 'style', 'refactor', 'perf'],
    lastSyncAt: null,
    lastCommitSha: null,
    hasAccessToken: false
};

type Props = { projectId: string };

export default function GitLabIntegrationSettings({ projectId }: Props) {
    const [settings, setSettings] = useState<GitLabIntegration>(DEFAULT_SETTINGS);
    const [accessToken, setAccessToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, [projectId]);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/integrations/gitlab`);
            if (res.status === 404) {
                setSettings(DEFAULT_SETTINGS);
                return;
            }
            const data = await res.json();
            if (!data) {
                setSettings(DEFAULT_SETTINGS);
                return;
            }
            setSettings({ ...DEFAULT_SETTINGS, ...data });
        } catch (err) {
            console.error('Failed to load GitLab settings:', err);
            setError('Failed to load settings');
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        if (!settings.repositoryUrl || !accessToken) {
            setError('Repository URL and access token are required');
            return;
        }
        try {
            setIsTesting(true);
            setError(null);
            setTestResult(null);
            const res = await fetch(`/api/projects/${projectId}/integrations/gitlab/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repositoryUrl: settings.repositoryUrl, accessToken })
            });
            const result = await res.json();
            setTestResult(result);
            if (result.success && result.repository) {
                setSettings((prev) => ({ ...prev, defaultBranch: result.repository.defaultBranch }));
            }
        } catch (err) {
            console.error('Test connection failed:', err);
            setTestResult({ success: false, error: 'Test failed' });
        } finally {
            setIsTesting(false);
        }
    };

    const saveSettings = async () => {
        if (!settings.repositoryUrl.trim()) return setError('Repository URL is required');
        if (!accessToken.trim() && !settings.hasAccessToken) return setError('Access token is required');
        try {
            setIsSaving(true);
            setError(null);
            const payload = { ...settings, ...(accessToken.trim() && { accessToken: accessToken.trim() }) };
            const res = await fetch(`/api/projects/${projectId}/integrations/gitlab`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save settings');
            }
            const updated = await res.json();
            setSettings({ ...DEFAULT_SETTINGS, ...updated });
            setAccessToken('');
            setSuccess('GitLab integration configured successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteIntegration = async () => {
        try {
            setIsDeleting(true);
            const res = await fetch(`/api/projects/${projectId}/integrations/gitlab`, { method: 'DELETE' });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed');
            }
            setSettings(DEFAULT_SETTINGS);
            setAccessToken('');
            setSuccess('GitLab integration removed successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    };

    const updateSettings = (updates: Partial<GitLabIntegration>) => setSettings((prev) => ({ ...prev, ...updates }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Gitlab className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">GitLab Integration</h2>
                    <p className="text-sm text-muted-foreground">Generate changelog content from your GitLab repository commits</p>
                </div>
            </div>
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"><AlertDescription>{success}</AlertDescription></Alert>
                    </motion.div>
                )}
            </AnimatePresence>
            <Tabs defaultValue="setup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="setup">Setup & Configuration</TabsTrigger>
                    <TabsTrigger value="preferences">Content Preferences</TabsTrigger>
                </TabsList>
                <TabsContent value="setup" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Link className="h-4 w-4" /> Repository Configuration</CardTitle>
                            <CardDescription>Connect your GitLab repository to generate changelog content from commits</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="repositoryUrl">Repository URL</Label>
                                <Input id="repositoryUrl" placeholder="https://gitlab.com/namespace/repository" value={settings.repositoryUrl || ''} onChange={(e) => updateSettings({ repositoryUrl: e.target.value })} />
                                <p className="text-xs text-muted-foreground">Enter the full GitLab repository URL (e.g., https://gitlab.com/group/repo)</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accessToken">Personal Access Token</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input id="accessToken" type={showToken ? 'text' : 'password'} placeholder={settings.hasAccessToken ? '••••••••••••••••' : 'glpat-xxxxxxxx'} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowToken(!showToken)}>{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="outline" onClick={testConnection} disabled={isTesting || !settings.repositoryUrl || !accessToken}>{isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}</Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Test Connection</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-xs text-muted-foreground">Generate a Personal Access Token in GitLab – Settings → Access Tokens. Requires api scope.</p>
                                {settings.hasAccessToken && !accessToken && <p className="text-xs text-green-600">✓ Access token is configured. Leave empty to keep existing token.</p>}
                            </div>
                            <AnimatePresence>
                                {testResult && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                        <Card className={testResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'}>
                                            <CardContent className="p-4">
                                                {testResult.success ? (
                                                    <div className="space-y-3"><div className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle className="h-4 w-4" /><span className="font-medium">Connection successful!</span></div></div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400"><XCircle className="h-4 w-4" /><span>{testResult.error || 'Connection failed'}</span></div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="space-y-2">
                                <Label htmlFor="defaultBranch">Default Branch</Label>
                                <Input id="defaultBranch" placeholder="main" value={settings.defaultBranch || 'main'} onChange={(e) => updateSettings({ defaultBranch: e.target.value })} />
                                <p className="text-xs text-muted-foreground">The default branch to use for commit analysis</p>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1"><Label htmlFor="enabled">Enable GitLab Integration</Label><p className="text-sm text-muted-foreground">Allow this project to generate changelog content from GitLab commits</p></div>
                                <Switch id="enabled" checked={settings.enabled} onCheckedChange={(checked) => updateSettings({ enabled: checked })} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="preferences" className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Content Generation Preferences</CardTitle><CardDescription>Configure which types of commits to include when generating changelog content</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Breaking Changes</Label><p className="text-xs text-muted-foreground">Include breaking changes</p></div><Switch checked={settings.includeBreakingChanges} onCheckedChange={(checked) => updateSettings({ includeBreakingChanges: checked })} /></div>
                                <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Features</Label><p className="text-xs text-muted-foreground">feat: new features</p></div><Switch checked={settings.includeFeatures} onCheckedChange={(checked) => updateSettings({ includeFeatures: checked })} /></div>
                                <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Bug Fixes</Label><p className="text-xs text-muted-foreground">fix: bug fixes</p></div><Switch checked={settings.includeFixes} onCheckedChange={(checked) => updateSettings({ includeFixes: checked })} /></div>
                                <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Maintenance</Label><p className="text-xs text-muted-foreground">chore: maintenance tasks</p></div><Switch checked={settings.includeChores} onCheckedChange={(checked) => updateSettings({ includeChores: checked })} /></div>
                            </div>
                            <Separator />
                            <div className="space-y-3"><Label>Additional Commit Types</Label><div className="flex flex-wrap gap-2">{['docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci'].map((type) => (<Badge key={type} variant={settings.customCommitTypes.includes(type) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => { const newTypes = settings.customCommitTypes.includes(type) ? settings.customCommitTypes.filter(t => t !== type) : [...settings.customCommitTypes, type]; updateSettings({ customCommitTypes: newTypes }); }}>{type}</Badge>))}</div><p className="text-xs text-muted-foreground">Click to toggle inclusion of these conventional commit types</p></div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <div className="flex items-center justify-between">
                <div>{settings.hasAccessToken && <Button variant="destructive" onClick={deleteIntegration} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Remove Integration</Button>}</div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={loadSettings} disabled={isLoading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                    <Button onClick={saveSettings} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Settings</Button>
                </div>
            </div>
        </div>
    );
} 