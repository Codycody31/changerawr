# Extensions

Extensions are the core building block of this library. Every piece of markdown syntax — headings, bold text, code blocks, alerts — is implemented as an extension. You can add new syntax, replace existing behaviour, or strip the engine down to only what you actually need.

This document walks through everything: the basic anatomy of an extension, how the two-phase parse/render system works, universal extension support across every output format, and the component extension system for React and Astro.

---

## How extensions work

The engine processes markdown in two steps: **parse**, then **render**.

During parsing, the engine scans the input string and tries each registered parse rule in priority order. When a rule matches, it produces a **token** — a plain object with a `type`, `content`, and optional `attributes`. The full document becomes an array of tokens.

During rendering, the engine iterates over the token array and looks up the render rule registered for each token's `type`. The render rule turns the token back into a string — HTML, Tailwind-classed HTML, JSON, whatever output format you're targeting.

Extensions package parse rules and render rules together:

```typescript
import type { Extension } from '@changerawr/markdown';

const HighlightExtension: Extension = {
  name: 'highlight',

  parseRules: [{
    name: 'highlight',
    pattern: /==(.+?)==/,
    render: (match) => ({
      type: 'highlight',
      content: match[1] ?? '',
      raw: match[0] ?? '',
    }),
  }],

  renderRules: [{
    type: 'highlight',
    render: (token) =>
      `<mark class="bg-yellow-200 px-1 rounded">${token.content}</mark>`,
  }],
};
```

Register it with the engine and you're done:

```typescript
import { createEngine } from '@changerawr/markdown';

const engine = createEngine();
engine.registerExtension(HighlightExtension);

const html = engine.toHtml('This is ==important==.');
// <p ...>This is <mark class="bg-yellow-200 px-1 rounded">important</mark>.</p>
```

---

## Universal extensions

An extension produces a **string** from its render rules. That string is used everywhere — plain HTML output, Tailwind output, JSON output, React via `dangerouslySetInnerHTML`, Astro's `set:html`, standalone browser builds, Node.js scripts. You write it once and it works in all of them.

```typescript
// This extension works without changes in every output target
const BadgeExtension: Extension = {
  name: 'badge',
  parseRules: [{
    name: 'badge',
    pattern: /\[badge:(\w+) ([^\]]+)\]/,
    render: (match) => ({
      type: 'badge',
      content: match[2] ?? '',
      raw: match[0] ?? '',
      attributes: { variant: match[1] ?? 'default' },
    }),
  }],
  renderRules: [{
    type: 'badge',
    render: (token) => {
      const variant = token.attributes?.variant ?? 'default';
      const classes: Record<string, string> = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger:  'bg-red-100 text-red-800',
      };
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[variant] ?? classes.default}">${token.content}</span>`;
    },
  }],
};
```

Same extension, used in different contexts:

```typescript
// Vanilla JS / Node.js
const html = engine.toHtml('Status: [badge:success Released]');

// React
<MarkdownRenderer content="Status: [badge:success Released]" extensions={[BadgeExtension]} />

// Astro
const html = renderMarkdownForAstro('Status: [badge:success Released]', {
  extensions: [BadgeExtension],
});
```

---

## Block extensions

Block extensions match multi-line patterns. The pattern should match the entire block — the parser runs across the full document string, so make sure your regex captures everything you need:

```typescript
import type { Extension } from '@changerawr/markdown';

