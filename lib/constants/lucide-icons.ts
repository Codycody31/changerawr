import * as LucideIcons from 'lucide-react';

/** Non-icon utility exports from lucide-react that should not appear in icon pickers. */
const NON_ICON_EXPORTS = new Set(['createLucideIcon', 'icons', 'default', 'Icon']);

/** All icon names exported by lucide-react, suitable for general-purpose icon pickers. */
export const PICKER_ICON_NAMES: string[] = Object.keys(LucideIcons)
    .filter((name) => /^[A-Z]/.test(name) && !NON_ICON_EXPORTS.has(name))
    .filter((name) => typeof (LucideIcons as unknown as Record<string, unknown>)[name] === 'object')
    // lucide-react also exports every icon again under `<Name>Icon` and
    // `Lucide<Name>` aliases (e.g. `Flag`, `FlagIcon`, `LucideFlag` are all
    // the same component) — drop the aliases, keep the bare name.
    .filter((name) => !name.endsWith('Icon') && !name.startsWith('Lucide'))
    .sort();

/** Returns true if `name` is null/undefined or a recognized lucide-react icon export. */
export function isValidPickerIcon(name: string | null | undefined): boolean {
    return name == null || PICKER_ICON_NAMES.includes(name);
}
