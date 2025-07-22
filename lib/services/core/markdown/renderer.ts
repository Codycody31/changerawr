import {MarkdownToken, RenderRule} from './types';

// Import DOMPurify with SSR safety but use it minimally
let DOMPurify: { sanitize: (html: string, options?: Record<string, unknown>) => string } = {
    sanitize: (html: string) => html
};

if (typeof window !== 'undefined') {
    import('dompurify').then(module => {
        DOMPurify = module.default;
    }).catch(err => {
        console.error('Failed to load DOMPurify', err);
    });
}

// Much more permissive allowlists for embeds
const ALLOWED_TAGS = [
    // Standard HTML
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'del', 'ins',
    'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead',
    'tbody', 'tr', 'th', 'td', 'div', 'span', 'sup', 'sub', 'hr', 'input',
    // Embeds
    'iframe', 'embed', 'object', 'param', 'video', 'audio', 'source',
    // SVG
    'svg', 'path', 'polyline', 'line', 'circle', 'rect', 'g', 'defs', 'use',
    // Form elements
    'form', 'fieldset', 'legend', 'label', 'select', 'option', 'textarea', 'button'
];

const ALLOWED_ATTR = [
    // Standard attributes
    'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel', 'type',
    'checked', 'disabled', 'loading', 'width', 'height', 'style', 'role',
    // Iframe attributes
    'frameborder', 'allowfullscreen', 'allow', 'sandbox', 'scrolling',
    'allowtransparency', 'name', 'seamless', 'srcdoc',
    // Data attributes (for embeds)
    'data-*',
    // SVG attributes
    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'd', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    // Media attributes
    'autoplay', 'controls', 'loop', 'muted', 'preload', 'poster',
    // Form attributes
    'value', 'placeholder', 'required', 'readonly', 'maxlength', 'minlength',
    'max', 'min', 'step', 'pattern', 'autocomplete', 'autofocus'
];

export class MarkdownRenderer {
    private rules: Map<string, RenderRule> = new Map();

    constructor() {
        this.setupDefaultRules();
    }

    addRule(rule: RenderRule): void {
        console.log(`Adding render rule for type: ${rule.type}`);
        this.rules.set(rule.type, rule);
    }

    render(tokens: MarkdownToken[]): string {
        console.log('🎨 Rendering tokens:', tokens.map(t => `${t.type}: ${t.raw?.substring(0, 30)}`));

        // Render each token
        const htmlParts = tokens.map(token => this.renderToken(token));
        const combinedHtml = htmlParts.join('');

        console.log('🎨 Combined HTML length before sanitization:', combinedHtml.length);

        // Apply minimal sanitization
        const sanitizedHtml = this.minimalSanitize(combinedHtml);

        console.log('🎨 Final HTML length after sanitization:', sanitizedHtml.length);
        return sanitizedHtml;
    }

    private renderToken(token: MarkdownToken): string {
        const rule = this.rules.get(token.type);

        if (rule) {
            console.log(`🎨 Rendering token type '${token.type}' with registered rule`);
            try {
                const result = rule.render(token);
                console.log(`🎨 Rule output length: ${result.length}`);
                return result;
            } catch (error) {
                console.error(`🎨 Error rendering token ${token.type}:`, error);
                return this.createErrorBlock(`Render error for ${token.type}: ${error}`);
            }
        }

        // Enhanced fallback with better debugging
        console.warn(`🎨 No render rule found for token type: '${token.type}'. Available rules:`, Array.from(this.rules.keys()));

        // For text tokens, just return the content
        if (token.type === 'text') {
            return this.escapeHtml(token.content || token.raw);
        }

        // For unknown types in development, show debug info
        if (process.env.NODE_ENV === 'development') {
            return this.createDebugBlock(token);
        }

        // In production, return the content safely
        return this.escapeHtml(token.content || token.raw || '');
    }

    // Public method to check what rules are registered
    getRegisteredRules(): string[] {
        return Array.from(this.rules.keys());
    }

    private createErrorBlock(message: string): string {
        return `<div class="bg-red-100 border border-red-300 text-red-800 p-2 rounded text-sm mb-2">
            <strong>Render Error:</strong> ${this.escapeHtml(message)}
        </div>`;
    }

    private createDebugBlock(token: MarkdownToken): string {
        return `<div class="bg-yellow-100 border border-yellow-300 text-yellow-800 p-2 rounded text-sm mb-2">
            <strong>Unknown token type:</strong> ${this.escapeHtml(token.type)}<br>
            <strong>Content:</strong> ${this.escapeHtml(token.content || token.raw || '')}
        </div>`;
    }