const CalloutExtension: Extension = {
  name: 'callout',
  parseRules: [{
    name: 'callout',
    pattern: /\[callout title="([^"]+)"\]\n([\s\S]*?)\n\[\/callout\]/,
    render: (match) => ({
      type: 'callout',
      content: match[2]?.trim() ?? '',
      raw: match[0] ?? '',
      attributes: { title: match[1] ?? '' },
    }),
  }],
  renderRules: [{
    type: 'callout',
    render: (token) => {
      const title = token.attributes?.title ?? '';
      return `
        <div class="border border-gray-200 rounded-lg overflow-hidden my-6">
          <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm">${title}</div>
          <div class="p-4 text-sm leading-relaxed">${token.content}</div>
        </div>
      `.trim();
    },
  }],
};
```

Markdown syntax:

```markdown
[callout title="Pro tip"]
You can nest any markdown content in here.
[/callout]
```

---

## Attributes and token data

The `attributes` field on a token is a free-form record — you can put anything in it from the parse step and read it back in the render step. Common uses:

```typescript
// Passing structured data through
render: (match) => ({
  type: 'video',
  content: '',
  raw: match[0] ?? '',
  attributes: {
    src: match[1] ?? '',
    width: parseInt(match[2] ?? '640', 10),
    autoplay: match[3] === 'autoplay',
  },
}),
```

The renderer also injects a few attributes automatically:

- `format` — the current output format (`'html'`, `'tailwind'`, `'json'`). Useful if you want your render rule to behave differently per format.
- `renderedChildren` — when a token has `children`, the renderer pre-renders them and injects the result here as a string.

```typescript
renderRules: [{
  type: 'my-block',
  render: (token) => {
    const format = token.attributes?.format;
    const children = token.attributes?.renderedChildren as string ?? token.content;

    if (format === 'html') {
      return `<section>${children}</section>`;
    }
    return `<section class="my-6 space-y-4">${children}</section>`;
  },
}],
```

---

## Component extensions

Plain string rendering covers most cases. But some things genuinely can't be expressed as a string: local state, animations, refs, portals, React context, third-party component libraries. Component extensions solve this by letting you attach a real React component to any token type — while still requiring a plain string fallback for every other output target.

This is the same idea as TipTap's node views. In TipTap, a node view lets you replace how a prosemirror node looks with an arbitrary framework component, and TipTap handles passing the node's "content" (the child nodes) into the component as a slot. Component extensions work the same way: the parser produces a token, the React renderer hands that token to your component as props, and if the token has nested content the renderer resolves it first and passes it as `children`.

### The dual-mode rule

Every component render rule has two fields: `component` and `render`.

```typescript
{
  type: 'my-token',

  // React renderer uses this
  component: ({ token, children }) => <MyComponent {...token.attributes}>{children}</MyComponent>,

  // Everything else uses this — HTML output, Astro SSR, standalone, Node.js
  render: (token) => `<div class="...">${token.content}</div>`,
}
```

**Both are required.** The `render` fallback is not optional. The whole point is that your extension definition is universal — one file, works everywhere — and the right version gets used depending on the environment. In React it's the component. Everywhere else it's the string.

### Writing a component extension

```typescript
import type { ReactComponentExtension } from '@changerawr/markdown/react';

const InlineVideoExtension: ReactComponentExtension = {
  name: 'inline-video',

  parseRules: [{
    name: 'inline-video',
    pattern: /\[video\]\(([^)]+)\)/,
    render: (match) => ({
      type: 'inline-video',
      content: match[1] ?? '',
      raw: match[0] ?? '',
    }),
  }],

  renderRules: [{
    type: 'inline-video',

    component: ({ token }) => {
      const [playing, setPlaying] = React.useState(false);
      return (
        <div className="relative rounded-xl overflow-hidden my-6">
          <video
            src={token.content}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="w-full"
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="text-white text-4xl">▶</span>
            </div>
          )}
        </div>
      );
    },

    render: (token) =>
      `<video src="${token.content}" controls class="w-full rounded-xl my-6"></video>`,
  }],
};
```

Pass it to `<MarkdownRenderer>` via `componentExtensions`:

```tsx
<MarkdownRenderer
  content={post.body}
  componentExtensions={[InlineVideoExtension]}
