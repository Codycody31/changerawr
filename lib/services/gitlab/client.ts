import { URLSearchParams } from 'node:url';

// lib/services/gitlab/client.ts

export interface GitLabConfig {
    accessToken: string;
    repositoryUrl: string;
    defaultBranch?: string;
}

export interface GitLabCommitAuthor {
    name: string;
    email: string;
    date: string;
}

export interface GitLabCommit {
    sha: string;
    commit: {
        message: string;
        author: GitLabCommitAuthor;
        committer: GitLabCommitAuthor;
    };
    html_url: string;
    stats?: {
        additions: number;
        deletions: number;
        total: number;
    };
    files?: Array<{
        filename: string;
        status: 'added' | 'modified' | 'removed' | 'renamed';
        additions: number;
        deletions: number;
        changes: number;
        patch?: string;
        blob_url: string;
        raw_url: string;
    }>;
    // Convenience flattened props matching GitHubCommit type
    message: string;
    author: GitLabCommitAuthor;
    url: string;
}

export interface GitLabTag {
    name: string;
    target: string;
}

export interface GitLabRelease {
    tag_name: string;
    name: string;
    description: string;
    released_at: string;
}

export interface GitLabRepository {
    id: number;
    name: string;
    description: string | null;
    visibility: string;
    default_branch: string | null;
    web_url: string;
    path_with_namespace: string;
    star_count: number;
    forks_count: number;
    last_activity_at: string;
}

export interface GitLabUser {
    id: number;
    username: string;
    name: string;
    avatar_url: string;
}

export class GitLabError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'GitLabError';
        this.statusCode = statusCode;
    }
}

export class GitLabClient {
    private accessToken: string;
    private baseUrl = 'https://gitlab.com/api/v4';

    constructor(config: GitLabConfig) {
        this.accessToken = config.accessToken;
    }

