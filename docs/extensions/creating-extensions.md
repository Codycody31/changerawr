# Creating Extensions

Learn how to build your own Changerawr extensions from scratch.

## Extension Structure

A basic extension consists of the following files:

```
my-extension/
├── index.ts          # Main extension file
├── toolbar.tsx       # Toolbar configuration (optional)
├── extension.json    # Extension metadata
├── README.md         # Documentation (optional)
├── CHANGELOG.md      # Version history (optional)
└── components/       # Custom UI components (optional)
```

## Minimal Extension Example

```typescript
import type { Extension, ExtensionMetadata } from '@/lib/services/extensions/sdk';

// Extension metadata
export const metadata: ExtensionMetadata = {
  name: 'my-extension',
  displayName: 'My Extension',
  version: '1.0.0',
  author: 'Your Name',
  description: 'A simple example extension',
  category: 'formatting',
  icon: 'Highlighter', // Lucide icon name (optional)
  isBuiltIn: false,
};

// Extension implementation
export const myExtension: Extension = {
  name: 'my-extension',

  parseRules: [
    {
      name: 'my_syntax',
      pattern: /==([^=]+)==/g,
      priority: 400, // Optional: controls execution order
      render: (match: RegExpMatchArray) => {
        return {
          type: 'highlight',
          content: match[1] || '',
          raw: match[0] || '',
          attributes: {
            color: '#fef08a',
          },
        };
      },
    },
  ],

  renderRules: [
    {
      type: 'highlight',
      render: (token): string => {
        const color = token.attributes?.color || '#fef08a';
        return `<mark style="background-color: ${color};">${token.content}</mark>`;
      },
    },
  ],
};
```

## Extension API

### Parse Rules

Parse rules define how your custom markdown syntax is recognized and converted into tokens:

```typescript
parseRules: [
  {
    name: 'unique_name',              // Unique identifier for this rule
    pattern: /your-regex/g,           // Regex to match your syntax
    priority: 500,                    // Optional: execution priority (see below)
    render: (match: RegExpMatchArray) => {
      return {
        type: 'token_type',           // Token type for render rules
        content: match[1] || '',      // The text content
        raw: match[0] || '',          // The original matched string
        attributes: {                 // Custom data to pass to render rule
          key: 'value',
        },
      };
    },
  },
]
```

#### Priority Guidelines

The `priority` field controls the order in which parse rules are executed:

- **800+**: HTML-like tags that must match before text escaping (e.g., `<cr>text</cr>`)
- **500-799**: Complex block patterns (e.g., spoiler blocks, tables)
- **100-499**: Inline formatting (e.g., highlight, inline code)
- **<100**: Simple replacements

Higher priority rules are matched first. If not specified, rules execute in the order they're defined.

**Example**: Spoiler text

```typescript
{
  name: 'spoiler',
  pattern: /:::spoiler(?: ([^\n]+))?\n([\s\S]*?)\n:::/,
  priority: 900, // High priority for block-level element
  render: (match: RegExpMatchArray) => {
    return {
      type: 'spoiler',
      content: match[2]?.trim() || '',
      raw: match[0] || '',
      attributes: {
        title: match[1]?.trim() || 'Click to reveal spoiler',
      },
    };
  },
}
```

### Render Rules

Render rules define how tokens are converted to HTML:

```typescript
renderRules: [
  {
    type: 'token_type',                    // Must match token type from parse rule
    render: (token): string => {           // Returns HTML string
      const value = token.attributes?.key; // Access custom attributes
      return `<div class="...">${token.content}</div>`;
    },
  },
]
```

**Important**: Render rules must return HTML strings, not objects.

**Example**: Spoiler rendering

```typescript
{
  type: 'spoiler',
  render: (token): string => {
    const title = token.attributes?.title || 'Click to reveal spoiler';
    return `
      <details class="spoiler-block border rounded-lg p-4 my-4">
        <summary class="cursor-pointer font-medium">${title}</summary>
        <div class="mt-3">${token.content}</div>
      </details>
    `;
  },
}
```

## Advanced Features

### Link Transformation

Transform custom link protocols:

```typescript
export const myExtension: Extension = {
  name: 'my-extension',

  transformLink: (href: string, title?: string) => {
    // Transform user:username to actual URL
    if (href.startsWith('user:')) {
      const username = href.slice(5);
      return {
        href: `https://example.com/users/${username}`,
        title: title || `User: ${username}`,
        target: '_blank',
        rel: 'noopener noreferrer',
      };
    }

    // Return unchanged for other links
    return { href, title };
  },
};
```

### Lifecycle Hooks

Execute code when extension loads or unloads:

```typescript
export const myExtension: Extension = {
  name: 'my-extension',

  onLoad: () => {
    console.log('Extension loaded!');
    // Initialize resources, connect to services, etc.
  },

  onUnload: () => {
    console.log('Extension unloaded!');
    // Cleanup resources
  },
};
```

### With Toolbar Integration

Add custom toolbar buttons:

```typescript
// toolbar.tsx
import type { ExtensionToolbar } from '@/lib/services/extensions/sdk';

