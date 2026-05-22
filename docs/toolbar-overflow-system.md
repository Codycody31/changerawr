# Smart Toolbar Overflow System

## Problem

With 200+ extensions potentially installed, showing all toolbar buttons inline would make the editor unusable. The toolbar would extend far beyond the screen width and overwhelm users with choices.

## Solution

A smart toolbar management system that:

1. **Shows most relevant extensions inline** (max 8 per category by default)
2. **Groups overflow extensions** in a searchable dropdown menu
3. **Tracks usage** to automatically promote frequently used extensions
4. **Allows pinning** favorite extensions to keep them inline
5. **Categorizes extensions** for easy discovery

## Architecture

### ExtensionToolbarManager

**Location**: `lib/services/toolbar/extensionToolbarManager.ts`

The core manager that handles:

- **Usage tracking**: Records button clicks with timestamp and count
- **Pin management**: Allows users to pin/unpin extensions
- **Smart organization**: Combines pinned + most used extensions inline
- **Overflow grouping**: Categorizes remaining extensions
- **Search functionality**: Filters extensions by name
- **Persistence**: Stores preferences in localStorage

### ExtensionOverflowMenu

**Location**: `components/markdown-editor/ExtensionOverflowMenu.tsx`

The UI component that displays overflow extensions:

- **Searchable dropdown**: Type to filter extensions
- **Grouped by category**: Formatting, Blocks, Media, etc.
- **Pin/Unpin buttons**: Quick access to favorite extensions
- **Usage indication**: Shows badge with overflow count
- **Scrollable**: Handles hundreds of extensions gracefully

### MarkdownToolbar Integration

**Location**: `components/markdown-editor/MarkdownToolbar.tsx`

Updated to use the new system:

- Organizes extensions into inline/overflow groups
- Renders inline extensions in their category sections
- Shows overflow menu button with count badge
- Re-renders when pin status changes

## User Experience

### For Users with Few Extensions (< 8 per category)

- All extensions appear inline (no change from before)
- No overflow menu appears
- Clean, simple toolbar

### For Users with Many Extensions (> 8 per category)

#### Initial State

- Shows 8 most recently used extensions inline
- Overflow menu appears with "More Extensions" button
- Badge shows how many extensions are hidden

#### After Usage

- System tracks which extensions you use
- Frequently used extensions automatically promoted to inline
- Rarely used extensions move to overflow
- Perfect balance between accessibility and clutter

#### Pinning

1. Click "More Extensions" button (⋯ icon with badge)
2. Search or browse for your favorite extension
3. Click the 📌 pin icon next to it
4. Extension moves to inline toolbar permanently
5. Click 📌 again to unpin

## Configuration

### Max Inline Buttons

Default: 8 per category

Can be changed via:

```typescript
import { getToolbarManager } from '@/lib/services/toolbar/extensionToolbarManager';

const manager = getToolbarManager();
manager.setMaxInlineButtons(12); // Show up to 12 inline
```

### Reset Settings

Clear all usage data and pins:

```typescript
const manager = getToolbarManager();
manager.reset();
```

## Algorithm

### Usage Score Calculation

Each extension gets a score based on:

```
recencyScore = max(0, 1 - (daysSinceLastUse / 30))
frequencyScore = log10(useCount + 1)

usageScore = (recencyScore × 0.6) + (frequencyScore × 0.4)
```

This balances:
- **Recency** (60%): Recently used extensions score higher
- **Frequency** (40%): Frequently used extensions score higher
- **Decay**: Scores decrease over time if not used

### Organization Logic

1. Separate pinned from unpinned extensions
2. Sort unpinned by usage score (descending)
3. Fill inline slots with:
   - All pinned extensions (always inline)
   - Top scoring unpinned extensions (up to max)
4. Remaining extensions go to overflow

## Data Storage

**Key**: `changerawr_toolbar_config`

**Storage**: localStorage

**Structure**:
```typescript
{
  maxInlineButtons: 8,
  pinnedExtensions: ['highlight', 'spoiler'],
  usageStats: {
    'highlight': {
      extensionId: 'highlight',
      useCount: 42,
      lastUsed: 1716172800000,
      isPinned: true
    },
    // ... more extensions
  }
}
```

## Benefits

### For Users

- **No clutter**: Only see extensions you actually use
- **Discoverable**: Search finds any installed extension
- **Customizable**: Pin your favorites
- **Adaptive**: Learns from your usage patterns
- **Scalable**: Works with 2 or 200 extensions

### For Developers

- **Automatic**: No manual toolbar management needed
- **Performant**: Renders only visible extensions
- **Extensible**: Easy to add new categories
- **Type-safe**: Full TypeScript support
- **Testable**: Clean separation of concerns

## Future Enhancements

Potential improvements:

1. **Keyboard shortcuts**: Quick access to overflow menu
2. **Drag & drop reordering**: Manual button organization
3. **Usage analytics**: Show most popular extensions
4. **Cloud sync**: Sync preferences across devices
5. **Context-aware**: Show different extensions based on document type
6. **Smart recommendations**: Suggest extensions based on content

## Migration

### From Old System

The old system rendered all extensions inline. The new system:

1. Maintains backwards compatibility
2. Works automatically with existing extensions
3. Requires no changes to extension code
4. Gradually adapts as user uses extensions

### Testing

To test with many extensions:

```typescript
// Simulate 50 extensions in the toolbar
const mockExtensions = Array.from({ length: 50 }, (_, i) => ({
  metadata: {
    name: `ext-${i}`,
    displayName: `Extension ${i}`,
    category: ['formatting', 'blocks', 'media'][i % 3],
    toolbar: {
      buttons: [{
        id: `btn-${i}`,
        icon: 'TestTube',
        tooltip: `Extension ${i}`,
        group: ['formatting', 'blocks', 'media'][i % 3],
        action: { before: '==', after: '==', placeholder: `ext${i}` }
      }]
    }
  }
}));
```

## Related Files

- `lib/services/toolbar/extensionToolbarManager.ts` - Core manager
- `components/markdown-editor/ExtensionOverflowMenu.tsx` - Overflow UI
- `components/markdown-editor/MarkdownToolbar.tsx` - Toolbar integration
- `lib/services/extensions/sdk.ts` - Extension types
