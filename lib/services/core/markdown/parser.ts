import { MarkdownToken, ParseRule } from './types';

export class MarkdownParser {
    public rules: ParseRule[] = [];
    private warnings: string[] = [];

    constructor() {
        // Don't setup default rules here - let extensions be added first
    }

    addRule(rule: ParseRule): void {
        // console.log(`Adding rule: ${rule.name}`);
        this.rules.push(rule);
        // Sort by priority - put specific patterns first
        this.rules.sort((a, b) => {
            // CUM extensions first (alert, embed, button)
            if (a.name.includes('alert') || a.name.includes('embed') || a.name.includes('button')) return -1;
            if (b.name.includes('alert') || b.name.includes('embed') || b.name.includes('button')) return 1;
            // Then other rules
            return a.name.localeCompare(b.name);
        });
        // console.log('Rules order:', this.rules.map(r => r.name));
    }

    setupDefaultRulesIfEmpty(): void {
        // Always ensure default rules are present
        // console.log('Ensuring default markdown rules are present...');
        // console.log('Current rules before default setup:', this.rules.map(r => r.name));
        this.setupDefaultRules();
        // console.log('Current rules after default setup:', this.rules.map(r => r.name));
    }

    parse(markdown: string): MarkdownToken[] {
        // Clear previous warnings
        this.warnings = [];

        // Ensure we have some rules
        this.setupDefaultRulesIfEmpty();

        // console.log('Parsing markdown:', markdown.substring(0, 100));
        // console.log('Available rules:', this.rules.map(r => r.name));

        // Pre-process markdown to handle common issues
        const processedMarkdown = this.preprocessMarkdown(markdown);

        const tokens: MarkdownToken[] = [];
        let remaining = processedMarkdown;
        let iterationCount = 0;
        const maxIterations = markdown.length * 2; // Safety valve

        while (remaining.length > 0 && iterationCount < maxIterations) {
            iterationCount++;
            let matched = false;
            let bestMatch: { rule: ParseRule; match: RegExpMatchArray; priority: number } | null = null;

            // Try each rule and find the best match (earliest position)
            for (const rule of this.rules) {
                try {
                    // Create a fresh regex without global flag for position-based matching
                    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', ''));
                    const match = remaining.match(pattern);

                    if (match && match.index !== undefined) {
                        // Prioritize matches at position 0, but also consider nearby matches
                        const priority = match.index === 0 ? 1000 : (1000 - match.index);

                        if (!bestMatch || priority > bestMatch.priority ||
                            (priority === bestMatch.priority && match.index < bestMatch.match.index!)) {
                            bestMatch = { rule, match, priority };
                        }
                    }
                } catch (error) {
                    console.warn(`Error in rule "${rule.name}":`, error);
                }
            }

            if (bestMatch && bestMatch.match.index !== undefined) {
                const { rule, match } = bestMatch;
                const matchIndex = match.index as number; // Type assertion since we've checked it's not undefined

                // If match is not at the beginning, take text before it
                if (matchIndex > 0) {
                    const textBefore = remaining.slice(0, matchIndex);
                    tokens.push({
                        type: 'text',
                        content: textBefore,
                        raw: textBefore
                    });
                    remaining = remaining.slice(matchIndex);
                    continue;
                }

                // Process the match
                try {
                    // console.log(`Rule "${rule.name}" matched:`, match[0].substring(0, 50));
                    const token = rule.render(match);
                    tokens.push({
                        ...token,
                        raw: match[0]
                    });

                    remaining = remaining.slice(match[0].length);
                    matched = true;
                } catch (error) {
                    console.error(`Error rendering token for rule "${rule.name}":`, error);
                    this.warnings.push(`Failed to render ${rule.name}: ${error}`);

                    // Fall back to treating as text
                    const char = remaining[0];
                    tokens.push({
                        type: 'text',
                        content: char,
                        raw: char
                    });
                    remaining = remaining.slice(1);
                }
            }

            if (!matched) {
                // Take one character and continue
                const char = remaining[0];
                tokens.push({
                    type: 'text',
                    content: char,
                    raw: char
                });
                remaining = remaining.slice(1);
            }
        }

        if (iterationCount >= maxIterations) {
            this.warnings.push('Parser hit maximum iterations - possible infinite loop detected');
        }

        // Post-process tokens to merge consecutive text and validate structure
        const processedTokens = this.postProcessTokens(tokens);

        // console.log('Final tokens:', processedTokens.slice(0, 10).map(t => `${t.type}: ${t.raw?.substring(0, 30)}`));
        // console.log(`Total tokens: ${processedTokens.length}`);

        if (this.warnings.length > 0) {
            console.warn('Parser warnings:', this.warnings);
        }

        return processedTokens;
    }

    private preprocessMarkdown(markdown: string): string {
        // Check for common markdown issues and warn about them
        this.validateMarkdown(markdown);

        // Normalize line endings
        return markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    private validateMarkdown(markdown: string): void {
        // Check for unclosed bold markers
        const boldMatches = markdown.match(/\*\*/g);
        if (boldMatches && boldMatches.length % 2 !== 0) {
            this.warnings.push('Unclosed bold markers (**) detected - some bold formatting may not work');
        }

        // Check for unclosed italic markers
        const italicMatches = markdown.match(/(?<!\*)\*(?!\*)/g);
        if (italicMatches && italicMatches.length % 2 !== 0) {
            this.warnings.push('Unclosed italic markers (*) detected - some italic formatting may not work');
        }

        // Check for unclosed code blocks
        const codeBlockMatches = markdown.match(/```/g);
        if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
            this.warnings.push('Unclosed code blocks (```) detected - some code formatting may not work');
        }

        // Check for unclosed inline code
        const inlineCodeMatches = markdown.match(/`/g);
        if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
            this.warnings.push('Unclosed inline code markers (`) detected - some code formatting may not work');
        }

