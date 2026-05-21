# Creating Extensions

Learn how to build your own Changerawr extensions from scratch.

## Extension Structure

A basic extension consists of two main parts:

```
my-extension/
├── index.ts          # Main extension file
├── package.json      # Extension metadata
├── README.md         # Documentation (optional)
├── CHANGELOG.md      # Version history (optional)
└── components/       # Custom UI components (optional)
```

## Minimal Extension Example

```typescript
import type { Extension } from '@changerawr/markdown';

// Extension metadata
export const metadata = {
  name: 'my-extension',
  displayName: 'My Extension',
  version: '1.0.0',
  author: 'Your Name',
  description: 'A simple example extension',
  category: 'formatting',
};

// Extension implementation
export const extension: Extension = {
  parseRules: [
    {
      name: 'my_syntax',
      pattern: /==([^=]+)==/g,
      replacement: (match, content) => {
        return `<mark>${content}</mark>`;
      },
    },
  ],
  renderRules: {
    mark: (content: string) => {
      return `<span class="bg-yellow-200 dark:bg-yellow-800">${content}</span>`;
    },
  },
};
```

## Extension API

### Parse Rules

Parse rules define how your custom markdown syntax is recognized and converted:

```typescript
parseRules: [
  {
    name: 'unique_name',           // Unique identifier for this rule
    pattern: /your-regex/g,        // Regex to match your syntax
    replacement: (match, ...groups) => {
      // Transform matched text
      return '<your-html>';
    },
  },
]
```

**Example**: Spoiler text

```typescript
{
  name: 'spoiler',
  pattern: /\|\|([^\|]+)\|\|/g,
  replacement: (match, content) => {
    return `<spoiler>${content}</spoiler>`;
  },
}
```

### Render Rules

Render rules define how custom HTML tags are styled and displayed:

```typescript
renderRules: {
  'your-tag': (content: string, attributes?: Record<string, string>) => {
    // Return HTML with styling
    return `<div class="...">${content}</div>`;
  },
}
```

**Example**: Spoiler rendering

```typescript
renderRules: {
  spoiler: (content: string) => {
    return `
      <span class="spoiler blur-sm hover:blur-none transition-all cursor-pointer">
        ${content}
      </span>
    `;
  },
}
```

## Advanced Features

### With Custom Attributes

```typescript
parseRules: [
  {
    name: 'callout',
    pattern: /:::(\w+)\n([\s\S]*?)\n:::/g,
    replacement: (match, type, content) => {
      return `<callout type="${type}">${content}</callout>`;
    },
  },
],
renderRules: {
  callout: (content: string, attributes?: Record<string, string>) => {
    const type = attributes?.type || 'info';
    const colors = {
      info: 'bg-blue-50 border-blue-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200',
    };
    return `
      <div class="border-l-4 p-4 ${colors[type] || colors.info}">
        ${content}
      </div>
    `;
  },
}
```

### With Toolbar Integration

See [Toolbar Integration](./toolbar.md) for details on adding toolbar buttons.

### With Settings

See [Settings System](./settings.md) for details on making extensions configurable.

## Best Practices

### Performance

✅ **Use efficient regex patterns** - Avoid catastrophic backtracking
✅ **Minimize DOM manipulation** - Keep render rules simple
✅ **Cache expensive operations** - Store computed values

### User Experience

✅ **Provide clear syntax** - Make patterns easy to remember
✅ **Show visual feedback** - Use distinct styling
✅ **Add keyboard shortcuts** - For toolbar buttons (optional)
✅ **Support dark mode** - Use Tailwind dark: variants

### Code Quality

✅ **Type everything** - Use TypeScript types
✅ **Add comments** - Explain complex logic
✅ **Test thoroughly** - Try edge cases
✅ **Follow naming conventions** - Use kebab-case for names

## Testing Your Extension

### Local Development with CLI Dev Server (Recommended)

