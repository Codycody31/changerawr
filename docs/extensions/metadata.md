# Extension Metadata

Extension metadata defines how your extension appears and behaves in the Changerawr system.

## Metadata Structure

```typescript
export const metadata = {
  // Required fields
  name: string;
  displayName: string;
  version: string;

  // Optional fields
  author?: string;
  description?: string;
  category?: string;
  isBuiltIn?: boolean;

  // Advanced features
  toolbar?: ExtensionToolbar;
  readme?: string;
  changelog?: string;
  icon?: string;
  invertIcon?: boolean;
  settings?: ExtensionSettingSchema[];
};
```

## Required Fields

### name
**Type**: `string`
**Description**: Unique identifier for your extension (kebab-case recommended)
**Example**: `'highlight-text'`, `'spoiler-tags'`, `'custom-blocks'`

```typescript
name: 'my-extension'
```

### displayName
**Type**: `string`
**Description**: Human-readable name shown in the UI
**Example**: `'Highlight Text'`, `'Spoiler Tags'`, `'Custom Blocks'`

```typescript
displayName: 'My Awesome Extension'
```

### version
**Type**: `string`
**Description**: Extension version using semantic versioning (MAJOR.MINOR.PATCH)
**Example**: `'1.0.0'`, `'2.3.1'`, `'0.1.0-beta'`

```typescript
version: '1.0.0'
```

## Optional Fields

### author
**Type**: `string`
**Description**: Extension creator's name or organization

```typescript
author: 'Your Name'
```

### description
**Type**: `string`
**Description**: Brief description of what the extension does (1-2 sentences)

```typescript
description: 'Add customizable highlight colors to your markdown text'
```

### category
**Type**: `string`
**Description**: Extension category for organization

**Common categories**:
- `'formatting'` - Text formatting (bold, italic, highlight, etc.)
- `'blocks'` - Block elements (callouts, cards, tabs, etc.)
- `'media'` - Media elements (videos, embeds, galleries, etc.)
- `'advanced'` - Advanced features (diagrams, math, code, etc.)

```typescript
category: 'formatting'
```

### isBuiltIn
**Type**: `boolean`
**Description**: Whether this is a built-in extension (cannot be disabled/uninstalled)

```typescript
isBuiltIn: false  // Default, only true for core extensions
```

## Advanced Fields

### toolbar
**Type**: `ExtensionToolbar`
**Description**: Toolbar button configuration

See [Toolbar Integration](./toolbar.md) for details.

```typescript
toolbar: {
  buttons: [
    {
      id: 'highlight-button',
      icon: 'Highlighter',
      tooltip: 'Highlight Text',
      action: {
        before: '==',
        after: '==',
        placeholder: 'highlighted text'
      }
    }
  ]
}
```

### readme
**Type**: `string` (markdown)
**Description**: Full extension documentation in markdown format

```typescript
readme: `
# My Extension

This extension adds custom highlighting to markdown.

## Usage

\`\`\`
==highlighted text==
\`\`\`

## Features

- Multiple colors
- Custom color picker
- Dark mode support
`
```

### changelog
**Type**: `string` (markdown)
**Description**: Version history in markdown format

**Recommended format** (Semantic versioning):

```typescript
changelog: `
# Changelog

## [1.2.0] - 2026-05-14

### Added
- Custom color picker
- Dark mode support

### Fixed
- Color rendering bug

## [1.1.0] - 2026-04-10

### Added
- Multiple preset colors

## [1.0.0] - 2026-03-15

### Added
- Initial release
- Basic highlighting
`
```

### icon
**Type**: `string`
**Description**: Extension icon - either Lucide icon name or base64 image

**Lucide Icon** (recommended):
```typescript
icon: 'Highlighter'  // Use any Lucide icon name
```

**Custom Image**:
```typescript
icon: 'data:image/svg+xml;base64,...'
```

**Popular icons**:
- `'Highlighter'` - Highlighting
- `'EyeOff'` - Spoilers
- `'MessageSquare'` - Comments/callouts
- `'Image'` - Media
- `'Code'` - Code blocks
- `'Table'` - Tables
- `'List'` - Lists
- `'Layout'` - Layouts/blocks

### invertIcon
**Type**: `boolean`
**Description**: Whether to invert icon colors in dark mode (default: `false`)

Use this when your icon PNG is black and should be inverted to white in dark mode.

```typescript
invertIcon: true  // Invert icon in dark mode
```

**When to use**:
- ✅ Icon is black on transparent background
- ✅ Icon should appear white in dark mode
- ❌ Icon already has proper dark mode colors
- ❌ Icon is a Lucide icon (handled automatically)

### settings
**Type**: `ExtensionSettingSchema[]`
**Description**: Configurable options for your extension

See [Settings System](./settings.md) for details.

```typescript
settings: [
  {
    key: 'defaultColor',
    label: 'Default Highlight Color',
    description: 'The color used when no color is specified',
    type: 'color',
    defaultValue: '#fef08a'
  }
]
```

## Complete Example

```typescript
export const metadata = {
  name: 'advanced-highlight',
  displayName: 'Advanced Highlight',
  version: '2.1.0',
  author: 'Changerawr Team',
  description: 'Customizable text highlighting with multiple colors and styles',
  category: 'formatting',

  icon: 'Highlighter',

  toolbar: {
    buttons: [
      {
        id: 'highlight',
        icon: 'Highlighter',
        tooltip: 'Highlight Text',
        group: 'formatting'
      }
    ],
    customUI: [
      {
        buttonId: 'highlight',
        type: 'popover',
        component: HighlightPopover
      }
    ]
  },

  settings: [
    {
      key: 'defaultColor',
      label: 'Default Color',
      type: 'color',
      defaultValue: '#fef08a'
    },
    {
      key: 'enableCustomColors',
      label: 'Enable Custom Colors',
      type: 'boolean',
      defaultValue: true
    }
  ],

  readme: `...`,
  changelog: `...`
};
```

## Best Practices

### Naming
✅ Use kebab-case for `name`
✅ Use Title Case for `displayName`
✅ Keep names concise and descriptive

### Versioning
✅ Follow semantic versioning (semver)
✅ Increment MAJOR for breaking changes
✅ Increment MINOR for new features
✅ Increment PATCH for bug fixes

### Documentation
✅ Provide detailed README
✅ Maintain CHANGELOG for all versions
✅ Include usage examples
✅ Add screenshots if visual

### Icons
✅ Use Lucide icons when possible
✅ Choose icons that represent function
✅ Keep custom icons simple and clear

## Type Definitions

```typescript
interface ExtensionMetadata {
  name: string;
  displayName: string;
  version: string;
  author?: string;
  description?: string;
  category?: string;
  isBuiltIn?: boolean;
  toolbar?: ExtensionToolbar;
  readme?: string;
  changelog?: string;
  icon?: string;
  settings?: ExtensionSettingSchema[];
  invertIcon?: boolean;
}
```

## Next Steps

- Learn about [toolbar integration](./toolbar.md)
- Implement [settings](./settings.md)
- See [examples](./examples.md)
