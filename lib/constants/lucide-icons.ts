import * as LucideIcons from 'lucide-react';

/** Non-icon utility exports from lucide-react that should not appear in icon pickers. */
const NON_ICON_EXPORTS = new Set(['createLucideIcon', 'icons', 'default', 'Icon']);

/** All icon names exported by lucide-react, suitable for general-purpose icon pickers. */
export const PICKER_ICON_NAMES: string[] = Object.keys(LucideIcons)
    .filter((name) => /^[A-Z]/.test(name) && !NON_ICON_EXPORTS.has(name))
    .filter((name) => typeof (LucideIcons as unknown as Record<string, unknown>)[name] === 'object')
    .sort();

/** Returns true if `name` is null/undefined or a recognized lucide-react icon export. */
export function isValidPickerIcon(name: string | null | undefined): boolean {
    return name == null || PICKER_ICON_NAMES.includes(name);
}
