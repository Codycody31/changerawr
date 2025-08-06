// components/markdown-editor/modals/CUMEmbedModal.tsx

'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Eye, Settings, Sparkles} from 'lucide-react';

import {
    SiYoutube,
    SiCodepen,
    SiFigma,
    SiX,
    SiGithub,
    SiGooglechrome,
    SiVimeo,
    SiSpotify,
    SiCodesandbox
} from '@icons-pack/react-simple-icons';

import {CUMModalProps} from '@/components/markdown-editor/types/cum-extensions';

// Enhanced type definitions
type EmbedProvider = typeof embedProviders[number]['value'];

interface EmbedOptions {
    width?: string;
    height?: string;
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    controls?: boolean;
    start?: string;
    theme?: 'light' | 'dark';
    tab?: 'result' | 'html' | 'css' | 'js';
    view?: 'preview' | 'editor' | 'split';

    [key: string]: string | number | boolean | undefined;
}

interface CUMEmbedConfig {
    provider: EmbedProvider;
    url: string;
    options: EmbedOptions;
}

const embedProviders = [
    {
        value: 'youtube',
        label: 'YouTube',
        icon: SiYoutube,
        color: '#FF0000',
        placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Embed YouTube videos',
        supportedOptions: ['autoplay', 'mute', 'loop', 'controls', 'start', 'height'],
        tips: [
            'Works with youtube.com, youtu.be, and YouTube Shorts URLs',
            'Video ID is automatically extracted',
            'Creates responsive embedded player with 16:9 aspect ratio',
            'Supports autoplay, mute, loop, and start time options'
        ]
    },
    {
        value: 'vimeo',
        label: 'Vimeo',
        icon: SiVimeo,
        color: '#1AB7EA',
        placeholder: 'https://vimeo.com/753580183',
        description: 'Embed Vimeo videos',
        supportedOptions: ['autoplay', 'mute', 'loop', 'height'],
        tips: [
            'High-quality video embedding',
            'Works with all Vimeo video URLs',
            'Responsive player with clean design',
            'Supports autoplay and loop options'
        ]
    },
    {
        value: 'codepen',
        label: 'CodePen',
        icon: SiCodepen,
        color: '#000000',
        placeholder: 'https://codepen.io/jcoulterdesign/pen/abYNyLq',
        description: 'Embed CodePen demos',
        supportedOptions: ['height', 'theme', 'tab'],
        tips: [
            'Perfect for showcasing code examples',
            'Interactive demos work in preview',
            'Shows HTML, CSS, and JS tabs',
            'Supports light and dark themes'
        ]
    },
    {
        value: 'codesandbox',
        label: 'CodeSandbox',
        icon: SiCodesandbox,
        color: '#040404',
        placeholder: 'https://codesandbox.io/p/sandbox/vite-hp9yj',
        description: 'Embed CodeSandbox projects',
        supportedOptions: ['height', 'view'],
        tips: [
            'Full development environment in browser',
            'Perfect for React, Vue, and other frameworks',
            'Live preview and file explorer',
            'Supports editor and preview views'
        ]
    },
    {
        value: 'figma',
        label: 'Figma',
        icon: SiFigma,
        color: '#F24E1E',
        placeholder: 'https://www.figma.com/community/file/804111521375743796/figma-file-template',
        description: 'Embed Figma designs',
        supportedOptions: ['height'],
        tips: [
            'Share design prototypes and wireframes',
            'Interactive prototypes work in embed',
            'Viewers can inspect design elements',
            'Perfect for design system documentation'
        ]
    },
    {
        value: 'spotify',
        label: 'Spotify',
        icon: SiSpotify,
        color: '#1DB954',
        placeholder: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        description: 'Embed Spotify tracks/playlists',
        supportedOptions: ['height'],
        tips: [
            'Embed tracks, albums, playlists, and podcasts',
            'Works with all Spotify open.spotify.com URLs',
            'Includes play controls and track info',
            'Great for music-related content'
        ]
    },
    {
        value: 'twitter',
        label: 'Twitter/X',
        icon: SiX,
        color: '#1DA1F2',
        placeholder: 'https://x.com/supernova3339/status/1947451911096992097',
        description: 'Embed tweets',
        supportedOptions: [],
        tips: [
            'Works with twitter.com and x.com URLs',
            'Shows tweet preview card',
            'Includes author and engagement info',
            'Links to original tweet'
        ]
    },
    {
        value: 'github',
        label: 'GitHub',
        icon: SiGithub,
        color: '#181717',
        placeholder: 'https://github.com/supernova3339/changerawr',
        description: 'Embed GitHub repos',
        supportedOptions: [],
        tips: [
            'Shows repository information card',
            'Displays repo name and description',
            'Links to live repository',
            'Perfect for open source showcases'
        ]
    },
    {
        value: 'generic',
        label: 'Generic Link',
        icon: SiGooglechrome,
        color: '#4285F4',
        placeholder: 'https://example.com',
        description: 'Generic link embed',
        supportedOptions: [],
        tips: [
            'Works with any HTTPS URL',
            'Creates a preview card',
            'Shows domain and link',
            'Fallback for unsupported platforms'
        ]
    },
] as const;

