'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, Check, Code2, Copy, Eye, Globe, Palette, Settings, Settings2 } from 'lucide-react'
import WidgetPreview from '@/components/changelog/WidgetPreview'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from "@/components/ui/scroll-area"
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter'
import {atomOneDark, atomOneLight} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { useTheme } from 'next-themes'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go'

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('xml', xml)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('go', go)

// Custom language definitions
SyntaxHighlighter.registerLanguage('vue', () => ({
    contains: [
        {
            className: 'tag',
            begin: '<template',
            end: '>',
            starts: {
                end: '</template>',
                returnEnd: true,
                subLanguage: 'xml'
            }
        },
        {
            className: 'tag',
            begin: '<script',
            end: '>',
            starts: {
                end: '</script>',
                returnEnd: true,
                subLanguage: 'javascript'
            }
        }
    ]
}))

SyntaxHighlighter.registerLanguage('svelte', () => ({
    contains: [
        {
            className: 'tag',
            begin: '<script',
            end: '>',
            starts: {
                end: '</script>',
                returnEnd: true,
                subLanguage: 'javascript'
            }
        },
        {
            className: 'template',
            begin: '{',
            end: '}',
            subLanguage: 'javascript'
        },
        {
            className: 'tag',
            begin: '<[A-Za-z]',
            end: '>',
            contains: [
                {
                    className: 'attr',
                    begin: ' [A-Za-z]+=',
                    end: /(?=\s|$)/,
                    contains: [
                        {
                            className: 'string',
                            begin: '"',
                            end: '"'
                        }
                    ]
                }
            ]
        }
    ]
}))

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
        script.src = '${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}';
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
    script.src = '${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}'
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
        WidgetSrc:   "${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}",
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
        script.src = '${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}';
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
        this.script.src = '${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${config.projectId}';
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

function CodeInstallation({ config, projectId, codeExamples }) {
    const [currentLanguage, setCurrentLanguage] = useState('HTML')
    const [copied, setCopied] = useState(false)
    const { theme } = useTheme()

    const generateEmbedCode = useMemo(() => {
        const currentExample = codeExamples.find(ex => ex.language === currentLanguage)
        return currentExample ? currentExample.template({...config, projectId}) : ''
    }, [config, currentLanguage, projectId, codeExamples])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generateEmbedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    type LanguageMap = {
        [key: string]: string;
        HTML: string;
        React: string;
        Vue: string;
        Go: string;
        Svelte: string;
        Angular: string;
    };

    const languageMap: LanguageMap = {
        'HTML': 'xml',
        'React': 'javascript',
        'Vue': 'vue',
        'Go': 'go',
        'Svelte': 'svelte',
        'Angular': 'typescript'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Installation Code
                </CardTitle>
                <CardDescription>
                    Copy and paste this code into your website
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="relative">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex gap-2">
                            {codeExamples.map((example) => (
                                <Button
                                    key={example.language}
                                    variant={currentLanguage === example.language ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCurrentLanguage(example.language)}
                                >
                                    {example.language}
                                </Button>
                            ))}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopy}
                            className="flex items-center gap-2"
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
                    <ScrollArea className="h-96">
                        <div className="p-4">
                            <SyntaxHighlighter
                                language={languageMap[currentLanguage]}
                                style={theme === 'dark' ? atomOneDark : atomOneLight}
                                customStyle={{
                                    margin: 0,
                                    padding: 0,
                                    background: 'transparent',
                                }}
                                codeTagProps={{
                                    className: 'text-sm font-mono'
                                }}
                            >
                                {generateEmbedCode}
                            </SyntaxHighlighter>
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    )
}

