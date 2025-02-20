// components/changelog/editor/EditorHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    ChevronLeft,
    Save,
    AlertCircle,
    ChevronDown,
    Tags,
    Check
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChangelogActionRequest } from "@/components/changelog/ChangelogActionRequest";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

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

const VersionSelector = ({
                             version,
                             onVersionChange,
                             projectId,
                         }: {
    version: string;
    onVersionChange: (version: string) => void;
    projectId: string;
}) => {
    const [customVersion, setCustomVersion] = React.useState(version);
    const [showInvalidVersions, setShowInvalidVersions] = React.useState(false);

    // Fetch versions from API
    const { data: versionData = { versions: [] } } = useQuery({
        queryKey: ['project-versions', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            return response.json();
        }
    });

    // Version validation function
    const isValidVersion = (v: string) => {
        if (!v) return false;
        // Remove 'v' prefix if present
        const versionNumber = v.startsWith('v') ? v.substring(1) : v;
        const parts = versionNumber.split('.').map(Number);
        return parts.length === 3 && parts.every(n => !isNaN(n));
    };

    // Clean version for calculations (remove 'v' prefix)
    const cleanVersion = (v: string) => v.startsWith('v') ? v.substring(1) : v;

    // Ensure versions is always an array and filter out invalid versions
    const allVersions = versionData.versions || [];
    const validVersions = allVersions.filter(isValidVersion);
    const invalidVersions = allVersions.filter(v => !isValidVersion(v));

    // Group versions by type
    const groupedVersions = React.useMemo(() => {
        if (!validVersions.length) return {
            suggestions: ['v1.0.0'],
            existing: []
        };

        // Get latest version and remove 'v' prefix for calculations
        const latest = cleanVersion(validVersions[0]);
        const [major, minor, patch] = latest.split('.').map(Number);

        return {
            suggestions: [
                `v${major + 1}.0.0`,  // Major
                `v${major}.${minor + 1}.0`,  // Minor
                `v${major}.${minor}.${patch + 1}`,  // Patch
            ],
            existing: validVersions
        };
    }, [validVersions]);

    // add back use for later
    // const handleCustomVersionSubmit = (e: React.FormEvent) => {
    //     e.preventDefault();
    //     let finalVersion = customVersion;
    //     // Add 'v' prefix if it's a valid version without one
    //     if (customVersion && !customVersion.startsWith('v') && /^\d+\.\d+\.\d+$/.test(customVersion)) {
    //         finalVersion = `v${customVersion}`;
    //     }
    //     onVersionChange(finalVersion);
    // };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                        "w-[200px] justify-between",
                        !version && "text-muted-foreground"
                    )}
                >
                    {version || "Select version..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Enter version..."
                        value={customVersion}
                        onValueChange={setCustomVersion}
                    />
                    <CommandList>
                        <CommandEmpty>No versions found</CommandEmpty>
                        <CommandGroup heading="Suggested Updates">
                            {groupedVersions.suggestions.map((v) => (
                                <CommandItem
                                    key={v}
                                    value={v}
                                    onSelect={() => {
                                        onVersionChange(v);
                                        setCustomVersion(v);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            version === v ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {v}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {groupedVersions.existing.length > 0 && (
                            <CommandGroup heading="Previous Versions">
                                {groupedVersions.existing.map((v) => (
                                    <CommandItem
                                        key={v}
                                        value={v}
                                        onSelect={() => {
                                            onVersionChange(v);
                                            setCustomVersion(v);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                version === v ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {v}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {invalidVersions.length > 0 && (
                            <>
                                <div className="px-2 py-2 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-muted-foreground text-sm"
                                        onClick={() => setShowInvalidVersions(!showInvalidVersions)}
                                    >
                                        {showInvalidVersions ? "Hide" : "Show"} {invalidVersions.length} non-standard version{invalidVersions.length === 1 ? "" : "s"}
                                    </Button>
                                </div>
                                {showInvalidVersions && (
                                    <CommandGroup heading="Non-standard Versions">
                                        {invalidVersions.map((v) => (
                                            <CommandItem
                                                key={v}
                                                value={v}
                                                onSelect={() => {
                                                    onVersionChange(v);
                                                    setCustomVersion(v);
                                                }}
                                                className="text-muted-foreground"
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        version === v ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {v || "(empty)"}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
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
    return (
        <TooltipProvider>
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container py-4">
                    <div className="flex flex-col gap-4">
                        {/* Top row: Back button and actions */}
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
                                        <ChangelogActionRequest
                                            projectId={projectId}
                                            entryId={entryId}
                                            action={isPublished ? "UNPUBLISH" : "PUBLISH"}
                                            title={title}
                                            isPublished={isPublished}
                                            variant="default"
                                        />
                                        <ChangelogActionRequest
                                            projectId={projectId}
                                            entryId={entryId}
                                            action="DELETE"
                                            title={title}
                                            variant="destructive"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bottom row: Title and metadata */}
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

                        {/* Status message */}
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