const optionDefinitions = {
    autoplay: {label: 'Autoplay', type: 'boolean', description: 'Start playing automatically'},
    mute: {label: 'Mute', type: 'boolean', description: 'Start muted (required for autoplay)'},
    loop: {label: 'Loop', type: 'boolean', description: 'Loop the video continuously'},
    controls: {label: 'Show Controls', type: 'boolean', description: 'Show player controls'},
    start: {label: 'Start Time', type: 'number', description: 'Start time in seconds'},
    height: {
        label: 'Height',
        type: 'select',
        options: ['300', '400', '500', '600'],
        description: 'Embed height in pixels'
    },
    theme: {label: 'Theme', type: 'select', options: ['light', 'dark'], description: 'Color theme'},
    tab: {
        label: 'Default Tab',
        type: 'select',
        options: ['result', 'html', 'css', 'js'],
        description: 'Default CodePen tab'
    },
    view: {
        label: 'View Mode',
        type: 'select',
        options: ['preview', 'editor', 'split'],
        description: 'CodeSandbox view mode'
    }
} as const;

export const CUMEmbedModal: React.FC<CUMModalProps> = ({
                                                           isOpen,
                                                           onClose,
                                                           onInsert,
                                                       }) => {
    const [config, setConfig] = useState<CUMEmbedConfig>({
        provider: 'youtube',
        url: '',
        options: {},
    });

    const [urlValid, setUrlValid] = useState(false);

    // Validate URL when it changes
    useEffect(() => {
        const provider = embedProviders.find(p => p.value === config.provider);
        if (!provider || !config.url) {
            setUrlValid(false);
            return;
        }

        try {
            const url = new URL(config.url);
            let valid = false;

            switch (config.provider) {
                case 'youtube':
                    valid = url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be');
                    break;
                case 'vimeo':
                    valid = url.hostname.includes('vimeo.com');
                    break;
                case 'codepen':
                    valid = url.hostname.includes('codepen.io');
                    break;
                case 'codesandbox':
                    valid = url.hostname.includes('codesandbox.io');
                    break;
                case 'figma':
                    valid = url.hostname.includes('figma.com');
                    break;
                case 'spotify':
                    valid = url.hostname.includes('open.spotify.com');
                    break;
                case 'twitter':
                    valid = url.hostname.includes('twitter.com') || url.hostname.includes('x.com');
                    break;
                case 'github':
                    valid = url.hostname.includes('github.com');
                    break;
                case 'generic':
                    valid = url.protocol === 'http:' || url.protocol === 'https:';
                    break;
                default:
                    valid = false;
            }

            setUrlValid(valid);
        } catch {
            setUrlValid(false);
        }
    }, [config.url, config.provider]);

    const handleInsert = () => {
        if (!urlValid) return;

        // Build options string
        const optionsArray: string[] = [];
        Object.entries(config.options).forEach(([key, value]) => {
            if (value !== undefined && value !== false && value !== '') {
                if (typeof value === 'boolean') {
                    optionsArray.push(`${key}:${value ? '1' : '0'}`);
                } else {
                    optionsArray.push(`${key}:${value}`);
                }
            }
        });

        const optionsString = optionsArray.length > 0 ? `{${optionsArray.join(',')}}` : '';
        const markdown = `[embed:${config.provider}](${config.url})${optionsString}`;

        onInsert(markdown);
        onClose();
    };

    const handleReset = () => {
        setConfig({
            provider: 'youtube',
            url: '',
            options: {},
        });
    };

    const handleQuickFill = (exampleUrl: string) => {
        setConfig(prev => ({...prev, url: exampleUrl}));
    };

    const handleProviderChange = (newProvider: string) => {
        // Type guard to ensure newProvider is a valid provider value
        const isValidProvider = embedProviders.some(p => p.value === newProvider);
        if (!isValidProvider) return;

        setConfig(prev => ({
            ...prev,
            provider: newProvider as typeof embedProviders[number]['value'],
            url: '',
            options: {} // Reset options when changing provider
        }));
    };

    const handleOptionChange = (optionKey: string, value: string | number | boolean) => {
        setConfig(prev => ({
            ...prev,
            options: {
                ...prev.options,
                [optionKey]: value
            }
        }));
    };

    const selectedProvider = embedProviders.find(p => p.value === config.provider);

    // Build preview Markdown
    const optionsArray: string[] = [];
    Object.entries(config.options).forEach(([key, value]) => {
        if (value !== undefined && value !== false && value !== '') {
            if (typeof value === 'boolean') {
                optionsArray.push(`${key}:${value ? '1' : '0'}`);
            } else {
                optionsArray.push(`${key}:${value}`);
            }
        }
    });
    const optionsString = optionsArray.length > 0 ? `{${optionsArray.join(',')}}` : '';
    const previewMarkdown = `[embed:${config.provider}](${config.url})${optionsString}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">🎬</span>
                        Create Embed
                    </DialogTitle>
                    <DialogDescription>
                        Embed external content like videos, code demos, designs, and more into your markdown.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="provider" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="provider">Provider</TabsTrigger>
                        <TabsTrigger value="options" disabled={!selectedProvider?.supportedOptions.length}>
                            <Settings className="w-4 h-4 mr-1"/>
                            Options
                        </TabsTrigger>
                        <TabsTrigger value="preview">
                            <Eye className="w-4 h-4 mr-1"/>
                            Preview
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="provider" className="space-y-6 mt-6">
                        {/* Provider Selection */}
                        <div className="grid gap-3">
                            <Label>Content Provider</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {embedProviders.map((provider) => {
                                    const Icon = provider.icon;
                                    return (
                                        <Button
                                            key={provider.value}
                                            variant={config.provider === provider.value ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleProviderChange(provider.value)}
                                            className="flex items-center gap-3 h-auto py-4 px-4 justify-start"
                                        >
                                            <Icon color={provider.color} size={20}/>
                                            <div className="text-left">
                                                <div className="font-medium">{provider.label}</div>
                                                <div
                                                    className="text-xs text-muted-foreground">{provider.description}</div>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* URL Input */}
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="embed-url">Content URL</Label>
                                {urlValid &&
                                    <Badge variant="outline" className="text-green-600 border-green-300">✓ Valid
                                        URL</Badge>}
                                {config.url && !urlValid &&
                                    <Badge variant="outline" className="text-red-600 border-red-300">✗ Invalid
                                        URL</Badge>}
                            </div>
                            <Input
                                id="embed-url"
                                type="url"
                                value={config.url}
                                onChange={(e) => setConfig(prev => ({...prev, url: e.target.value}))}
                                placeholder={selectedProvider?.placeholder}
                                className={urlValid ? 'border-green-300 focus:border-green-500' : config.url && !urlValid ? 'border-red-300 focus:border-red-500' : ''}
                            />
                            {selectedProvider && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleQuickFill(selectedProvider.placeholder)}
                                        className="text-xs"
                                    >
                                        Use example URL
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Provider Tips */}
                        {selectedProvider && (
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-3">
                                    <selectedProvider.icon color={selectedProvider.color} size={16}/>
                                    <span className="font-medium text-sm">{selectedProvider.label} Tips</span>
                                </div>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    {selectedProvider.tips.map((tip, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-xs mt-0.5">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Popular Examples */}
                        <div className="grid gap-3">
                            <Label className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4"/>
                                Popular Examples
                            </Label>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        handleProviderChange('youtube');
                                        handleQuickFill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                                    }}
                                    className="justify-start h-auto py-2"
                                >
                                    <SiYoutube color="#FF0000" size={16} className="mr-2"/>
                                    Rick Astley - Never Gonna Give You Up
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        handleProviderChange('codepen');
                                        handleQuickFill('https://codepen.io/team/codepen/pen/PNaGbb');
                                    }}
                                    className="justify-start h-auto py-2"
                                >
                                    <SiCodepen color="#000000" size={16} className="mr-2"/>
                                    CSS Animation Example
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        handleProviderChange('spotify');
                                        handleQuickFill('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh');
                                    }}
                                    className="justify-start h-auto py-2"
                                >
                                    <SiSpotify color="#1DB954" size={16} className="mr-2"/>
                                    Spotify Track Example
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        handleProviderChange('github');
                                        handleQuickFill('https://github.com/facebook/react');
                                    }}
                                    className="justify-start h-auto py-2"
                                >
                                    <SiGithub color="#181717" size={16} className="mr-2"/>
                                    React Repository
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="options" className="space-y-6 mt-6">
                        {selectedProvider?.supportedOptions.length ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5"/>
                                    <Label className="text-base font-medium">
                                        {selectedProvider.label} Options
                                    </Label>
                                </div>

                                <div className="grid gap-4">
                                    {selectedProvider.supportedOptions.map((optionKey) => {
                                        const option = optionDefinitions[optionKey];
                                        if (!option) return null;

                                        if (option.type === 'boolean') {
                                            return (
                                                <div key={optionKey}
                                                     className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <Label className="font-medium">{option.label}</Label>
                                                        <p className="text-sm text-muted-foreground">{option.description}</p>
                                                    </div>
                                                    <Switch
                                                        checked={!!config.options[optionKey]}
                                                        onCheckedChange={(checked) => handleOptionChange(optionKey, checked)}
                                                    />
                                                </div>
                                            );
                                        }

                                        if (option.type === 'select') {
                                            return (
                                                <div key={optionKey} className="p-3 border rounded-lg space-y-2">
                                                    <Label className="font-medium">{option.label}</Label>
                                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                                    <Select
                                                        value={String(config.options[optionKey] || '')}
                                                        onValueChange={(value) => handleOptionChange(optionKey, value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={`Select ${option.label.toLowerCase()}`}/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {option.options?.map((value) => (
                                                                <SelectItem key={value} value={value}>
                                                                    {value}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            );
                                        }

                                        if (option.type === 'number') {
                                            return (
                                                <div key={optionKey} className="p-3 border rounded-lg space-y-2">
                                                    <Label className="font-medium">{option.label}</Label>
                                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                                    <Input
                                                        type="number"
                                                        value={String(config.options[optionKey] || '')}
                                                        onChange={(e) => handleOptionChange(optionKey, e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                <div className="text-sm">
                                    {selectedProvider?.label} doesn&apos;t have configurable options
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-6 mt-6">
                        <div className="grid gap-4">
                            {/* Markdown Preview */}
                            <div className="space-y-2">
                                <Label>Generated Markdown</Label>
                                <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                                    {previewMarkdown}
                                </div>
                            </div>

                            {/* Visual Preview */}
                            <div className="space-y-2">
                                <Label>Visual Preview</Label>
                                <div
                                    className="p-4 border rounded-lg bg-gradient-to-br from-muted/30 to-muted/60 min-h-[100px] flex items-center justify-center">
                                    {urlValid ? (
                                        <div className="flex items-center gap-3">
                                            {selectedProvider &&
                                                <selectedProvider.icon color={selectedProvider.color} size={32}/>}
                                            <div className="text-left">
                                                <div className="font-medium text-lg">{selectedProvider?.label} Embed
                                                </div>
                                                <div className="text-sm text-muted-foreground truncate max-w-md">
                                                    {config.url}
                                                </div>
                                                {Object.keys(config.options).length > 0 && (
                                                    <div className="flex gap-1 mt-1">
                                                        {Object.entries(config.options).map(([key, value]) => (
                                                            value &&
                                                            <Badge key={key} variant="secondary" className="text-xs">
                                                                {key}: {value.toString()}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <div className="text-2xl mb-2">🎬</div>
                                            <div className="text-sm">Enter a valid URL to see preview</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={handleReset}>
                        Reset
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleInsert} disabled={!urlValid}>
                        Insert Embed
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};