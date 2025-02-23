'use client'

import {ChangeEvent, useState} from 'react'
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
import { ArrowLeft, Copy, Check, Settings2, Eye, Code } from 'lucide-react'
import WidgetPreview from '@/components/changelog/WidgetPreview'

export interface WidgetConfig {
    theme: 'light' | 'dark'
    isPopup: boolean
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    maxEntries: number
    maxHeight: string
    trigger: string
}

const MIN_ENTRIES = 1;
const MAX_ENTRIES = 10;
const DEFAULT_ENTRIES = 3;

export default function WidgetConfigContent({ projectId }: { projectId: string }) {
    const router = useRouter()
    const [config, setConfig] = useState<WidgetConfig>({
        theme: 'light',
        isPopup: false,
        position: 'bottom-right',
        maxEntries: DEFAULT_ENTRIES,
        maxHeight: '400px',
        trigger: ''
    })
    const [copied, setCopied] = useState(false)

    const handleMaxEntriesChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();

        // Handle empty input
        if (value === '') {
            setConfig(prev => ({ ...prev, maxEntries: DEFAULT_ENTRIES }));
            return;
        }

        // Parse the input value
        const numValue = parseInt(value, 10);

        // Handle invalid numbers, negative values, and bounds
        if (isNaN(numValue) || numValue < MIN_ENTRIES) {
            setConfig(prev => ({ ...prev, maxEntries: MIN_ENTRIES }));
        } else if (numValue > MAX_ENTRIES) {
            setConfig(prev => ({ ...prev, maxEntries: MAX_ENTRIES }));
        } else {
            setConfig(prev => ({ ...prev, maxEntries: numValue }));
        }
    };

    // Fetch project to check if it's public
    const { data: project, isLoading } = useQuery({
        queryKey: ['project-settings', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/settings`)
            if (!response.ok) throw new Error('Failed to fetch settings')
            return response.json()
        }
    })

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generateEmbedCode())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="space-y-2 text-center">
                    <Settings2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading configuration...</p>
                </div>
            </div>
        )
    }

    if (!project?.isPublic) {
        return (
            <div className="container max-w-5xl py-8">
                <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertTitle>Project is not public</AlertTitle>
                    <AlertDescription>
                        The widget is only available for public projects. Please make your project public in settings to use the widget.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const generateEmbedCode = () => {
        const attributes = [
            config.isPopup ? 'data-popup="true"' : '',
            `data-theme="${config.theme}"`,
            config.isPopup ? `data-position="${config.position}"` : '',
            config.maxEntries !== DEFAULT_ENTRIES ? `data-max-entries="${config.maxEntries}"` : '',
            config.maxHeight !== '400px' ? `data-max-height="${config.maxHeight}"` : '',
            config.trigger ? `data-trigger="${config.trigger}"` : '',
        ].filter(Boolean).join('\n    ')

        return `${config.isPopup && config.theme === 'dark' ? '<div style="--theme: dark;">\n' : ''}${config.trigger ? `<button id="${config.trigger}">View Updates</button>\n` : ''}<script 
    src="${window.location.origin}/api/integrations/widget/${projectId}"
    ${attributes}
    async
></script>${config.isPopup && config.theme === 'dark' ? '\n</div>' : ''}`
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
                    <ArrowLeft className="h-4 w-4" />
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
                                <Settings2 className="h-4 w-4" />
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

                                    <div>
                                        <Label htmlFor="trigger" className="font-medium mb-1.5">Trigger Button ID</Label>
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
                                <Code className="h-4 w-4" />
                                <CardTitle>Installation</CardTitle>
                            </div>
                            <CardDescription>Copy and paste this code into your website</CardDescription>
                        </CardHeader>
                        <CardContent className="relative">
                            <Button
                                size="icon"
                                variant="outline"
                                className="absolute top-4 right-4 h-8 w-8"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                            <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
                                <code>{generateEmbedCode()}</code>
                            </pre>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <CardTitle>Preview</CardTitle>
                        </div>
                        <CardDescription>See how your widget looks with the current configuration</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs
                            defaultValue="light"
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
                                <WidgetPreview config={config} projectId={projectId} />
                            </TabsContent>
                            <TabsContent value="dark" className="mt-0">
                                <WidgetPreview config={config} projectId={projectId} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}