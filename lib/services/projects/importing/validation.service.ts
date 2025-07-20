// lib/services/projects/importing/validation.service.ts

import {
    ParsedChangelogEntry,
    ValidatedEntry,
    ValidationError,
    ImportPreview,
    ImportOptions
} from '@/lib/types/projects/importing';

export class ImportValidationService {
    private static readonly MAX_TITLE_LENGTH = 200;
    private static readonly MAX_CONTENT_LENGTH = 50000;
    private static readonly VERSION_REGEX = /^v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

    /**
     * Validate a single changelog entry
     */
    static validateEntry(entry: ParsedChangelogEntry): ValidatedEntry {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const suggestedFixes: Record<string, unknown> = {};

        // Validate title
        if (!entry.title || !entry.title.trim()) {
            errors.push({
                type: 'missing_title',
                message: 'Entry title is required',
                field: 'title',
                severity: 'error'
            });
        } else if (entry.title.length > this.MAX_TITLE_LENGTH) {
            warnings.push({
                type: 'content_too_long',
                message: `Title is too long (${entry.title.length} chars, max ${this.MAX_TITLE_LENGTH})`,
                field: 'title',
                value: entry.title,
                severity: 'warning'
            });
            suggestedFixes.title = entry.title.substring(0, this.MAX_TITLE_LENGTH - 3) + '...';
        }

        // Validate content
        if (!entry.content || !entry.content.trim()) {
            warnings.push({
                type: 'missing_content',
                message: 'Entry content is empty',
                field: 'content',
                severity: 'warning'
            });
            suggestedFixes.content = entry.title; // Use title as content if missing
        } else if (entry.content.length > this.MAX_CONTENT_LENGTH) {
            errors.push({
                type: 'content_too_long',
                message: `Content is too long (${entry.content.length} chars, max ${this.MAX_CONTENT_LENGTH})`,
                field: 'content',
                value: `${entry.content.length} characters`,
                severity: 'error'
            });
        }

        // Validate version format
        if (entry.version && !this.VERSION_REGEX.test(entry.version)) {
            warnings.push({
                type: 'invalid_version',
                message: `Version format may be invalid: "${entry.version}"`,
                field: 'version',
                value: entry.version,
                severity: 'warning'
            });

            // Suggest a fix
            const sanitized = this.sanitizeVersion(entry.version);
            if (sanitized) {
                suggestedFixes.version = sanitized;
            }
        }

        // Validate date
        if (entry.publishedAt && isNaN(entry.publishedAt.getTime())) {
            errors.push({
                type: 'invalid_date',
                message: 'Published date is invalid',
                field: 'publishedAt',
                severity: 'error'
            });
        }

        const isValid = errors.length === 0;

        return {
            ...entry,
            isValid,
            errors,
            warnings,
            suggestedFixes
        };
    }

    /**
     * Validate multiple entries and generate import preview
     */
    static validateEntries(entries: ParsedChangelogEntry[]): {
        validatedEntries: ValidatedEntry[];
        preview: ImportPreview;
    } {
        const validatedEntries = entries.map(entry => this.validateEntry(entry));

        const validEntries = validatedEntries.filter(e => e.isValid);
        const invalidEntries = validatedEntries.filter(e => !e.isValid);

        // Check for duplicate versions
        const versions = validatedEntries
            .map(e => e.version)
            .filter(Boolean) as string[];
        const duplicateVersions = versions.filter((version, index) =>
            versions.indexOf(version) !== index
        );

        // Count issues
        const missingTitles = validatedEntries.filter(e =>
            !e.title || !e.title.trim()
        ).length;

        const missingContent = validatedEntries.filter(e =>
            !e.content || !e.content.trim()
        ).length;

        // Generate suggestions for version and tag mappings
        const suggestedMappings = this.generateMappingSuggestions(validatedEntries);

        // Collect all warnings and errors
        const allWarnings = validatedEntries.flatMap(e => e.warnings.map(w => w.message));
        const allErrors = validatedEntries.flatMap(e => e.errors.map(err => err.message));

        const preview: ImportPreview = {
            totalEntries: entries.length,
            validEntries: validEntries.length,
            invalidEntries: invalidEntries.length,
            duplicateVersions: [...new Set(duplicateVersions)],
            missingTitles,
            missingContent,
            suggestedMappings,
            warnings: allWarnings,
            errors: allErrors
        };

        return {validatedEntries, preview};
    }