/>
```

When component extensions are present the renderer detects this and switches from `dangerouslySetInnerHTML` to a real React element tree. Plain tokens are batched together and rendered to HTML as normal. Component tokens get their React component. The two modes are interleaved transparently — your markdown can have five paragraphs, a video, three more paragraphs, and another video, and the output is a single coherent React tree.

### Token data as props

Everything you put into a token's `attributes` during parsing comes through to the component on `token.attributes`. Parse once, use in both the component and the string fallback:

```typescript
const PricingCardExtension: ReactComponentExtension = {
  name: 'pricing-card',
  parseRules: [{
    name: 'pricing-card',
    pattern: /\[pricing plan="([^"]+)" price="([^"]+)" cta="([^"]+)"\]\n([\s\S]*?)\n\[\/pricing\]/,
    render: (match) => ({
      type: 'pricing-card',
      content: match[4]?.trim() ?? '',
      raw: match[0] ?? '',
      attributes: {
        plan:  match[1] ?? '',
        price: match[2] ?? '',
        cta:   match[3] ?? '',
      },
    }),
  }],
  renderRules: [{
    type: 'pricing-card',
    component: ({ token, children }) => {
      const { plan, price, cta } = token.attributes as { plan: string; price: string; cta: string };
      return (
        <div className="border rounded-2xl p-8 shadow-sm my-8">
          <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">{plan}</div>
          <div className="mt-2 text-4xl font-bold">{price}</div>
          <div className="mt-6 space-y-3 text-sm text-gray-600">{children}</div>
          <button className="mt-8 w-full rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700">
            {cta}
          </button>
        </div>
      );
    },
    render: (token) => {
      const { plan, price, cta } = token.attributes as any;
      return `<div class="border rounded-2xl p-8 shadow-sm my-8">
        <div class="text-sm font-semibold text-indigo-600 uppercase">${plan}</div>
        <div class="mt-2 text-4xl font-bold">${price}</div>
        <div class="mt-6 text-sm text-gray-600">${token.content}</div>
        <a href="#" class="mt-8 block text-center rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium">${cta}</a>
      </div>`;
    },
  }],
};
```

```markdown
[pricing plan="Pro" price="$29/mo" cta="Get started"]
Unlimited projects
Priority support
Advanced analytics
[/pricing]
```

### The content hole

If your token wraps inner content that itself contains markdown, use the `children` prop — that content will already be parsed and rendered as React elements before it reaches your component. This is the equivalent of TipTap's content hole: the place where the node's inner content lives.

```typescript
const SpoilerExtension: ReactComponentExtension = {
  name: 'spoiler',
  parseRules: [{
    name: 'spoiler',
    pattern: /:::spoiler\n([\s\S]*?)\n:::/,
    render: (match) => ({
      type: 'spoiler',
      content: match[1]?.trim() ?? '',
      raw: match[0] ?? '',
    }),
  }],
  renderRules: [{
    type: 'spoiler',
    component: ({ children }) => {
      const [revealed, setRevealed] = React.useState(false);
      return (
        <div className="my-4 border border-dashed border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setRevealed(r => !r)}
            className="text-sm text-blue-600 hover:underline"
          >
            {revealed ? '▲ Hide spoiler' : '▼ Show spoiler'}
          </button>
          {revealed && <div className="mt-3">{children}</div>}
        </div>
      );
    },
    // Children content becomes token.content in the string fallback
    render: (token) =>
      `<details class="my-4 border border-dashed border-gray-200 rounded-lg p-4">
        <summary class="text-sm text-blue-600 cursor-pointer">Show spoiler</summary>
        <div class="mt-3">${token.content}</div>
      </details>`,
  }],
};
```

The inner content of `:::spoiler` can be any valid markdown — headings, lists, other extensions. The engine handles the nesting. Your component just receives `children` and decides where to put them.

### Accessing React context

Because the component runs inside the React tree, it can use any context available in the application. This is where component extensions go significantly further than anything a string renderer can do:

```tsx
const ThemeAwareCalloutExtension: ReactComponentExtension = {
  name: 'callout',
  parseRules: [{ /* ... */ }],
  renderRules: [{
    type: 'callout',
    component: ({ token, children }) => {
      // Access your app's theme, auth state, feature flags — anything
      const { theme } = useTheme();
      const ringClass = theme === 'dark' ? 'ring-white/10' : 'ring-black/5';
      return (
        <aside className={`my-6 rounded-xl ring-1 ${ringClass} p-5`}>
          {children}
        </aside>
      );
    },
    render: (token) => `<aside class="my-6 rounded-xl ring-1 ring-black/5 p-5">${token.content}</aside>`,
  }],
};
```

### Using third-party UI libraries

Extension components are regular React components. You can use shadcn/ui, Radix, Headless UI, Framer Motion, or anything else you'd use in the rest of your application:

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';

const AccordionExtension: ReactComponentExtension = {
  name: 'accordion',
  parseRules: [{
    name: 'accordion',
    pattern: /\[accordion title="([^"]+)"\]\n([\s\S]*?)\n\[\/accordion\]/,
    render: (match) => ({
      type: 'accordion',
      content: match[2]?.trim() ?? '',
      raw: match[0] ?? '',
      attributes: { title: match[1] ?? '' },
    }),
  }],
  renderRules: [{
    type: 'accordion',
    component: ({ token, children }) => (
      <Accordion type="single" collapsible className="my-4">
        <AccordionItem value="item">
          <AccordionTrigger>{token.attributes?.title as string}</AccordionTrigger>
          <AccordionContent asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {children}
            </motion.div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
    render: (token) =>
      `<details class="my-4 border rounded-lg">
        <summary class="px-4 py-3 font-medium cursor-pointer">${token.attributes?.title}</summary>
        <div class="px-4 pb-4">${token.content}</div>
      </details>`,
  }],
};
```

### Using the hook directly

`useMarkdownComponents` gives you the raw pieces if you need to build a custom layout around the rendered content:

```tsx
import { useMarkdownComponents, TokenTreeRenderer } from '@changerawr/markdown/react';

function ArticleRenderer({ content }: { content: string }) {
  const { tokens, componentMap, renderBatch, isLoading, error } = useMarkdownComponents(content, {
    componentExtensions: [SpoilerExtension, AccordionExtension, InlineVideoExtension],
    format: 'tailwind',
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <article className="prose prose-gray max-w-none">
      <TokenTreeRenderer
        tokens={tokens}
        componentMap={componentMap}
        renderBatch={renderBatch}
      />
    </article>
  );
}
```

