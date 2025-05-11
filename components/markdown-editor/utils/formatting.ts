/**
 * Utilities for formatting markdown text
 */

/**
 * Formats for inserting around selected text
 */
export interface TextFormatOptions {
    prefix: string;
    suffix?: string;
    blockLevel?: boolean;
    replaceSelection?: boolean;
    multiline?: boolean;
    linePrefix?: string;
}

/**
 * Common formatting options
 */
export const FORMAT_OPTIONS = {
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '_', suffix: '_' },
    strikethrough: { prefix: '~~', suffix: '~~' },
    code: { prefix: '`', suffix: '`' },
    codeBlock: { prefix: '```\n', suffix: '\n```', blockLevel: true },
    link: { prefix: '[', suffix: '](url)' },
    image: { prefix: '![', suffix: '](url)' },
    quote: { prefix: '> ', blockLevel: true, multiline: true, linePrefix: '> ' },
    h1: { prefix: '# ', blockLevel: true },
    h2: { prefix: '## ', blockLevel: true },
    h3: { prefix: '### ', blockLevel: true },
    h4: { prefix: '#### ', blockLevel: true },
    h5: { prefix: '##### ', blockLevel: true },
    h6: { prefix: '###### ', blockLevel: true },
    unorderedList: { prefix: '- ', blockLevel: true, multiline: true, linePrefix: '- ' },
    orderedList: { prefix: '1. ', blockLevel: true, multiline: true, linePrefix: (i: number) => `${i + 1}. ` },
    taskList: { prefix: '- [ ] ', blockLevel: true, multiline: true, linePrefix: '- [ ] ' },
    table: {
        replaceSelection: true,
        prefix: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
        blockLevel: true
    },
    horizontalRule: { prefix: '\n---\n', blockLevel: true, replaceSelection: true },
};

/**
 * Apply formatting to text with special handling for multiline and block-level elements
 */
export function formatText(
    text: string,
    selection: { start: number; end: number; text: string },
    options: TextFormatOptions
): { newText: string; newSelection: { start: number; end: number } } {
    const { prefix, suffix = '', blockLevel = false, replaceSelection = false, multiline = false, linePrefix } = options;
    const { start, end, text: selectedText } = selection;

    // If there's no selection and it's a block level element, add newlines
    if (selectedText === '' && blockLevel) {
        const newLine = text.charAt(start - 1) !== '\n' && start > 0 ? '\n' : '';
        const endLine = text.charAt(end) !== '\n' ? '\n' : '';
        const insertText = replaceSelection ? prefix : `${newLine}${prefix}${suffix}${endLine}`;

        const newText = text.substring(0, start) + insertText + text.substring(end);
        const cursorPos = start + newLine.length + prefix.length;

        return {
            newText,
            newSelection: { start: cursorPos, end: cursorPos },
        };
    }

    // If selection should be replaced entirely
    if (replaceSelection) {
        const newText = text.substring(0, start) + prefix + text.substring(end);
        const cursorPos = start + prefix.length;

        return {
            newText,
            newSelection: { start: cursorPos, end: cursorPos },
        };
    }

    // Handle multiline formatting (lists, quotes, etc.)
    if (multiline && selectedText.includes('\n')) {
        const lines = selectedText.split('\n');

        // Format each line
        const formattedLines = lines.map((line, i) => {
            if (!line.trim()) return line; // Skip empty lines

            // If linePrefix is a function, call it with the index
            const prefixValue = typeof linePrefix === 'function'
                ? (linePrefix as (i: number) => string)(i)
                : linePrefix || prefix;

            return `${prefixValue}${line}`;
        });

        const formattedText = formattedLines.join('\n');
        const newText = text.substring(0, start) + formattedText + text.substring(end);

        return {
            newText,
            newSelection: { start, end: start + formattedText.length },
        };
    }

    // Standard formatting (bold, italic, etc.)
    const formattedText = prefix + selectedText + suffix;
    const newText = text.substring(0, start) + formattedText + text.substring(end);

    // Set cursor position based on whether there was a selection
    const newStart = selectedText ? start : start + prefix.length;
    const newEnd = selectedText ? start + formattedText.length : start + prefix.length;

    return {
        newText,
        newSelection: { start: newStart, end: newEnd },
    };
}

/**
 * Is a line empty or contains only whitespace?
 */
export function isEmptyLine(line: string): boolean {
    return line.trim() === '';
}

/**
 * Does the line start with the given prefix?
 */
export function lineStartsWith(line: string, prefix: string): boolean {
    return line.trimStart().startsWith(prefix);
}

/**
 * Get the indentation level of a line (number of spaces at the beginning)
 */
export function getIndentationLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
}

/**
 * Add indentation to a line
 */
export function addIndentation(line: string, spaces: number): string {
    return ' '.repeat(spaces) + line;
}

/**
 * Remove indentation from a line
 */
export function removeIndentation(line: string, spaces: number): string {
    const indentation = getIndentationLevel(line);
    const removeSpaces = Math.min(indentation, spaces);
    return line.substring(removeSpaces);
}

/**
 * Toggle a formatting feature on selected text
 */
export function toggleFormatting(
    text: string,
    selection: { start: number; end: number; text: string },
    options: TextFormatOptions
): { newText: string; newSelection: { start: number; end: number } } {
    const { prefix, suffix = '' } = options;
    const { start, end, text: selectedText } = selection;

    // If there's no selection, just insert the formatting
    if (selectedText === '') {
        return formatText(text, selection, options);
    }

    // Check if the selection already has the formatting
    if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
        // Remove the formatting
        const unformattedText = selectedText.substring(prefix.length, selectedText.length - suffix.length);
        const newText = text.substring(0, start) + unformattedText + text.substring(end);

        return {
            newText,
            newSelection: { start, end: start + unformattedText.length },
        };
    }

    // Add the formatting
    return formatText(text, selection, options);
}

/**
 * Calculate word and character count
 */
export function getTextMetrics(text: string): { words: number; chars: number; lines: number } {
    const lines = text.split('\n').length;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    return { words, chars, lines };
}

/**
 * Determine the line and column number for a cursor position
 */
export function positionToLineColumn(text: string, position: number): { line: number; column: number } {
    const lines = text.substring(0, position).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    return { line, column };
}

/**
 * Extract the current paragraph around the cursor
 */
export function getCurrentParagraph(text: string, position: number): { text: string; start: number; end: number } {
    const lines = text.split('\n');
    let currentIndex = 0;
    let paragraphStart = 0;
    let paragraphEnd = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for the newline

        if (position >= currentIndex && position < currentIndex + lineLength) {
            // We found the line containing the cursor
            if (isEmptyLine(lines[i])) {
                // If the cursor is on an empty line, return just that line
                paragraphStart = currentIndex;
                paragraphEnd = currentIndex + lineLength - 1;
                break;
            }

            // Find the start of the paragraph
            let start = i;
            while (start > 0 && !isEmptyLine(lines[start - 1])) {
                start--;
            }

            // Find the end of the paragraph
            let end = i;
            while (end < lines.length - 1 && !isEmptyLine(lines[end + 1])) {
                end++;
            }

            // Calculate start and end positions
            paragraphStart = lines.slice(0, start).reduce((sum, line) => sum + line.length + 1, 0);
            paragraphEnd = paragraphStart + lines.slice(start, end + 1).join('\n').length;
            break;
        }

        currentIndex += lineLength;
    }

    return {
        text: text.substring(paragraphStart, paragraphEnd),
        start: paragraphStart,
        end: paragraphEnd,
    };
}