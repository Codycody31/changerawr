/**
 * Utilities for rendering markdown content to HTML
 */

/**
 * Options for rendering markdown
 */
export interface MarkdownRenderOptions {
    /**
     * Enable/disable specific features
     */
    features?: {
        headings?: boolean;
        anchors?: boolean;
        bold?: boolean;
        italic?: boolean;
        strikethrough?: boolean;
        blockquotes?: boolean;
        code?: boolean;
        inlineCode?: boolean;
        links?: boolean;
        images?: boolean;
        lists?: boolean;
        taskLists?: boolean;
        tables?: boolean;
        footnotes?: boolean;
        lineBreaks?: boolean;
        horizontalRules?: boolean;
    };

    /**
     * CSS class to add to the container
     */
    className?: string;

    /**
     * Custom URL for links
     */
    baseUrl?: string;

    /**
     * Should links open in a new tab?
     */
    openLinksInNewTab?: boolean;

    /**
     * Allow HTML in markdown
     */
    allowHtml?: boolean;

    /**
     * Custom renderer functions
     */
    customRenderers?: Record<string, (content: string) => string>;
}

/**
 * Default render options
 */
export const DEFAULT_RENDER_OPTIONS: MarkdownRenderOptions = {
    features: {
        headings: true,
        anchors: true,
        bold: true,
        italic: true,
        strikethrough: true,
        blockquotes: true,
        code: true,
        inlineCode: true,
        links: true,
        images: true,
        lists: true,
        taskLists: true,
        tables: true,
        footnotes: true,
        lineBreaks: true,
        horizontalRules: true,
    },
    openLinksInNewTab: true,
    allowHtml: false,
};

/**
 * Escape special HTML characters
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Process code blocks
 */
function processCodeBlocks(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.code) return input;

    return input.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (_, lang, code) => {
        const escapedCode = escapeHtml(code.trim());
        return `<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre>`;
    });
}

/**
 * Process inline code
 */
function processInlineCode(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.inlineCode) return input;

    return input.replace(/`([^`]+)`/g, (_, code) =>
        `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">${escapeHtml(code)}</code>`
    );
}

/**
 * Process lists, including task lists
 */