`TokenTreeRenderer` is also exported if you want to use it standalone — for example inside a custom renderer that wraps tokens in analytics tracking or injects ads between sections.

### Component extensions in Astro

Astro renders server-side, so the `component` field is ignored and the `render` string fallback is used automatically. You don't need separate extension files for React vs Astro — the same extension object works in both:

```astro
---
import { renderMarkdownForAstro } from '@changerawr/markdown/astro';
import { AccordionExtension } from '../extensions/accordion';

// component field is ignored, render string is used
const html = renderMarkdownForAstro(Astro.props.content, {
  extensions: [AccordionExtension],
});
---

<div set:html={html} />
```

This is intentional. Your extension library is framework-agnostic. Ship one package, one set of extensions, and let each environment use what it supports. React gets the interactive component. Astro gets valid server-rendered HTML. An RSS feed or email renderer gets the same HTML. Nothing changes in how you write or distribute the extension.

---

## Priority and ordering

Parse rules run in a fixed priority order:

1. Feature extensions (`alert`, `button`, `embed`, and any custom extensions with those names)
2. Core extensions (`heading`, `bold`, `image`, `link`, `code`, etc.)
3. Custom extensions (everything else, in registration order)

Within core extensions, more specific patterns win: `codeblock` before `code`, `image` before `link`, `task-item` before `list-item`, `bold` before `italic`.

If you're writing an extension that could conflict with a built-in pattern, test it against the built-ins and consider whether you need to unregister one of them first.

---

## Registering and unregistering

```typescript
const engine = createEngine();

// Register
const result = engine.registerExtension(MyExtension);
if (!result.success) {
  console.error(result.error);
}

// Check if registered
engine.hasExtension('my-extension'); // true

// List all registered extensions
engine.getExtensions(); // ['text', 'heading', ..., 'my-extension']

// Unregister (rebuilds parser and renderer internally)
engine.unregisterExtension('my-extension');

// Unregister a built-in to replace it
engine.unregisterExtension('alert');
engine.registerExtension(MyAlertExtension);
```

The `createMinimalEngine` factory is the most direct way to start from scratch:

```typescript
import { createMinimalEngine, HeadingExtension, BoldExtension, ParagraphExtension } from '@changerawr/markdown';

const engine = createMinimalEngine([HeadingExtension, BoldExtension, ParagraphExtension]);
```

---

## TypeScript tips

All extension types are fully generic and exported:

```typescript
import type {
  Extension,              // Base extension (string render rules only)
  ComponentExtension,     // Framework-agnostic base with optional component field
  ParseRule,
  RenderRule,
  ComponentRenderRule,
  MarkdownToken,
  ComponentTokenProps,
} from '@changerawr/markdown';

import type {
  ReactComponentExtension,        // Extension with React components
  ReactComponentRenderRule,
  ReactComponentTokenProps,       // { token, children?: React.ReactNode }
} from '@changerawr/markdown/react';
```

Typing your parse output with a custom token interface keeps things tidy:

```typescript
interface VideoToken extends MarkdownToken {
  attributes: {
    src: string;
    autoplay: boolean;
    format: string; // injected by renderer
  };
}

renderRules: [{
  type: 'video',
  render: (token) => {
    const { src, autoplay } = (token as VideoToken).attributes;
    // ...
  },
}],
```

---

## Example: a complete extension

Here's a full working extension — a `[kbd]` shortcode for keyboard keys — that works everywhere:

```typescript
import type { Extension } from '@changerawr/markdown';

export const KeyboardExtension: Extension = {
  name: 'keyboard',

  parseRules: [{
    name: 'keyboard',
    pattern: /\[kbd\]([^\[]+)\[\/kbd\]/,
    render: (match) => ({
      type: 'keyboard',
      content: match[1]?.trim() ?? '',
      raw: match[0] ?? '',
    }),
  }],

  renderRules: [{
    type: 'keyboard',
    render: (token) => {
      const keys = token.content.split('+').map(k => k.trim());
      const rendered = keys
        .map(k => `<kbd class="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-300 bg-gray-100 text-gray-700 text-xs font-mono shadow-sm">${k}</kbd>`)
        .join('<span class="mx-0.5 text-gray-400">+</span>');
      return `<span class="inline-flex items-center gap-0.5">${rendered}</span>`;
    },
  }],
};
```

Markdown:

```markdown
Save the file with [kbd]Ctrl+S[/kbd] or [kbd]Cmd+S[/kbd] on macOS.
```

Output:

```html
Save the file with
<span class="inline-flex items-center gap-0.5">
  <kbd class="...">Ctrl</kbd>
  <span class="...">+</span>
  <kbd class="...">S</kbd>
</span>
or ...
```

This extension can be dropped into any project regardless of framework or output format and it will just work.