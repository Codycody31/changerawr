# Extension Settings System

Make your extensions configurable with a powerful settings system that supports multiple input types and validation.

## Overview

The settings system allows extensions to define configurable options that users can modify through a UI. Settings are:

- **Type-safe** - Define schemas with validation
- **Persistent** - Automatically saved to database
- **User-friendly** - Beautiful UI with appropriate input controls
- **Accessible** - Available via settings API in your extension code

## Defining Settings

Add a `settings` array to your extension metadata:

```typescript
export const metadata = {
  name: 'my-extension',
  displayName: 'My Extension',
  version: '1.0.0',

  settings: [
    {
      key: 'enabled',
      label: 'Enable Feature',
      description: 'Toggle this feature on or off',
      type: 'boolean',
      defaultValue: true
    },
    {
      key: 'theme',
      label: 'Color Theme',
      description: 'Choose your preferred color theme',
      type: 'select',
      defaultValue: 'blue',
      options: [
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Red', value: 'red' }
      ]
    }
  ]
};
```

## Setting Types

### Boolean

Simple on/off toggle switches.

```typescript
{
  key: 'darkMode',
  label: 'Dark Mode',
  description: 'Enable dark mode styling',
  type: 'boolean',
  defaultValue: false
}
```

**Rendered as**: Toggle switch

### String

Single-line text input.

```typescript
{
  key: 'prefix',
  label: 'Prefix Text',
  description: 'Text to prepend to output',
  type: 'string',
  defaultValue: 'Note:',
  placeholder: 'Enter prefix...',
  required: true
}
```

**Properties**:
- `placeholder` - Hint text shown when empty
- `required` - Whether field must be filled

**Rendered as**: Text input field

### Number

Numeric input with optional min/max constraints.

```typescript
{
  key: 'maxItems',
  label: 'Maximum Items',
  description: 'Maximum number of items to display',
  type: 'number',
  defaultValue: 10,
  min: 1,
  max: 100
}
```

**Properties**:
- `min` - Minimum allowed value
- `max` - Maximum allowed value

**Rendered as**: Number input with spinner

### Select

Dropdown selection from predefined options.

```typescript
{
  key: 'alignment',
  label: 'Text Alignment',
  description: 'How to align the text',
  type: 'select',
  defaultValue: 'left',
  options: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' }
  ]
}
```

**Properties**:
- `options` - Array of `{ label, value }` objects

**Rendered as**: Dropdown select

### Textarea

Multi-line text input for longer content.

```typescript
{
  key: 'template',
  label: 'Custom Template',
  description: 'HTML template for rendering',
  type: 'textarea',
  defaultValue: '<div>{content}</div>',
  placeholder: 'Enter template HTML...'
}
```

**Properties**:
- `placeholder` - Hint text shown when empty

**Rendered as**: Multi-line textarea (4 rows)

### Color

Color picker for hex color values.

```typescript
{
  key: 'highlightColor',
  label: 'Highlight Color',
  description: 'Background color for highlights',
  type: 'color',
  defaultValue: '#fef08a'
}
```

**Rendered as**: Color picker + hex input field

## Setting Schema

### Required Fields

```typescript
interface ExtensionSettingSchema {
  key: string;              // Unique identifier
  label: string;            // Display name
  type: 'boolean' | 'string' | 'number' | 'select' | 'textarea' | 'color';
  defaultValue: string | number | boolean;
}
```

### Optional Fields

```typescript
interface ExtensionSettingSchema {
  // ... required fields
  description?: string;     // Help text shown below input
  placeholder?: string;     // Placeholder text (string/textarea)
  required?: boolean;       // Whether field is required (string/textarea)
  min?: number;            // Minimum value (number)
  max?: number;            // Maximum value (number)
  options?: Array<{        // Options (select)
    label: string;
    value: string | number;
  }>;
}
```

## Accessing Settings

### In Your Extension Code

Settings are not directly available in parse/render rules since they're static. Instead, use settings to generate code:

```typescript
export const metadata = {
  settings: [
    {
      key: 'defaultColor',
      type: 'color',
      defaultValue: '#fef08a'
    }
  ]
};

// Settings are used at build-time to generate the extension
export const extension: Extension = {
  parseRules: [
    {
      name: 'highlight',
      pattern: /==([^=]+)==/g,
      replacement: (match, content) => {
        // Note: You can't access settings here directly
        // Settings influence the extension at registration time
        return `<mark>${content}</mark>`;
      }
    }
  ]
};
```

### Dynamic Settings Usage

For settings that need to affect runtime behavior, you can:

1. **Inline the setting value in metadata**
2. **Use CSS variables** for colors/styles
3. **Generate multiple versions** based on settings

Example with CSS variables:

```typescript
export const metadata = {
  settings: [
    {
      key: 'highlightColor',
      type: 'color',
      defaultValue: '#fef08a'
    }
  ]
};

export const extension: Extension = {
  renderRules: {
    mark: (content: string) => {
      // Use CSS variable that can be set via settings
      return `<span style="background: var(--highlight-color, #fef08a);">${content}</span>`;
    }
  }
};
```

## User Interface

