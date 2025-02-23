'use client'

import {ChangeEvent, useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useQuery} from '@tanstack/react-query'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Switch} from '@/components/ui/switch'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Label} from '@/components/ui/label'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {ArrowLeft, Check, Code, Copy, Eye, Settings2} from 'lucide-react'
import WidgetPreview from '@/components/changelog/WidgetPreview'

// Configuration constants
const MIN_ENTRIES = 1;
const MAX_ENTRIES = 10;
const DEFAULT_ENTRIES = 3;

// Type definitions
export interface WidgetConfig {
    theme: 'light' | 'dark'
    isPopup: boolean
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    maxEntries: number
    maxHeight: string
    trigger: string
}

// Code example interface
interface CodeExample {
    language: string
    template: (config: WidgetConfig & { projectId: string }) => string
}

// Code examples collection
const CODE_EXAMPLES: CodeExample[] = [
    {
        language: 'HTML',
        template: (config) => {
            const attributes = [
                config.isPopup ? 'data-popup="true"' : '',
                `data-theme="${config.theme}"`,
                config.isPopup ? `data-position="${config.position}"` : '',
                config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
                config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
                config.trigger ? `data-trigger="${config.trigger}"` : '',
            ].filter(Boolean).join('\n    ')

            return `${config.isPopup && config.theme === 'dark' ? '<div style="--theme: dark;">\n' : ''}${config.trigger ? `<button id="${config.trigger}">View Updates</button>\n` : ''}<script 
    src="${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}"
    ${attributes}
    async
></script>${config.isPopup && config.theme === 'dark' ? '\n</div>' : ''}`
        }
    },
    {
        language: 'React',
        template: (config) => {
            const attributes = [
                config.isPopup ? 'data-popup="true"' : '',
                `data-theme="${config.theme}"`,
                config.isPopup ? `data-position="${config.position}"` : '',
                config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
                config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
                config.trigger ? `data-trigger="${config.trigger}"` : '',
            ].filter(Boolean)

            return `import React, { useEffect } from 'react';

export default function ChangelogWidget() {
    useEffect(() => {
        const script = document.createElement('script');
        script.src = '/api/integrations/widget/${config.projectId}';
        script.async = true;
        ${attributes.map(attr => {
                const [key, value] = attr.split('=');
                return `        script.setAttribute('${key}', ${value});`
            }).join('\n')}
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    ${config.trigger ? `return <button id="${config.trigger}">View Updates</button>;` : 'return null;'}
}`
        }
    },
    {
        language: 'Vue',
        template: (config) => {
            const attributes = [
                config.isPopup ? 'data-popup="true"' : '',
                `data-theme="${config.theme}"`,
                config.isPopup ? `data-position="${config.position}"` : '',
                config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
                config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
                config.trigger ? `data-trigger="${config.trigger}"` : '',
            ].filter(Boolean)

            return `<template>
    <div>
        ${config.trigger ? `<button id="${config.trigger}">View Updates</button>` : ''}
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

const createChangelog = () => {
    const script = document.createElement('script')
    script.src = '/api/integrations/widget/${config.projectId}'
    script.async = true
    ${attributes.map(attr => {
                const [key, value] = attr.split('=');
                return `    script.setAttribute('${key}', ${value});`
            }).join('\n')}
    document.body.appendChild(script)
    return script
}

const script = onMounted(createChangelog)
onUnmounted(() => {
    if (script.value) {
        document.body.removeChild(script.value)
    }
})
</script>`
        }
    },
    {
        language: 'Go',
        template: (config) => `package main

import (
    "fmt"
    "html/template"
    "net/http"
)

func renderChangelog(w http.ResponseWriter, r *http.Request) {
    tmpl := template.Must(template.New("changelog").Parse(\`
        {{if .Popup}}<div style="--theme: {{.Theme}};">{{end}}
        {{if .Trigger}}<button id="{{.Trigger}}">View Updates</button>{{end}}
        <script 
            src="{{.WidgetSrc}}"
            ${config.isPopup ? 'data-popup="true"' : ''}
            data-theme="{{.Theme}}"
            {{if .Popup}}data-position="{{.Position}}"{{end}}
            data-max-entries="{{.MaxEntries}}"
            data-max-height="{{.MaxHeight}}"
            {{if .Trigger}}data-trigger="{{.Trigger}}"{{end}}
            async
        ></script>
        {{if .Popup}}</div>{{end}}
    \`))

    data := struct {
        WidgetSrc   string
        Popup       bool
        Theme       string
        Position    string
        MaxEntries  int
        MaxHeight   string
        Trigger     string
    }{
        WidgetSrc:   "/api/integrations/widget/${config.projectId}",
        Popup:       ${config.isPopup},
        Theme:       "${config.theme}",
        Position:    "${config.position}",
        MaxEntries:  ${config.maxEntries},
        MaxHeight:   "${config.maxHeight}",
        Trigger:     "${config.trigger}",
    }

    err := tmpl.Execute(w, data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}`
    },
    {
        language: 'Svelte',
        template: (config) => {
            const attributes = [
                config.isPopup ? 'data-popup="true"' : '',
                `data-theme="${config.theme}"`,
                config.isPopup ? `data-position="${config.position}"` : '',
                config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
                config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
                config.trigger ? `data-trigger="${config.trigger}"` : '',
            ].filter(Boolean)

            return `<script>
    import { onMount, onDestroy } from 'svelte';

    let script;

    onMount(() => {
        script = document.createElement('script');
        script.src = '/api/integrations/widget/${config.projectId}';
        script.async = true;
        ${attributes.map(attr => {
                const [key, value] = attr.split('=');
                return `        script.setAttribute('${key}', ${value});`
            }).join('\n')}
        document.body.appendChild(script);
    });

    onDestroy(() => {
        if (script) {
            document.body.removeChild(script);
        }
    });
</script>

${config.trigger ? `<button id="${config.trigger}">View Updates</button>` : ''}`
        }
    },
    {
        language: 'Angular',
        template: (config) => {
            const attributes = [
                config.isPopup ? 'data-popup="true"' : '',
                `data-theme="${config.theme}"`,
                config.isPopup ? `data-position="${config.position}"` : '',
                config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
                config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
                config.trigger ? `data-trigger="${config.trigger}"` : '',
            ].filter(Boolean)

            return `import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
    selector: 'app-changelog-widget',
    template: \`
        ${config.trigger ? `<button id="${config.trigger}">View Updates</button>` : ''}
    \`
})
export class ChangelogWidgetComponent implements OnInit, OnDestroy {
    private script: HTMLScriptElement;

    ngOnInit() {
        this.script = document.createElement('script');
        this.script.src = '/api/integrations/widget/${config.projectId}';
        this.script.async = true;
        ${attributes.map(attr => {
                const [key, value] = attr.split('=');
                return `        this.script.setAttribute('${key}', ${value});`
            }).join('\n')}
        document.body.appendChild(this.script);
    }

    ngOnDestroy() {
        if (this.script) {
            document.body.removeChild(this.script);
        }
    }
}`
        }
    }
]

