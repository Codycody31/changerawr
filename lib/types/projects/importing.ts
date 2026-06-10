// lib/types/projects/importing.ts

export interface ParsedChangelogEntry {
    title: string;
    content: string;
    version?: string;
    publishedAt?: Date;
    tags?: string[];
    metadata?: Record<string, unknown>;
}

export interface ChangelogSection {
    heading: string;
    level: number; // 1-6 for h1-h6
    content: string;
    entries: ParsedChangelogEntry[];
    rawContent: string;
}

export interface ParsedChangelog {
    sections: ChangelogSection[];
    entries: ParsedChangelogEntry[];
    metadata: {
        totalSections: number;
        totalEntries: number;
        hasVersions: boolean;
        hasDates: boolean;
        originalFormat: ImportFormat;
        parseWarnings: string[];
    };
}

export interface ImportPreview {
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
    duplicateVersions: string[];
    missingTitles: number;
    missingContent: number;
    suggestedMappings: {
        versions: Record<string, string>;
        tags: Record<string, string>;
    };
    warnings: string[];
    errors: string[];
}

export interface ImportOptions {
    strategy: 'merge' | 'replace' | 'append';
    preserveExistingEntries: boolean;
    autoGenerateVersions: boolean;
    defaultTags: string[];
    publishImportedEntries: boolean;
    dateHandling: 'preserve' | 'current' | 'sequence';
    conflictResolution: 'skip' | 'overwrite' | 'prompt';
}

export interface ImportResult {
    success: boolean;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    createdEntries: Array<{
        id: string;
        title: string;
        version?: string;
    }>;
    warnings: string[];
    errors: Array<{
        entry: ParsedChangelogEntry;
        error: string;
    }>;
    processingTime: number;
}

export interface ImportStats {
    processed: number;
    imported: number;
    skipped: number;
    errors: number;
    startTime: Date;
    endTime?: Date;
}

// Supported import formats (parser-level)
export type ImportFormat =
    | 'keepachangelog'          // Keep a Changelog spec
    | 'github_releases'         // GitHub Releases markdown
    | 'simple_version'          // ## v1.0.7 / ## 1.0.7 flat style
    | 'conventional_commits'    // feat: / fix: prefix style
    | 'date_based'              // organized by date headers
    | 'flat_list'               // just bullet lists, no version headers
    | 'simple'                  // minimal structure
    | 'custom'                  // mixed / unrecognized
    | 'json'
    | 'json_github'
    | 'csv'
    | 'rss'
    | 'atom';

// UI-level import sources (determines which input component is shown)
export type ImportSource =
    | 'markdown'
    | 'canny'
    | 'json'
    | 'csv'
    | 'url';

export interface ParsingHints {
    /** Which heading level carries the version/release entries (null = not header-based) */
    primaryHeaderLevel: 1 | 2 | 3 | null;
    /** How version strings are formatted in headers */
    versionStyle: 'bracket-dash' | 'bracket-date' | 'v-prefix' | 'plain-semver' | 'release-prefix' | 'date-only' | 'none';
    /** Are there sub-headings inside version entries (### Added, ### Fixed …) */
    hasSubsections: boolean;
    /** Treat entire content as a single changelog entry */
    treatAsSingle: boolean;
    /** Parse as conventional commit prefixes (feat:, fix: …) */
    conventionalCommits: boolean;
    /** Group entries by date headers rather than version headers */
    dateBasedGrouping: boolean;
}

export interface FormatDetectionResult {
    format: ImportFormat;
    confidence: number; // 0-1
    characteristics: string[];
    structure: {
        hasVersionHeaders: boolean;
        hasDateHeaders: boolean;
        hasTypeHeaders: boolean;
        usesListFormat: boolean;
        usesMarkdownSyntax: boolean;
        /** Heading level detected as the primary version/release marker */
        detectedHeaderLevel: number | null;
        /** Approximate number of release/version entries found */
        estimatedEntryCount: number;
    };
    hints: ParsingHints;
}

// Import validation errors
export interface ValidationError {
    type: 'missing_title' | 'missing_content' | 'invalid_version' | 'duplicate_version' | 'invalid_date' | 'content_too_long';
    message: string;
    field?: string;
    value?: string;
    severity: 'error' | 'warning';
}

export interface ValidatedEntry extends ParsedChangelogEntry {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    suggestedFixes: Record<string, unknown>;
}

/** User-supplied overrides that bypass or adjust auto-detection */
export interface ParseOverrides {
    /** Force a specific heading level to be treated as version headers (null = auto) */
    primaryHeaderLevel?: 1 | 2 | 3 | 4 | null;
    /** Strip these markup patterns from header text before detection (regex source string) */
    stripPatterns?: string[];
    /** Force a specific format instead of auto-detecting */
    forceFormat?: ImportFormat;
    /** Treat entire content as a single entry */
    treatAsSingle?: boolean;
}

// Source-specific import options
export interface JsonImportOptions {
    versionField: string;
    titleField: string;
    contentField: string;
    dateField: string;
    tagsField: string;
    tagSeparator: string;
}

export interface CsvImportOptions {
    delimiter: string;
    hasHeader: boolean;
    versionColumn: string;
    titleColumn: string;
    contentColumn: string;
    dateColumn: string;
    tagsColumn: string;
    tagSeparator: string;
}

export interface UrlImportOptions {
    url: string;
    format: 'auto' | 'rss' | 'atom' | 'github_api' | 'json';
    maxEntries: number;
    githubToken?: string;
}
