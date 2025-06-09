import { createSectonClient, SectonClient } from '@/lib/utils/ai/secton';
import { GitHubCommit, ConventionalCommit, parseConventionalCommit } from './client';

export interface AIChangelogOptions {
    apiKey: string;
    model?: string;
    temperature?: number;
    style?: 'professional' | 'casual' | 'technical' | 'marketing';
    audience?: 'developers' | 'users' | 'stakeholders' | 'mixed';
    includeImpact?: boolean;
    includeTechnicalDetails?: boolean;
    groupSimilarChanges?: boolean;
    prioritizeByImportance?: boolean;
}

export interface AIProcessedCommit {
    originalCommit: GitHubCommit;
    parsedCommit: ConventionalCommit | null;
    importance: number; // 1-10 scale
    category: string;
    userFacingImpact: string;
    technicalDetails: string;
    suggestedGrouping: string;
}

export interface AIChangelogSection {
    title: string;
    emoji?: string;
    description?: string;
    entries: Array<{
        title: string;
        description: string;
        impact?: string;
        technicalNote?: string;
        commitShas: string[];
        importance: number;
    }>;
    importance: number;
}

export interface AIGeneratedChangelog {
    summary: string;
    version?: string;
    sections: AIChangelogSection[];
    metadata: {
        totalCommits: number;
        processedCommits: number;
        aiModel: string;
        generatedAt: string;
        style: string;
        audience: string;
    };
}

// Type for AI analysis response
interface AICommitAnalysis {
    sha: string;
    importance: number;
    category: string;
    userFacingImpact: string;
    technicalDetails: string;
    suggestedGrouping: string;
}

// Type for commit data sent to AI
interface CommitDataForAI {
    sha: string;
    message: string;
    author: string;
    date: string;
}

// Type for commit summaries used in AI prompts
interface CommitSummary {
    sha: string;
    impact: string;
    technical: string;
    importance: number;
}

// Type for AI section response
interface AISectionResponse {
    title: string;
    emoji?: string;
    description?: string;
    entries: Array<{
        title: string;
        description: string;
        impact?: string;
        technicalNote?: string;
        commitShas: string[];
        importance: number;
    }>;
}

// Type for sub-grouping response
interface AISubGroupResponse {
    [subGroupName: string]: string[];
}

// Type for section summaries used in summary generation
interface SectionSummary {
    title: string;
    entryCount: number;
    topChanges: string[];
}

export class AIChangelogGenerator {
    private aiClient: SectonClient;
    private options: Required<AIChangelogOptions>;

    constructor(options: AIChangelogOptions) {
        this.options = {
            model: options.model || 'copilot-zero',
            temperature: options.temperature ?? 0.7,
            style: options.style || 'professional',
            audience: options.audience || 'mixed',
            includeImpact: options.includeImpact ?? true,
            includeTechnicalDetails: options.includeTechnicalDetails ?? false,
            groupSimilarChanges: options.groupSimilarChanges ?? true,
            prioritizeByImportance: options.prioritizeByImportance ?? true,
            apiKey: options.apiKey
        };

        this.aiClient = createSectonClient({
            apiKey: options.apiKey,
            defaultModel: this.options.model
        });
    }

    /**
     * Generate AI-enhanced changelog from commits
     */
    async generateChangelog(commits: GitHubCommit[]): Promise<AIGeneratedChangelog> {
        console.log(`Starting AI changelog generation for ${commits.length} commits`);

        // Step 1: Analyze and categorize commits
        const processedCommits = await this.analyzeCommits(commits);
        console.log(`Processed ${processedCommits.length} commits with AI analysis`);

        // Step 2: Group similar changes
        const groupedCommits = this.options.groupSimilarChanges
            ? await this.groupSimilarCommits(processedCommits)
            : this.basicGroupCommits(processedCommits);

        // Step 3: Generate sections with AI enhancement
        const sections = await this.generateSections(groupedCommits);

        // Step 4: Generate overall summary
        const summary = await this.generateSummary(sections, commits);

        // Step 5: Suggest version if possible
        const version = await this.suggestVersion(commits, sections);

        return {
            summary,
            version,
            sections: this.options.prioritizeByImportance
                ? sections.sort((a, b) => b.importance - a.importance)
                : sections,
            metadata: {
                totalCommits: commits.length,
                processedCommits: processedCommits.length,
                aiModel: this.options.model,
                generatedAt: new Date().toISOString(),
                style: this.options.style,
                audience: this.options.audience
            }
        };
    }

