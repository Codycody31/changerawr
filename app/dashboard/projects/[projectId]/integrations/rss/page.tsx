'use client';

import {useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {useToast} from '@/hooks/use-toast';
import {useAuth} from '@/context/auth';
import {useProjectSettings} from '@/hooks/useProjectSettings';
import {
    DEFAULT_RSS_FEED_CONFIG,
    renderItemTemplate,
    RSS_TEMPLATE_VARIABLES,
    type RssFeedConfig
} from '@/lib/services/changelog/rss';
import {cn} from '@/lib/utils';
import {
    ArrowLeftIcon,
    CheckIcon,
    CopyIcon,
    ExternalLinkIcon,
    Lock,
    RotateCcw,
    Rss,
    Wand2
} from 'lucide-react';

interface ProjectTag {
    id: string;
    name: string;
    color: string | null;
}

export default function RssIntegrationPage() {
    const params = useParams();
    const router = useRouter();
    const {toast} = useToast();
    const {user} = useAuth();
    const projectId = params.projectId as string;
    const {project, isLoading, handleUpdate, updateSettings} = useProjectSettings(projectId);
    const [copied, setCopied] = useState(false);
    const [feedConfig, setFeedConfig] = useState<RssFeedConfig>(DEFAULT_RSS_FEED_CONFIG);
    const [initialized, setInitialized] = useState(false);
    const templateRef = useRef<HTMLTextAreaElement>(null);

    const isAdmin = user?.role === 'ADMIN';

    const {data: tagsData} = useQuery({
        queryKey: ['project-tags-raw', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags?limit=100`);
            if (!response.ok) throw new Error('Failed to fetch tags');
            return response.json() as Promise<{ tags: ProjectTag[] }>;
        }
    });
    const tags = tagsData?.tags ?? [];

    const savedFeedConfig: RssFeedConfig = project?.rssFeedConfig
        ? {...DEFAULT_RSS_FEED_CONFIG, ...project.rssFeedConfig}
        : DEFAULT_RSS_FEED_CONFIG;

    useEffect(() => {
        if (project && !initialized) {
            setFeedConfig(savedFeedConfig);
            setInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project, initialized]);

    if (isLoading || !project) {
        return (
            <div className="space-y-4">
                <div className="h-32 bg-muted animate-pulse rounded-lg"/>
            </div>
        );
    }

    const feedPath = `/changelog/${projectId}/rss.xml`;
    const isFeedConfigDirty = JSON.stringify(feedConfig) !== JSON.stringify(savedFeedConfig);

    const handleCopy = async () => {
        try {
            const url = `${window.location.origin}${feedPath}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast({title: 'Copied', description: 'Feed URL copied to clipboard'});
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({title: 'Error', description: 'Failed to copy feed URL', variant: 'destructive'});
        }
    };

    const toggleTagFilter = (tagId: string) => {
        setFeedConfig(prev => ({
            ...prev,
            tagFilter: prev.tagFilter.includes(tagId)
                ? prev.tagFilter.filter(id => id !== tagId)
                : [...prev.tagFilter, tagId]
        }));
    };

    const insertTemplateVariable = (key: string) => {
        const placeholder = `{{${key}}}`;
        const textarea = templateRef.current;
        const current = feedConfig.itemTemplate ?? '';

        if (!textarea) {
            setFeedConfig(prev => ({...prev, itemTemplate: current + placeholder}));
            return;
        }

        const start = textarea.selectionStart ?? current.length;
        const end = textarea.selectionEnd ?? current.length;
        const next = current.slice(0, start) + placeholder + current.slice(end);
        setFeedConfig(prev => ({...prev, itemTemplate: next}));

        requestAnimationFrame(() => {
            const pos = start + placeholder.length;
            textarea.focus();
            textarea.setSelectionRange(pos, pos);
        });
    };

    const handleSaveFeedBuilder = () => {
        updateSettings.mutate({rssFeedConfig: feedConfig});
    };

    const handleResetFeedBuilder = () => {
        setFeedConfig(DEFAULT_RSS_FEED_CONFIG);
        updateSettings.mutate({rssFeedConfig: null});
    };

    const sampleEntry = {
        title: 'Example Release Title',
        content: '<p>This is the <strong>full</strong> HTML content of an example changelog entry.</p>',
        excerpt: 'This is a short excerpt of the entry.',
        version: 'v1.2.0',
        date: new Date().toUTCString(),
        url: `${feedPath.replace('/rss.xml', '')}/sample-entry-id`,
        tags: tags.length > 0 ? tags.slice(0, 2).map(t => t.name).join(', ') : 'feature, improvement',
        id: 'sample-entry-id'
    };

    const previewFeedTitle = feedConfig.feedTitle?.trim() ? feedConfig.feedTitle : `${project.name} Changelog`;
    const previewFeedDescription = feedConfig.feedDescription?.trim()
        ? feedConfig.feedDescription
        : `Latest changes and updates for ${project.name}`;
    const previewDescription = feedConfig.itemTemplate?.trim()
        ? renderItemTemplate(feedConfig.itemTemplate, sampleEntry)
        : (!project.rssFullContent ? sampleEntry.excerpt : sampleEntry.content);
    const previewTags = tags.length > 0 ? tags.slice(0, 2) : [{id: 'sample-1', name: 'feature', color: null}, {id: 'sample-2', name: 'improvement', color: null}];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Rss className="w-8 h-8 text-orange-500"/>
                        RSS Feed
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Let readers subscribe to changelog updates via RSS
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="gap-2"
                >
                    <ArrowLeftIcon className="w-4 h-4"/>
                    Back
                </Button>
            </div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.3}}
                className="space-y-6"
            >
                {!project.isPublic && (
                    <Alert variant="warning" borderStyle="accent">
                        <AlertTitle>Project is not public</AlertTitle>
                        <AlertDescription>
                            The RSS feed is only available for public projects. Enable public access in
                            Access settings to let readers subscribe.
                        </AlertDescription>
                    </Alert>
                )}

                {!isAdmin && (
                    <Alert icon={<Lock className="h-4 w-4 text-amber-600 dark:text-amber-400"/>}
                           className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Only administrators can enable or disable the RSS feed.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Feed Settings</CardTitle>
                        <CardDescription>Availability and output for this project&apos;s RSS feed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium leading-none">Enable RSS Feed</p>
                                <p className="text-sm text-muted-foreground">
                                    When disabled, the feed link is hidden and the feed URL returns a 404
                                </p>
                            </div>
                            <Switch
                                checked={Boolean(project.enableRss)}
                                onCheckedChange={(checked) => handleUpdate('enableRss', checked)}
                                disabled={!isAdmin}
                            />
                        </div>

                        <div className="rounded-lg border p-4 space-y-2">
                            <p className="text-sm font-medium leading-none">Feed URL</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
                                    {feedPath}
                                </code>
                                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy feed URL">
                                    {copied ? <CheckIcon className="h-4 w-4"/> : <CopyIcon className="h-4 w-4"/>}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Open feed"
                                    disabled={!project.isPublic || !project.enableRss}
                                    onClick={() => window.open(feedPath, '_blank')}
                                >
                                    <ExternalLinkIcon className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium leading-none">Number of Entries</p>
                                    <p className="text-sm text-muted-foreground">
                                        Most recent entries to include
                                    </p>
                                </div>
                                <Select
                                    value={String(project.rssItemLimit)}
                                    onValueChange={(value) => handleUpdate('rssItemLimit', Number(value))}
                                    disabled={!isAdmin}
                                >
                                    <SelectTrigger className="w-20 shrink-0">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[5, 10, 20, 50, 100].map((value) => (
                                            <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium leading-none">Full Content</p>
                                    <p className="text-sm text-muted-foreground">
                                        Off includes only the excerpt
                                    </p>
                                </div>
                                <Switch
                                    checked={Boolean(project.rssFullContent)}
                                    onCheckedChange={(checked) => handleUpdate('rssFullContent', checked)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1.5">
                                <CardTitle className="flex items-center gap-2">
                                    <Wand2 className="h-4 w-4 text-primary"/>
                                    Feed Builder
                                </CardTitle>
                                <CardDescription>
                                    Customize the feed&apos;s metadata, item fields, filters, and layout
                                </CardDescription>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    {isFeedConfigDirty && (
                                        <Badge variant="warning" size="sm">Unsaved changes</Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFeedBuilder}
                                        disabled={updateSettings.isPending}
                                        className="gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4"/>
                                        Reset
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveFeedBuilder}
                                        disabled={!isFeedConfigDirty || updateSettings.isPending}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This mirrors the structure of your feed &mdash; edit a field and the feed updates
                            to match. Changes apply once you hit <span className="font-medium">Save Changes</span>.
                        </p>

                        <div className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                    &lt;rss&gt;&lt;channel&gt;
                                </span>
                                <Badge variant="outline" size="sm" className="font-mono">
                                    up to {project.rssItemLimit} &lt;item&gt;
                                </Badge>
                            </div>

                            <div className="p-4 space-y-4 font-mono text-sm bg-background">
                                {/* Channel title */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground shrink-0">&lt;title&gt;</span>
                                    <Input
                                        value={feedConfig.feedTitle ?? ''}
                                        onChange={(e) => setFeedConfig(prev => ({...prev, feedTitle: e.target.value}))}
                                        placeholder={`${project.name} Changelog`}
                                        disabled={!isAdmin}
                                        className="h-7 flex-1 min-w-[160px] font-mono text-sm"
                                    />
                                    <span className="text-muted-foreground shrink-0">&lt;/title&gt;</span>
                                </div>

                                {/* Channel description */}
                                <div className="flex flex-wrap items-start gap-2">
                                    <span className="text-muted-foreground shrink-0 pt-2">&lt;description&gt;</span>
                                    <Textarea
                                        value={feedConfig.feedDescription ?? ''}
                                        onChange={(e) => setFeedConfig(prev => ({...prev, feedDescription: e.target.value}))}
                                        placeholder={`Latest changes and updates for ${project.name}`}
                                        disabled={!isAdmin}
                                        rows={2}
                                        className="flex-1 min-w-[160px] font-mono text-sm"
                                    />
                                    <span className="text-muted-foreground shrink-0 pt-2">&lt;/description&gt;</span>
                                </div>

                                {/* Tag filter, framed as the condition for which entries become items */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="text-muted-foreground">// include entries tagged</span>
                                    {tags.length === 0 ? (
                                        <span className="text-xs text-muted-foreground italic">
                                            (no tags yet &mdash; all entries included)
                                        </span>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((tag) => {
                                                    const selected = feedConfig.tagFilter.includes(tag.id);
                                                    return (
                                                        <Badge
                                                            key={tag.id}
                                                            variant={selected ? 'default' : 'outline'}
                                                            size="sm"
                                                            interactive
                                                            customColor={selected ? tag.color : undefined}
                                                            onClick={() => isAdmin && toggleTagFilter(tag.id)}
                                                            className={cn(!isAdmin && 'cursor-not-allowed opacity-60')}
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                            <span className="text-xs text-muted-foreground italic">
                                                {feedConfig.tagFilter.length === 0 ? '(none selected — all entries included)' : '(any of the above)'}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Item block */}
                                <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">&lt;item&gt;</span>
                                        <Badge variant="secondary" size="sm">preview of one entry</Badge>
                                    </div>

                                    <div className="pl-4 space-y-3 border-l ml-1">
                                        {/* Item title */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground shrink-0">&lt;title&gt;</span>
                                            <span className="truncate">{sampleEntry.title}</span>
                                            <span className="text-muted-foreground shrink-0">&lt;/title&gt;</span>
                                            <span className="text-xs text-muted-foreground italic ml-auto">entry&apos;s title</span>
                                        </div>

                                        {/* Item description / template */}
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-muted-foreground">&lt;description&gt;</span>
                                                <div className="flex gap-1 rounded-md border p-0.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={feedConfig.itemTemplate === null ? 'secondary' : 'ghost'}
                                                        onClick={() => setFeedConfig(prev => ({...prev, itemTemplate: null}))}
                                                        disabled={!isAdmin}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        Default
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={feedConfig.itemTemplate !== null ? 'secondary' : 'ghost'}
                                                        onClick={() => feedConfig.itemTemplate === null && setFeedConfig(prev => ({...prev, itemTemplate: ''}))}
                                                        disabled={!isAdmin}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        Custom Template
                                                    </Button>
                                                </div>
                                            </div>

                                            {feedConfig.itemTemplate !== null ? (
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {RSS_TEMPLATE_VARIABLES.map((variable) => (
                                                            <Badge
                                                                key={variable.key}
                                                                variant="secondary"
                                                                size="sm"
                                                                interactive
                                                                onClick={() => isAdmin && insertTemplateVariable(variable.key)}
                                                                className={cn('font-mono', !isAdmin && 'cursor-not-allowed opacity-60')}
                                                                title={variable.description}
                                                            >
                                                                {variable.label}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <Textarea
                                                        ref={templateRef}
                                                        value={feedConfig.itemTemplate ?? ''}
                                                        onChange={(e) => setFeedConfig(prev => ({...prev, itemTemplate: e.target.value}))}
                                                        placeholder={'<p>{{content}}</p>\n<p>Tags: {{tags}}</p>'}
                                                        disabled={!isAdmin}
                                                        rows={5}
                                                        className="font-mono text-xs"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Rendered preview:
                                                    </p>
                                                    <div className="rounded-md border bg-background p-2 text-xs whitespace-pre-wrap font-mono break-all max-h-32 overflow-y-auto text-muted-foreground">
                                                        {previewDescription}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-md border bg-background p-2 text-xs whitespace-pre-wrap font-mono break-all max-h-32 overflow-y-auto text-muted-foreground">
                                                    {previewDescription}
                                                    <span className="block mt-1 text-[10px] text-muted-foreground/70">
                                                        ({project.rssFullContent ? 'full content' : 'excerpt'} &mdash; change in Feed Settings above)
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-muted-foreground block">&lt;/description&gt;</span>
                                        </div>

                                        {/* Version element */}
                                        <div className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                                            <span className={cn(!feedConfig.includeVersion && 'text-muted-foreground/40 line-through')}>
                                                &lt;version&gt;{sampleEntry.version}&lt;/version&gt;
                                            </span>
                                            <Switch
                                                checked={feedConfig.includeVersion}
                                                onCheckedChange={(checked) => setFeedConfig(prev => ({...prev, includeVersion: checked}))}
                                                disabled={!isAdmin}
                                            />
                                        </div>

                                        {/* Category elements */}
                                        <div className="space-y-2 rounded border px-3 py-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className={cn(!feedConfig.includeTags && 'text-muted-foreground/40 line-through')}>
                                                    &lt;category&gt;tag&lt;/category&gt;
                                                </span>
                                                <Switch
                                                    checked={feedConfig.includeTags}
                                                    onCheckedChange={(checked) => setFeedConfig(prev => ({...prev, includeTags: checked}))}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            {feedConfig.includeTags && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {previewTags.map((tag) => (
                                                        <Badge key={tag.id} variant="secondary" size="sm" customColor={tag.color}>
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-muted-foreground block">&lt;/item&gt;</span>
                                </div>

                                <span className="text-muted-foreground block">&lt;/channel&gt;&lt;/rss&gt;</span>
                            </div>
                        </div>

                        {previewFeedTitle !== `${project.name} Changelog` || previewFeedDescription !== `Latest changes and updates for ${project.name}` ? (
                            <p className="text-xs text-muted-foreground">
                                Resulting feed title: <span className="font-medium text-foreground">{previewFeedTitle}</span>
                            </p>
                        ) : null}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
