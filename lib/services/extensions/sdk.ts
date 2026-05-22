/**
 * Changerawr Extension SDK
 *
 * This module provides types and utilities for building Changerawr extensions.
 * All extensions should import from this module instead of internal packages.
 */

/**
 * Props passed to modal components in extension custom UI
 */
export interface ModalComponentProps {
  /**
   * Callback to insert markdown into the editor
   */
  onInsert: (markdown: string) => void;

  /**
   * Callback to close the modal
   */
  onClose: () => void;

  /**
   * Optional textarea ref for direct DOM manipulation
   */
  textarea?: HTMLTextAreaElement;
}

/**
 * Props passed to popover components in extension custom UI
 */
export interface PopoverComponentProps {
  /**
   * Callback to insert markdown into the editor
   */
  onInsert: (markdown: string) => void;

  /**
   * Callback to close the popover
   */
  onClose: () => void;

  /**
   * Optional textarea ref for direct DOM manipulation
   */
  textarea?: HTMLTextAreaElement;
}

/**
 * Props passed to inline components in extension custom UI
 */
export interface InlineComponentProps {
  /**
   * Callback to insert markdown into the editor
   */
  onInsert: (markdown: string) => void;

  /**
   * Optional textarea ref for direct DOM manipulation
   */
  textarea?: HTMLTextAreaElement;
}

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description: string;
  category: 'formatting' | 'blocks' | 'media' | 'integrations' | 'utilities' | 'other';
  icon?: string;
  invertIcon?: boolean;
  isBuiltIn?: boolean;
  toolbar?: ExtensionToolbar;
}

/**
 * Toolbar button configuration
 */
export interface ToolbarButton {
  id: string;
  label: string;
  icon?: string;
  group: 'formatting' | 'blocks' | 'media' | 'integrations' | 'utilities';
  action?: {
    before: string;
    after: string;
    placeholder?: string;
  };
  onClick?: () => void;
  customUI?: {
    type: 'modal' | 'popover' | 'inline';
    component: React.ComponentType<any>;
  };
}

/**
 * Toolbar configuration for extensions
 */
export interface ToolbarConfig {
  buttons: ToolbarButton[];
}

/**
 * Extension toolbar configuration (legacy format)
 */
export interface ExtensionToolbar {
  buttons: Array<{
    id: string;
    icon?: string;
    tooltip?: string;
    group: 'formatting' | 'blocks' | 'media' | 'integrations' | 'utilities';
    onClick?: (textarea: HTMLTextAreaElement) => void;
    action?: {
      before: string;
      after: string;
      placeholder?: string;
    };
  }>;
  customUI?: Array<{
    buttonId: string;
    type: 'modal' | 'popover' | 'inline';
    component: React.ComponentType<any>;
  }>;
}

/**
 * Parse rule for custom markdown syntax
 *
 * Priority guidelines:
 * - 800+: HTML-like tags that must match before text escaping (e.g., <cr>text</cr>)
 * - 500-799: Complex block patterns (e.g., spoiler blocks, tables)
 * - 100-499: Inline formatting (e.g., highlight, inline code)
 * - <100: Simple replacements
 */
export interface ParseRule {
  name: string;
  pattern: RegExp;
  render: (match: RegExpMatchArray) => MarkdownToken | null | undefined;
  priority?: number;
  recursiveContent?: boolean;
}

/**
 * Render rule for custom markdown elements
 */
export interface RenderRule {
  type: string;
  render: (token: MarkdownToken) => MarkdownElement | string;
}

/**
 * Markdown token returned by parse rules
 */
export interface MarkdownToken {
  type: string;
  content: string;
  raw: string;
  attributes?: Record<string, any>;
}

/**
 * Markdown element returned by render rules
 */
export interface MarkdownElement {
  tagName: string;
  attributes?: Record<string, string>;
  content?: string;
  children?: MarkdownElement[];
}

/**
 * Link transformation function
 */
export interface LinkTransform {
  href: string;
  title?: string;
  target?: string;
  rel?: string;
}

/**
 * Main extension interface
 */
export interface Extension {
  name: string;
  parseRules?: ParseRule[];
  renderRules?: RenderRule[];
  transformLink?: (href: string, title?: string) => LinkTransform;
  onLoad?: () => void;
  onUnload?: () => void;
}
