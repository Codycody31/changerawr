// components/ui/color-picker.tsx
'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
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
} from '@/components/ui/command';
import {Check, Palette, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {TAG_COLOR_OPTIONS, getTagColorInfo, type TagColorOption} from '@/lib/types/changelog';
import {Badge} from '@/components/ui/badge'

interface ColorPickerProps {
    value?: string | null;
    onChange: (color: string | null) => void;
    disabled?: boolean;
    placeholder?: string;
    showCustomInput?: boolean;
}

export function ColorPicker({
                                value,
                                onChange,
                                disabled = false,
                                placeholder = 'Select a color',
                                showCustomInput = true,
                            }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customColor, setCustomColor] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const selectedColor = getTagColorInfo(value);

    const handleColorSelect = (colorOption: TagColorOption) => {
        onChange(colorOption.color);
        setIsOpen(false);
        setShowCustom(false);
    };

    const handleCustomColorSubmit = () => {
        const hexPattern = /^#[0-9A-Fa-f]{6}$/;
        if (hexPattern.test(customColor)) {
            onChange(customColor);
            setCustomColor('');
            setShowCustom(false);
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        onChange(null);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <div className="flex items-center gap-2">
                        {value ? (
                            <>
                                <div
                                    className="h-4 w-4 rounded border border-gray-300"
                                    style={{backgroundColor: selectedColor.color}}
                                />
                                <span>{selectedColor.label}</span>
                            </>
                        ) : (
                            <>
                                <Palette className="h-4 w-4"/>
                                <span>{placeholder}</span>
                            </>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search colors..."/>
                    <CommandEmpty>No colors found.</CommandEmpty>
                    <CommandGroup>
                        <div className="grid grid-cols-4 gap-2 p-2">
                            {TAG_COLOR_OPTIONS.map((colorOption) => {
                                const isSelected = value === colorOption.color;
                                return (
                                    <CommandItem
                                        key={colorOption.value}
                                        onSelect={() => handleColorSelect(colorOption)}
                                        className="flex flex-col items-center gap-1 p-2 cursor-pointer hover:bg-accent rounded"
                                    >
                                        <div className="relative">
                                            <div
                                                className="h-8 w-8 rounded border-2 border-gray-300"
                                                style={{backgroundColor: colorOption.color}}
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check
                                                        className="h-4 w-4"
                                                        style={{color: colorOption.textColor || '#ffffff'}}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-center">{colorOption.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </div>
                    </CommandGroup>
                </Command>

                <div className="border-t p-3 space-y-3">
                    {showCustomInput && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCustom(!showCustom)}
                                className="w-full"
                            >
                                <Palette className="h-4 w-4 mr-2"/>
                                Custom Color
                            </Button>

                            {showCustom && (
                                <div className="space-y-2">
                                    <Label htmlFor="custom-color" className="text-sm">
                                        Hex Color Code
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="custom-color"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            placeholder="#3b82f6"
                                            className="flex-1"
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleCustomColorSubmit}
                                            disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColor)}
                                        >
                                            <Check className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {value && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="w-full text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4 mr-2"/>
                            Clear Color
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Utility component for displaying colored tags
interface ColoredTagProps {
    name: string;
    color?: string | null;
    variant?: 'default' | 'outline' | 'secondary';
    size?: 'sm' | 'default' | 'lg';
    className?: string;
    onClick?: () => void;
    removable?: boolean;
    onRemove?: () => void;
}

export function ColoredTag({
                               name,
                               color,
                               variant = 'default',
                               size = 'default',
                               className,
                               onClick,
                               removable = false,
                               onRemove
                           }: ColoredTagProps) {

    return (
        <Badge
            variant={color ? variant : 'secondary'}
            customColor={color || undefined}
            className={cn(
                size === 'sm' && 'text-xs px-2 py-1',
                size === 'default' && 'text-sm px-2.5 py-1.5',
                size === 'lg' && 'text-base px-3 py-2',
                onClick && 'cursor-pointer hover:opacity-80',
                className
            )}
            onClick={onClick}
        >
            {name}
            {removable && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </Badge>
    );
}