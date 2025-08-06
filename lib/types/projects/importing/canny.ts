export interface CannyUser {
    id: string;
    created: string;
    email: string;
    isAdmin: boolean;
    name: string;
    url: string;
    userID: string;
}

export interface CannyBoard {
    id: string;
    created: string;
    name: string;
    postCount: number;
    url: string;
}

export interface CannyCategory {
    id: string;
    name: string;
    parentID: string | null;
    postCount: number;
    url: string;
}

export interface CannyTag {
    id: string;
    name: string;
    postCount: number;
    url: string;
}

export interface CannyPost {
    id: string;
    author?: CannyUser;
    board?: CannyBoard;
    by?: CannyUser;
    category?: CannyCategory;
    commentCount?: number;
    created: string;
    clickup?: {
        linkedTasks: Array<{
            id: string;
            linkID: string;
            name: string;
            postID: string;
            status: string;
            url: string;
        }>;
    };
    details?: string;
    eta?: string;
    imageURLs?: string[];
    jira?: {
        linkedIssues: Array<{
            id: string;
            key: string;
            url: string;
        }>;
    };
    linear?: {
        linkedIssueIDs: string[];
    };
    owner?: CannyUser;
    score?: number;
    status?: string;
    tags?: CannyTag[];
    title: string;
    url: string;
}

export interface CannyLabel {
    id: string;
    created: string;
    entryCount: number;
    name: string;
    url: string;
}

export interface CannyEntry {
    id: string;
    created: string;
    labels?: CannyLabel[];
    lastSaved: string;
    markdownDetails?: string;
    plaintextDetails?: string;
    posts?: CannyPost[];
    publishedAt?: string;
    reactions?: {
        like?: number;
    };
    scheduledFor?: string | null;
    status: 'published' | 'draft' | 'scheduled';
    title: string;
    types?: string[];
    url: string;
}

export interface CannyApiResponse {
    hasMore: boolean;
    entries: CannyEntry[];
}

export interface CannyImportOptions {
    apiKey: string;
    includeLabels: boolean;
    includePostTags: boolean;
    statusFilter: 'all' | 'published' | 'draft';
    maxEntries: number;
}