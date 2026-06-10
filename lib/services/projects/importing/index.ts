export { MarkdownParserService } from './markdown-parser.service';
export { ImportValidationService } from './validation.service';
export { ImportProcessorService } from './processor.service';
export { JsonParserService } from './parsers/json.parser';
export { CsvParserService } from './parsers/csv.parser';
export { UrlParserService } from './parsers/url.parser';

export type {
    ParsedChangelogEntry,
    ChangelogSection,
    ParsedChangelog,
    ImportPreview,
    ImportOptions,
    ImportResult,
    ImportStats,
    ImportFormat,
    ImportSource,
    FormatDetectionResult,
    ValidationError,
    ValidatedEntry,
    JsonImportOptions,
    CsvImportOptions,
    UrlImportOptions
} from '@/lib/types/projects/importing';

import { MarkdownParserService } from './markdown-parser.service';
import { JsonParserService } from './parsers/json.parser';
import { CsvParserService } from './parsers/csv.parser';
import { ImportValidationService } from './validation.service';
import { ImportProcessorService } from './processor.service';
import {
    ParsedChangelog,
    ImportPreview,
    ValidatedEntry,
    ImportOptions,
    ImportResult
} from '@/lib/types/projects/importing';

export class ChangelogImportService {
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
        const parsed = MarkdownParserService.parseChangelog(content);

        if (parsed.entries.length === 0) {
            throw new Error('No valid entries found in the provided content');
        }

        const { validatedEntries, preview } = ImportValidationService.validateEntries(parsed.entries);
        const result = await ImportProcessorService.processImport(projectId, validatedEntries, options, userId);

        return { parsed, preview, result };
    }

    static previewImport(content: string): {
        parsed: ParsedChangelog;
        preview: ImportPreview;
        validatedEntries: ValidatedEntry[];
    } {
        const parsed = MarkdownParserService.parseChangelog(content);
        const { validatedEntries, preview } = ImportValidationService.validateEntries(parsed.entries);
        return { parsed, preview, validatedEntries };
    }

    static detectFormat(content: string) {
        // Try JSON first (unambiguous)
        const jsonDetect = JsonParserService.detectJsonFormat(content);
        if (jsonDetect.isJson) {
            return {
                format: jsonDetect.isGitHubReleases ? 'json_github' : 'json',
                confidence: 0.95,
                characteristics: ['JSON content'],
                structure: { hasVersionHeaders: false, hasDateHeaders: false, hasTypeHeaders: false, usesListFormat: false, usesMarkdownSyntax: false, detectedHeaderLevel: null, estimatedEntryCount: 0 },
                hints: { primaryHeaderLevel: null, versionStyle: 'none' as const, hasSubsections: false, treatAsSingle: false, conventionalCommits: false, dateBasedGrouping: false }
            };
        }

        // Try CSV
        const csvDetect = CsvParserService.detectCsv(content);
        if (csvDetect.isCsv) {
            return {
                format: 'csv',
                confidence: 0.85,
                characteristics: [`CSV with delimiter: ${csvDetect.delimiter}`],
                structure: { hasVersionHeaders: false, hasDateHeaders: false, hasTypeHeaders: false, usesListFormat: false, usesMarkdownSyntax: false, detectedHeaderLevel: null, estimatedEntryCount: 0 },
                hints: { primaryHeaderLevel: null, versionStyle: 'none' as const, hasSubsections: false, treatAsSingle: false, conventionalCommits: false, dateBasedGrouping: false }
            };
        }

        return MarkdownParserService.detectFormat(content);
    }

    static getImportRecommendations(content: string): {
        recommendedStrategy: 'merge' | 'replace' | 'append';
        recommendedOptions: Partial<ImportOptions>;
        warnings: string[];
        suggestions: string[];
    } {
        const parsed = MarkdownParserService.parseChangelog(content);
        const warnings: string[] = [];
        const suggestions: string[] = [];
        let recommendedStrategy: 'merge' | 'replace' | 'append' = 'merge';

        const { hasVersions, hasDates } = parsed.metadata;
        const entryCount = parsed.entries.length;

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

        let dateHandling: 'preserve' | 'current' | 'sequence' = 'preserve';
        if (!hasDates) {
            dateHandling = 'current';
            warnings.push('No dates found in entries. Consider using current date for all entries.');
        }

        let autoGenerateVersions = false;
        if (!hasVersions && entryCount > 5) {
            autoGenerateVersions = true;
            suggestions.push('No versions detected. Auto-generation recommended for better organization.');
        }

        let publishImportedEntries = false;
        if (entryCount <= 10 && hasVersions) {
            publishImportedEntries = true;
            suggestions.push('Small import with versions. Consider publishing entries immediately.');
        }

        return {
            recommendedStrategy,
            recommendedOptions: {
                strategy: recommendedStrategy,
                dateHandling,
                autoGenerateVersions,
                publishImportedEntries,
                conflictResolution: 'skip',
                preserveExistingEntries: true
            },
            warnings,
            suggestions
        };
    }

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

        if (!content || typeof content !== 'string') {
            errors.push('Content must be a non-empty string');
        }

        if (content.length < 10) {
            errors.push('Content is too short to contain valid changelog entries');
        }

        if (content.length > 1000000) {
            errors.push('Content is too large (max 1MB)');
        }

        const lines = content.split('\n');
        const hasMarkdown = /[#*`\[\]]/.test(content);
        const hasHeaders = lines.some(line => /^#+\s/.test(line));
        const hasLists = lines.some(line => /^\s*[-*+]\s/.test(line));

        if (!hasMarkdown && !hasHeaders && !hasLists) {
            warnings.push('Content does not appear to be in a recognized changelog format');
        }

        const headerCount = lines.filter(line => /^#+\s/.test(line)).length;
        const listItemCount = lines.filter(line => /^\s*[-*+]\s/.test(line)).length;
        const estimatedEntries = Math.max(headerCount, Math.floor(listItemCount / 3));

        if (estimatedEntries === 0) {
            warnings.push('No potential changelog entries detected');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            stats: {
                characterCount: content.length,
                lineCount: lines.length,
                estimatedEntries,
                hasMarkdown
            }
        };
    }
}
