import { Extension, MarkdownToken } from '@changerawr/markdown';

/**
 * Enhanced Image Extension for Changerawr Markdown
 *
 * Block-level images with beautiful Tailwind styling
 *
 * Basic syntax:
 * ![alt text](url)
 *
 * With caption:
 * ![alt text](url "caption text")
 *
 * With size:
 * ![alt text](url){width=500}
 * ![alt text](url){height=300}
 * ![alt text](url){width=500 height=300}
 *
 * With alignment:
 * ![alt text](url){align=left}
 * ![alt text](url){align=center}
 * ![alt text](url){align=right}
 *
 * Combined:
 * ![Beautiful sunset](https://example.com/sunset.jpg "Photo taken in Santorini"){width=800 align=center}
 */

const imageExtension: Extension = {
  name: 'image',
  parseRules: [
    {
      name: 'image',
      // Match: ![alt](url), ![alt](url "title"), ![alt](url){attrs}
      // More strict pattern to avoid cross-image matching
      pattern: /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)(?:\{([^}]+)\})?/g,
      render: (match): MarkdownToken => {
        const alt = match[1] || '';
        const src = match[2] || '';
        let title = match[3] || '';
        const attributesStr = match[4] || '';

        // Remove quotes from title (already captured without quotes by regex)
        // No need to process further

        // Parse attributes {width=500 height=300 align=center}
        let width = '';
        let height = '';
        let align = '';

        if (attributesStr) {
          const widthMatch = attributesStr.match(/width=(\d+)/);
          const heightMatch = attributesStr.match(/height=(\d+)/);
          const alignMatch = attributesStr.match(/align=(left|center|right)/);

          if (widthMatch) width = widthMatch[1];
          if (heightMatch) height = heightMatch[1];
          if (alignMatch) align = alignMatch[1];
        }

        return {
          type: 'image',
          content: match[0],
          raw: match[0],
          attributes: {
            alt,
            src,
            title,
            width,
            height,
            align,
          }
        };
      }
    }
  ],
  renderRules: [
    {
      type: 'image',
      render: (token): string => {
        const alt = (token.attributes?.alt as string) || '';
        const src = (token.attributes?.src as string) || '';
        let title = (token.attributes?.title as string) || '';
        const width = (token.attributes?.width as string) || '';
        const height = (token.attributes?.height as string) || '';
        const align = (token.attributes?.align as string) || '';

        // Process markdown links in caption/title
        // Use a more precise regex that captures the entire link and processes it
        if (title) {
          // Escape HTML special characters first to prevent XSS
          const escapeHtml = (text: string) => {
            const div = { innerHTML: text };
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };

          // Parse links: [text](url) or [text](url "title")
          // Process each link individually to avoid cross-contamination
          let processedTitle = '';
          let lastIndex = 0;
          const linkRegex = /\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g;
          let match;

          while ((match = linkRegex.exec(title)) !== null) {
            // Add the text before this link (escaped)
            const beforeText = title.substring(lastIndex, match.index);
            processedTitle += escapeHtml(beforeText);

            // Add the link (URL and title are escaped, but link text can contain markdown)
            const linkText = match[1];
            const linkUrl = escapeHtml(match[2]);
            const linkTitle = match[3] ? ` title="${escapeHtml(match[3])}"` : '';

            processedTitle += `<a href="${linkUrl}"${linkTitle} class="text-primary hover:underline font-medium transition-colors">${escapeHtml(linkText)}</a>`;

            lastIndex = linkRegex.lastIndex;
          }

          // Add any remaining text after the last link (escaped)
          processedTitle += escapeHtml(title.substring(lastIndex));

          title = processedTitle;
        }

        // Build inline styles for the image
        const styles: string[] = [];
        if (width) styles.push(`width: ${width}px`);
        if (height) styles.push(`height: ${height}px`);

        // If only width is specified, maintain aspect ratio
        if (width && !height) {
          styles.push('height: auto');
        }
        // If only height is specified, maintain aspect ratio
        if (height && !width) {
          styles.push('width: auto');
        }

        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';

        // Container classes based on alignment
        let containerClasses = 'my-6';
        if (align === 'center') {
          containerClasses += ' flex flex-col items-center';
        } else if (align === 'left') {
          containerClasses += ' flex flex-col items-start';
        } else if (align === 'right') {
          containerClasses += ' flex flex-col items-end';
        } else {
          // Default to center if no alignment specified
          containerClasses += ' flex flex-col items-center';
        }

        // Image classes - always responsive
        const imgClasses = 'rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 max-w-full';

        let html = `<div class="${containerClasses}">`;
        html += `<img src="${src}" alt="${alt}" class="${imgClasses}"${styleAttr} loading="lazy" />`;

        // Add caption if title exists
        if (title) {
          html += `<p class="text-sm text-muted-foreground mt-3 italic text-center">${title}</p>`;
        }

        html += '</div>';
        return html;
      }
    }
  ]
};

export { imageExtension };
