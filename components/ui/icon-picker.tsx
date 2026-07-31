'use client';

import React, {useMemo, useState} from 'react';
import * as LucideIcons from 'lucide-react';
import {Smile, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from '@/components/ui/command';
import {PICKER_ICON_NAMES} from '@/lib/constants/lucide-icons';
import {cn} from '@/lib/utils';

const MAX_RESULTS = 240;

/** Resolves a lucide-react icon by name, falling back to `fallback` if the name is missing or unrecognized. */
export function DynamicIcon({name, fallback, className}: {
    name?: string | null;
    fallback?: React.ElementType;
    className?: string;
}) {
    const Icon = (name && (LucideIcons as unknown as Record<string, React.ElementType>)[name]) || fallback;
    return Icon ? <Icon className={className}/> : null;
}

export interface IconPickerProps {
    value: string | null;
    onChange: (icon: string | null) => void;
    disabled?: boolean;
    align?: 'start' | 'center' | 'end';
    className?: string;
}

/** General-purpose popover picker for any lucide-react icon, searchable by name. */
export function IconPicker({value, onChange, disabled, align = 'start', className}: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const results = useMemo(() => {
        const query = search.trim().toLowerCase();
        const matches = query
            ? PICKER_ICON_NAMES.filter((name) => name.toLowerCase().includes(query))
            : PICKER_ICON_NAMES;
        return matches.slice(0, MAX_RESULTS);
    }, [search]);

    const handleSelect = (name: string) => {
        onChange(name);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    className={cn('h-8 w-8 shrink-0 p-0', className)}
                    title={value ?? 'Choose icon'}
                >
                    <DynamicIcon name={value} fallback={Smile} className="h-4 w-4"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align={align}>
                <Command shouldFilter={false}>
                    <CommandInput value={search} onValueChange={setSearch} placeholder="Search icons…"/>
                    <CommandEmpty>No icons found.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            <div className="grid grid-cols-6 gap-1 p-2">
                                {results.map((name) => {
                                    const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
                                    const isSelected = value === name;

                                    return (
                                        <CommandItem
                                            key={name}
                                            value={name}
                                            onSelect={() => handleSelect(name)}
                                            title={name}
                                            className={cn(
                                                'flex h-8 w-8 items-center justify-center rounded p-0',
                                                isSelected && 'bg-accent text-accent-foreground'
                                            )}
                                        >
                                            <Icon className="h-4 w-4"/>
                                        </CommandItem>
                                    );
                                })}
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
                {value && (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                onChange(null);
                                setIsOpen(false);
                            }}
                            className="h-6 w-full px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="mr-1 h-3 w-3"/>
                            Clear
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
