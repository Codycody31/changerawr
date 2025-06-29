export type RequestType = 'DELETE_PROJECT' | 'DELETE_TAG'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ChangelogEntry {
    id: string
    title: string
    content: string
    version?: string | null
    publishedAt?: Date | null
    scheduledAt?: Date | null
    createdAt: Date
    updatedAt: Date
    tags: ChangelogTag[]
}

export interface ChangelogTag {
    id: string
    name: string
    color?: string | null
}

export interface Changelog {
    id: string
    projectId: string
    entries: ChangelogEntry[]
    createdAt: Date
    updatedAt: Date
}

export interface ChangelogRequest {
    id: string
    type: RequestType
    status: RequestStatus
    staffId: string
    adminId?: string | null
    projectId: string
    targetId?: string | null
    createdAt: string
    reviewedAt?: string | null
    changelogEntryId?: string | null
    changelogTagId?: string | null
    staff: {
        id: string
        email: string
        name: string | null
    }
    project: {
        id: string
        name: string
    }
    ChangelogEntry?: {
        id: string
        title: string
    } | null
    ChangelogTag?: {
        id: string
        name: string
        color?: string | null
    } | null
}

export interface Project {
    changelog: {
        id: string;
        projectId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    allowAutoPublish: boolean;
    requireApproval: boolean;
    defaultTags: string[];
}

export interface RequestDataType {
    type: string;
    status: string;
    projectId: string;
    targetId: string | null;
    id: string;
    createdAt: Date;
    staffId: string;
    adminId: string | null;
    reviewedAt: Date | null;
    changelogEntryId: string | null;
    changelogTagId: string | null;
    project: {
        changelog: {
            id: string;
            projectId: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        allowAutoPublish: boolean;
        requireApproval: boolean;
        defaultTags: string[];
    };
    ChangelogEntry: unknown | null;
    ChangelogTag: {
        id: string;
        name: string;
        color?: string | null;  // Added color support
    } | null;
}

// Color utility types and constants
export type TagColorOption = {
    value: string;
    label: string;
    color: string;
    textColor?: string;
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
    {value: 'blue', label: 'Blue', color: '#3b82f6', textColor: '#ffffff'},
    {value: 'green', label: 'Green', color: '#10b981', textColor: '#ffffff'},
    {value: 'red', label: 'Red', color: '#ef4444', textColor: '#ffffff'},
    {value: 'yellow', label: 'Yellow', color: '#f59e0b', textColor: '#000000'},
    {value: 'purple', label: 'Purple', color: '#8b5cf6', textColor: '#ffffff'},
    {value: 'pink', label: 'Pink', color: '#ec4899', textColor: '#ffffff'},
    {value: 'indigo', label: 'Indigo', color: '#6366f1', textColor: '#ffffff'},
    {value: 'orange', label: 'Orange', color: '#f97316', textColor: '#ffffff'},
    {value: 'teal', label: 'Teal', color: '#14b8a6', textColor: '#ffffff'},
    {value: 'cyan', label: 'Cyan', color: '#06b6d4', textColor: '#ffffff'},
    {value: 'gray', label: 'Gray', color: '#6b7280', textColor: '#ffffff'},
    {value: 'slate', label: 'Slate', color: '#475569', textColor: '#ffffff'},
];

export const DEFAULT_TAG_COLOR = '#6b7280'; // Gray color as default

// Utility function to get color info
export function getTagColorInfo(color: string | null | undefined): TagColorOption {
    if (!color) {
        return TAG_COLOR_OPTIONS.find(option => option.value === 'gray') || TAG_COLOR_OPTIONS[0];
    }

    return TAG_COLOR_OPTIONS.find(option => option.color === color || option.value === color) ||
        {value: 'custom', label: 'Custom', color: color, textColor: '#ffffff'};
}