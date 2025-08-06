// lib/services/core/markdown/types.ts

export interface MarkdownToken {
    type: string;
    content: string;
    raw: string;
    attributes?: Record<string, string>;
}

export interface ParseRule {
    name: string;
    pattern: RegExp;
    render: (match: RegExpMatchArray) => MarkdownToken;
}

export interface RenderRule {
    type: string;
    render: (token: MarkdownToken) => string;
}

export interface Extension {
    name: string;
    parseRules: ParseRule[];
    renderRules: RenderRule[];
}