    private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Private-Token': this.accessToken,
            'User-Agent': 'Changerawr/1.0',
            ...(options.headers || {}) as Record<string, string>
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            let errorMessage = `GitLab API error: ${response.status} ${response.statusText}`;
            try {
                // GitLab returns JSON errors sometimes
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                }
            } catch {
                // ignore
            }
            throw new GitLabError(errorMessage, response.status);
        }

        // Some GitLab endpoints (e.g., compare) return plain text for empty, but here assume JSON
        return response.json() as Promise<T>;
    }

    /**
     * Convert a GitLab repository URL to a path_with_namespace usable in API endpoints.
     * Supports http(s) and ssh URLs.
     */
    private parseRepositoryUrl(repositoryUrl: string): string {
        // Examples:
        // https://gitlab.com/group/subgroup/repo.git
        // git@gitlab.com:group/subgroup/repo.git
        // group/subgroup/repo
        let path = repositoryUrl.trim();

        // Strip scheme and domain if present
        const httpsPattern = /^https?:\/\/gitlab\.com\/(.+?)(?:\.git)?$/;
        const sshPattern = /^git@gitlab\.com:(.+?)(?:\.git)?$/;

        if (httpsPattern.test(path)) {
            path = path.replace(httpsPattern, '$1');
        } else if (sshPattern.test(path)) {
            path = path.replace(sshPattern, '$1');
        }

        // Remove .git suffix if present
        path = path.replace(/\.git$/, '');

        return encodeURIComponent(path);
    }

    /**
     * Get current user based on token
     */
    async getUser(): Promise<GitLabUser> {
        return this.makeRequest<GitLabUser>('/user');
    }

    /**
     * Test repository access and return repository info
     */
    async testConnection(repositoryUrl: string): Promise<GitLabRepository> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        return this.makeRequest<GitLabRepository>(`/projects/${projectPath}`);
    }

    /**
     * Get repository details
     */
    async getRepository(repositoryUrl: string): Promise<GitLabRepository> {
        return this.testConnection(repositoryUrl);
    }

    /**
     * Get commits with optional filtering
     */
    async getCommits(
        repositoryUrl: string,
        options: {
            since?: string;
            until?: string;
            per_page?: number;
        } = {}
    ): Promise<GitLabCommit[]> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        const params = new URLSearchParams();
        if (options.since) params.append('since', options.since);
        if (options.until) params.append('until', options.until);
        if (options.per_page) params.append('per_page', options.per_page.toString());

        const data = await this.makeRequest<any[]>(`/projects/${projectPath}/repository/commits?${params.toString()}`);

        // Map to GitLabCommit interface
        return data.map((c) => this.normalizeCommitSummary(c, repositoryUrl));
    }

    /**
     * Compare two refs and return commits between them
     */
    async getCommitsBetween(
        repositoryUrl: string,
        from: string,
        to: string
    ): Promise<GitLabCommit[]> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        const params = new URLSearchParams({ from, to });
        const data = await this.makeRequest<any>(`/projects/${projectPath}/repository/compare?${params.toString()}`);
        // GitLab compare API returns { commits: [...] }
        const commits = (data.commits || []) as any[];
        return commits.map((c) => this.normalizeCommitSummary(c, repositoryUrl));
    }

    /**
     * Get detailed commit info (includes diff stats)
     */
    async getCommit(repositoryUrl: string, sha: string): Promise<GitLabCommit> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        const commit = await this.makeRequest<any>(`/projects/${projectPath}/repository/commits/${sha}`);
        // For files, we need separate call to /diff or /changes
        let files: GitLabCommit['files'] | undefined;
        try {
            const diffs = await this.makeRequest<any[]>(`/projects/${projectPath}/repository/commits/${sha}/diff`);
            files = diffs.map((d) => ({
                filename: d.new_path,
                status: d.deleted ? 'removed' : d.renamed_file ? 'renamed' : d.new_file ? 'added' : 'modified',
                additions: d.additions ?? 0,
                deletions: d.deletions ?? 0,
                changes: (d.additions ?? 0) + (d.deletions ?? 0),
                patch: d.diff,
                blob_url: `${commit.web_url}#${d.new_path}`,
                raw_url: `${commit.web_url}/raw` // Placeholder
            }));
        } catch {
            // Ignore errors fetching diff
        }

        const normalized = this.normalizeCommitSummary(commit, repositoryUrl);
        normalized.files = files;
        return normalized;
    }

    /**
     * Get tags
     */
    async getTags(
        repositoryUrl: string,
        options: { per_page?: number } = {}
    ): Promise<GitLabTag[]> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        const params = new URLSearchParams();
        if (options.per_page) params.append('per_page', options.per_page.toString());
        return this.makeRequest<GitLabTag[]>(`/projects/${projectPath}/repository/tags?${params.toString()}`);
    }

    /**
     * Get releases
     */
    async getReleases(
        repositoryUrl: string,
        options: { per_page?: number } = {}
    ): Promise<GitLabRelease[]> {
        const projectPath = this.parseRepositoryUrl(repositoryUrl);
        const params = new URLSearchParams();
        if (options.per_page) params.append('per_page', options.per_page.toString());
        return this.makeRequest<GitLabRelease[]>(`/projects/${projectPath}/releases?${params.toString()}`);
    }

    /** Helper to convert commit summary */
    private normalizeCommitSummary(raw: any, repositoryUrl: string): GitLabCommit {
        const sha = raw.id || raw.sha;
        const message = raw.message || '';
        const author: GitLabCommitAuthor = {
            name: raw.author_name || raw.author?.name || 'Unknown',
            email: raw.author_email || raw.author?.email || '',
            date: raw.created_at || new Date().toISOString()
        };

        const commitObj: GitLabCommit = {
            sha,
            commit: {
                message,
                author,
                committer: author // GitLab doesn't distinct
            },
            html_url: raw.web_url || `${repositoryUrl}/-/commit/${sha}`,
            message,
            author,
            url: raw.web_url || `${repositoryUrl}/-/commit/${sha}`
        } as GitLabCommit;

        return commitObj;
    }
}

export function createGitLabClient(config: GitLabConfig): GitLabClient {
    return new GitLabClient(config);
} 