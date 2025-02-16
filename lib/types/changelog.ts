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