'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
    Sparkles,
    Info,
    Save,
    CheckCircle,
    XCircle,
    Lock,
    Loader2,
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import { Separator } from '@/components/ui/separator'

interface AISettings {
    enableAIAssistant: boolean
    aiApiKey: string | null
    aiDefaultModel: string | null
    aiApiProvider: 'secton' | 'openai'
    aiApiBaseUrl?: string | null
}

// List of models is now fetched dynamically from the backend depending on the provider
// via /api/admin/ai-settings/models. No hard-coded options anymore.

export default function AISettingsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // Local form state
    const [formData, setFormData] = useState<AISettings>({
        enableAIAssistant: false,
        aiApiKey: '',
        aiDefaultModel: '',
        aiApiProvider: 'secton',
        aiApiBaseUrl: '',
    })

    // Track if the API key has been changed
    const [apiKeyChanged, setApiKeyChanged] = useState(false)

    // Validation state
    const [keyValidated, setKeyValidated] = useState<boolean | null>(null)

    // Dynamically fetched models based on selected provider
    const {
        data: models,
        isLoading: isModelsLoading,
    } = useQuery<string[]>({
        queryKey: ['ai-models', formData.aiApiProvider],
        queryFn: async () => {
            const response = await fetch(`/api/admin/ai-settings/models?provider=${formData.aiApiProvider}`)
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to fetch models')
            }
            const data = (await response.json()) as { models: string[] }
            return data.models
        },
        enabled: !!formData.aiApiProvider,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    // When model list loads, ensure we have a default selection
    useEffect(() => {
        if (!isModelsLoading && models && models.length > 0 && !formData.aiDefaultModel) {
            setFormData(prev => ({ ...prev, aiDefaultModel: models[0] }))
        }
    }, [isModelsLoading, models])

    // Fetch current settings
    const { data: settings, isLoading } = useQuery<AISettings>({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const response = await fetch('/api/admin/ai-settings')
            if (!response.ok) throw new Error('Failed to fetch AI settings')

            const data = await response.json()

            // Update form data when settings are loaded
            setFormData({
                enableAIAssistant: data.enableAIAssistant,
                aiApiKey: data.aiApiKey ? '••••••••••••••••' : '', // Mask the API key
                aiDefaultModel: data.aiDefaultModel || '',
                aiApiProvider: data.aiApiProvider || 'secton',
                aiApiBaseUrl: data.aiApiBaseUrl || '',
            })

            return data
        },
        refetchOnWindowFocus: false,
    })

    // Mutation to save settings
    const { mutate: saveSettings, isPending: isSaving } = useMutation({
        mutationFn: async (data: Partial<AISettings>) => {
            const response = await fetch('/api/admin/ai-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    aiApiProvider: formData.aiApiProvider,
                    aiApiBaseUrl: formData.aiApiBaseUrl,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to save settings')
            }

            return response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Settings saved',
                description: 'AI Assistant settings have been updated successfully.',
                duration: 3000,
            })

            // Reset API key changed flag
            setApiKeyChanged(false)

            // Invalidate the query to refresh data
            queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save settings',
                variant: 'destructive',
                duration: 5000,
            })
        },
    })

    // Test API key validity
    const { mutate: testApiKey, isPending: isTesting } = useMutation({
        mutationFn: async (apiKey: string) => {
            const response = await fetch('/api/admin/ai-settings/test-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey,
                    provider: formData.aiApiProvider,
                    baseUrl: formData.aiApiBaseUrl || undefined
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'API key validation failed')
            }

            return response.json()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onSuccess: (data) => {
            setKeyValidated(true)
            toast({
                title: 'API Key Valid',
                description: 'Your key has been validated and is working correctly.',
                duration: 3000,
            })
        },
        onError: (error) => {
            setKeyValidated(false)
            toast({
                title: 'Invalid API Key',
                description: error.message || 'Could not validate API key',
                variant: 'destructive',
                duration: 5000,
            })
        },
    })

    // Reset validation state when the API key changes
    useEffect(() => {
        if (apiKeyChanged) {
            setKeyValidated(null)
        }
    }, [apiKeyChanged])

    // Handle form changes
    const handleChange = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }))

        // Track if the API key was changed
        if (key === 'aiApiKey') {
            setApiKeyChanged(true)
        }

        // If provider changes, refetch model list and reset default model once loaded
        if (key === 'aiApiProvider') {
            // Reset default model until we have fetched the list
            setFormData(prev => ({ ...prev, aiDefaultModel: '' }))
        }
    }

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Prepare the data for submission
        const dataToSubmit: Partial<AISettings> = {
            enableAIAssistant: formData.enableAIAssistant,
            aiDefaultModel: formData.aiDefaultModel,
            aiApiProvider: formData.aiApiProvider,
            aiApiBaseUrl: formData.aiApiBaseUrl,
        }

        // Only include API key if it was changed and isn't masked
        if (apiKeyChanged && !formData.aiApiKey?.includes('•')) {
            dataToSubmit.aiApiKey = formData.aiApiKey
        }

        // Save the settings
        saveSettings(dataToSubmit)
    }

    const handleTestApiKey = () => {
        if (formData.aiApiKey && !formData.aiApiKey.includes('•')) {
            testApiKey(formData.aiApiKey)
        } else {
            toast({
                title: 'Cannot test API key',
                description: 'Please enter a new API key first',
                variant: 'destructive',
                duration: 3000,
            })
        }
    }

    if (isLoading) {
        return (
            <div className="container max-w-4xl mx-auto p-4">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>AI Integration Settings</CardTitle>
                        <CardDescription>Loading configuration...</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center p-8">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-4xl mx-auto p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex flex-col space-y-6">
                    {/* Header Card with Promo */}
                    <Card className="overflow-hidden border-primary/20">
                        <div className="relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                            <CardHeader className="relative z-10">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                                    <div className="flex items-center">
                                        <div className="mr-4 bg-primary/10 p-2 rounded-lg">
                                            <Sparkles className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl">AI Integration</CardTitle>
                                            <CardDescription className="text-base">
                                                Power up Changerawr with AI capabilities
                                            </CardDescription>
                                        </div>
                                    </div>

                                    {/*<Badge*/}
                                    {/*    variant="outline"*/}
                                    {/*    className="border-primary/30 bg-primary/5 text-primary px-3 py-1 text-sm"*/}
                                    {/*>*/}
                                    {/*    <Sparkles className="h-3.5 w-3.5 mr-1.5" />*/}
                                    {/*    <span>Premium Feature</span>*/}
                                    {/*</Badge>*/}
                                </div>
                            </CardHeader>
                        </div>
                    </Card>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuration Settings</CardTitle>
                                <CardDescription>
                                    Manage your AI integration settings
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Enable AI Assistant Toggle */}
                                <div className="flex items-center justify-between space-x-2 p-4 rounded-lg bg-muted/50">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="enableAIAssistant" className="text-base">Enable AI Assistant</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow users to use AI features in Changerawr
                                        </p>
                                    </div>
                                    <Switch
                                        id="enableAIAssistant"
                                        checked={formData.enableAIAssistant}
                                        onCheckedChange={(checked) => handleChange('enableAIAssistant', checked)}
                                    />
                                </div>

                                <Separator />

                                {/* Default Model Selection */}
                                <div className="space-y-3">
                                    <Label htmlFor="aiDefaultModel" className="text-base">Default AI Model</Label>
                                    <Select
                                        value={formData.aiDefaultModel || models?.[0] || ''}
                                        onValueChange={(value) => handleChange('aiDefaultModel', value)}
                                    >
                                        <SelectTrigger id="aiDefaultModel" className="w-full">
                                            <SelectValue placeholder="Select default model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isModelsLoading && (
                                                <div className="p-4 text-sm text-muted-foreground">Loading models...</div>
                                            )}
                                            {!isModelsLoading && models?.length === 0 && (
                                                <div className="p-4 text-sm text-muted-foreground">No models available</div>
                                            )}
                                            {models?.map((m) => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-start gap-3">
                                        <p className="text-sm text-muted-foreground flex-1">
                                            Choose the default AI model for all users.
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* AI Provider Selection */}
                                <div className="space-y-3">
                                    <Label htmlFor="aiApiProvider" className="text-base">AI Provider</Label>
                                    <Select
                                        value={formData.aiApiProvider}
                                        onValueChange={(value) => handleChange('aiApiProvider', value as 'secton' | 'openai')}
                                    >
                                        <SelectTrigger id="aiApiProvider" className="w-full">
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="secton">Secton</SelectItem>
                                            <SelectItem value="openai">OpenAI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        Choose which AI provider to use for completions.
                                    </p>
                                </div>

                                {/* After AI Provider Selection, add Base URL input (only for openai) */}
                                {formData.aiApiProvider === 'openai' && (
                                    <>
                                        <Separator />
                                        <div className="space-y-3">
                                            <Label htmlFor="aiApiBaseUrl" className="text-base">OpenAI Base URL (optional)</Label>
                                            <Input
                                                id="aiApiBaseUrl"
                                                placeholder="https://api.openai.com/v1"
                                                value={formData.aiApiBaseUrl || ''}
                                                onChange={(e) => handleChange('aiApiBaseUrl', e.target.value)}
                                            />
                                            <p className="text-sm text-muted-foreground">Use this to point to Azure/OpenAI-compatible proxies.</p>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                {/* API Key Input */}
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="aiApiKey" className="text-base">{formData.aiApiProvider === 'openai' ? 'OpenAI API Key' : 'Secton API Key'}</Label>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-80">
                                                    <p>This key will be used as the system-wide key for all AI Assistant features.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3">
                                        <div className="relative">
                                            <Input
                                                id="aiApiKey"
                                                type="password"
                                                placeholder={settings?.aiApiKey ? "••••••••••••••••" : (formData.aiApiProvider === 'openai' ? 'Enter OpenAI key (starts with sk-)' : 'Enter Secton API key (starts with sk_)')}
                                                value={formData.aiApiKey || ''}
                                                onChange={(e) => handleChange('aiApiKey', e.target.value)}
                                                autoComplete="off"
                                                className="pr-10"
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center">
                                                <Lock className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleTestApiKey}
                                            disabled={isTesting || (!formData.aiApiKey || formData.aiApiKey.includes('•'))}
                                            className="w-full md:w-auto"
                                        >
                                            {isTesting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    <span>Validating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    {keyValidated === true && (
                                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                                    )}
                                                    {keyValidated === false && (
                                                        <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                                    )}
                                                    <span>Validate Key</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {formData.aiApiProvider === 'openai' && (
                                        <p className="text-sm text-muted-foreground">
                                            Enter your OpenAI API key starting with &ldquo;sk-&rdquo;. Don&apos;t have one?
                                            <a
                                                href="https://platform.openai.com/account/api-keys"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline ml-1"
                                            >
                                                Get one here
                                            </a>
                                        </p>
                                    )}

                                    {formData.aiApiProvider === 'secton' && (
                                        <p className="text-sm text-muted-foreground">
                                        Enter your Secton API key starting with &ldquo;sk_&rdquo;. Don&apos;t have one?
                                        <a
                                            href="https://platform.secton.org/settings/organization/api-keys"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline ml-1"
                                        >
                                            Get one here
                                        </a>
                                    </p>
                                    )}

                                    <AnimatePresence>
                                        {keyValidated === true && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Alert variant="success" className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900">
                                                    <AlertTitle>Valid API Key</AlertTitle>
                                                    <AlertDescription>
                                                        Your API key has been verified and is working correctly.
                                                    </AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}

                                        {keyValidated === false && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Alert variant="destructive">
                                                    <AlertTitle>Invalid API Key</AlertTitle>
                                                    <AlertDescription>
                                                        The API key could not be validated. Please check that you&apos;ve entered it correctly.
                                                    </AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Info Box */}
                                <Alert>
                                    <AlertTitle>About AI Integration</AlertTitle>
                                    <AlertDescription>
                                        <p className="leading-relaxed">
                                            The AI Assistant adds powerful AI capabilities to Changerawr, such as AI functionality in the content editor.
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            </CardContent>

                            <CardFooter className="flex justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        // Reset form to current settings
                                        if (settings) {
                                            setFormData({
                                                enableAIAssistant: settings.enableAIAssistant,
                                                aiApiKey: settings.aiApiKey ? '••••••••••••••••' : '',
                                                aiDefaultModel: settings.aiDefaultModel || '',
                                                aiApiProvider: settings.aiApiProvider || 'secton',
                                                aiApiBaseUrl: settings.aiApiBaseUrl || '',
                                            })
                                            setApiKeyChanged(false)
                                            setKeyValidated(null)
                                        }
                                    }}
                                    type="button"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>

                                <Button type="submit" disabled={isSaving} className="min-w-[120px]">
                                    {isSaving ? (
                                        <span className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </span>
                                    ) : (
                                        <span className="flex items-center gap-1">
                      <Save className="h-4 w-4" />
                      <span>Save Settings</span>
                    </span>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}