The modern way to develop extensions is to use the Changerawr CLI dev server with hot-reload:

1. **Install Changerawr CLI globally**:
   ```bash
   npm install -g changerawr-cli
   ```

2. **Create your extension**:
   ```bash
   changerawr ext create my-extension
   cd my-extension
   ```

3. **Start the dev server**:
   ```bash
   changerawr ext dev
   ```

4. **Link your extension in the web UI**:
   - Navigate to Admin Dashboard → Extensions
   - Click "Link Local Extension"
   - Provide the full path to your extension directory
   - Click **Link**

5. **Develop with instant feedback**:
   - Make changes to your code
   - Save the file - changes apply instantly with Fast Refresh!
   - Watch validation results in the dev server console
   - Click "Open in Editor" button in web UI to jump to code

**Why the CLI dev server is better**:
- ✅ Instant hot-reload with file watching
- ✅ Live validation and error detection
- ✅ Interactive REPL console for debugging
- ✅ Real-time browser-CLI communication via WebSocket
- ✅ Automatic rendering/parsing events in console
- ✅ Breakpoint support for parse rules
- ✅ Remote code evaluation in browser context
- ✅ One-click editor opening via `changerawr://` protocol
- ✅ Professional development workflow

### Dev Tools Console

When you run `changerawr ext dev`, you get an interactive REPL console with these commands:

- `.help` - Show all available commands
- `.breakpoint <rule>` - Add breakpoint to a parse rule (pauses when rule matches)
- `.list` - List all active breakpoints
- `.clear` - Clear all breakpoints
- `.history` - Show console message history
- `.eval <code>` - Evaluate JavaScript in the browser context
- `.clients` - Show how many browsers are connected
- `.exit` - Exit the dev server

**Auto-Connection**: The Changerawr web app automatically connects to the dev server (port 3737) in development mode. You'll see real-time events when markdown is rendered:

```
[2:30:15 PM] ℹ️ Rendering 245 characters of markdown
[2:30:15 PM] ℹ️ Rendered 892 characters of HTML
```

**Available CLI Commands**:
- `changerawr ext create <name>` - Scaffold a new extension
- `changerawr ext dev` - Start development server with hot-reload
- `changerawr ext validate` - Validate extension structure
- `changerawr ext open` - Open extension in your editor
- `changerawr ext register-protocol` - Enable "Open in Editor" buttons
- `changerawr ext unregister-protocol` - Remove protocol handler

### Traditional Local Development

If you prefer the old way:

1. Create your extension in `extensions/changerawr/[name]/` directory
2. Run `npm run extensions:generate` to regenerate imports
3. Restart the dev server to load changes
4. Use the markdown editor to test syntax
5. Check the preview pane for rendering

### Debugging

```typescript
parseRules: [
  {
    name: 'debug',
    pattern: /your-pattern/g,
    replacement: (match, ...groups) => {
      console.log('Match:', match);
      console.log('Groups:', groups);
      return '...';
    },
  },
]
```

## Packaging for Distribution

### Create package.json

```json
{
  "name": "@yourname/my-extension",
  "version": "1.0.0",
  "description": "Extension description",
  "main": "index.ts",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["changerawr", "markdown", "extension"]
}
```

### Add README.md

Document your extension:
- What it does
- How to use it
- Syntax examples
- Screenshots (if applicable)

### Add CHANGELOG.md

Track version history using semantic versioning:

```markdown
# Changelog

## [1.0.0] - 2026-05-14

### Added
- Initial release
- Basic highlighting functionality
```

### Create GitHub Repository

1. Create a new repository
2. Push your extension code
3. Tag releases with version numbers
4. Submit to the extension store

## Next Steps

- Learn about [extension metadata](./metadata.md)
- Add [toolbar buttons](./toolbar.md)
- Implement [settings](./settings.md)
- See [examples](./examples.md) for inspiration
- Read [publishing guide](./publishing.md) to share your extension
