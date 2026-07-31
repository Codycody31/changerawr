// components/ui/color-picker.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAG_COLOR_OPTIONS, getTagColorInfo, type TagColorOption } from '@/lib/types/changelog';
import { Badge } from '@/components/ui/badge';
import { useDebouncedCallback } from 'use-debounce';

interface ColorPickerProps {
    value?: string | null;
    onChange: (color: string | null) => void;
    disabled?: boolean;
    placeholder?: string;
    showCustomInput?: boolean;
    minimal?: boolean;
    align?: 'start' | 'center' | 'end';
}

export function ColorPicker({
    value,
    onChange,
    disabled = false,
    placeholder = 'Select a color',
    showCustomInput = true,
    minimal = false,
    align = 'start',
}: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedColor = getTagColorInfo(value);

    const handleColorSelect = (colorOption: TagColorOption) => {
        onChange(colorOption.color);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setIsOpen(false);
    };

    // Debounce native color picker changes so rapid dragging doesn't hammer state
    const handleNativeColor = useDebouncedCallback((hex: string) => {
        onChange(hex);
    }, 80);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {minimal ? (
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={disabled}
                        className="h-8 w-8 flex-shrink-0 p-0"
                        title={value ? selectedColor.label : 'Choose color'}
                    >
                        {value ? (
                            <span
                                className="h-5 w-5 rounded-md border border-border/60 block"
                                style={{ backgroundColor: value }}
                            />
                        ) : (
                            <Palette className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
                    >
                        <div className="flex items-center gap-2">
                            {value ? (
                                <>
                                    <div className="h-4 w-4 rounded border border-border/60" style={{ backgroundColor: value }} />
                                    <span>{selectedColor.label}</span>
                                </>
                            ) : (
                                <>
                                    <Palette className="h-4 w-4" />
                                    <span>{placeholder}</span>
                                </>
                            )}
                        </div>
                    </Button>
                )}
            </PopoverTrigger>

            <PopoverContent className="w-56 p-0" align={align}>
                <Command>
                    <CommandInput placeholder="Search colors…" />
                    <CommandEmpty>No colors found.</CommandEmpty>
                    <CommandGroup>
                        <div className="grid grid-cols-4 gap-1.5 p-2">
                            {TAG_COLOR_OPTIONS.map((colorOption) => {
                                const isSelected = value === colorOption.color;
                                return (
                                    <CommandItem
                                        key={colorOption.value}
                                        onSelect={() => handleColorSelect(colorOption)}
                                        className="flex flex-col items-center gap-1 p-1.5 cursor-pointer rounded"
                                    >
                                        <div className="relative">
                                            <div
                                                className="h-7 w-7 rounded border border-border/40"
                                                style={{ backgroundColor: colorOption.color }}
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check className="h-3.5 w-3.5" style={{ color: colorOption.textColor || '#fff' }} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground text-center leading-tight">{colorOption.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </div>
                    </CommandGroup>
                </Command>

                {/* Footer: native color swatch + clear */}
                <div className="border-t px-2 py-2 flex items-center gap-2">
                    {showCustomInput && (
                        <label className="flex items-center gap-2 cursor-pointer flex-1 group">
                            {/* Native color input hidden behind a styled swatch */}
                            {(() => {
                                const isCustomActive = !!value && !TAG_COLOR_OPTIONS.find(o => o.color === value);
                                const swatchColor = isCustomActive ? value! : '#6366f1';
                                const textColor = isCustomActive
                                    ? (parseInt(swatchColor.slice(1, 3), 16) * 0.299 + parseInt(swatchColor.slice(3, 5), 16) * 0.587 + parseInt(swatchColor.slice(5, 7), 16) * 0.114) / 255 > 0.5 ? '#000' : '#fff'
                                    : '#fff';
                                return (
                                    <div className="relative h-6 w-6 rounded border border-border/60 overflow-hidden flex-shrink-0">
                                        <div className="absolute inset-0" style={{ backgroundColor: swatchColor }} />
                                        {isCustomActive && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Check className="h-3.5 w-3.5" style={{ color: textColor }} />
                                            </div>
                                        )}
                                        <input
                                            type="color"
                                            value={swatchColor}
                                            onChange={e => handleNativeColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                    </div>
                                );
                            })()}
                            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors select-none">
                                Custom
                            </span>
                        </label>
                    )}
                    {value && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground ml-auto"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Clear
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
    onRemove,
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
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </Badge>
    );
}