export const myToolbar: ExtensionToolbar = {
  buttons: [
    {
      id: 'insert-highlight',
      icon: 'Highlighter',
      tooltip: 'Highlight text',
      group: 'formatting',
      action: {
        before: '==',
        after: '==',
        placeholder: 'highlighted text',
      },
    },
  ],
};

// index.ts
import { myToolbar } from './toolbar';

export const metadata: ExtensionMetadata = {
  // ...
  toolbar: myToolbar,
};
```

See [Toolbar Integration](./toolbar.md) for more details.

## Best Practices

### Performance

✅ **Use efficient regex patterns** - Avoid catastrophic backtracking
✅ **Set appropriate priorities** - Prevent conflicts between rules
✅ **Keep render rules simple** - Minimize complex logic
✅ **Escape user content** - Prevent XSS attacks

### Security

⚠️ **Never use `eval()` on user input**
⚠️ **Sanitize HTML attributes** - Escape quotes and special characters
⚠️ **Validate URLs** - Check protocols before transforming links
⚠️ **Use standard HTML tags** - Avoid custom tags that may be stripped

### User Experience

✅ **Provide clear syntax** - Make patterns easy to remember
✅ **Show visual feedback** - Use distinct styling
✅ **Support dark mode** - Use Tailwind `dark:` variants
✅ **Add helpful tooltips** - For toolbar buttons

### Code Quality

✅ **Type everything** - Use TypeScript types from SDK
✅ **Add comments** - Explain complex logic
✅ **Test edge cases** - Try malformed input
✅ **Follow naming conventions** - Use kebab-case for extension names

## Testing Your Extension

### Local Development

1. **Create extension directory**:
   ```
   extensions/changerawr/my-extension/
   ```

2. **Add your files**:
   - `index.ts` - Extension code
   - `extension.json` - Metadata
   - `toolbar.tsx` - Toolbar config (if needed)

3. **Regenerate imports**:
   ```bash
   npm run extensions:generate
   ```

4. **Restart dev server**:
   ```bash
   npm run dev
   ```

5. **Test in editor**:
   - Use the markdown editor to test your syntax
   - Check the preview pane for rendering
   - Verify toolbar buttons work correctly

### Debugging

Add console logs to understand what's happening:

```typescript
parseRules: [
  {
    name: 'debug',
    pattern: /your-pattern/g,
    render: (match: RegExpMatchArray) => {
      console.log('Match:', match);
      console.log('Captured groups:', match.slice(1));
      return {
        type: 'debug',
        content: match[1] || '',
        raw: match[0] || '',
        attributes: {},
      };
    },
  },
]
```

## Packaging for Distribution

### Create extension.json

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Extension description",
  "category": "formatting",
  "icon": "Highlighter",
  "repository": "https://github.com/yourname/my-extension",
  "license": "MIT",
  "keywords": ["changerawr", "markdown", "extension"]
}
```

### Add README.md

Document your extension:
- What it does
- How to use it
- Syntax examples with markdown
- Screenshots (if applicable)
- Installation instructions

### Add CHANGELOG.md

Track version history using semantic versioning:

```markdown
# Changelog

## [1.0.0] - 2026-05-20

### Added
- Initial release
- Basic highlighting functionality
- Toolbar integration
```

### Create GitHub Repository

1. Create a new repository
2. Push your extension code
3. Tag releases with version numbers (`git tag v1.0.0`)
4. Submit to the extension store

## Common Patterns

### Block-Level Elements

Use high priority and multiline patterns:

```typescript
{
  name: 'callout',
  pattern: /:::callout\{([^}]+)\}\n([\s\S]*?)\n:::/,
  priority: 700,
  render: (match: RegExpMatchArray) => ({
    type: 'callout',
    content: match[2] || '',
    raw: match[0] || '',
    attributes: { variant: match[1] },
  }),
}
```

### Inline Formatting

Use medium priority:

```typescript
{
  name: 'highlight',
  pattern: /==([^=]+)==/g,
  priority: 400,
  render: (match: RegExpMatchArray) => ({
    type: 'highlight',
    content: match[1] || '',
    raw: match[0] || '',
    attributes: {},
  }),
}
```

### HTML-Like Tags

Use very high priority to match before text escaping:

```typescript
{
  name: 'color',
  pattern: /<c:([^>]+)>([^<]+)<\/c:[^>]+>/g,
  priority: 850,
  render: (match: RegExpMatchArray) => ({
    type: 'color',
    content: match[2] || '',
    raw: match[0] || '',
    attributes: { color: match[1] },
  }),
}
```

## Next Steps

- Learn about [extension metadata](./metadata.md)
- Add [toolbar buttons](./toolbar.md)
- Read [publishing guide](./publishing.md) to share your extension
