// lib/services/core/markdown/index.ts

import {MarkdownParser} from './parser';
import {MarkdownRenderer} from './renderer';
import {Extension, MarkdownToken} from './types';

// CUM Extensions
import {ButtonExtension} from './extensions/button';
import {AlertExtension} from './extensions/alert';
import {EmbedExtension} from './extensions/embed';

export class ChangerawrMarkdown {
    private parser: MarkdownParser;
    private renderer: MarkdownRenderer;
    private extensions: Map<string, Extension> = new Map();

    constructor() {
        this.parser = new MarkdownParser();
        this.renderer = new MarkdownRenderer();

        // Register CUM extensions FIRST, before any default rules
        console.log('Registering CUM extensions...');
        this.registerExtension(ButtonExtension);
        this.registerExtension(AlertExtension);
        this.registerExtension(EmbedExtension);

        // Now setup default parser rules (renderer rules are already setup)
        this.parser.setupDefaultRulesIfEmpty();

        // Debug: Log registered rules
        console.log('Parser rules:', this.parser.rules?.map(r => r.name) || 'rules not accessible');
        console.log('Renderer rules:', this.renderer.getRegisteredRules());
    }

    registerExtension(extension: Extension): void {
        console.log(`Registering extension: ${extension.name}`);
        this.extensions.set(extension.name, extension);

        // Add parse rules to parser FIRST
        extension.parseRules.forEach(rule => {
            console.log(`Adding parse rule: ${rule.name} with pattern: ${rule.pattern}`);
            this.parser.addRule(rule);
        });

        // Add render rules to renderer
        extension.renderRules.forEach(rule => {
            console.log(`Adding render rule: ${rule.type}`);
            this.renderer.addRule(rule);
        });
    }

    unregisterExtension(name: string): void {
        const extension = this.extensions.get(name);
        if (!extension) return;

        // Remove the extension
        this.extensions.delete(name);

        // Rebuild parser rules (remove extension rules)
        this.rebuildParser();

        // Rebuild renderer rules (remove extension rules)
        this.rebuildRenderer();
    }

    private rebuildParser(): void {
        // Clear current rules and rebuild from scratch
        this.parser = new MarkdownParser();

        // Re-add all extension rules
        for (const extension of this.extensions.values()) {
            extension.parseRules.forEach(rule => {
                this.parser.addRule(rule);
            });
        }

        // Add default rules
        this.parser.setupDefaultRulesIfEmpty();
    }

    private rebuildRenderer(): void {
        // Clear current rules and rebuild from scratch
        this.renderer = new MarkdownRenderer();

        // Re-add all extension rules
        for (const extension of this.extensions.values()) {
            extension.renderRules.forEach(rule => {
                this.renderer.addRule(rule);
            });
        }
    }

    parse(markdown: string): MarkdownToken[] {
        console.log('Parsing markdown in main class:', markdown.substring(0, 50));
        const tokens = this.parser.parse(markdown);
        console.log('Parsed tokens:', tokens.map(t => ({type: t.type, content: t.content?.substring(0, 30)})));
        return tokens;
    }

    render(tokens: MarkdownToken[]): string {
        console.log('Rendering tokens in main class:', tokens.map(t => t.type));
        return this.renderer.render(tokens);
    }

    toHtml(markdown: string): string {
        const tokens = this.parse(markdown);
        const html = this.render(tokens);
        console.log('Final HTML output:', html.substring(0, 200));
        return html;
    }

    getExtensions(): string[] {
        return Array.from(this.extensions.keys());
    }

    hasExtension(name: string): boolean {
        return this.extensions.has(name);
    }

    // Debug method to check registered rules
    debugRules(): void {
        console.log('=== DEBUG RULES ===');
        console.log('Extensions:', this.getExtensions());
        console.log('Renderer rules:', this.renderer.getRegisteredRules());
        console.log('===================');
    }
}

// Create a default instance
export const markdown = new ChangerawrMarkdown();

// Export everything else
export * from './types';
export * from './parser';
export * from './renderer';
export * from './extensions/button';
export * from './extensions/alert';
export * from './extensions/embed';

// Convenience functions
export function parseMarkdown(content: string): MarkdownToken[] {
    return markdown.parse(content);
}

export function renderMarkdown(content: string): string {
    return markdown.toHtml(content);
}

// Debug function
export function debugMarkdown(): void {
    markdown.debugRules();
}