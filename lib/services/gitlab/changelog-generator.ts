import {
    GitLabClient,
    GitLabCommit
} from './client';
import {
    parseConventionalCommit,
    shouldIncludeCommit,
    groupCommitsByType,
    CommitFilterSettings,
    ConventionalCommit
} from '@/lib/services/github/client';

import { createSectonClient } from '@/lib/utils/ai/secton';

export interface FileChange {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    patch?: string;
}

export interface CommitData {
    sha: string;
    message: string;
    author: string;
    date: string;
    files: FileChange[];
    url: string;
}

export interface ChangelogEntry {
    category: string;
    description: string;
    files: string[];
    commit: string;
    impact?: string;
    technicalDetails?: string;
}

export interface ChangelogGenerationOptions {
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    useAI: boolean;
    aiApiKey?: string;
    aiModel?: string;
    aiApiProvider?: 'secton' | 'openai';
    aiApiBaseUrl?: string | null;
    groupByType: boolean;
    includeCommitLinks: boolean;
    repositoryUrl: string;
    includeCodeAnalysis: boolean;
    maxCommitsToAnalyze?: number;
}

export interface GeneratedChangelog {
    content: string;
    version?: string;
    commits: CommitData[];
    entries: ChangelogEntry[];
    metadata: {
        totalCommits: number;
        analyzedCommits: number;
        aiGenerated: boolean;
        hasCodeAnalysis: boolean;
        model?: string;
        generatedAt: string;
    };
}

export class GitLabChangelogGenerator {
    private client: GitLabClient;

    constructor(client: GitLabClient) {
        this.client = client;
    }

    async generateChangelogBetweenRefs(
        repositoryUrl: string,
        fromRef: string,
        toRef: string,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        const commits = await this.client.getCommitsBetween(repositoryUrl, fromRef, toRef);
        return this.generateChangelogFromCommits(commits, repositoryUrl, options);
    }

    async generateChangelogFromRecent(
        repositoryUrl: string,
        daysBack: number,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        const since = new Date();
        since.setDate(since.getDate() - daysBack);
        const commits = await this.client.getCommits(repositoryUrl, {
            since: since.toISOString(),
            per_page: Math.min(options.maxCommitsToAnalyze ?? 50, 100)
        });
        return this.generateChangelogFromCommits(commits, repositoryUrl, options);
    }

    private async generateChangelogFromCommits(
        commits: GitLabCommit[],
        repositoryUrl: string,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        const filteredCommits = commits.filter((commit) =>
            shouldIncludeCommit(commit as any, options as unknown as CommitFilterSettings)
        );

        const commitData: CommitData[] = filteredCommits.map((c) => ({
            sha: c.sha,
            message: c.message,
            author: c.author?.name || 'Unknown',
            date: c.author?.date || new Date().toISOString(),
            url: c.url,
            files: []
        }));

        const entries = this.generateBasicEntries(commitData);

        const content = this.generateMarkdownContent(entries, options);

        return {
            content,
            commits: commitData,
            entries,
            metadata: {
                totalCommits: commits.length,
                analyzedCommits: commitData.length,
                aiGenerated: false,
                hasCodeAnalysis: false,
                generatedAt: new Date().toISOString()
            }
        };
    }

    private generateBasicEntries(commits: CommitData[]): ChangelogEntry[] {
        return commits.map((c) => ({
            category: this.categorizeCommitMessage(c.message),
            description: c.message.split('\n')[0],
            files: [],
            commit: c.sha.substring(0, 7)
        }));
    }

    private categorizeCommitMessage(message: string): string {
        const parsed = parseConventionalCommit(message) as ConventionalCommit | undefined;
        if (!parsed) return 'Other';

        switch (parsed.type) {
            case 'feat':
                return 'Features';
            case 'fix':
                return 'Bug Fixes';
            case 'docs':
                return 'Documentation';
            case 'refactor':
                return 'Refactoring';
            case 'perf':
                return 'Performance';
            case 'BREAKING CHANGE':
                return 'Breaking Changes';
            default:
                return 'Other';
        }
    }

    private generateMarkdownContent(entries: ChangelogEntry[], options: ChangelogGenerationOptions): string {
        const today = new Date().toISOString().split('T')[0];
        let content = `# Changelog (${today})\n\n`;

        if (entries.length === 0) {
            return content + 'No significant changes found.\n';
        }

        // Group entries
        const grouped: Record<string, ChangelogEntry[]> = {};
        entries.forEach(e => {
            (grouped[e.category] ||= []).push(e);
        });

        const categoryOrder = [
            'Breaking Changes',
            'Features',
            'Bug Fixes',
            'Performance',
            'Refactoring',
            'Documentation',
            'Other'
        ];

        categoryOrder.forEach(category => {
            const list = grouped[category];
            if (!list || list.length === 0) return;

            const emoji = this.getCategoryEmoji(category);
            content += `## ${emoji} ${category}\n\n`;

            list.forEach(entry => {
                content += `- ${entry.description}\n`;

                if (entry.impact) {
                    content += `  - **Impact**: ${entry.impact}\n`;
                }

                if (entry.technicalDetails) {
                    content += `  - **Technical**: ${entry.technicalDetails}\n`;
                }

                if (options.includeCommitLinks) {
                    const shortSha = entry.commit.substring(0, 7);
                    const commitUrl = `${options.repositoryUrl}/-/commit/${entry.commit}`;
                    content += `  - **Commit**: [${shortSha}](${commitUrl})\n`;
                }

                content += '\n';
            });
        });

        return content.trim();
    }

    private getCategoryEmoji(category: string): string {
        const map: Record<string, string> = {
            'Breaking Changes': '💥',
            'Features': '🚀',
            'Bug Fixes': '🐛',
            'Performance': '⚡',
            'Refactoring': '♻️',
            'Documentation': '📚',
            'Other': '📝'
        };
        return map[category] || '📝';
    }
}

export function createGitLabChangelogGenerator(client: GitLabClient): GitLabChangelogGenerator {
    return new GitLabChangelogGenerator(client);
} 