import type React from 'react';
import {Clock, FilePlus2, Save, Undo2} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

/** Shared label + icon mapping for `ChangelogEntryRevision.reason`, used across the history list, detail panel, and blame view. */
export const REVISION_REASON_LABELS: Record<string, string> = {
    manual: 'Manual save',
    autosave: 'Autosave',
    restore: 'Restore',
    initial: 'Initial version',
};

export const REVISION_REASON_ICONS: Record<string, React.ElementType> = {
    manual: Save,
    autosave: Clock,
    restore: Undo2,
    initial: FilePlus2,
};

export interface RevisionMarkerFields {
    reason: string;
    label?: string | null;
    icon?: string | null;
    color?: string | null;
}

/** Resolves the icon, label, and accent color to display for a revision, preferring its custom marker over the reason defaults. */
export function getRevisionDisplay(revision: RevisionMarkerFields): { Icon: React.ElementType; label: string; color: string | null } {
    const customIcon = revision.icon ? (LucideIcons as unknown as Record<string, React.ElementType>)[revision.icon] : undefined;
    const Icon = customIcon ?? REVISION_REASON_ICONS[revision.reason] ?? FilePlus2;
    const label = revision.label?.trim() || REVISION_REASON_LABELS[revision.reason] || revision.reason;

    return {Icon, label, color: revision.color ?? null};
}