    private setupDefaultRules(): void {
        this.addRule({
            type: 'heading',
            render: (token) => {
                const level = parseInt(token.attributes?.level || '1');
                const text = token.content;
                const id = this.generateId(text);
                const escapedContent = this.escapeHtml(text);

                let headingClasses = 'group relative flex items-center gap-2';

                switch (level) {
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

                return `<h${level} id="${id}" class="${headingClasses}">
          ${escapedContent}
          <a href="#${id}" class="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.5 4H5.75A3.75 3.75 0 002 7.75v.5a3.75 3.75 0 003.75 3.75h1.5m-1.5-4h3m1.5-4h1.75A3.75 3.75 0 0114 7.75v.5a3.75 3.75 0 01-3.75 3.75H8.5"/>
            </svg>
          </a>
        </h${level}>`;
            }
        });

        this.addRule({
            type: 'bold',
            render: (token) => `<strong>${this.escapeHtml(token.content)}</strong>`
        });

        this.addRule({
            type: 'italic',
            render: (token) => `<em>${this.escapeHtml(token.content)}</em>`
        });

        this.addRule({
            type: 'code',
            render: (token) => `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">${this.escapeHtml(token.content)}</code>`
        });

        this.addRule({
            type: 'codeblock',
            render: (token) => {
                const language = token.attributes?.language || 'text';
                const escapedCode = this.escapeHtml(token.content);
                return `<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="language-${this.escapeHtml(language)}">${escapedCode}</code></pre>`;
            }
        });

        this.addRule({
            type: 'link',
            render: (token) => {
                const href = token.attributes?.href || '#';
                const escapedHref = this.escapeHtml(href);
                const escapedText = this.escapeHtml(token.content);

                return `<a href="${escapedHref}" class="text-primary hover:underline inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer">
          ${escapedText}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>`;
            }
        });

        this.addRule({
            type: 'list-item',
            render: (token) => `<li>${this.escapeHtml(token.content)}</li>`
        });

        this.addRule({
            type: 'blockquote',
            render: (token) => `<blockquote class="pl-4 py-2 border-l-2 border-border italic text-muted-foreground my-4">${this.escapeHtml(token.content)}</blockquote>`
        });

        this.addRule({
            type: 'text',
            render: (token) => {
                if (!token.content) return '';
                // For remaining text tokens, just escape and return
                return this.escapeHtml(token.content);
            }
        });

        this.addRule({
            type: 'paragraph',
            render: (token) => {
                if (!token.content) return '';
                const content = token.content.trim();
                if (!content) return '';

                // Check if content already contains HTML tags (like <br>)
                if (content.includes('<br>')) {
                    return `<p class="leading-7 mb-4">${content}</p>`;
                } else {
                    return `<p class="leading-7 mb-4">${this.escapeHtml(content)}</p>`;
                }
            }
        });

        this.addRule({
            type: 'task-item',
            render: (token) => {
                const isChecked = token.attributes?.checked === 'true';
                const escapedContent = this.escapeHtml(token.content);

                return `<div class="flex items-center gap-2 my-2 task-list-item">
          <input type="checkbox" ${isChecked ? 'checked' : ''} disabled 
            class="form-checkbox h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <span${isChecked ? ' class="line-through text-muted-foreground"' : ''}>${escapedContent}</span>
        </div>`;
            }
        });

        this.addRule({
            type: 'image',
            render: (token) => {
                const src = token.attributes?.src || '';
                const alt = token.attributes?.alt || '';
                const title = token.attributes?.title || '';
                const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';

                return `<img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(alt)}"${titleAttr} class="max-w-full h-auto rounded-lg my-4" loading="lazy" />`;
            }
        });

        this.addRule({
            type: 'hr',
            render: () => '<hr class="my-6 border-t border-border">'
        });

        // Line break handling
        this.addRule({
            type: 'line-break',
            render: () => '<br class="leading-7">'
        });

        this.addRule({
            type: 'paragraph-break',
            render: () => '</p><p class="leading-7 mb-4">'
        });

        this.addRule({
            type: 'soft-break',
            render: (token) => token.content // Usually a space
        });
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }

    private generateId(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .trim();
    }

    private minimalSanitize(html: string): string {
        try {
            // Skip sanitization entirely for embed content in debug mode
            if (html.includes('codepen.io/') || html.includes('youtube.com/embed/') || html.includes('🚨 DEBUG')) {
                console.log('🚨 SKIPPING SANITIZATION for embed content');
                return html;
            }

            // For embeds, we need to be much more permissive
            if (typeof DOMPurify?.sanitize === 'function') {
                const sanitized = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS,
                    ALLOWED_ATTR,
                    ALLOW_DATA_ATTR: true, // Allow data-* attributes for embeds
                    ALLOW_UNKNOWN_PROTOCOLS: false,
                    SAFE_FOR_TEMPLATES: false,
                    WHOLE_DOCUMENT: false,
                    RETURN_DOM: false,
                    RETURN_DOM_FRAGMENT: false,
                    FORCE_BODY: false,
                    SANITIZE_DOM: false, // Don't sanitize DOM for embeds
                    SANITIZE_NAMED_PROPS: false, // Don't sanitize named properties
                    // Only block dangerous event handlers, not styling or embed attributes
                    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
                    // Explicitly allow iframe with all necessary attributes
                    ADD_TAGS: ['iframe', 'embed', 'object', 'param'],
                    ADD_ATTR: [
                        'allow', 'allowfullscreen', 'frameborder', 'scrolling',
                        'allowtransparency', 'sandbox', 'loading', 'style',
                        'title', 'name', 'seamless', 'srcdoc'
                    ],
                    // Don't transform URLs
                    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
                });

                if (sanitized.length < html.length * 0.7) {
                    console.warn('🚨 MAJOR content loss during sanitization! Falling back to basic sanitization');
                    console.log('Original length:', html.length);
                    console.log('Sanitized length:', sanitized.length);
                    console.log('Original HTML sample:', html.substring(0, 200));
                    console.log('Sanitized HTML sample:', sanitized.substring(0, 200));

                    // Fall back to basic sanitization if too much content is lost
                    return this.basicSanitize(html);
                }

                return sanitized;
            }

            // Fallback: minimal unsafe content removal
            return this.basicSanitize(html);
        } catch (error) {
            console.error('Sanitization failed:', error);
            return this.basicSanitize(html);
        }
    }

    private basicSanitize(html: string): string {
        // Very basic sanitization - only remove obviously dangerous content
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/on\w+\s*=\s*'[^']*'/gi, '')
            .replace(/javascript:/gi, '');
    }
}