    /**
     * Analyze commits using AI to extract meaningful information
     */
    private async analyzeCommits(commits: GitHubCommit[]): Promise<AIProcessedCommit[]> {
        console.log('Analyzing commits with AI...');
        const processed: AIProcessedCommit[] = [];

        // Process in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < commits.length; i += batchSize) {
            const batch = commits.slice(i, i + batchSize);
            const batchResults = await this.processBatch(batch);
            processed.push(...batchResults);
        }

        return processed;
    }

    /**
     * Process a batch of commits
     */
    private async processBatch(commits: GitHubCommit[]): Promise<AIProcessedCommit[]> {
        const commitData: CommitDataForAI[] = commits.map(commit => ({
            sha: commit.sha.substring(0, 7),
            message: commit.message || 'No message',
            author: commit.author?.name || 'Unknown',
            date: commit.author?.date || new Date().toISOString()
        }));

        const prompt = `Analyze these git commits and extract meaningful information for a changelog:

${JSON.stringify(commitData, null, 2)}

For each commit, provide:
1. importance (1-10 scale, 10 being most important to users)
2. category (feature, bugfix, improvement, security, breaking, maintenance, docs, other)
3. userFacingImpact (1-2 sentences describing what users will notice)
4. technicalDetails (brief technical summary for developers)
5. suggestedGrouping (a short phrase to group similar changes)

Audience: ${this.options.audience}
Style: ${this.options.style}

Return JSON array with this structure:
[{
  "sha": "abc1234",
  "importance": 8,
  "category": "feature",
  "userFacingImpact": "Users can now...",
  "technicalDetails": "Implemented...",
  "suggestedGrouping": "authentication"
}]

Focus on user value and clear communication. Be concise but informative.`;

        try {
            const response = await this.aiClient.generateText(prompt, {
                temperature: this.options.temperature,
                max_tokens: 2000
            });

            // Parse AI response
            const analysisResults = this.parseAIResponse(response);

            // Map back to processed commits
            return commits.map((commit, index) => {
                const analysis = analysisResults[index] || this.getDefaultAnalysis(commit);

                return {
                    originalCommit: commit,
                    parsedCommit: parseConventionalCommit(commit.message),
                    importance: analysis.importance || 5,
                    category: analysis.category || 'other',
                    userFacingImpact: analysis.userFacingImpact || this.extractBasicImpact(commit),
                    technicalDetails: analysis.technicalDetails || (commit.message || 'No details'),
                    suggestedGrouping: analysis.suggestedGrouping || analysis.category || 'other'
                };
            });

        } catch (error) {
            console.error('AI analysis failed, falling back to basic analysis:', error);
            return commits.map(commit => this.getDefaultAnalysis(commit));
        }
    }

    /**
     * Parse AI response safely
     */
    private parseAIResponse(response: string): AICommitAnalysis[] {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return Array.isArray(parsed) ? parsed : [];
            }

            // If no JSON array found, try to parse the whole response
            const parsed = JSON.parse(response);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return [];
        }
    }

    /**
     * Get default analysis when AI fails
     */
    private getDefaultAnalysis(commit: GitHubCommit): AIProcessedCommit {
        const parsed = parseConventionalCommit(commit.message);
        const category = parsed?.type || 'other';

        let importance = 5;
        if (parsed?.breaking) importance = 9;
        else if (category === 'feat') importance = 7;
        else if (category === 'fix') importance = 6;
        else if (category === 'docs') importance = 3;

        return {
            originalCommit: commit,
            parsedCommit: parsed,
            importance,
            category: this.mapConventionalToCategory(category),
            userFacingImpact: this.extractBasicImpact(commit),
            technicalDetails: commit.message || 'No details',
            suggestedGrouping: category
        };
    }

    /**
     * Extract basic impact from commit message
     */
    private extractBasicImpact(commit: GitHubCommit): string {
        const message = commit.message || 'No message';
        const firstLine = message.split('\n')[0];

        // Remove conventional commit prefix if present
        const cleanMessage = firstLine.replace(/^(\w+)(\([^)]+\))?!?:\s*/, '');

        return cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    }

    /**
     * Map conventional commit types to our categories
     */
    private mapConventionalToCategory(type: string): string {
        const mapping: Record<string, string> = {
            'feat': 'feature',
            'feature': 'feature',
            'fix': 'bugfix',
            'docs': 'docs',
            'style': 'maintenance',
            'refactor': 'improvement',
            'perf': 'improvement',
            'test': 'maintenance',
            'chore': 'maintenance',
            'ci': 'maintenance',
            'build': 'maintenance'
        };

        return mapping[type] || 'other';
    }

    /**
     * Group similar commits using AI
     */
    private async groupSimilarCommits(commits: AIProcessedCommit[]): Promise<Record<string, AIProcessedCommit[]>> {
        // Group by suggested grouping first
        const initialGroups: Record<string, AIProcessedCommit[]> = {};

        commits.forEach(commit => {
            const group = commit.suggestedGrouping || 'other';
            if (!initialGroups[group]) {
                initialGroups[group] = [];
            }
            initialGroups[group].push(commit);
        });

        // Use AI to refine groupings for large groups
        const refinedGroups: Record<string, AIProcessedCommit[]> = {};

        for (const [groupName, groupCommits] of Object.entries(initialGroups)) {
            if (groupCommits.length > 5) {
                // For large groups, ask AI to create sub-groups
                const subGroups = await this.refineGrouping(groupName, groupCommits);
                Object.assign(refinedGroups, subGroups);
            } else {
                refinedGroups[groupName] = groupCommits;
            }
        }

        return refinedGroups;
    }

    /**
     * Basic grouping without AI refinement
     */
    private basicGroupCommits(commits: AIProcessedCommit[]): Record<string, AIProcessedCommit[]> {
        const groups: Record<string, AIProcessedCommit[]> = {};

        commits.forEach(commit => {
            const group = commit.category;
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(commit);
        });

        return groups;
    }

    /**
     * Refine grouping for large groups using AI
     */
    private async refineGrouping(
        groupName: string,
        commits: AIProcessedCommit[]
    ): Promise<Record<string, AIProcessedCommit[]>> {
        try {
            const commitSummaries: CommitSummary[] = commits.map(c => ({
                sha: c.originalCommit.sha.substring(0, 7),
                impact: c.userFacingImpact,
                technical: c.technicalDetails,
                importance: c.importance
            }));

            const prompt = `These commits are all related to "${groupName}". Create meaningful sub-groups:

${JSON.stringify(commitSummaries, null, 2)}

Return JSON object where keys are sub-group names and values are arrays of commit SHAs:
{
  "subgroup1": ["abc1234", "def5678"],
  "subgroup2": ["ghi9012"]
}

Create 2-4 logical sub-groups with clear, descriptive names.`;

            const response = await this.aiClient.generateText(prompt, {
                temperature: 0.3,
                max_tokens: 500
            });

            const subGroups: AISubGroupResponse = JSON.parse(response);
            const result: Record<string, AIProcessedCommit[]> = {};

            // Map SHAs back to commits
            Object.entries(subGroups).forEach(([subGroupName, shas]) => {
                const groupCommits = commits.filter(c =>
                    shas.includes(c.originalCommit.sha.substring(0, 7))
                );
                if (groupCommits.length > 0) {
                    result[`${groupName}: ${subGroupName}`] = groupCommits;
                }
            });

            // Add any unmapped commits to a general group
            const mappedShas = new Set(Object.values(subGroups).flat());
            const unmappedCommits = commits.filter(c =>
                !mappedShas.has(c.originalCommit.sha.substring(0, 7))
            );
            if (unmappedCommits.length > 0) {
                result[groupName] = unmappedCommits;
            }

            return result;

        } catch (error) {
            console.error('Failed to refine grouping:', error);
            return { [groupName]: commits };
        }
    }

    /**
     * Generate sections with AI enhancement
     */
    private async generateSections(
        groupedCommits: Record<string, AIProcessedCommit[]>
    ): Promise<AIChangelogSection[]> {
        const sections: AIChangelogSection[] = [];

        for (const [groupName, commits] of Object.entries(groupedCommits)) {
            if (commits.length === 0) continue;

            const section = await this.generateSection(groupName, commits);
            sections.push(section);
        }

        return sections;
    }

    /**
     * Generate a single section with AI
     */
    private async generateSection(
        groupName: string,
        commits: AIProcessedCommit[]
    ): Promise<AIChangelogSection> {
        try {
            const commitData: CommitSummary[] = commits.map(c => ({
                impact: c.userFacingImpact,
                technical: c.technicalDetails,
                importance: c.importance,
                sha: c.originalCommit.sha.substring(0, 7)
            }));

            const prompt = `Create a changelog section for "${groupName}" with these changes:

${JSON.stringify(commitData, null, 2)}

Audience: ${this.options.audience}
Style: ${this.options.style}
Include impact: ${this.options.includeImpact}
Include technical details: ${this.options.includeTechnicalDetails}

Return JSON:
{
  "title": "Section Title",
  "emoji": "🚀",
  "description": "Brief section description",
  "entries": [
    {
      "title": "Change title",
      "description": "What users will notice",
      "impact": "Why this matters",
      "technicalNote": "Technical details",
      "commitShas": ["abc1234"],
      "importance": 8
    }
  ]
}

Group similar changes into single entries. Use clear, ${this.options.style} language for ${this.options.audience}.`;

            const response = await this.aiClient.generateText(prompt, {
                temperature: this.options.temperature,
                max_tokens: 1500
            });

            const sectionData: AISectionResponse = JSON.parse(response);

            return {
                title: sectionData.title || this.capitalizeGroupName(groupName),
                emoji: sectionData.emoji || this.getEmojiForGroup(groupName),
                description: sectionData.description,
                entries: sectionData.entries || [],
                importance: Math.max(...commits.map(c => c.importance))
            };

        } catch (error) {
            console.error('Failed to generate section with AI:', error);
            return this.generateBasicSection(groupName, commits);
        }
    }

    /**
     * Generate basic section without AI
     */
    private generateBasicSection(
        groupName: string,
        commits: AIProcessedCommit[]
    ): AIChangelogSection {
        const entries = commits.map(commit => ({
            title: commit.userFacingImpact,
            description: commit.technicalDetails,
            commitShas: [commit.originalCommit.sha],
            importance: commit.importance
        }));

        return {
            title: this.capitalizeGroupName(groupName),
            emoji: this.getEmojiForGroup(groupName),
            entries,
            importance: Math.max(...commits.map(c => c.importance))
        };
    }

    /**
     * Generate overall summary
     */
    private async generateSummary(
        sections: AIChangelogSection[],
        originalCommits: GitHubCommit[]
    ): Promise<string> {
        try {
            const sectionSummaries: SectionSummary[] = sections.map(s => ({
                title: s.title,
                entryCount: s.entries.length,
                topChanges: s.entries
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, 3)
                    .map(e => e.title)
            }));

            const prompt = `Create a brief, engaging summary for this changelog:

Sections: ${JSON.stringify(sectionSummaries, null, 2)}
Total commits: ${originalCommits.length}
Audience: ${this.options.audience}
Style: ${this.options.style}

Write 2-3 sentences highlighting the most important changes and overall theme of this release. Be ${this.options.style} and speak to ${this.options.audience}.`;

            const summary = await this.aiClient.generateText(prompt, {
                temperature: this.options.temperature,
                max_tokens: 200
            });

            return summary.trim();

        } catch (error) {
            console.error('Failed to generate summary:', error);
            return this.generateBasicSummary(sections, originalCommits);
        }
    }

    /**
     * Generate basic summary without AI
     */
    private generateBasicSummary(
        sections: AIChangelogSection[],
        originalCommits: GitHubCommit[]
    ): string {
        const totalEntries = sections.reduce((sum, s) => sum + s.entries.length, 0);
        const mainSections = sections.filter(s => s.entries.length > 0);

        return `This release includes ${totalEntries} changes across ${mainSections.length} areas, based on ${originalCommits.length} commits.`;
    }

    /**
     * Suggest version based on changes
     */
    private async suggestVersion(
        commits: GitHubCommit[],
        sections: AIChangelogSection[]
    ): Promise<string | undefined> {
        try {
            const hasBreaking = commits.some(c =>
                parseConventionalCommit(c.message)?.breaking ||
                c.message?.includes('BREAKING')
            );

            const hasFeatures = sections.some(s =>
                s.title.toLowerCase().includes('feature') ||
                s.title.toLowerCase().includes('new')
            );

            const hasFixes = sections.some(s =>
                s.title.toLowerCase().includes('fix') ||
                s.title.toLowerCase().includes('bug')
            );

            if (hasBreaking) {
                return 'major'; // Will be resolved to actual version later
            } else if (hasFeatures) {
                return 'minor';
            } else if (hasFixes) {
                return 'patch';
            }

            return undefined;
        } catch (error) {
            console.error('Failed to suggest version:', error);
            return undefined;
        }
    }

    /**
     * Utility functions
     */
    private capitalizeGroupName(name: string): string {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private getEmojiForGroup(groupName: string): string {
        const name = groupName.toLowerCase();

        if (name.includes('feature') || name.includes('new')) return '🚀';
        if (name.includes('fix') || name.includes('bug')) return '🐛';
        if (name.includes('security')) return '🔒';
        if (name.includes('performance') || name.includes('perf')) return '⚡';
        if (name.includes('docs') || name.includes('documentation')) return '📚';
        if (name.includes('style') || name.includes('ui')) return '💅';
        if (name.includes('refactor')) return '♻️';
        if (name.includes('test')) return '🧪';
        if (name.includes('maintenance') || name.includes('chore')) return '🔧';
        if (name.includes('breaking')) return '💥';

        return '📝';
    }
}

/**
 * Factory function to create AI changelog generator
 */
export function createAIChangelogGenerator(options: AIChangelogOptions): AIChangelogGenerator {
    return new AIChangelogGenerator(options);
}