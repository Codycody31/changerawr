// lib/services/github/changelog-generator.ts
import {
    GitHubClient,
    GitHubCommit,
    ConventionalCommit,
    parseConventionalCommit,
    groupCommitsByType,
    shouldIncludeCommit
} from './client';

export interface ChangelogGenerationOptions {
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    useAI: boolean;
    aiApiKey?: string;
    groupByType: boolean;
    includeCommitLinks: boolean;
    repositoryUrl: string;
}

export interface GeneratedChangelog {
    content: string;
    version?: string;
    commits: GitHubCommit[];
    sections: ChangelogSection[];
}

export interface ChangelogSection {
    title: string;
    type: string;
    commits: GitHubCommit[];
    emoji?: string;
}

/**
 * Service for generating changelog content from GitHub commits
 */
export class GitHubChangelogGenerator {
    private client: GitHubClient;

    constructor(client: GitHubClient) {
        this.client = client;
    }

    /**
     * Generate changelog from commits between two references
     */
    async generateChangelogBetweenRefs(
        repositoryUrl: string,
        fromRef: string,
        toRef: string,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        console.log(`Fetching commits between ${fromRef} and ${toRef}`);

        const commits = await this.client.getCommitsBetween(repositoryUrl, fromRef, toRef);
        console.log(`Found ${commits.length} commits between refs`);

        return this.generateChangelogFromCommits(commits, options);
    }

    /**
     * Generate changelog from recent commits
     */
    async generateChangelogFromRecent(
        repositoryUrl: string,
        daysBack: number,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        console.log(`Fetching commits since ${since.toISOString()}`);

        const commits = await this.client.getCommits(repositoryUrl, {
            since: since.toISOString(),
            per_page: 100
        });

        console.log(`Found ${commits.length} commits in the last ${daysBack} days`);

        return this.generateChangelogFromCommits(commits, options);
    }

    /**
     * Generate changelog from a list of commits
     */
    async generateChangelogFromCommits(
        commits: GitHubCommit[],
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        console.log(`Processing ${commits.length} commits`);

        // Filter commits based on settings
        const filteredCommits = commits.filter(commit => {
            const shouldInclude = shouldIncludeCommit(commit, options);
            if (!shouldInclude) {
                console.log(`Filtering out commit: ${commit.message?.substring(0, 50)}...`);
            }
            return shouldInclude;
        });

        console.log(`${filteredCommits.length} commits passed filtering`);

        // Generate sections
        const sections = this.createChangelogSections(filteredCommits, options);
        console.log(`Created ${sections.length} sections`);

        // Generate content
        let content: string;
        if (options.useAI && options.aiApiKey) {
            console.log('Generating AI-enhanced changelog');
            content = await this.generateAIChangelog(filteredCommits, sections, options);
        } else {
            console.log('Generating formatted changelog');
            content = this.generateFormattedChangelog(sections, options);
        }

        // Try to infer version from commits/tags
        const version = await this.inferVersion(filteredCommits, options.repositoryUrl);

        return {
            content,
            version,
            commits: filteredCommits,
            sections
        };
    }

    /**
     * Create organized sections from commits
     */
    private createChangelogSections(
        commits: GitHubCommit[],
        options: ChangelogGenerationOptions
    ): ChangelogSection[] {
        const sections: ChangelogSection[] = [];

        if (options.groupByType) {
            const groupedCommits = groupCommitsByType(commits);

            // Define section order and styling
            const sectionConfig = [
                { type: 'feat', title: 'Features', emoji: '🚀' },
                { type: 'feature', title: 'Features', emoji: '🚀' },
                { type: 'fix', title: 'Bug Fixes', emoji: '🐛' },
                { type: 'perf', title: 'Performance', emoji: '⚡' },
                { type: 'refactor', title: 'Refactoring', emoji: '♻️' },
                { type: 'docs', title: 'Documentation', emoji: '📚' },
                { type: 'style', title: 'Styling', emoji: '💅' },
                { type: 'test', title: 'Testing', emoji: '🧪' },
                { type: 'chore', title: 'Maintenance', emoji: '🔧' },
                { type: 'ci', title: 'CI/CD', emoji: '👷' },
                { type: 'build', title: 'Build System', emoji: '📦' },
                { type: 'other', title: 'Other Changes', emoji: '📝' }
            ];

            // Check for breaking changes first
            const breakingCommits = commits.filter(commit => {
                const parsed = parseConventionalCommit(commit.message);
                return parsed?.breaking;
            });

            if (breakingCommits.length > 0 && options.includeBreakingChanges) {
                sections.push({
                    title: 'Breaking Changes',
                    type: 'breaking',
                    emoji: '💥',
                    commits: breakingCommits
                });
            }

            // Add other sections
            sectionConfig.forEach(config => {
                const sectionCommits = groupedCommits[config.type];
                if (sectionCommits && sectionCommits.length > 0) {
                    sections.push({
                        title: config.title,
                        type: config.type,
                        emoji: config.emoji,
                        commits: sectionCommits
                    });
                }
            });
        } else {
            // Single section with all commits
            sections.push({
                title: 'Changes',
                type: 'all',
                commits
            });
        }

        return sections;
    }

