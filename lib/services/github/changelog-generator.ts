import {
    GitHubClient,
    GitHubCommit,
    ConventionalCommit,
    parseConventionalCommit,
    groupCommitsByType,
    shouldIncludeCommit
} from './client';
import {
    createAIChangelogGenerator,
    AIChangelogOptions,
    AIGeneratedChangelog,
    AIChangelogSection
} from './ai-changelog-generator';

export interface ChangelogGenerationOptions {
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    useAI: boolean;
    aiApiKey?: string;
    aiOptions?: Partial<AIChangelogOptions>;
    groupByType: boolean;
    includeCommitLinks: boolean;
    repositoryUrl: string;
}

export interface GeneratedChangelog {
    content: string;
    version?: string;
    commits: GitHubCommit[];
    sections: ChangelogSection[];
    metadata?: {
        aiGenerated?: boolean;
        style?: string;
        audience?: string;
        totalCommits: number;
        processedCommits: number;
    };
}

export interface ChangelogSection {
    title: string;
    type: string;
    commits: GitHubCommit[];
    emoji?: string;
    description?: string;
    entries?: Array<{
        title: string;
        description: string;
        impact?: string;
        technicalNote?: string;
        commitShas: string[];
        importance: number;
    }>;
}

/**
 * Enhanced service for generating changelog content from GitHub commits with AI
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
     * Generate changelog from a list of commits with AI enhancement
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

        if (filteredCommits.length === 0) {
            return {
                content: 'No significant changes found in the selected commits.',
                commits: filteredCommits,
                sections: [],
                metadata: {
                    aiGenerated: false,
                    totalCommits: commits.length,
                    processedCommits: 0
                }
            };
        }

        // Choose generation method
        if (options.useAI && options.aiApiKey) {
            console.log('Generating AI-enhanced changelog');
            return this.generateAIEnhancedChangelog(filteredCommits, options);
        } else {
            console.log('Generating traditional formatted changelog');
            return this.generateTraditionalChangelog(filteredCommits, options);
        }
    }

    /**
     * Generate AI-enhanced changelog
     */
    private async generateAIEnhancedChangelog(
        commits: GitHubCommit[],
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        try {
            const aiOptions: AIChangelogOptions = {
                apiKey: options.aiApiKey!,
                style: options.aiOptions?.style || 'professional',
                audience: options.aiOptions?.audience || 'mixed',
                includeImpact: options.aiOptions?.includeImpact ?? true,
                includeTechnicalDetails: options.aiOptions?.includeTechnicalDetails ?? false,
                groupSimilarChanges: options.aiOptions?.groupSimilarChanges ?? true,
                prioritizeByImportance: options.aiOptions?.prioritizeByImportance ?? true,
                temperature: options.aiOptions?.temperature || 0.7,
                model: options.aiOptions?.model || 'copilot-zero'
            };

            const aiGenerator = createAIChangelogGenerator(aiOptions);
            const aiResult: AIGeneratedChangelog = await aiGenerator.generateChangelog(commits);

            // Convert AI sections to our format
            const sections: ChangelogSection[] = aiResult.sections.map(aiSection => ({
                title: aiSection.title,
                type: this.inferTypeFromTitle(aiSection.title),
                commits: this.getCommitsForSection(aiSection, commits),
                emoji: aiSection.emoji,
                description: aiSection.description,
                entries: aiSection.entries
            }));

            // Generate markdown content from AI result
            const content = this.generateAIMarkdownContent(aiResult, options);

            // Try to infer version
            const version = await this.inferVersion(commits, options.repositoryUrl, aiResult.version);

            return {
                content,
                version,
                commits,
                sections,
                metadata: {
                    aiGenerated: true,
                    style: aiOptions.style,
                    audience: aiOptions.audience,
                    totalCommits: aiResult.metadata.totalCommits,
                    processedCommits: aiResult.metadata.processedCommits
                }
            };

        } catch (error) {
            console.error('AI changelog generation failed, falling back to traditional:', error);
            return this.generateTraditionalChangelog(commits, options);
        }
    }

    /**
     * Generate traditional formatted changelog
     */
    private generateTraditionalChangelog(
        commits: GitHubCommit[],
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        // Create sections using existing logic
        const sections = this.createTraditionalSections(commits, options);

        // Generate content
        const content = this.generateTraditionalMarkdownContent(sections, options);

        return Promise.resolve({
            content,
            commits,
            sections,
            metadata: {
                aiGenerated: false,
                totalCommits: commits.length,
                processedCommits: commits.length
            }
        });
    }

    /**
     * Create traditional sections from commits
     */
    private createTraditionalSections(
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
     * Generate markdown content from AI result
     */
    private generateAIMarkdownContent(
        aiResult: AIGeneratedChangelog,
        options: ChangelogGenerationOptions
    ): string {
        let content = '';

        // Add summary if available
        if (aiResult.summary) {
            content += `${aiResult.summary}\n\n`;
        }

        // Add sections
        aiResult.sections.forEach(section => {
            if (section.entries.length === 0) return;

            // Section header
            content += `## ${section.emoji ? section.emoji + ' ' : ''}${section.title}\n\n`;

            // Section description if available
            if (section.description) {
                content += `${section.description}\n\n`;
            }

            // Section entries
            section.entries.forEach(entry => {
                content += `- **${entry.title}**: ${entry.description}`;

                // Add impact if available and enabled
                if (entry.impact && options.aiOptions?.includeImpact) {
                    content += ` *${entry.impact}*`;
                }

                // Add technical note if available and enabled
                if (entry.technicalNote && options.aiOptions?.includeTechnicalDetails) {
                    content += ` (${entry.technicalNote})`;
                }

                // Add commit links if enabled
                if (options.includeCommitLinks && entry.commitShas.length > 0) {
                    const commitLinks = entry.commitShas.map(sha => {
                        const shortSha = sha.substring(0, 7);
                        const commitUrl = `${options.repositoryUrl}/commit/${sha}`;
                        return `[${shortSha}](${commitUrl})`;
                    }).join(', ');
                    content += ` (${commitLinks})`;
                }

                content += '\n';
            });

            content += '\n';
        });

        return content.trim();
    }

    /**
     * Generate traditional markdown content
     */
    private generateTraditionalMarkdownContent(
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
     * Format a single commit line for traditional changelog
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
            const commitUrl = commit.url || `${options.repositoryUrl}/commit/${commit.sha}`;
            line += ` ([${shortSha}](${commitUrl}))`;
        }

        return line;
    }

    /**
     * Helper function to get commits for an AI section
     */
    private getCommitsForSection(aiSection: AIChangelogSection, allCommits: GitHubCommit[]): GitHubCommit[] {
        const sectionShas = new Set(
            aiSection.entries.flatMap(entry => entry.commitShas)
        );

        return allCommits.filter(commit =>
            sectionShas.has(commit.sha) ||
            sectionShas.has(commit.sha.substring(0, 7))
        );
    }

    /**
     * Infer section type from title
     */
    private inferTypeFromTitle(title: string): string {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('feature') || titleLower.includes('new')) return 'feat';
        if (titleLower.includes('fix') || titleLower.includes('bug')) return 'fix';
        if (titleLower.includes('break')) return 'breaking';
        if (titleLower.includes('performance') || titleLower.includes('perf')) return 'perf';
        if (titleLower.includes('docs') || titleLower.includes('documentation')) return 'docs';
        if (titleLower.includes('style')) return 'style';
        if (titleLower.includes('refactor')) return 'refactor';
        if (titleLower.includes('test')) return 'test';
        if (titleLower.includes('chore') || titleLower.includes('maintenance')) return 'chore';

        return 'other';
    }

    /**
     * Try to infer version from commits or recent tags
     */
    private async inferVersion(
        commits: GitHubCommit[],
        repositoryUrl: string,
        aiSuggestedVersion?: string
    ): Promise<string | undefined> {
        try {
            // First, check if AI suggested a version type
            if (aiSuggestedVersion) {
                const latestTag = await this.getLatestVersion(repositoryUrl);
                if (latestTag) {
                    return this.incrementVersion(latestTag, aiSuggestedVersion);
                }
            }

            // Check if any commit messages contain version info
            for (const commit of commits) {
                const message = commit.message || '';
                const versionMatch = message.match(/v?(\d+\.\d+\.\d+)/);
                if (versionMatch) {
                    return versionMatch[1];
                }
            }

            // Try to get the latest tag and increment
            const latestTag = await this.getLatestVersion(repositoryUrl);
            if (latestTag) {
                // Analyze commits to determine version increment
                const hasBreaking = commits.some(c =>
                    parseConventionalCommit(c.message)?.breaking ||
                    c.message?.includes('BREAKING')
                );
                const hasFeatures = commits.some(c => {
                    const parsed = parseConventionalCommit(c.message);
                    return parsed?.type === 'feat' || parsed?.type === 'feature';
                });

                if (hasBreaking) {
                    return this.incrementVersion(latestTag, 'major');
                } else if (hasFeatures) {
                    return this.incrementVersion(latestTag, 'minor');
                } else {
                    return this.incrementVersion(latestTag, 'patch');
                }
            }

            return undefined;
        } catch (error) {
            console.error('Version inference failed:', error);
            return undefined;
        }
    }

    /**
     * Get latest version from repository tags
     */
    private async getLatestVersion(repositoryUrl: string): Promise<string | null> {
        try {
            const tags = await this.client.getTags(repositoryUrl, { per_page: 10 });

            // Find the latest semantic version tag
            const versionTags = tags
                .map(tag => ({
                    name: tag.name,
                    version: tag.name.replace(/^v/, ''),
                    parts: tag.name.replace(/^v/, '').split('.').map(Number)
                }))
                .filter(tag =>
                    tag.parts.length === 3 &&
                    tag.parts.every(part => !isNaN(part))
                )
                .sort((a, b) => {
                    // Sort by semantic version
                    for (let i = 0; i < 3; i++) {
                        if (a.parts[i] !== b.parts[i]) {
                            return b.parts[i] - a.parts[i]; // Descending order
                        }
                    }
                    return 0;
                });

            return versionTags.length > 0 ? versionTags[0].version : null;
        } catch (error) {
            console.error('Failed to fetch latest version:', error);
            return null;
        }
    }

    /**
     * Increment version based on type
     */
    private incrementVersion(version: string, incrementType: string): string {
        const parts = version.split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            return version; // Return original if not valid semver
        }

        let [major, minor, patch] = parts;

        switch (incrementType) {
            case 'major':
                major++;
                minor = 0;
                patch = 0;
                break;
            case 'minor':
                minor++;
                patch = 0;
                break;
            case 'patch':
                patch++;
                break;
            default:
                patch++; // Default to patch increment
                break;
        }

        return `${major}.${minor}.${patch}`;
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
            throw error;
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
            throw error;
        }
    }
}

/**
 * Factory function to create enhanced changelog generator
 */
export function createGitHubChangelogGenerator(client: GitHubClient): GitHubChangelogGenerator {
    return new GitHubChangelogGenerator(client);
}