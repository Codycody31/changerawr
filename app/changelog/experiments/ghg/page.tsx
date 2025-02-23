'use client'

import React, { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from 'lucide-react';

interface Release {
    tag_name: string;
    name: string;
    target_commitish: string;
}

interface CommitInfo {
    message: string;
    author: string;
    date: string;
    type: string;
    scope?: string;
    breaking: boolean;
    originalMessage: string;
}

// Commit analysis configuration
const COMMIT_PATTERNS = {
    breaking: [
        /!$/,
        /BREAKING CHANGE:/i,
        /BREAKING-CHANGE:/i,
        /breaking:/i,
        /💥/,
    ],

    // Extended keyword patterns for better categorization
    feat: {
        keywords: [
            /^feat(\([^)]*\))?:/i,
            /add(?:ed|ing)?\s+(?:new|feature)/i,
            /implement(?:ed|ing)?/i,
            /🚀|✨|🆕/,
        ],
        score: 3
    },

    fix: {
        keywords: [
            /^fix(\([^)]*\))?:/i,
            /fix(?:ed|ing)?/i,
            /patch(?:ed|ing)?/i,
            /resolv(?:ed|ing)?/i,
            /bug|issue|problem|error/i,
            /🐛|🩹|🔧/,
        ],
        score: 3
    },

    perf: {
        keywords: [
            /^perf(\([^)]*\))?:/i,
            /performance/i,
            /optimize|optimizing|optimized/i,
            /speed up|faster/i,
            /⚡️|🚀/,
        ],
        score: 2
    },

    refactor: {
        keywords: [
            /^refactor(\([^)]*\))?:/i,
            /refactor(?:ed|ing)?/i,
            /restructur(?:ed|ing)?/i,
            /reorganiz(?:ed|ing)?/i,
            /cleanup|clean up/i,
            /♻️|🔨/,
        ],
        score: 2
    },

    docs: {
        keywords: [
            /^docs(\([^)]*\))?:/i,
            /document(?:ed|ing|ation)?/i,
            /readme/i,
            /📚|📝/,
        ],
        score: 1
    },

    style: {
        keywords: [
            /^style(\([^)]*\))?:/i,
            /style|css|sass|less/i,
            /visual|layout|ui|ux/i,
            /💅|🎨/,
        ],
        score: 1
    },

    test: {
        keywords: [
            /^test(\([^)]*\))?:/i,
            /test(?:ed|ing)?/i,
            /spec|coverage/i,
            /🧪|✅/,
        ],
        score: 1
    },

    chore: {
        keywords: [
            /^chore(\([^)]*\))?:/i,
            /maintain|maintenance/i,
            /deps|dependencies/i,
            /package\.json/i,
            /🔧|⚙️/,
        ],
        score: 1
    },

    ci: {
        keywords: [
            /^ci(\([^)]*\))?:/i,
            /circle|travis|github actions/i,
            /pipeline|workflow/i,
            /👷|⚙️/,
        ],
        score: 1
    }
};

const analyzeCommit = (message: string): CommitInfo => {
    // Initialize scoring object
    const scores: Record<string, number> = {};
    let breaking = false;
    let scope: string | undefined;

    // Check for breaking changes
    breaking = COMMIT_PATTERNS.breaking.some(pattern => pattern.test(message));

    // Extract conventional commit scope if present
    const scopeMatch = message.match(/^[a-z]+\(([^)]+)\):/i);
    if (scopeMatch) {
        scope = scopeMatch[1];
    }

    // Score each type based on keyword matches
    Object.entries(COMMIT_PATTERNS).forEach(([type, patterns]) => {
        if (type === 'breaking') return; // Skip breaking patterns as they're handled separately

        const typePatterns = patterns as { keywords: RegExp[]; score: number };
        scores[type] = 0;

        typePatterns.keywords.forEach(pattern => {
            if (pattern.test(message)) {
                scores[type] += typePatterns.score;
            }
        });
    });

    // Get the type with the highest score
    let maxScore = 0;
    let commitType = 'other';

    Object.entries(scores).forEach(([type, score]) => {
        if (score > maxScore) {
            maxScore = score;
            commitType = type;
        }
    });

    // Clean up the commit message
    let cleanMessage = message;

    // Remove conventional commit prefix if present
    const conventionalMatch = message.match(/^[a-z]+(\([^)]+\))?:\s*/i);
    if (conventionalMatch) {
        cleanMessage = message.substring(conventionalMatch[0].length);
    }

    // Remove emoji prefixes
    cleanMessage = cleanMessage.replace(/^\s*[^\u0000-\u007F]+\s*/, '');

    // Take only the first line and trim
    cleanMessage = cleanMessage.split('\n')[0].trim();

    // Capitalize first letter
    cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

    return {
        message: cleanMessage,
        type: commitType,
        scope,
        breaking,
        originalMessage: message,
        author: '', // Will be filled later
        date: '', // Will be filled later
    };
};

