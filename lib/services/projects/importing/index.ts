export {MarkdownParserService} from './markdown-parser.service';
export {ImportValidationService} from './validation.service';
export {ImportProcessorService} from './processor.service';

// Re-export types for convenience
export type {
    ParsedChangelogEntry,
    ChangelogSection,
    ParsedChangelog,
    ImportPreview,
    ImportOptions,
    ImportResult,
    ImportStats,
    ImportFormat,
    FormatDetectionResult,
    ValidationError,
    ValidatedEntry
} from '@/lib/types/projects/importing';

// Main service class that orchestrates the import process
import {MarkdownParserService} from './markdown-parser.service';
import {ImportValidationService} from './validation.service';
import {ImportProcessorService} from './processor.service';
import {
    ParsedChangelog,
    ImportPreview,
    ValidatedEntry,
    ImportOptions,
    ImportResult
} from '@/lib/types/projects/importing';

export class ChangelogImportService {
    /**
     * Complete import workflow - parse, validate, and process
     */
    static async performCompleteImport(
        content: string,
        projectId: string,
        options: ImportOptions,
        userId: string
    ): Promise<{
        parsed: ParsedChangelog;
        preview: ImportPreview;
        result: ImportResult;
    }> {
        // Step 1: Parse the content
        const parsed = MarkdownParserService.parseChangelog(content);

        if (parsed.entries.length === 0) {
            throw new Error('No valid entries found in the provided content');
        }

        // Step 2: Validate entries
        const {validatedEntries, preview} = ImportValidationService.validateEntries(
            parsed.entries
        );

        // Step 3: Process the import
        const result = await ImportProcessorService.processImport(
            projectId,
            validatedEntries,
            options,
            userId
        );

        return {parsed, preview, result};
    }

    /**
     * Preview import without actually importing
     */
    static previewImport(content: string): {
        parsed: ParsedChangelog;
        preview: ImportPreview;
        validatedEntries: ValidatedEntry[];
    } {
        const parsed = MarkdownParserService.parseChangelog(content);
        const {validatedEntries, preview} = ImportValidationService.validateEntries(
            parsed.entries
        );

        return {parsed, preview, validatedEntries};
    }

    /**
     * Detect the format of changelog content
     */
    static detectFormat(content: string) {
        return MarkdownParserService.detectFormat(content);
    }

    /**
     * Get import recommendations based on content analysis
     */
    static getImportRecommendations(content: string): {
        recommendedStrategy: 'merge' | 'replace' | 'append';
        recommendedOptions: Partial<ImportOptions>;
        warnings: string[];
        suggestions: string[];
    } {
        // const detection = MarkdownParserService.detectFormat(content);
        const parsed = MarkdownParserService.parseChangelog(content);

        const warnings: string[] = [];
        const suggestions: string[] = [];
        let recommendedStrategy: 'merge' | 'replace' | 'append' = 'merge';

        // Analyze content to make recommendations
        const hasVersions = parsed.metadata.hasVersions;
        const hasDates = parsed.metadata.hasDates;
        const entryCount = parsed.entries.length;

        // Strategy recommendations
        if (entryCount > 50) {
            recommendedStrategy = 'replace';
            warnings.push('Large number of entries detected. Consider using replace strategy.');
        } else if (entryCount > 10) {
            recommendedStrategy = 'merge';
            suggestions.push('Medium-sized import. Merge strategy recommended to preserve existing data.');
        } else {
            recommendedStrategy = 'append';
            suggestions.push('Small import. Append strategy will add entries to existing ones.');
        }

        // Date handling recommendations
        let dateHandling: 'preserve' | 'current' | 'sequence' = 'preserve';
        if (!hasDates) {
            dateHandling = 'current';
            warnings.push('No dates found in entries. Consider using current date for all entries.');
        }

        // Version handling recommendations
        let autoGenerateVersions = false;
        if (!hasVersions && entryCount > 5) {
            autoGenerateVersions = true;
            suggestions.push('No versions detected. Auto-generation recommended for better organization.');
        }

        // Publishing recommendations
        let publishImportedEntries = false;
        if (entryCount <= 10 && hasVersions) {
            publishImportedEntries = true;
            suggestions.push('Small import with versions. Consider publishing entries immediately.');
        }

        const recommendedOptions: Partial<ImportOptions> = {
            strategy: recommendedStrategy,
            dateHandling,
            autoGenerateVersions,
            publishImportedEntries,
            conflictResolution: 'skip',
            preserveExistingEntries: true
        };

        return {
            recommendedStrategy,
            recommendedOptions,
            warnings,
            suggestions
        };
    }

    /**
     * Validate content before showing import UI
     */
    static validateContent(content: string): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        stats: {
            characterCount: number;
            lineCount: number;
            estimatedEntries: number;
            hasMarkdown: boolean;
        };
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!content || typeof content !== 'string') {
            errors.push('Content must be a non-empty string');
        }

        if (content.length < 10) {
            errors.push('Content is too short to contain valid changelog entries');
        }

        if (content.length > 1000000) { // 1MB limit
            errors.push('Content is too large (max 1MB)');
        }

        // Content analysis
        const lines = content.split('\n');
        const hasMarkdown = /[#*`\[\]]/.test(content);
        const hasHeaders = lines.some(line => /^#+\s/.test(line));
        const hasLists = lines.some(line => /^\s*[-*+]\s/.test(line));

        if (!hasMarkdown && !hasHeaders && !hasLists) {
            warnings.push('Content does not appear to be in a recognized changelog format');
        }

        // Try to estimate entry count
        const headerCount = lines.filter(line => /^#+\s/.test(line)).length;
        const listItemCount = lines.filter(line => /^\s*[-*+]\s/.test(line)).length;
        const estimatedEntries = Math.max(headerCount, Math.floor(listItemCount / 3));

        if (estimatedEntries === 0) {
            warnings.push('No potential changelog entries detected');
        }

        const stats = {
            characterCount: content.length,
            lineCount: lines.length,
            estimatedEntries,
            hasMarkdown
        };

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            stats
        };
    }
}