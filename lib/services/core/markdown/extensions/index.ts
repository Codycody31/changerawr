/**
 * Custom Markdown Extensions for Changerawr
 *
 * This module ONLY contains built-in extensions.
 * Other extensions are loaded dynamically from the extensions/ directory.
 */

import { Extension } from '@changerawr/markdown';
import { tableExtension } from './table/table';
import { subtextExtension } from './subtext/subtext';
import { syntaxHighlightExtension } from './syntax-highlight/syntax-highlight';
import { imageExtension } from './image/image';
import { linkExtension } from './link/link';
import { embedExtension } from './embed/embed';

/**
 * Toolbar button configuration for extensions
 */
export interface ToolbarButton {
  /** Unique ID for the button */
  id: string;
  /** Lucide icon name (e.g., 'Eye', 'EyeOff', 'Bold') */
  icon: string;
  /** Tooltip text */
  tooltip: string;
  /** Click handler - receives textarea ref for insertion */
  onClick: (textarea: HTMLTextAreaElement) => void;
  /** Optional keyboard shortcut (e.g., 'Ctrl+B') */
  shortcut?: string;
  /** Optional group for organizing buttons */
  group?: 'formatting' | 'blocks' | 'media' | 'advanced';
}

/**
 * Submenu configuration for complex toolbar interactions
 */
export interface ToolbarSubmenu {
  /** Parent button ID */
  parentId: string;
  /** Menu items */
  items: Array<{
    label: string;
    icon?: string;
    onClick: (textarea: HTMLTextAreaElement) => void;
  }>;
}

/**
 * Custom UI component for advanced extension interactions
 */
export interface ToolbarCustomUI {
  /** Button ID that triggers this UI */
  buttonId: string;
  /** Type of UI component */
  type: 'popover' | 'modal' | 'inline';
  /** React component to render */
  component: React.ComponentType<{
    textarea: HTMLTextAreaElement;
    onClose: () => void;
  }>;
}

/**
 * Toolbar configuration for an extension
 */
export interface ExtensionToolbar {
  /** Primary toolbar buttons */
  buttons?: ToolbarButton[];
  /** Submenu configurations */
  submenus?: ToolbarSubmenu[];
  /** Custom UI components */
  customUI?: ToolbarCustomUI[];
}

/**
 * Extension metadata interface
 */
/**
 * Extension setting schema - defines configurable options
 */
export interface ExtensionSettingSchema {
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

export interface ExtensionMetadata {
  name: string;
  displayName: string;
  version: string;
  author?: string;
  description?: string;
  category?: string;
  isBuiltIn?: boolean;
  /** Optional toolbar configuration */
  toolbar?: ExtensionToolbar;
  /** Optional README content (markdown) */
  readme?: string;
  /** Optional CHANGELOG content (markdown) */
  changelog?: string;
  /** Optional icon - Lucide icon name or base64 encoded image */
  icon?: string;
  /** Optional settings schema - defines configurable options */
  settings?: ExtensionSettingSchema[];
  /** Whether to invert the icon colors in dark mode (default: false) */
  invertIcon?: boolean;
}

/**
 * Extension with metadata
 */
export interface ExtensionWithMetadata {
  extension: Extension;
  metadata: ExtensionMetadata;
}

/**
 * Built-in extensions ONLY (cannot be disabled, always loaded)
 * These are the core extensions that ship with Changerawr
 */
export const builtInExtensions: ExtensionWithMetadata[] = [
  {
    extension: tableExtension,
    metadata: {
      name: 'table',
      displayName: 'Tables',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'GFM-style markdown tables utilizing our table component from the UI kit',
      category: 'structure',
      isBuiltIn: true,
    }
  },
  {
    extension: subtextExtension,
    metadata: {
      name: 'subtext',
      displayName: 'Subtext',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'Discord-style subtext with -# syntax',
      category: 'formatting',
      isBuiltIn: true,
    }
  },
  {
    extension: syntaxHighlightExtension,
    metadata: {
      name: 'syntax-highlight',
      displayName: 'Syntax Highlighting',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'Enhanced code block syntax highlighting with proper language support',
      category: 'formatting',
      isBuiltIn: true,
    }
  },
  {
    extension: imageExtension,
    metadata: {
      name: 'image',
      displayName: 'Images',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'Improved image support with captions, sizing, and alignment',
      category: 'media',
      isBuiltIn: true,
    }
  },
  {
    extension: linkExtension,
    metadata: {
      name: 'link',
      displayName: ' BetterLinks',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'Overhauled link support with markdown formatting inside link text',
      category: 'formatting',
      isBuiltIn: true,
    }
  },
  {
    extension: embedExtension,
    metadata: {
      name: 'embed',
      displayName: 'BetterEmbeds',
      version: '1.0.0',
      author: 'Changerawr',
      description: 'Embeds with loading skeletons, lazy iframes, and preconnect hints',
      category: 'media',
      isBuiltIn: true,
    }
  }
];

/**
 * Array of built-in extensions (for backward compatibility)
 */
export const customExtensions: Extension[] = builtInExtensions.map(e => e.extension);

/**
 * Export individual built-in extensions
 */
export { tableExtension } from './table/table';
export { subtextExtension } from './subtext/subtext';
export { syntaxHighlightExtension } from './syntax-highlight/syntax-highlight';
export { imageExtension } from './image/image';
export { linkExtension } from './link/link';
export { embedExtension } from './embed/embed';