    /**
     * Generate formatted changelog using templates
     */
    private generateFormattedChangelog(
        sections: ChangelogSection[],
        options: ChangelogGenerationOptions
    ): string {
        let content = '';

        sections.forEach(section => {
            if (section.commits.length === 0) return;

            // Section header
            content += `## ${section.emoji ? section.emoji + ' ' : ''}${section.title}\n\n`;

            // Section commits
            section.commits.forEach(commit => {
                const parsed = parseConventionalCommit(commit.message);
                const line = this.formatCommitLine(commit, parsed, options);
                content += `${line}\n`;
            });

            content += '\n';
        });

        return content.trim();
    }

    /**
     * Format a single commit line
     */
    private formatCommitLine(
        commit: GitHubCommit,
        parsed: ConventionalCommit | null,
        options: ChangelogGenerationOptions
    ): string {
        let line = '- ';

        // Get the actual message from the commit
        const message = commit.message || '';

        if (parsed) {
            // Use parsed description
            line += parsed.description;

            if (parsed.scope) {
                line += ` (${parsed.scope})`;
            }

            if (parsed.breaking) {
                line += ' **BREAKING**';
            }
        } else {
            // Use raw commit message (first line only)
            line += message.split('\n')[0] || 'No commit message';
        }

        // Add commit link if enabled
        if (options.includeCommitLinks && commit.sha) {
            const shortSha = commit.sha.substring(0, 7);
            const commitUrl = commit.url || '';
            if (commitUrl) {
                line += ` ([${shortSha}](${commitUrl}))`;
            }
        }

        return line;
    }

    /**
     * Generate AI-powered changelog
     */
    private async generateAIChangelog(
        commits: GitHubCommit[],
        sections: ChangelogSection[],
        options: ChangelogGenerationOptions
    ): Promise<string> {
        if (!options.aiApiKey) {
            return this.generateFormattedChangelog(sections, options);
        }

        try {
            // Import AI service dynamically
            const { createSectonClient } = await import('@/lib/utils/ai/secton');

            const aiClient = createSectonClient({
                apiKey: options.aiApiKey
            });

            // Prepare commit data for AI
            const commitSummary = commits.map(commit => {
                const parsed = parseConventionalCommit(commit.message);
                return {
                    message: commit.message?.split('\n')[0],
                    type: parsed?.type || 'other',
                    scope: parsed?.scope,
                    breaking: parsed?.breaking || false,
                    author: commit.author?.name,
                    date: commit.author?.date
                };
            });

            const prompt = `Generate a professional changelog entry from these commits:

${JSON.stringify(commitSummary, null, 2)}

Requirements:
- Use markdown format
- Group similar changes together
- Highlight breaking changes prominently
- Use clear, user-friendly language
- Focus on impact to users, not implementation details
- Include appropriate emojis for sections
- Keep it concise but informative

Generate only the changelog content, no additional commentary.`;

            const aiContent = await aiClient.generateText(prompt);
            return aiContent;

        } catch (error) {
            console.error('AI changelog generation failed:', error);
            // Fallback to formatted changelog
            return this.generateFormattedChangelog(sections, options);
        }
    }

    /**
     * Try to infer version from commits or recent tags
     */
    private async inferVersion(
        commits: GitHubCommit[],
        repositoryUrl: string
    ): Promise<string | undefined> {
        try {
            // Check if any commit messages contain version info
            for (const commit of commits) {
                const message = commit.message || '';
                const versionMatch = message.match(/v?(\d+\.\d+\.\d+)/);
                if (versionMatch) {
                    return versionMatch[1];
                }
            }

            // Try to get the latest tag
            const tags = await this.client.getTags(repositoryUrl, { per_page: 1 });
            if (tags.length > 0) {
                const tagVersion = tags[0].name.replace(/^v/, '');
                // Suggest next patch version
                const parts = tagVersion.split('.');
                if (parts.length === 3) {
                    const patch = parseInt(parts[2]) + 1;
                    return `${parts[0]}.${parts[1]}.${patch}`;
                }
            }

            return undefined;
        } catch (error) {
            console.error('Version inference failed:', error);
            return undefined;
        }
    }

    /**
     * Get available tags for version selection
     */
    async getAvailableTags(repositoryUrl: string): Promise<Array<{ name: string; sha: string }>> {
        try {
            console.log('Fetching tags from repository:', repositoryUrl);
            const tags = await this.client.getTags(repositoryUrl, { per_page: 50 });
            console.log(`Found ${tags.length} tags`);

            return tags.map(tag => ({
                name: tag.name,
                sha: tag.commit.sha
            }));
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            throw error; // Re-throw to let caller handle
        }
    }

    /**
     * Get available releases for version selection
     */
    async getAvailableReleases(repositoryUrl: string): Promise<Array<{ name: string; tagName: string }>> {
        try {
            console.log('Fetching releases from repository:', repositoryUrl);
            const releases = await this.client.getReleases(repositoryUrl, { per_page: 50 });
            console.log(`Found ${releases.length} releases`);

            return releases.map(release => ({
                name: release.name || release.tag_name,
                tagName: release.tag_name
            }));
        } catch (error) {
            console.error('Failed to fetch releases:', error);
            throw error; // Re-throw to let caller handle
        }
    }
}

/**
 * Factory function to create changelog generator
 */
export function createGitHubChangelogGenerator(client: GitHubClient): GitHubChangelogGenerator {
    return new GitHubChangelogGenerator(client);
}