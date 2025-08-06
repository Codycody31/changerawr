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
        originalFormat: 'keepachangelog' | 'github_releases' | 'simple' | 'custom';
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

// Supported import formats
export type ImportFormat =
    | 'keepachangelog'
    | 'github_releases'
    | 'simple'
    | 'custom';

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
    };
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