export type RequestType = 'DELETE_PROJECT' | 'DELETE_TAG'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ChangelogEntry {
    id: string
    title: string
    content: string
    version?: string | null
    publishedAt?: Date | null
    createdAt: Date
    updatedAt: Date
    tags: ChangelogTag[]
}

export interface ChangelogTag {
    id: string
    name: string
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
    ChangelogTag: unknown;
}