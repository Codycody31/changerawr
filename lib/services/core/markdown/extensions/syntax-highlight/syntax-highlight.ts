import {Extension, MarkdownToken} from '@changerawr/markdown';
import Prism from 'prismjs';

// Import common languages that exist in prismjs
import 'prismjs/components/prism-markup'; // HTML/XML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

/**
 * Language aliases - map common language names to Prism language identifiers
 */
const languageAliases: Record<string, string> = {
    'html': 'markup',
    'xml': 'markup',
    'svg': 'markup',
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'shell': 'bash',
    'yml': 'yaml',
};

/**
 * Syntax Highlighting Extension for Changerawr Markdown
 *
 * Uses Prism.js for syntax highlighting with support for 20+ languages
 *
 * Examples:
 * ```javascript
 * const hello = 'world';
 * ```
 *
 * ```python
 * def hello():
 *     print("world")
 * ```
 */
const syntaxHighlightExtension: Extension = {
    name: 'syntax-highlight',

    parseRules: [
        {
            name: 'code_block',
            // Block-level code fence pattern: ```language\ncode\n```
            // Must be at start of line, captures language and code content
            pattern: /^```(\w+)?\n([\s\S]*?)```$/m,
            render: (match): MarkdownToken => {
                const language = match[1] || 'text';
                const code = match[2] || '';

                return {
                    type: 'code_block',
                    content: code,
                    raw: match[0],
                    attributes: {
                        language,
                    },
                };
            }
        }
    ],

    renderRules: [
        {
            type: 'code_block',
            render: (token): string => {
                const code = token.content;
                let language = token.attributes?.language || 'text';

                // Map language aliases to actual Prism language identifiers
                language = languageAliases[language.toLowerCase()] || language;

                // Try to highlight with Prism, fall back to escaped HTML if language not supported
                let highlightedCode: string;
                try {
                    const grammar = Prism.languages[language];
                    if (grammar) {
                        highlightedCode = Prism.highlight(code, grammar, language);
                    } else {
                        // Language not supported, just escape HTML
                        highlightedCode = code
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                    }
                } catch (error) {
                    // If highlighting fails, fall back to escaped HTML
                    highlightedCode = code
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }

                const languageClass = `language-${language}`;

                return `<div class="code-block-wrapper my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
  <div class="code-block-header bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
    <span class="text-xs font-mono text-gray-600 dark:text-gray-400 uppercase">${language}</span>
    <button
      type="button"
      class="copy-code-button text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      data-copy-button
    >
      Copy
    </button>
  </div>
  <pre class="m-0 p-4 bg-gray-50 dark:bg-gray-900 overflow-x-auto"><code class="${languageClass} text-sm">${highlightedCode}</code></pre>
</div>`;
            }
        }
    ]
};

export {syntaxHighlightExtension};
