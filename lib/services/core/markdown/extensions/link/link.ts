import { Extension, MarkdownToken } from '@changerawr/markdown';

/**
 * Enhanced Link Extension for Changerawr Markdown
 *
 * Supports links with markdown formatting inside link text
 *
 * Basic:
 * [link text](url)
 *
 * With title:
 * [link text](url "hover title")
 *
 * With markdown inside:
 * [**bold link**](url)
 * [*italic link*](url)
 * [~~strikethrough~~](url)
 * [`code link`](url)
 * [**Bold** and *italic*](url)
 */

const linkExtension: Extension = {
  name: 'link',
  parseRules: [
    {
      name: 'link',
      // Match [text](url) or [text](url "title")
      // Updated regex to handle URLs with query params and special chars
      pattern: /\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g,
      render: (match): MarkdownToken => {
        const text = match[1] || '';
        const url = match[2] || '';
        let title = match[3] || '';

        // Remove quotes from title
        if (title) {
          title = title.replace(/^["']|["']$/g, '');
        }

        return {
          type: 'link',
          content: match[0],
          raw: match[0],
          attributes: {
            text,
            url,
            title,
          }
        };
      }
    }
  ],
  renderRules: [
    {
      type: 'link',
      render: (token): string => {
        let text = (token.attributes?.text as string) || '';
        const url = (token.attributes?.url as string) || '';
        const title = (token.attributes?.title as string) || '';

        // Process inline markdown in link text
        // Code (backticks) - highest priority
        text = text.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 text-sm bg-muted rounded font-mono">$1</code>');

        // Bold + italic (***text***)
        text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');

        // Bold (**text** or __text__)
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        // Italic (*text* or _text_)
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

        // Strikethrough (~~text~~)
        text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // Build title attribute
        const titleAttr = title ? ` title="${title}"` : '';

        // Return link with styling
        return `<a href="${url}"${titleAttr} class="text-primary hover:underline font-medium transition-colors">${text}</a>`;
      }
    }
  ]
};

export { linkExtension };