function processLists(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.lists) return input;

    let processedContent = input;

    // Process task lists if enabled
    if (features.taskLists) {
        processedContent = processedContent.replace(/^(\s*)-\s\[([ xX])\]\s(.+)$/gm, (match, spaces, checked, content) => {
            const isChecked = checked.toLowerCase() === 'x';
            const indentation = spaces.length;
            const escapedContent = escapeHtml(content);

            // Use a special marker for task list items
            return `__TASK_ITEM_${indentation}_${isChecked ? 'CHECKED' : 'UNCHECKED'}_${escapedContent}__`;
        });
    }

    // Process ordered lists (1. Item)
    processedContent = processedContent.replace(
        /^([ \t]*)((?:[0-9]+\.)[ \t]+)(.+)(?:\n|$)/gm,
        (match, indent, marker, content) => {
            // Return the match untouched if it's inside a code block or already processed
            if (match.includes('<pre') || match.includes('<li>')) return match;
            return `${indent}<ol-item depth="${indent.length}" marker="${marker.trim()}">${escapeHtml(content)}</ol-item>\n`;
        }
    );

    // Process unordered lists (- Item or * Item)
    processedContent = processedContent.replace(
        /^([ \t]*)([-*])[ \t]+([^\n]+)(?:\n|$)/gm,
        (match, indent, marker, content) => {
            // Skip if it's a task list marker, inside code block, or already processed
            if (match.includes('__TASK_ITEM_') || match.includes('<pre') || match.includes('<li>')) return match;
            return `${indent}<ul-item depth="${indent.length}" marker="${marker}">${escapeHtml(content)}</ul-item>\n`;
        }
    );

    // Now convert the task list markers back to HTML
    if (features.taskLists) {
        processedContent = processedContent.replace(/__TASK_ITEM_(\d+)_(CHECKED|UNCHECKED)_(.+?)__/g,
            (_, indentation, checkedState, content) => {
                const isChecked = checkedState === 'CHECKED';
                const indent = parseInt(indentation);

                return `<task-item depth="${indent}" checked="${isChecked}">${content}</task-item>\n`;
            }
        );
    }

    // Convert the markers to proper HTML
    const processLists = (content: string): string => {
        // Process ul-item elements
        let currentUlDepth: number | null = null;
        let inUl = false;

        content = content.split('\n').map(line => {
            const ulMatch = line.match(/<ul-item depth="(\d+)" marker="([-*])">(.+?)<\/ul-item>/);

            if (ulMatch) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [, depthStr, marker, itemContent] = ulMatch;
                const depth = parseInt(depthStr);

                if (!inUl || currentUlDepth !== depth) {
                    let result = '';

                    // Close previous list if needed
                    if (inUl) {
                        result += '</ul>'.repeat(1);
                    }

                    // Open new list
                    result += `<ul class="list-disc list-inside space-y-2 my-4 ml-${depth > 0 ? depth * 4 : '0'}">\n`;
                    inUl = true;
                    currentUlDepth = depth;

                    return result + `<li>${itemContent}</li>`;
                }

                return `<li>${itemContent}</li>`;
            } else if (inUl && !line.includes('<ul-item')) {
                inUl = false;
                currentUlDepth = null;
                return '</ul>\n' + line;
            }

            return line;
        }).join('\n');

        // Close any open lists
        if (inUl) {
            content += '\n</ul>';
        }

        // Process ol-item elements
        let currentOlDepth: number | null = null;
        let inOl = false;

        content = content.split('\n').map(line => {
            const olMatch = line.match(/<ol-item depth="(\d+)" marker="([0-9]+\.)">(.+?)<\/ol-item>/);

            if (olMatch) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [, depthStr, marker, itemContent] = olMatch;
                const depth = parseInt(depthStr);

                if (!inOl || currentOlDepth !== depth) {
                    let result = '';

                    // Close previous list if needed
                    if (inOl) {
                        result += '</ol>'.repeat(1);
                    }

                    // Open new list
                    result += `<ol class="list-decimal list-inside space-y-2 my-4 ml-${depth > 0 ? depth * 4 : '0'}">\n`;
                    inOl = true;
                    currentOlDepth = depth;

                    return result + `<li>${itemContent}</li>`;
                }

                return `<li>${itemContent}</li>`;
            } else if (inOl && !line.includes('<ol-item')) {
                inOl = false;
                currentOlDepth = null;
                return '</ol>\n' + line;
            }

            return line;
        }).join('\n');

        // Close any open lists
        if (inOl) {
            content += '\n</ol>';
        }

        // Process task items
        let currentTaskListDepth: number | null = null;
        let inTaskList = false;

        content = content.split('\n').map(line => {
            const taskMatch = line.match(/<task-item depth="(\d+)" checked="(true|false)">(.+?)<\/task-item>/);

            if (taskMatch) {
                const [, depthStr, checkedStr, itemContent] = taskMatch;
                const depth = parseInt(depthStr);
                const isChecked = checkedStr === 'true';

                if (!inTaskList || currentTaskListDepth !== depth) {
                    let result = '';

                    // Close previous list if needed
                    if (inTaskList) {
                        result += '</div>'.repeat(1);
                    }

                    // Open new task list
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    result += `<div class="flex flex-col gap-2 my-4 ml-${depth > 0 ? depth * 4 : '0'}">\n`;
                    inTaskList = true;
                    currentTaskListDepth = depth;
                }

                const checkboxHtml = `
          <div class="flex items-center gap-2 my-1">
            <input type="checkbox" ${isChecked ? 'checked' : ''} disabled 
              class="form-checkbox h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span${isChecked ? ' class="line-through text-muted-foreground"' : ''}>${itemContent}</span>
          </div>
        `;

                return checkboxHtml;
            } else if (inTaskList && !line.includes('<task-item')) {
                inTaskList = false;
                currentTaskListDepth = null;
                return '</div>\n' + line;
            }

            return line;
        }).join('\n');

        // Close any open task lists
        if (inTaskList) {
            content += '\n</div>';
        }

        return content;
    };

    return processLists(processedContent);
}

/**
 * Process line breaks
 */
function processLineBreaks(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.lineBreaks) return input;

    // Handle single line breaks (when a line ends with two spaces)
    let output = input.replace(/ {2}\n/g, '<br />');

    // Handle paragraphs (double line breaks)
    output = output.replace(/\n\n/g, '</p><p class="leading-7 mb-4">');

    return output;
}

/**
 * Process headings (with optional anchor links)
 */