export default function WidgetConfigContent({projectId}: { projectId: string }) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState('design')
    const [config, setConfig] = useState<WidgetConfig>({
        theme: 'light',
        isPopup: false,
        position: 'bottom-right',
        maxEntries: DEFAULT_ENTRIES,
        maxHeight: '400px',
        trigger: ''
    })

    const {data: project, isLoading, isError} = useQuery({
        queryKey: ['project-settings', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/settings`)
            if (!response.ok) throw new Error('Failed to fetch settings')
            return response.json()
        }
    })

    useEffect(() => {
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

        detectInitialTheme();
        setMounted(true);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    detectInitialTheme();
                    break;
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        return () => observer.disconnect();
    }, [])

    if (!mounted || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Settings2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError || !project?.isPublic) {
        return (
            <div className="container max-w-6xl py-8">
                <Alert variant="destructive">
                    <AlertTitle>{isError ? 'Error Loading Project' : 'Project is not public'}</AlertTitle>
                    <AlertDescription>
                        {isError
                            ? 'Unable to load project settings. Please try again later.'
                            : 'The widget is only available for public projects. Please make your project public in settings to use the widget.'}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-6xl py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Widget Configuration</h1>
                        <p className="text-muted-foreground mt-1">Customize your changelog widget</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="design" className="flex items-center gap-2">
                                    <Palette className="h-4 w-4" />
                                    Design
                                </TabsTrigger>
                                <TabsTrigger value="code" className="flex items-center gap-2">
                                    <Code2 className="h-4 w-4" />
                                    Installation
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="design" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Settings className="h-5 w-5" />
                                            Widget Settings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label htmlFor="popup-mode" className="text-base">Popup Mode</Label>
                                                <p className="text-sm text-muted-foreground">Show widget in a popup overlay</p>
                                            </div>
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

                                        <Separator />

                                        {config.isPopup && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="position">Position</Label>
                                                    <Select
                                                        value={config.position}
                                                        onValueChange={(value) => setConfig(prev => ({...prev, position: value}))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select position" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                                            <SelectItem value="top-right">Top Right</SelectItem>
                                                            <SelectItem value="top-left">Top Left</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="trigger">Trigger Button ID</Label>
                                                    <Input
                                                        id="trigger"
                                                        value={config.trigger}
                                                        onChange={(e) => setConfig(prev => ({...prev, trigger: e.target.value}))}
                                                        placeholder="changelog-trigger"
                                                    />
                                                </div>

                                                <Separator />
                                            </>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="max-entries">Maximum Entries</Label>
                                            <Input
                                                id="max-entries"
                                                type="number"
                                                value={config.maxEntries}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value);
                                                    if (value >= MIN_ENTRIES && value <= MAX_ENTRIES) {
                                                        setConfig(prev => ({...prev, maxEntries: value}));
                                                    }
                                                }}
                                                min={MIN_ENTRIES}
                                                max={MAX_ENTRIES}
                                            />
                                            <p className="text-sm text-muted-foreground">Choose between {MIN_ENTRIES} and {MAX_ENTRIES} entries</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="max-height">Maximum Height</Label>
                                            <Input
                                                id="max-height"
                                                value={config.maxHeight}
                                                onChange={(e) => setConfig(prev => ({...prev, maxHeight: e.target.value}))}
                                                placeholder="400px"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="code">
                                <CodeInstallation config={config} projectId={projectId} codeExamples={CODE_EXAMPLES} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="sticky top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="h-5 w-5" />
                                    Live Preview
                                </CardTitle>
                                <CardDescription>
                                    See how your widget looks
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs
                                    value={config.theme}
                                    onValueChange={(value) => setConfig(prev => ({
                                        ...prev,
                                        theme: value as 'light' | 'dark'
                                    }))}
                                >
                                    <TabsList className="w-full mb-4">
                                        <TabsTrigger value="light" className="flex-1">Light</TabsTrigger>
                                        <TabsTrigger value="dark" className="flex-1">Dark</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="light" className="mt-0">
                                        <WidgetPreview config={config} />
                                    </TabsContent>
                                    <TabsContent value="dark" className="mt-0">
                                        <WidgetPreview config={config} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}