        // Check for malformed links
        const openBrackets = (markdown.match(/\[/g) || []).length;
        const closeBrackets = (markdown.match(/\]/g) || []).length;
        const openParens = (markdown.match(/\(/g) || []).length;
        const closeParens = (markdown.match(/\)/g) || []).length;

        if (openBrackets !== closeBrackets) {
            this.warnings.push('Unmatched square brackets [] detected - some links may not work');
        }
        if (openParens !== closeParens) {
            this.warnings.push('Unmatched parentheses () detected - some links may not work');
        }
    }

    private postProcessTokens(tokens: MarkdownToken[]): MarkdownToken[] {
        const processed: MarkdownToken[] = [];
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.type === 'text') {
                // Collect consecutive text tokens
                let textContent = token.content || token.raw || '';
                let j = i + 1;

                while (j < tokens.length && tokens[j].type === 'text') {
                    textContent += tokens[j].content || tokens[j].raw || '';
                    j++;
                }

                // Only create a text token if there's actual content
                if (textContent.trim().length > 0 || textContent.includes('\n')) {
                    processed.push({
                        type: 'text',
                        content: textContent,
                        raw: textContent
                    });
                }

                i = j;
            } else {
                processed.push(token);
                i++;
            }
        }

        return processed;
    }

    private setupDefaultRules(): void {
        // Headers (most specific first)
        this.addRule({
            name: 'heading',
            pattern: /^(#{1,6})\s+(.+)$/m,
            render: (match) => ({
                type: 'heading',
                content: match[2].trim(),
                raw: match[0],
                attributes: {
                    level: match[1].length.toString()
                }
            })
        });

        // Code blocks (before inline code)
        this.addRule({
            name: 'codeblock',
            pattern: /```(\w+)?\s*\n([\s\S]*?)```/,
            render: (match) => ({
                type: 'codeblock',
                content: match[2],
                raw: match[0],
                attributes: {
                    language: match[1] || 'text'
                }
            })
        });

        // Hard line breaks - backslash at end of line
        this.addRule({
            name: 'hard-break-backslash',
            pattern: /\\\s*\n/,
            render: (match) => ({
                type: 'line-break',
                content: '',
                raw: match[0]
            })
        });

        // Hard line breaks - two spaces at end of line
        this.addRule({
            name: 'hard-break-spaces',
            pattern: /  +\n/,
            render: (match) => ({
                type: 'line-break',
                content: '',
                raw: match[0]
            })
        });

        // Paragraph breaks - double newlines
        this.addRule({
            name: 'paragraph-break',
            pattern: /\n\s*\n/,
            render: (match) => ({
                type: 'paragraph-break',
                content: '',
                raw: match[0]
            })
        });

        // Bold (before italic to avoid conflicts)
        this.addRule({
            name: 'bold',
            pattern: /\*\*((?:(?!\*\*).)+)\*\*/,
            render: (match) => ({
                type: 'bold',
                content: match[1],
                raw: match[0]
            })
        });

        // Italic
        this.addRule({
            name: 'italic',
            pattern: /\*((?:(?!\*).)+)\*/,
            render: (match) => ({
                type: 'italic',
                content: match[1],
                raw: match[0]
            })
        });

        // Inline code
        this.addRule({
            name: 'code',
            pattern: /`([^`]+)`/,
            render: (match) => ({
                type: 'code',
                content: match[1],
                raw: match[0]
            })
        });

        // Images (before links to avoid conflicts)
        this.addRule({
            name: 'image',
            pattern: /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/,
            render: (match) => ({
                type: 'image',
                content: match[1],
                raw: match[0],
                attributes: {
                    alt: match[1],
                    src: match[2],
                    title: match[3] || ''
                }
            })
        });

        // Links
        this.addRule({
            name: 'link',
            pattern: /\[([^\]]+)\]\(([^)]+)\)/,
            render: (match) => ({
                type: 'link',
                content: match[1],
                raw: match[0],
                attributes: {
                    href: match[2]
                }
            })
        });

        // Task lists (before regular lists)
        this.addRule({
            name: 'task-list',
            pattern: /^[\s]*-\s\[([ xX])\]\s(.+)$/m,
            render: (match) => ({
                type: 'task-item',
                content: match[2],
                raw: match[0],
                attributes: {
                    checked: (match[1].toLowerCase() === 'x').toString()
                }
            })
        });

        // Lists
        this.addRule({
            name: 'list',
            pattern: /^[\s]*[-*+]\s+(.+)$/m,
            render: (match) => ({
                type: 'list-item',
                content: match[1],
                raw: match[0]
            })
        });

        // Blockquotes
        this.addRule({
            name: 'blockquote',
            pattern: /^>\s+(.+)$/m,
            render: (match) => ({
                type: 'blockquote',
                content: match[1],
                raw: match[0]
            })
        });

        // Horizontal rules
        this.addRule({
            name: 'hr',
            pattern: /^---$/m,
            render: (match) => ({
                type: 'hr',
                content: '',
                raw: match[0]
            })
        });

        // Single newlines (soft line breaks) - handled last
        this.addRule({
            name: 'soft-break',
            pattern: /\n/,
            render: (match) => ({
                type: 'soft-break',
                content: ' ', // Convert to space for inline text
                raw: match[0]
            })
        });
    }

    // Public method to get warnings
    getWarnings(): string[] {
        return [...this.warnings];
    }
}