function processHeadings(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.headings) return input;

    return input.replace(/^(#{1,6})\s(.+)$/gm, (_, level, content) => {
        const headingLevel = level.length;
        const escapedContent = escapeHtml(content);
        const id = content.toLowerCase().replace(/[^\w]+/g, '-');

        // Apply different styling based on heading level
        let headingClasses = 'group relative flex items-center gap-2';

        switch(headingLevel) {
            case 1:
                headingClasses += ' text-3xl font-bold mt-8 mb-4';
                break;
            case 2:
                headingClasses += ' text-2xl font-semibold mt-6 mb-3';
                break;
            case 3:
                headingClasses += ' text-xl font-medium mt-5 mb-3';
                break;
            case 4:
                headingClasses += ' text-lg font-medium mt-4 mb-2';
                break;
            case 5:
                headingClasses += ' text-base font-medium mt-3 mb-2';
                break;
            case 6:
                headingClasses += ' text-sm font-medium mt-3 mb-2';
                break;
        }

        return `<h${headingLevel} id="${id}" class="${headingClasses}">
      ${escapedContent}
      ${features.anchors ? `
        <a href="#${id}" class="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.5 4H5.75A3.75 3.75 0 002 7.75v.5a3.75 3.75 0 003.75 3.75h1.5m-1.5-4h3m1.5-4h1.75A3.75 3.75 0 0114 7.75v.5a3.75 3.75 0 01-3.75 3.75H8.5"/>
          </svg>
        </a>
      ` : ''}
    </h${headingLevel}>`;
    });
}

/**
 * Process blockquotes
 */
function processBlockquotes(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.blockquotes) return input;

    return input.replace(/^(>+)\s(.+)$/gm, (_, level, content) => {
        const depth = level.length;
        const padding = (depth - 1) * 1.5;
        return `<blockquote class="pl-4 py-2 border-l-2 border-border ml-${padding} italic text-muted-foreground my-4">${escapeHtml(content)}</blockquote>`;
    });
}

/**
 * Process tables
 */
function processTables(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.tables) return input;

    // First, identify and process entire tables
    return input.replace(/(\|.+\|\n)+/g, (tableBlock) => {
        const rows = tableBlock.trim().split('\n');

        // Extract the header row
        const headerRow = rows[0];
        const headerCells = headerRow
            .split('|')
            .slice(1, -1)
            .map(cell => escapeHtml(cell.trim()));

        // Check if we have alignment row
        const isAlignmentRow = rows[1] && rows[1].includes('---');

        // Process body rows
        const bodyRows = rows.slice(isAlignmentRow ? 2 : 1);

        // Create table HTML
        let tableHtml = '<table class="w-full border-collapse border-2 rounded-md my-6 mx-auto">\n';

        // Add header
        tableHtml += '<thead class="bg-muted/50">\n<tr>\n';
        headerCells.forEach(cell => {
            tableHtml += `<th class="border px-4 py-2 text-left font-medium">${cell}</th>\n`;
        });
        tableHtml += '</tr>\n</thead>\n';

        // Add body
        tableHtml += '<tbody>\n';
        bodyRows.forEach(row => {
            const cells = row
                .split('|')
                .slice(1, -1)
                .map(cell => escapeHtml(cell.trim()));

            tableHtml += '<tr class="hover:bg-muted/20">\n';
            cells.forEach(cell => {
                tableHtml += `<td class="border px-4 py-2">${cell}</td>\n`;
            });
            tableHtml += '</tr>\n';
        });
        tableHtml += '</tbody>\n</table>';

        return tableHtml;
    });
}

/**
 * Process inline elements (bold, italic, etc.)
 */
function processInlineFormatting(input: string, features?: MarkdownRenderOptions['features']): string {
    let output = input;

    // Bold
    if (features?.bold) {
        output = output.replace(/\*\*(.*?)\*\*/g, (_, content) => `<strong>${escapeHtml(content)}</strong>`);
    }

    // Italic
    if (features?.italic) {
        output = output.replace(/\b_(.*?)_\b/g, (_, content) => `<em>${escapeHtml(content)}</em>`);
    }

    // Strikethrough
    if (features?.strikethrough) {
        output = output.replace(/~~(.*?)~~/g, (_, content) => `<del>${escapeHtml(content)}</del>`);
    }

    return output;
}

/**
 * Process links
 */