const ChangelogGenerator = () => {
    const [repo, setRepo] = useState('');
    const [token, setToken] = useState('');
    const [releases, setReleases] = useState<Release[]>([]);
    const [filteredReleases, setFilteredReleases] = useState<Release[]>([]);
    const [selectedRelease, setSelectedRelease] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingReleases, setFetchingReleases] = useState(false);
    const [error, setError] = useState('');
    const [changelog, setChangelog] = useState('');

    useEffect(() => {
        const fetchReleases = async () => {
            if (!repo || !token) return;

            try {
                const [owner, repoName] = repo.split('/');
                const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repoName}/releases?per_page=10`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github.v3+json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch releases');
                }

                const releasesData: Release[] = await response.json();
                setReleases(releasesData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch releases');
            }
        };

        fetchReleases();
    }, [repo, token]);

    const debouncedSearch = useDebouncedCallback(
        async (owner: string, repoName: string, searchTerm: string) => {
            if (!owner || !repoName || !token) return;

            setFetchingReleases(true);
            try {
                const endpoint = searchTerm
                    ? `https://api.github.com/repos/${owner}/${repoName}/releases?per_page=100`
                    : `https://api.github.com/repos/${owner}/${repoName}/releases?per_page=10`;

                const response = await fetch(endpoint, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch releases');
                }

                const releasesData: Release[] = await response.json();
                setReleases(releasesData);

                if (searchTerm) {
                    const filtered = releasesData.filter(release =>
                        (release.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        release.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setFilteredReleases(filtered);
                } else {
                    setFilteredReleases(releasesData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch releases');
            } finally {
                setFetchingReleases(false);
            }
        },
        500 // 500ms delay
    );

    useEffect(() => {
        if (repo) {
            const [owner, repoName] = repo.split('/');
            if (owner && repoName) {
                debouncedSearch(owner, repoName, searchTerm);
            }
        }
    }, [repo, token, searchTerm]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
    };

    const generateChangelog = async () => {
        setLoading(true);
        setError('');

        try {
            const [owner, repoName] = repo.split('/');
            const currentReleaseIndex = releases.findIndex(r => r.tag_name === selectedRelease);
            if (currentReleaseIndex === -1) throw new Error('Release not found');

            const currentRelease = releases[currentReleaseIndex];
            const previousRelease = releases[currentReleaseIndex + 1];

            const compareUrl = previousRelease
                ? `https://api.github.com/repos/${owner}/${repoName}/compare/${previousRelease.tag_name}...${currentRelease.tag_name}`
                : `https://api.github.com/repos/${owner}/${repoName}/commits?sha=${currentRelease.target_commitish}`;

            const commitsResponse = await fetch(compareUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });

            if (!commitsResponse.ok) {
                throw new Error('Failed to fetch commits');
            }

            const compareData = await commitsResponse.json();
            const commits = previousRelease ? compareData.commits : compareData;

            // Analyze and group commits
            const groupedCommits: Record<string, CommitInfo[]> = {};
            const breakingChanges: CommitInfo[] = [];

            commits.forEach((commit: { commit: { message: string; author: { name: string; date: string | number | Date; }; }; }) => {
                const analysis = analyzeCommit(commit.commit.message);
                analysis.author = commit.commit.author.name;
                analysis.date = new Date(commit.commit.author.date).toLocaleDateString();

                if (analysis.breaking) {
                    breakingChanges.push(analysis);
                }

                if (!groupedCommits[analysis.type]) {
                    groupedCommits[analysis.type] = [];
                }
                groupedCommits[analysis.type].push(analysis);
            });

            // Format changelog
            const typeOrder = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'chore', 'ci', 'other'];
            let formattedChangelog = `# ${currentRelease.name || currentRelease.tag_name}\n\n`;

            if (previousRelease) {
                formattedChangelog += `Changes between ${previousRelease.tag_name} and ${currentRelease.tag_name}\n\n`;
            }

            // Add breaking changes section if any
            if (breakingChanges.length > 0) {
                formattedChangelog += `## 💥 Breaking Changes\n\n`;
                breakingChanges.forEach(commit => {
                    formattedChangelog += `- ${commit.message}${commit.scope ? ` (${commit.scope})` : ''} (${commit.author} - ${commit.date})\n`;
                });
                formattedChangelog += '\n';
            }

            // Add other changes by type
            typeOrder.forEach(type => {
                if (groupedCommits[type]?.length) {
                    const typeTitle = {
                        feat: '🚀 New Features',
                        fix: '🐛 Bug Fixes',
                        perf: '⚡️ Performance Improvements',
                        docs: '📚 Documentation',
                        style: '💅 Styling',
                        refactor: '♻️ Refactoring',
                        test: '🧪 Testing',
                        chore: '🔧 Maintenance',
                        ci: '👷 CI/CD',
                        other: '📦 Other Changes'
                    }[type];

                    formattedChangelog += `## ${typeTitle}\n\n`;
                    groupedCommits[type].forEach(commit => {
                        formattedChangelog += `- ${commit.message}${commit.scope ? ` (${commit.scope})` : ''} (${commit.author} - ${commit.date})\n`;
                    });
                    formattedChangelog += '\n';
                }
            });

            setChangelog(formattedChangelog);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>GitHub Changelog Generator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Input
                            placeholder="owner/repo (e.g., facebook/react)"
                            value={repo}
                            onChange={(e) => setRepo(e.target.value)}
                        />
                    </div>
                    <div>
                        <Input
                            type="password"
                            placeholder="GitHub Token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                    </div>

                    {releases.length > 0 && (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search releases..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {fetchingReleases ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            ) : (
                                <Select
                                    value={selectedRelease}
                                    onValueChange={setSelectedRelease}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a release" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredReleases.map((release) => (
                                            <SelectItem key={release.tag_name} value={release.tag_name}>
                                                {release.name || release.tag_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {filteredReleases.length === 0 && searchTerm && !fetchingReleases && (
                                <Alert>
                                    <AlertDescription>
                                        No releases found matching &ldquo;{searchTerm}&rdquo;
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={generateChangelog}
                        disabled={loading || !repo || !token || !selectedRelease}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Changelog
                            </>
                        ) : (
                            'Generate Changelog'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {changelog && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Changelog</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap break-words">{changelog}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


export default ChangelogGenerator;