    /**
     * Generate mapping suggestions for versions and tags
     */
    private static generateMappingSuggestions(entries: ValidatedEntry[]): {
        versions: Record<string, string>;
        tags: Record<string, string>;
    } {
        const versionMappings: Record<string, string> = {};
        const tagMappings: Record<string, string> = {};

        // Generate version mappings for invalid versions
        entries.forEach(entry => {
            if (entry.version && entry.suggestedFixes.version) {
                versionMappings[entry.version] = entry.suggestedFixes.version as string;
            }
        });

        // Generate tag mappings (normalize common variations)
        const allTags = entries.flatMap(e => e.tags || []);
        const uniqueTags = [...new Set(allTags)];

        uniqueTags.forEach(tag => {
            const normalized = this.normalizeTag(tag);
            if (normalized !== tag) {
                tagMappings[tag] = normalized;
            }
        });

        return {versions: versionMappings, tags: tagMappings};
    }

    /**
     * Sanitize version string to make it semver-compatible
     */
    private static sanitizeVersion(version: string): string | null {
        if (!version) return null;

        // Remove common prefixes
        const clean = version.replace(/^(version|release|v)\s*/i, '');

        // Extract semver-like pattern
        const match = clean.match(/(\d+)\.?(\d+)?\.?(\d+)?(?:-(.+))?/);
        if (!match) return null;

        const [, major, minor = '0', patch = '0', prerelease] = match;
        let result = `${major}.${minor}.${patch}`;

        if (prerelease) {
            // Clean up prerelease part
            const cleanPrerelease = prerelease.replace(/[^\w.-]/g, '');
            if (cleanPrerelease) {
                result += `-${cleanPrerelease}`;
            }
        }

        return result;
    }

    /**
     * Normalize tag names to common conventions
     */
    private static normalizeTag(tag: string): string {
        const normalized = tag.toLowerCase().trim();

        const tagMappings: Record<string, string> = {
            'bug': 'fix',
            'bugfix': 'fix',
            'bugs': 'fix',
            'feature': 'feat',
            'features': 'feat',
            'enhancement': 'feat',
            'enhancements': 'feat',
            'improvement': 'feat',
            'improvements': 'feat',
            'documentation': 'docs',
            'doc': 'docs',
            'breaking': 'breaking-change',
            'breaking-changes': 'breaking-change',
            'performance': 'perf',
            'optimization': 'perf',
            'optimizations': 'perf',
            'security': 'security',
            'sec': 'security',
            'maintenance': 'chore',
            'housekeeping': 'chore',
            'misc': 'chore',
            'miscellaneous': 'chore'
        };

        return tagMappings[normalized] || normalized;
    }

    /**
     * Check if entries would create conflicts with existing data
     */
    static checkConflicts(
        entries: ValidatedEntry[],
        existingVersions: string[]
    ): {
        versionConflicts: Array<{ entry: ValidatedEntry; existingVersion: string }>;
        titleConflicts: Array<{ entry: ValidatedEntry; similarTitle: string }>;
    } {
        const versionConflicts: Array<{ entry: ValidatedEntry; existingVersion: string }> = [];
        const titleConflicts: Array<{ entry: ValidatedEntry; similarTitle: string }> = [];

        entries.forEach(entry => {
            // Check version conflicts
            if (entry.version && existingVersions.includes(entry.version)) {
                versionConflicts.push({
                    entry,
                    existingVersion: entry.version
                });
            }

            // Note: Title conflict checking would require existing titles
            // This could be implemented if needed by passing existing entries
        });

        return {versionConflicts, titleConflicts};
    }

    /**
     * Validate import options
     */
    static validateImportOptions(options: Partial<ImportOptions>): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate strategy
        const validStrategies = ['merge', 'replace', 'append'];
        if (options.strategy && !validStrategies.includes(options.strategy)) {
            errors.push(`Invalid strategy: ${options.strategy}. Must be one of: ${validStrategies.join(', ')}`);
        }

        // Validate conflict resolution
        const validResolutions = ['skip', 'overwrite', 'prompt'];
        if (options.conflictResolution && !validResolutions.includes(options.conflictResolution)) {
            errors.push(`Invalid conflict resolution: ${options.conflictResolution}. Must be one of: ${validResolutions.join(', ')}`);
        }

        // Validate date handling
        const validDateHandling = ['preserve', 'current', 'sequence'];
        if (options.dateHandling && !validDateHandling.includes(options.dateHandling)) {
            errors.push(`Invalid date handling: ${options.dateHandling}. Must be one of: ${validDateHandling.join(', ')}`);
        }

        // Check for potentially problematic combinations
        if (options.strategy === 'replace' && options.preserveExistingEntries) {
            warnings.push('Replace strategy with preserve existing entries may cause unexpected behavior');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}