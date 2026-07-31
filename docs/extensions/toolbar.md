# Toolbar Integration

Add custom buttons to the markdown editor toolbar.

## Basic Toolbar Button

```typescript
export const metadata = {
  // ... other metadata
  toolbar: {
    buttons: [
      {
        id: 'my-button',
        icon: 'Sparkles',
        tooltip: 'My Button',
        group: 'formatting',
        action: {
          before: '==',
          after: '==',
          placeholder: 'text'
        }
      }
    ]
  }
};
```

## Button Properties

### id
**Type**: `string`
**Required**: Yes
**Description**: Unique identifier for the button

```typescript
id: 'highlight-button'
```

### icon
**Type**: `string | React.ComponentType`
**Required**: Yes
**Description**: Lucide icon name or custom React component

```typescript
icon: 'Highlighter'  // Lucide icon name
```

### tooltip
**Type**: `string`
**Required**: Yes
**Description**: Text shown on hover

```typescript
tooltip: 'Highlight Text (Ctrl+H)'
```

### group
**Type**: `'formatting' | 'blocks' | 'media' | 'advanced'`
**Required**: No
**Default**: `'advanced'`
**Description**: Where the button appears in the toolbar

```typescript
group: 'formatting'  // Appears with Bold, Italic, etc.
```

### action
**Type**: `{ before: string; after: string; placeholder?: string }`
**Required**: For simple buttons
**Description**: Text to insert before/after selection

```typescript
action: {
  before: '==',
  after: '==',
  placeholder: 'highlighted text'
}
```

### onClick
**Type**: `(textarea: HTMLTextAreaElement) => void`
**Required**: For custom logic
**Description**: Custom click handler

```typescript
onClick: (textarea) => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);

  // Your custom logic here
  const newText = transform(selected);

  // Update textarea
  textarea.value =
    textarea.value.substring(0, start) +
    newText +
    textarea.value.substring(end);

  // Trigger change event
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
```

## Custom UI (Popovers)

For advanced interactions like color pickers:

```typescript
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
}
```

### Creating a Popover Component

```typescript
// components/HighlightPopover.tsx
'use client';

import { useState } from 'react';

interface HighlightPopoverProps {
  textarea: HTMLTextAreaElement;
  onClose: () => void;
}

export function HighlightPopover({ textarea, onClose }: HighlightPopoverProps) {
  const [color, setColor] = useState('#fef08a');

  const handleApply = () => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || 'text';

    const syntax = `=={${color}}${selected}==`;

    textarea.value =
      textarea.value.substring(0, start) +
      syntax +
      textarea.value.substring(end);

    // Trigger events
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    onClose();
  };

  return (
    <div className="p-3 space-y-2">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-full h-10"
      />
      <button
        onClick={handleApply}
        className="w-full px-3 py-2 bg-primary text-white rounded"
      >
        Apply Color
      </button>
    </div>
  );
}
```

## Mobile Support

Toolbar buttons automatically work on mobile:
- Desktop: Shown in toolbar
- Mobile: Available in sidebar menu (☰)
- Custom UI opens in mobile-friendly dialog

## Complete Example

```typescript
import { HighlightPopover } from './components/HighlightPopover';

export const metadata = {
  name: 'highlight',
  displayName: 'Text Highlighter',
  version: '1.0.0',

  toolbar: {
    buttons: [
      // Simple button
      {
        id: 'quick-highlight',
        icon: 'Highlighter',
        tooltip: 'Quick Highlight (Yellow)',
        group: 'formatting',
        action: {
          before: '==',
          after: '==',
          placeholder: 'highlighted text'
        }
      },
      // Button with custom UI
      {
        id: 'color-highlight',
        icon: 'Palette',
        tooltip: 'Highlight with Color',
        group: 'formatting'
      }
    ],
    customUI: [
      {
        buttonId: 'color-highlight',
        type: 'popover',
        component: HighlightPopover
      }
    ]
  }
};
```

## Best Practices

✅ **Group appropriately** - Place buttons in logical groups
✅ **Use clear icons** - Choose icons that represent the action
✅ **Add keyboard hints** - Include shortcuts in tooltips
✅ **Handle selection** - Support both selected text and cursor position
✅ **Trigger events** - Always dispatch `input` and `change` events
✅ **Mobile-friendly** - Test custom UI on mobile

## Type Definitions

```typescript
interface ToolbarButton {
  id: string;
  icon: string | React.ComponentType;
  tooltip: string;
  group?: 'formatting' | 'blocks' | 'media' | 'advanced';
  action?: {
    before: string;
    after: string;
    placeholder?: string;
  };
  onClick?: (textarea: HTMLTextAreaElement) => void;
}

interface CustomUI {
  buttonId: string;
  type: 'popover' | 'modal';
  component: React.ComponentType<{
    textarea: HTMLTextAreaElement;
    onClose: () => void;
  }>;
}

interface ExtensionToolbar {
  buttons?: ToolbarButton[];
  customUI?: CustomUI[];
}
```