function processLinks(input: string, options: MarkdownRenderOptions): string {
    if (!options.features?.links) return input;

    const targetAttr = options.openLinksInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';

    return input.replace(
        /\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g,
        (_, text, url, title) => {
            let finalUrl = url;

            // Add base URL if provided and URL is relative
            if (options.baseUrl && !url.match(/^(https?:\/\/|mailto:|tel:)/)) {
                finalUrl = new URL(url, options.baseUrl).toString();
            }

            const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';

            return `<a href="${finalUrl}"${titleAttr} class="text-primary hover:underline inline-flex items-center gap-1"${targetAttr}>
        ${escapeHtml(text)}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>`;
        }
    );
}

/**
 * Process images
 */
function processImages(input: string, options: MarkdownRenderOptions): string {
    if (!options.features?.images) return input;

    return input.replace(/!\[(.*?)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g, (_, alt, src, title) => {
        let finalSrc = src;

        // Add base URL if provided and URL is relative
        if (options.baseUrl && !src.match(/^(https?:\/\/)/)) {
            finalSrc = new URL(src, options.baseUrl).toString();
        }

        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        const escapedAlt = escapeHtml(alt || '');

        return `<img src="${finalSrc}" alt="${escapedAlt}"${titleAttr} class="max-w-full h-auto rounded-lg my-4" loading="lazy" />`;
    });
}

/**
 * Process footnotes
 */
function processFootnotes(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.footnotes) return input;

    // Process footnote references
    let output = input.replace(/\[\^(\d+)\](?!:)/g, (_, num) =>
        `<sup><a href="#fn${escapeHtml(num)}" id="fnref${escapeHtml(num)}">[${escapeHtml(num)}]</a></sup>`
    );

    // Process footnote definitions
    output = output.replace(/\[\^(\d+)\]:\s*(.+)$/gm, (_, num, content) => {
        return `<div id="fn${escapeHtml(num)}" class="text-sm text-muted-foreground mt-8 pt-2 border-t">
      ${escapeHtml(num)}. ${escapeHtml(content)}
      <a href="#fnref${escapeHtml(num)}" class="text-primary">↩</a>
    </div>`;
    });

    return output;
}

/**
 * Process horizontal rules
 */
function processHorizontalRules(input: string, features?: MarkdownRenderOptions['features']): string {
    if (!features?.horizontalRules) return input;

    return input.replace(/^---$/gm, '<hr class="my-6 border-t border-border">');
}

/**
 * Wrap paragraphs
 */
function wrapParagraphs(input: string): string {
    return input.replace(/([^\n]+?)(?:\n\n|$)/g, (_, content) => {
        if (
            content.startsWith('<') || // Skip if content starts with HTML tag
            content.trim() === '' // Skip empty lines
        ) {
            return content;
        }
        return `<p class="leading-7 mb-4">${content}</p>\n`;
    });
}

/**
 * Apply custom renderers
 */
function applyCustomRenderers(
    input: string,
    customRenderers?: Record<string, (content: string) => string>
): string {
    if (!customRenderers) return input;

    let output = input;

    // Apply each custom renderer
    Object.entries(customRenderers).forEach(([pattern, renderer]) => {
        const regex = new RegExp(pattern, 'g');
        output = output.replace(regex, (match, ...args) => {
            // Extract the content from the match (typically the first capture group)
            const content = args[0] || match;
            return renderer(content);
        });
    });

    return output;
}

/**
 * Main renderer function
 */
export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): string {
    // Merge options with defaults
    const mergedOptions: MarkdownRenderOptions = {
        ...DEFAULT_RENDER_OPTIONS,
        ...options,
        features: {
            ...DEFAULT_RENDER_OPTIONS.features,
            ...options.features,
        },
    };

    let html = markdown;

    // Process blocks in specific order
    html = processCodeBlocks(html, mergedOptions.features);
    html = processLists(html, mergedOptions.features);
    html = processHeadings(html, mergedOptions.features);
    html = processBlockquotes(html, mergedOptions.features);
    html = processTables(html, mergedOptions.features);

    // Process line breaks
    html = processLineBreaks(html, mergedOptions.features);

    // Process inline code (after blocks to avoid conflicts)
    html = processInlineCode(html, mergedOptions.features);

    // Process inline formatting
    html = processInlineFormatting(html, mergedOptions.features);

    // Process links
    html = processLinks(html, mergedOptions);

    // Process images
    html = processImages(html, mergedOptions);

    // Process footnotes
    html = processFootnotes(html, mergedOptions.features);

    // Process horizontal rules
    html = processHorizontalRules(html, mergedOptions.features);

    // Apply custom renderers
    html = applyCustomRenderers(html, mergedOptions.customRenderers);

    // Wrap paragraphs last
    html = wrapParagraphs(html);

    // Apply sanitization if needed
    // Note: In a real-world implementation, you'd probably use a library like DOMPurify
    if (!mergedOptions.allowHtml) {
        // Simple sanitization (this is not comprehensive!)
        html = html.replace(/<(script|iframe|object|embed|style)/gi, '&lt;$1');
    }

    // Wrap in a container with the specified class
    if (mergedOptions.className) {
        html = `<div class="${mergedOptions.className}">${html}</div>`;
    }

    return html;
}

