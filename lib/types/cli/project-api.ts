// Types for CLI Project API endpoints

export interface ProjectLinkRequest {
    repositoryUrl?: string;
    branch?: string;
    localPath?: string;
}

export interface ProjectLinkResponse {
    success: boolean;
    message: string;
    linkId?: string;
    linkedAt: string;
}

export interface ProjectUnlinkRequest {
    reason?: string;
    preserveData?: boolean;
}

export interface ProjectUnlinkResponse {
    success: boolean;
    message: string;
    unlinkedAt: string;
}

export interface CommitData {
    hash: string;
    message: string;
    author: string;
    email: string;
    date: string;
    files: string[];
    type?: ConventionalCommitType;
    scope?: string;
    breaking?: boolean;
    body?: string;
    footer?: string;
}

export interface SyncRequest {
    commits: CommitData[];
    lastSyncHash?: string;
    branch: string;
    repositoryUrl?: string;
    metadata?: {
        cliVersion?: string;
        platform?: string;
        timestamp: string;
    };
}

export interface SyncResponse {
    success: boolean;
    processed: number;
    skipped: number;
    errors: string[];
    warnings: string[];
    newSyncHash: string;
    syncedAt: string;
    nextSyncRecommendedAt?: string;
}

export interface SyncStatusResponse {
    success: boolean;
    lastSync?: {
        syncHash: string;
        syncedAt: string;
        commitCount: number;
        branch: string;
    };
    pendingCommits: number;
    totalCommits: number;
    repositoryInfo: {
        url?: string;
        branch: string;
        lastCommitHash?: string;
        linkedAt: string;
    };
    syncSettings: {
        autoSync: boolean;
        lastSyncInterval: number;
        maxCommitsPerSync: number;
    };
}

export type ConventionalCommitType =
    | 'feat'
    | 'fix'
    | 'docs'
    | 'style'
    | 'refactor'
    | 'perf'
    | 'test'
    | 'build'
    | 'ci'
    | 'chore'
    | 'revert';

export interface ProjectSyncMetadata {
    id: string;
    projectId: string;
    lastSyncHash?: string;
    lastSyncedAt?: Date;
    totalCommitsSynced: number;
    repositoryUrl?: string;
    branch: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SyncedCommit {
    id: string;
    projectId: string;
    commitHash: string;
    commitMessage: string;
    commitAuthor: string;
    commitEmail: string;
    commitDate: Date;
    commitFiles: string[];
    conventionalType?: ConventionalCommitType;
    conventionalScope?: string;
    isBreaking: boolean;
    commitBody?: string;
    commitFooter?: string;
    syncedAt: Date;
    branch: string;
}

// Error response types
export interface ProjectApiError {
    success: false;
    error: string;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

// Success response wrapper
export interface ProjectApiSuccess<T = unknown> {
    success: true;
    data: T;
    message?: string;
}