### Accessing Settings

Users can configure extension settings through the Extensions page:

1. Navigate to **Admin Dashboard** → **Extensions**
2. Click **Installed** tab
3. Find the extension
4. Click the **Settings** button
5. Modify settings in the dialog
6. Click **Save Settings**

### Settings Dialog

The settings dialog automatically generates appropriate UI controls:

- **Boolean** → Toggle switch
- **String** → Text input
- **Number** → Number input with min/max
- **Select** → Dropdown menu
- **Textarea** → Multi-line text area
- **Color** → Color picker with hex input

Each setting shows:
- Label (bold)
- Input control
- Description (help text below)

## Best Practices

### Naming

✅ Use clear, descriptive labels
```typescript
label: 'Default Highlight Color'  // Good
label: 'Color'                     // Too vague
```

✅ Use camelCase for keys
```typescript
key: 'defaultColor'    // Good
key: 'default-color'   // Avoid
key: 'DefaultColor'    // Avoid
```

### Descriptions

✅ Explain what the setting does
```typescript
description: 'The color used when no color is specified in the syntax'
```

✅ Include examples if helpful
```typescript
description: 'Template variables: {content}, {type}, {color}'
```

### Default Values

✅ Choose sensible defaults
```typescript
defaultValue: '#fef08a'  // A pleasant yellow
```

✅ Match the type
```typescript
type: 'number',
defaultValue: 10         // Number, not "10"
```

### Validation

✅ Use min/max for numbers
```typescript
type: 'number',
min: 1,
max: 100,
defaultValue: 10
```

✅ Use required for critical settings
```typescript
type: 'string',
required: true
```

### Organization

✅ Group related settings
```typescript
settings: [
  // Color settings
  { key: 'primaryColor', ... },
  { key: 'secondaryColor', ... },

  // Layout settings
  { key: 'maxWidth', ... },
  { key: 'padding', ... }
]
```

## Complete Example

```typescript
export const metadata = {
  name: 'advanced-callout',
  displayName: 'Advanced Callouts',
  version: '1.0.0',

  settings: [
    // Enable/disable features
    {
      key: 'enableIcons',
      label: 'Show Icons',
      description: 'Display icons in callout headers',
      type: 'boolean',
      defaultValue: true
    },

    // Color customization
    {
      key: 'infoColor',
      label: 'Info Callout Color',
      description: 'Background color for info callouts',
      type: 'color',
      defaultValue: '#dbeafe'
    },
    {
      key: 'warningColor',
      label: 'Warning Callout Color',
      description: 'Background color for warning callouts',
      type: 'color',
      defaultValue: '#fef3c7'
    },

    // Style options
    {
      key: 'style',
      label: 'Callout Style',
      description: 'Visual style for callouts',
      type: 'select',
      defaultValue: 'bordered',
      options: [
        { label: 'Bordered', value: 'bordered' },
        { label: 'Filled', value: 'filled' },
        { label: 'Minimal', value: 'minimal' }
      ]
    },

    // Layout
    {
      key: 'borderRadius',
      label: 'Border Radius (px)',
      description: 'Roundness of callout corners',
      type: 'number',
      defaultValue: 8,
      min: 0,
      max: 20
    },

    // Custom template
    {
      key: 'customTemplate',
      label: 'Custom HTML Template',
      description: 'Override default template. Use {type}, {content}, {color}',
      type: 'textarea',
      defaultValue: '<div class="callout callout-{type}">{content}</div>',
      placeholder: 'Enter custom HTML...'
    }
  ]
};
```

## API Reference

### ExtensionSettingSchema

```typescript
interface ExtensionSettingSchema {
  key: string;
  label: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'textarea' | 'color';
  defaultValue: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
  min?: number;
  max?: number;
  placeholder?: string;
  required?: boolean;
}
```

### Type Constraints

| Type | defaultValue Type | Additional Properties |
|------|------------------|---------------------|
| boolean | `boolean` | - |
| string | `string` | `placeholder`, `required` |
| number | `number` | `min`, `max` |
| select | `string \| number` | `options` (required) |
| textarea | `string` | `placeholder` |
| color | `string` (hex) | - |

## Troubleshooting

### Settings Not Saving

**Problem**: Settings dialog shows but changes don't persist

**Solution**: Check that the API endpoint `/api/extensions/[id]/settings` is working

### Settings Not Appearing

**Problem**: Settings button doesn't show up

**Solution**: Verify that `settings` array is defined in metadata and has at least one setting

### Invalid Default Value

**Problem**: TypeScript error about default value type

**Solution**: Ensure `defaultValue` matches the `type`:
- `boolean` → `true` or `false`
- `number` → `42` (not `"42"`)
- `string` → `"value"`
- `color` → `"#ff0000"` (hex string)

### Options Not Working

**Problem**: Select dropdown is empty

**Solution**: Ensure `options` array is provided and has valid format:
```typescript
options: [
  { label: 'Display Text', value: 'actualValue' }
]
```

## Next Steps

- Learn about [toolbar integration](./toolbar.md)
- See [complete examples](./examples.md)
- Read [troubleshooting guide](./troubleshooting.md)