/**
 * React-friendly renderer component
 * This is just a placeholder generated by Grazie to help you with your component - the actual component would be in a .tsx file
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MarkdownRenderer(props: {
    children: string;
    options?: MarkdownRenderOptions;
}) {
    // In a real implementation, you'd use:
    // 1. A useEffect to run DOMPurify on client-side
    // 2. Handle hydration issues with server/client rendering
    // 3. Use dangerouslySetInnerHTML with proper sanitization

    // Example of how it would be used:
    // return (
    //   <div
    //     dangerouslySetInnerHTML={{ __html: renderMarkdown(props.children, props.options) }}
    //     suppressHydrationWarning
    //   />
    // );

    // This is just a placeholder
    return null;
}

/**
 * Extract all headings from markdown text
 * Useful for generating table of contents
 */
export function extractHeadings(markdown: string): Array<{
    text: string;
    level: number;
    id: string;
}> {
    const headings: Array<{ text: string; level: number; id: string }> = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;

    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^\w]+/g, '-');

        headings.push({ text, level, id });
    }

    return headings;
}

/**
 * Get word count from markdown text
 */
export function getWordCount(markdown: string): number {
    // Remove code blocks to avoid counting code as words
    const withoutCode = markdown.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');

    // Remove URLs
    const withoutUrls = withoutInlineCode.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Count words using regex
    const words = withoutUrls.trim().match(/\S+/g);
    return words ? words.length : 0;
}

/**
 * Get reading time in minutes
 */
export function getReadingTime(markdown: string, wordsPerMinute: number = 200): number {
    const wordCount = getWordCount(markdown);
    const minutes = wordCount / wordsPerMinute;
    return Math.ceil(minutes);
}

/**
 * Create a table of contents HTML
 */
export function generateTableOfContents(markdown: string): string {
    const headings = extractHeadings(markdown);

    if (headings.length === 0) {
        return '';
    }

    let toc = '<nav class="toc mb-8">\n';
    toc += '<h2 class="text-lg font-medium mb-4">Table of Contents</h2>\n';
    toc += '<ul class="space-y-2 text-sm">\n';

    // Track the current level for proper nesting
    let currentLevel = 0;

    headings.forEach((heading) => {
        // Handle nesting
        if (heading.level > currentLevel) {
            // Indent deeper
            for (let i = currentLevel; i < heading.level; i++) {
                toc += '<ul class="ml-4 mt-2 space-y-2">\n';
            }
        } else if (heading.level < currentLevel) {
            // Close deeper levels
            for (let i = currentLevel; i > heading.level; i--) {
                toc += '</ul>\n';
            }
        }

        // Update current level
        currentLevel = heading.level;

        // Add the heading link
        toc += `<li><a href="#${heading.id}" class="hover:text-primary hover:underline">${heading.text}</a></li>\n`;
    });

    // Close any remaining open lists
    for (let i = currentLevel; i > 0; i--) {
        toc += '</ul>\n';
    }

    toc += '</ul>\n</nav>';

    return toc;
}

/**
 * Helper to detect if the markdown contains a specific element type
 */
export function containsElementType(markdown: string, type: 'table' | 'code' | 'heading' | 'list'): boolean {
    switch (type) {
        case 'table':
            return /\|(.+)\|[\r\n]/.test(markdown);
        case 'code':
            return /```[\s\S]*?```/.test(markdown);
        case 'heading':
            return /^#{1,6}\s+.+$/m.test(markdown);
        case 'list':
            return /^(\s*)([-*+]|\d+\.)(\s+)(.+)$/m.test(markdown);
        default:
            return false;
    }
}