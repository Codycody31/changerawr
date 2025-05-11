import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronLeft, Save, AlertCircle, ChevronDown, Tags, Check, Info, Calendar, Tag } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChangelogActionRequest } from "@/components/changelog/ChangelogActionRequest";
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {Badge} from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Tag {
    id: string;
    name: string;
}

interface EditorHeaderProps {
    title: string;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    lastSaveError: string | null;
    onManualSave: () => Promise<void>;
    onBack: () => void;
    isPublished: boolean;
    projectId: string;
    entryId?: string;
    version: string;
    onVersionChange: (version: string) => void;
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
}

interface VersionData {
    versions: string[];
}

// Types
type VersionFormat = 'semver' | 'custom';
type VersionType = 'major' | 'minor' | 'patch' | 'custom';

interface Version {
    value: string;
    type: VersionType;
    isStandard: boolean;
}

interface VersionData {
    versions: string[];
}

interface VersionManagerState {
    input: string;
    activeTab: VersionFormat;
    isOpen: boolean;
    showPrevious: boolean;
}

/**
 * An enhanced version selector component that supports both semantic versioning
 * and custom version formats (e.g., v2025.8.04.162)
 */
const VersionSelector = ({
                             version,
                             onVersionChange,
                             projectId,
                         }: {
    version: string;
    onVersionChange: (version: string) => void;
    projectId: string;
}) => {
    // Ref for input focus management
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Core state using useReducer for better organization
    const [state, dispatch] = React.useReducer(
        (state: VersionManagerState, action: Partial<VersionManagerState> | 'reset' | 'toggle-previous'): VersionManagerState => {
            if (action === 'reset') {
                return {
                    ...state,
                    input: version || '',
                };
            }

            if (action === 'toggle-previous') {
                return {
                    ...state,
                    showPrevious: !state.showPrevious,
                };
            }

            return { ...state, ...action };
        },
        {
            input: version || '',
            activeTab: 'semver',
            isOpen: false,
            showPrevious: true,
        }
    );

    // Destructure state for easier access
    const { input, activeTab, isOpen, showPrevious } = state;

    // Fetch versions using React Query
    const {
        data: versionData = { versions: [] },
        isLoading,
    } = useQuery({
        queryKey: ['project-versions', projectId],
        queryFn: async (): Promise<VersionData> => {
            const response = await fetch(`/api/projects/${projectId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            return await response.json();
        },
        staleTime: 60000, // 1 minute caching
    });

    // ===== Version utilities =====

    /**
     * Check if a version follows semver format (x.y.z)
     */
    const isSemVer = React.useCallback((v: string): boolean => {
        if (!v) return false;
        const versionNumber = v.startsWith('v') ? v.substring(1) : v;
        const parts = versionNumber.split('.');

        // Must have 3 parts that are all numbers
        return parts.length === 3 && parts.every(part => /^\d+$/.test(part));
    }, []);

    /**
     * Determine if a version string is valid for selection
     */
    const isValidVersion = React.useCallback((v: string): boolean => {
        return Boolean(v && v.trim());
    }, []);

    /**
     * Ensure version has 'v' prefix
     */
    const formatVersion = React.useCallback((v: string): string => {
        if (!v) return '';
        const trimmed = v.trim();
        return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
    }, []);

    /**
     * Remove 'v' prefix from version
     */
    const stripPrefix = React.useCallback((v: string): string => {
        return v.startsWith('v') ? v.substring(1) : v;
    }, []);

    /**
     * Determine the type of a version (major, minor, patch, custom)
     */
    const getVersionType = React.useCallback((v: string): VersionType => {
        if (!isSemVer(v)) return 'custom';

        if (v.endsWith('.0.0')) return 'major';
        if (v.match(/\.\d+\.0$/)) return 'minor';
        return 'patch';
    }, [isSemVer]);

    // ===== Process versions =====

    // Create processed versions array with metadata
    const processedVersions = React.useMemo(() => {
        return (versionData.versions || []).map(v => ({
            value: v,
            type: getVersionType(v),
            isStandard: isSemVer(v),
        }));
    }, [versionData.versions, getVersionType, isSemVer]);

    // Split versions by type
    const { semverVersions, customVersions } = React.useMemo(() => {
        return {
            semverVersions: processedVersions.filter(v => v.isStandard),
            customVersions: processedVersions.filter(v => !v.isStandard),
        };
    }, [processedVersions]);

    // Generate version suggestions based on latest version
    const suggestions = React.useMemo(() => {
        // Default suggestion if no standard versions exist
        if (!semverVersions.length) {
            return [
                { value: 'v1.0.0', type: 'major' as VersionType, isStandard: true }
            ];
        }

        // Find latest version
        const latestVersion = semverVersions[0].value;
        const cleanVersion = stripPrefix(latestVersion);
        const [major, minor, patch] = cleanVersion.split('.').map(Number);

        return [
            { value: `v${major + 1}.0.0`, type: 'major' as VersionType, isStandard: true },
            { value: `v${major}.${minor + 1}.0`, type: 'minor' as VersionType, isStandard: true },
            { value: `v${major}.${minor}.${patch + 1}`, type: 'patch' as VersionType, isStandard: true },
        ];
    }, [semverVersions, stripPrefix]);

    // Generate custom version templates
    const customTemplates = React.useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return [
            `v${year}.${month}.${day}`,
            `v${year}.${month}.${day}.1`,
            `v${year}${month}${day}`,
        ];
    }, []);

    // ===== Handlers =====

    /**
     * Handle version selection
     */
    const handleVersionSelect = React.useCallback((selectedVersion: string) => {
        const formattedVersion = formatVersion(selectedVersion);
        onVersionChange(formattedVersion);
        dispatch({ isOpen: false });

        // Keep the focus on the element to prevent unexpected tab navigation
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, [formatVersion, onVersionChange]);

    /**
     * Handle custom version creation
     */
    const handleCreateCustomVersion = React.useCallback(() => {
        if (isValidVersion(input)) {
            handleVersionSelect(input);
        }
    }, [input, handleVersionSelect, isValidVersion]);

    /**
     * Handle key events in the input field
     */
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValidVersion(input)) {
            e.preventDefault();
            handleVersionSelect(input);
        }
    }, [input, handleVersionSelect, isValidVersion]);

    // ===== Effects =====

    // Auto focus input when popover opens or tab changes
    React.useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    }, [isOpen, activeTab]);

    // Reset input when popover opens
    React.useEffect(() => {
        if (isOpen) {
            dispatch('reset');
        }
    }, [isOpen, version]);

    // Set appropriate starting tab based on current version
    React.useEffect(() => {
        const isCurrentVersionCustom = version && !isSemVer(version);
        if (isCurrentVersionCustom) {
            dispatch({ activeTab: 'custom' });
        }
    }, [version, isSemVer]);

    // ===== Renderers =====

    /**
     * Render badge for version type
     */
    const renderVersionTypeBadge = (type: VersionType) => {
        if (type === 'major') {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className="ml-auto bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Major
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Breaking changes (1.0.0 → 2.0.0)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        if (type === 'minor') {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-200">
                            Minor
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">New features (1.0.0 → 1.1.0)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        if (type === 'patch') {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className="ml-auto bg-gray-100 text-gray-800 hover:bg-gray-200">
                            Patch
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Bug fixes (1.0.0 → 1.0.1)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return null;
    };

    /**
     * Render a single version item
     */
    const renderVersionItem = (version: Version) => (
        <CommandItem
            key={version.value}
            value={version.value}
            onSelect={() => handleVersionSelect(version.value)}
            className="flex items-center"
        >
            <Check
                className={cn(
                    "mr-2 h-4 w-4",
                    version.value === formatVersion(input) ? "opacity-100" : "opacity-0"
                )}
            />
            <span className="flex-1">{version.value}</span>
            {renderVersionTypeBadge(version.type)}
        </CommandItem>
    );

    return (
        <TooltipProvider>
            <Popover
                open={isOpen}
                onOpenChange={(open) => dispatch({ isOpen: open })}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                            "w-[200px] justify-between",
                            !version && "text-muted-foreground"
                        )}
                    >
                        <div className="flex items-center text-left truncate">
              <span className="truncate">
                {version || "Select version..."}
              </span>
                            {version && !isSemVer(version) && (
                                <Badge variant="outline" className="ml-1 h-4 text-xs">
                                    Custom
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[320px] p-0" align="start">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => dispatch({ activeTab: value as VersionFormat })}
                        className="w-full"
                    >
                        {/* Tab headers */}
                        <div className="flex items-center px-3 pt-3 pb-2">
                            <TabsList className="grid grid-cols-2 h-8">
                                <TabsTrigger value="semver" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />
                                    SemVer
                                </TabsTrigger>
                                <TabsTrigger value="custom" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Custom
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Command interface */}
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder={activeTab === 'semver' ? "Find version..." : "Enter custom version..."}
                                value={input}
                                onValueChange={(value) => dispatch({ input: value })}
                                onKeyDown={handleKeyDown}
                                ref={inputRef}
                                className="border-b"
                            />

                            <CommandList>
                                {/* Empty state */}
                                <CommandEmpty>
                                    {isValidVersion(input) ? (
                                        <div className="p-2">
                                            <div className="flex items-center gap-1 text-sm mb-2">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span>Use custom version:</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={handleCreateCustomVersion}
                                            >
                                                {formatVersion(input)}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            {isLoading ? 'Loading versions...' : 'No versions found'}
                                        </div>
                                    )}
                                </CommandEmpty>

                                {/* SemVer tab */}
                                <TabsContent value="semver" className="mt-0 border-none p-0">
                                    {/* Suggested updates */}
                                    <CommandGroup heading="Suggested Updates">
                                        {suggestions.map(renderVersionItem)}
                                    </CommandGroup>

                                    {/* Previous versions */}
                                    {semverVersions.length > 0 && (
                                        <>
                                            <div className="px-2 pt-2 pb-1 border-t">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-muted-foreground text-xs"
                                                    onClick={() => dispatch('toggle-previous')}
                                                >
                                                    {showPrevious ? "Hide" : "Show"} previous versions ({semverVersions.length})
                                                </Button>
                                            </div>

                                            {showPrevious && (
                                                <CommandGroup heading="Previous Versions">
                                                    <div className="max-h-[200px] overflow-y-auto">
                                                        {semverVersions.map(renderVersionItem)}
                                                    </div>
                                                </CommandGroup>
                                            )}
                                        </>
                                    )}

                                    {/* Help text */}
                                    <div className="p-2 border-t">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <Info className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span>
                        SemVer format: <code className="px-1 bg-muted rounded text-xs">vMAJOR.MINOR.PATCH</code>
                      </span>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Custom tab */}
                                <TabsContent value="custom" className="mt-0 border-none p-0">
                                    <CommandGroup heading="Create Custom Version">
                                        <div className="px-2 py-1">
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Enter any version format, such as:
                                            </p>

                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {customTemplates.map((template, index) => (
                                                    <Button
                                                        key={index}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={() => dispatch({ input: template })}
                                                    >
                                                        {template}
                                                    </Button>
                                                ))}
                                            </div>

                                            <Separator className="my-2" />

                                            <div className="flex items-center">
                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                    disabled={!isValidVersion(input)}
                                                    onClick={handleCreateCustomVersion}
                                                >
                                                    Use {formatVersion(input || 'custom version')}
                                                </Button>
                                            </div>
                                        </div>
                                    </CommandGroup>

                                    {/* Previous custom versions */}
                                    {customVersions.length > 0 && (
                                        <CommandGroup heading="Previous Custom Versions">
                                            <div className="max-h-[150px] overflow-y-auto">
                                                {customVersions.map(renderVersionItem)}
                                            </div>
                                        </CommandGroup>
                                    )}

                      {/*              /!* Help text *!/*/}
                      {/*              <div className="p-2 border-t">*/}
                      {/*                  <div className="flex items-center text-xs text-muted-foreground">*/}
                      {/*                      <Info className="h-3 w-3 mr-1 flex-shrink-0" />*/}
                      {/*                      <span>*/}
                      {/*  Custom formats like <code className="px-1 bg-muted rounded text-xs">v2025.01.02.3</code> are supported*/}
                      {/*</span>*/}
                      {/*                  </div>*/}
                      {/*              </div>*/}
                                </TabsContent>
                            </CommandList>
                        </Command>
                    </Tabs>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
};

const TagSelector = ({
                         selectedTags,
                         availableTags,
                         onTagsChange,
                     }: {
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
}) => {
    const [search, setSearch] = React.useState('');

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 border-dashed">
                    <Tags className="mr-2 h-4 w-4" />
                    {selectedTags?.length > 0 ? (
                        <>
                            <span className="hidden md:inline-block">
                                {selectedTags.length} selected
                            </span>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                        </>
                    ) : (
                        <span className="hidden md:inline-block">Select tags</span>
                    )}
                    <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal md:hidden"
                    >
                        {selectedTags?.length}
                    </Badge>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search tags..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup>
                            {availableTags.map((tag) => {
                                const isSelected = selectedTags.some(
                                    (selectedTag) => selectedTag.id === tag.id
                                );

                                return (
                                    <CommandItem
                                        key={tag.id}
                                        onSelect={() => {
                                            if (isSelected) {
                                                onTagsChange(
                                                    selectedTags.filter((t) => t.id !== tag.id)
                                                );
                                            } else {
                                                onTagsChange([...selectedTags, tag]);
                                            }
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {tag.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

interface EntryData {
    publishedAt?: string;
    // Add other fields as needed
}

const EditorHeader = ({
                          title,
                          isSaving,
                          hasUnsavedChanges,
                          lastSaveError,
                          onManualSave,
                          onBack,
                          isPublished,
                          projectId,
                          entryId,
                          version,
                          onVersionChange,
                          selectedTags,
                          availableTags,
                          onTagsChange
                      }: EditorHeaderProps) => {
    const queryClient = useQueryClient();

    const { data: entryData } = useQuery({
        queryKey: ['changelog-entry', projectId, entryId],
        queryFn: async () => {
            if (!entryId) return null;
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`);
            if (!response.ok) throw new Error('Failed to fetch entry');
            return await response.json() as Promise<EntryData>;
        },
        enabled: !!entryId,
    });

    const currentPublishStatus = entryData?.publishedAt ? true : isPublished;
    const handleActionSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['changelog-entry', projectId, entryId] });
    };
    const canPublish = !!version && version.trim() !== '';
    const publishTooltip = !canPublish
        ? "Please set a version before publishing"
        : currentPublishStatus
            ? "Unpublish this entry"
            : "Publish this entry";

    return (
        <TooltipProvider>
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBack}
                                className="hover:bg-accent hover:text-accent-foreground"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2"/>
                                Back
                            </Button>

                            <div className="flex items-center gap-2">
                                {lastSaveError && (
                                    <Alert variant="destructive" className="w-auto">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            {lastSaveError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            onClick={onManualSave}
                                            disabled={isSaving || !hasUnsavedChanges}
                                        >
                                            <Save className="h-4 w-4 mr-2"/>
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {hasUnsavedChanges ? 'Save changes' : 'No unsaved changes'}
                                    </TooltipContent>
                                </Tooltip>

                                {entryId && (
                                    <>
                                        <Separator orientation="vertical" className="h-6" />
                                        {/* Fixed the nested button issue by wrapping in div */}
                                        <div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div>
                                                        <ChangelogActionRequest
                                                            projectId={projectId}
                                                            entryId={entryId}
                                                            action={currentPublishStatus ? "UNPUBLISH" : "PUBLISH"}
                                                            title={title}
                                                            isPublished={currentPublishStatus}
                                                            variant="default"
                                                            disabled={!canPublish && !currentPublishStatus}
                                                            onSuccess={handleActionSuccess}
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {publishTooltip}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div>
                                            <ChangelogActionRequest
                                                projectId={projectId}
                                                entryId={entryId}
                                                action="DELETE"
                                                title={title}
                                                variant="destructive"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold truncate flex-1">
                                {title || 'Untitled Entry'}
                            </h1>

                            <div className="flex items-center gap-2">
                                <TagSelector
                                    selectedTags={selectedTags}
                                    availableTags={availableTags}
                                    onTagsChange={onTagsChange}
                                />

                                <VersionSelector
                                    version={version}
                                    onVersionChange={onVersionChange}
                                    projectId={projectId}
                                />
                            </div>
                        </div>

                        {hasUnsavedChanges && (
                            <div className="text-sm text-muted-foreground">
                                You have unsaved changes
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default EditorHeader;