export default function WidgetConfigContent({projectId}: { projectId: string }) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [currentLanguage, setCurrentLanguage] = useState('HTML')
    const [config, setConfig] = useState<WidgetConfig>({
        theme: 'light',
        isPopup: false,
        position: 'bottom-right',
        maxEntries: DEFAULT_ENTRIES,
        maxHeight: '400px',
        trigger: ''
    })
    const [copied, setCopied] = useState(false)

    // Fetch project to check if it's public - always called
    const {data: project, isLoading, isError} = useQuery({
        queryKey: ['project-settings', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/settings`)
            if (!response.ok) throw new Error('Failed to fetch settings')
            return response.json()
        }
    })

    // Handle initial theme setup
    useEffect(() => {
        // Detect initial theme from HTML element
        const detectInitialTheme = () => {
            const htmlElement = document.documentElement;
            const isDarkMode =
                htmlElement.classList.contains('dark') ||
                htmlElement.style.colorScheme === 'dark';

            setConfig(prev => ({
                ...prev,
                theme: isDarkMode ? 'dark' : 'light'
            }));
        };

        // Detect initial theme
        detectInitialTheme();

        // Create a MutationObserver to watch for class or style changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    detectInitialTheme();
                    break;
                }
            }
        });

        // Start observing the html element
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        // Mark as mounted
        setMounted(true);

        // Cleanup observer
        return () => {
            observer.disconnect();
        };
    }, [])

    // Generate code based on current configuration
    const generateEmbedCode = useMemo(() => {
        const currentExample = CODE_EXAMPLES.find(ex => ex.language === currentLanguage)
        return currentExample
            ? currentExample.template({...config, projectId})
            : ''
    }, [config, currentLanguage, projectId])

    // Copy to clipboard handler
    const handleCopy = async () => {
        await navigator.clipboard.writeText(generateEmbedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Render loading state
    if (!mounted || isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="space-y-2 text-center">
                    <Settings2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground"/>
                    <p className="text-sm text-muted-foreground">Loading configuration...</p>
                </div>
            </div>
        )
    }

    // Render error state
    if (isError) {
        return (
            <div className="container max-w-5xl py-8">
                <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertTitle>Error Loading Project</AlertTitle>
                    <AlertDescription>
                        Unable to load project settings. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Render project not public state
    if (!project?.isPublic) {
        return (
            <div className="container max-w-5xl py-8">
                <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertTitle>Project is not public</AlertTitle>
                    <AlertDescription>
                        The widget is only available for public projects. Please make your project public in settings to
                        use the widget.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in-50">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="hover:bg-muted"
                >
                    <ArrowLeft className="h-4 w-4"/>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Widget Configuration</h1>
                    <p className="text-muted-foreground">Customize and install the changelog widget</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-8">
                    <Card>
                        <CardHeader className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4"/>
                                <CardTitle>Configuration</CardTitle>
                            </div>
                            <CardDescription>Customize how your widget looks and behaves</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="popup-mode" className="font-medium">Popup Mode</Label>
                                <Switch
                                    id="popup-mode"
                                    checked={config.isPopup}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        isPopup: checked,
                                        trigger: checked ? (prev.trigger || 'changelog-trigger') : ''
                                    }))}
                                />
                            </div>

                            {config.isPopup && (
                                <div className="grid gap-4 animate-in fade-in-50 slide-in-from-top-2">
                                    <div>
                                        <Label htmlFor="position" className="font-medium mb-1.5">Position</Label>
                                        <Select
                                            value={config.position}
                                            onValueChange={(value: WidgetConfig['position']) =>
                                                setConfig(prev => ({...prev, position: value}))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select position"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                                <SelectItem value="top-right">Top Right</SelectItem>
                                                <SelectItem value="top-left">Top Left</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="trigger" className="font-medium mb-1.5">Trigger Button
                                            ID</Label>
                                        <Input
                                            id="trigger"
                                            value={config.trigger}
                                            onChange={(e) => setConfig(prev => ({...prev, trigger: e.target.value}))}
                                            placeholder="changelog-trigger"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4">
                                <div>
                                    <Label htmlFor="max-entries" className="font-medium mb-1.5">
                                        Max Entries ({MIN_ENTRIES}-{MAX_ENTRIES})
                                    </Label>
                                    <Input
                                        id="max-entries"
                                        type="number"
                                        value={config.maxEntries.toString()}
                                        onChange={handleMaxEntriesChange}
                                        min={MIN_ENTRIES}
                                        max={MAX_ENTRIES}
                                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="max-height" className="font-medium mb-1.5">Max Height</Label>
                                    <Input
                                        id="max-height"
                                        value={config.maxHeight}
                                        onChange={(e) => setConfig(prev => ({...prev, maxHeight: e.target.value}))}
                                        placeholder="400px"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4"/>
                                <CardTitle>Installation</CardTitle>
                            </div>
                            <CardDescription>Copy and paste this code into your website</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="absolute top-2 right-2 z-10 bg-background hover:bg-muted"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <div className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-600"/>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Copy className="h-4 w-4"/>
                                        </div>
                                    )}
                                </Button>
                                <Tabs
                                    defaultValue="HTML"
                                    onValueChange={(value) => {
                                        setCurrentLanguage(value);
                                        setCopied(false);
                                    }}
                                >
                                    <TabsList className="absolute top-2 left-2 z-10">
                                        {CODE_EXAMPLES.map((example) => (
                                            <TabsTrigger
                                                key={example.language}
                                                value={example.language}
                                            >
                                                {example.language}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <TabsContent value={currentLanguage} className="pt-16">
                                        <pre
                                            className="p-4 pt-10 rounded-lg bg-muted overflow-x-auto text-sm font-mono">
                                            <code>{generateEmbedCode}</code>
                                        </pre>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4"/>
                            <CardTitle>Preview</CardTitle>
                        </div>
                        <CardDescription>See how your widget looks with the current configuration</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs
                            defaultValue={config.theme}
                            className="w-full"
                            onValueChange={(value) => setConfig(prev => ({
                                ...prev,
                                theme: value as 'light' | 'dark'
                            }))}
                        >
                            <TabsList className="mb-4">
                                <TabsTrigger value="light">Light</TabsTrigger>
                                <TabsTrigger value="dark">Dark</TabsTrigger>
                            </TabsList>
                            <TabsContent value="light" className="mt-0">
                                <WidgetPreview config={config}/>
                            </TabsContent>
                            <TabsContent value="dark" className="mt-0">
                                <WidgetPreview config={config}/>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Helper function to handle max entries input
function handleMaxEntriesChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim();

    // Handle empty input
    if (value === '') {
        return DEFAULT_ENTRIES;
    }

    // Parse the input value
    const numValue = parseInt(value, 10);

    // Handle invalid numbers, negative values, and bounds
    if (isNaN(numValue) || numValue < MIN_ENTRIES) {
        return MIN_ENTRIES;
    } else if (numValue > MAX_ENTRIES) {
        return MAX_ENTRIES;
    }

    return numValue;
}