import { Extension, MarkdownToken, parseOptions, extractDomain } from '@changerawr/markdown';

/**
 * Enhanced Embed Extension for Changerawr Markdown ("BetterEmbeds")
 *
 * Same syntax as the core embed extension:
 * [embed:provider](url){options}
 *
 * Supported providers: youtube, vimeo, codepen, figma, spotify, codesandbox,
 * twitter/tweet, github, generic
 *
 * Improvements over the core extension:
 * - iframe-based embeds render with a skeleton placeholder that's hidden once
 *   the iframe finishes loading (see hooks/use-embed-enhancements.ts)
 * - iframes use loading="lazy" and are tagged with data-embed-* attributes so
 *   the renderer can wire up loading states and preconnect hints
 */

const embedExtension: Extension = {
    name: 'embed',
    parseRules: [
        {
            name: 'embed',
            scope: 'block',
            pattern: /\[embed:(\w+)\]\(([^)]+)\)(?:\{([^}]+)\})?/,
            render: (match): MarkdownToken => ({
                type: 'embed',
                content: match[2] || '',
                raw: match[0] || '',
                attributes: {
                    provider: match[1] || 'generic',
                    url: match[2] || '',
                    options: match[3] || ''
                }
            })
        }
    ],
    renderRules: [
        {
            type: 'embed',
            render: (token): string => {
                const provider = (token.attributes?.provider as string) || 'generic';
                const url = (token.attributes?.url as string) || '';
                const options = (token.attributes?.options as string) || '';

                return renderEmbed(provider, url, options);
            }
        }
    ]
};

export { embedExtension };

const baseClasses = 'rounded-lg border bg-card text-card-foreground shadow-sm my-6 overflow-hidden';

function renderEmbed(provider: string, url: string, options: string): string {
    const parsedOptions = parseOptions(options);

    switch (provider.toLowerCase()) {
        case 'youtube':
            return renderYouTubeEmbed(url, parsedOptions);
        case 'codepen':
            return renderCodePenEmbed(url, parsedOptions);
        case 'figma':
            return renderFigmaEmbed(url, parsedOptions);
        case 'twitter':
        case 'tweet':
            return renderTwitterEmbed(url);
        case 'github':
            return renderGitHubEmbed(url);
        case 'vimeo':
            return renderVimeoEmbed(url, parsedOptions);
        case 'spotify':
            return renderSpotifyEmbed(url, parsedOptions);
        case 'codesandbox':
            return renderCodeSandboxEmbed(url, parsedOptions);
        default:
            return renderGenericEmbed(url);
    }
}

/**
 * Skeleton placeholder shown over an iframe until it finishes loading.
 * Hidden client-side by useEmbedEnhancements (hooks/use-embed-enhancements.ts).
 */
function skeletonOverlay(label: string): string {
    return `<div data-embed-skeleton class="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-pulse bg-muted text-muted-foreground transition-opacity duration-300">
      <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-6.66l1.42-1.42M4.92 19.08l1.42-1.42M19.08 19.08l-1.42-1.42M4.92 4.92L6.34 6.34"/>
      </svg>
      <span class="text-xs font-medium">Loading ${label}…</span>
    </div>`;
}

/**
 * Renders a responsive (aspect-ratio based) iframe embed with a loading skeleton.
 */
function renderAspectRatioEmbed(opts: {
    provider: string;
    src: string;
    title: string;
    allow?: string;
    sandbox?: string;
    paddingBottom?: string; // default 16:9
}): string {
    const { provider, src, title, allow, sandbox, paddingBottom = '56.25%' } = opts;
    const allowAttr = allow ? ` allow="${allow}"` : '';
    const sandboxAttr = sandbox ? ` sandbox="${sandbox}"` : '';

    return `<div class="${baseClasses}">
    <div class="relative" style="padding-bottom: ${paddingBottom}; height: 0; overflow: hidden;">
      ${skeletonOverlay(title)}
      <iframe
        data-embed-frame
        data-embed-provider="${provider}"
        class="absolute inset-0 w-full h-full"
        style="border: 0;"
        src="${src}"
        title="${title}"
        loading="lazy"
        frameborder="0"${allowAttr}${sandboxAttr}
        allowfullscreen>
      </iframe>
    </div>
  </div>`;
}

/**
 * Renders a fixed-height iframe embed with a loading skeleton.
 */
function renderFixedHeightEmbed(opts: {
    provider: string;
    src: string;
    title: string;
    height: string;
    allow?: string;
    sandbox?: string;
    extraStyle?: string;
}): string {
    const { provider, src, title, height, allow, sandbox, extraStyle = '' } = opts;
    const allowAttr = allow ? ` allow="${allow}"` : '';
    const sandboxAttr = sandbox ? ` sandbox="${sandbox}"` : '';

    return `<div class="${baseClasses}">
    <div class="relative" style="height: ${height}px;">
      ${skeletonOverlay(title)}
      <iframe
        data-embed-frame
        data-embed-provider="${provider}"
        class="absolute inset-0 w-full h-full"
        style="border: 0;${extraStyle}"
        src="${src}"
        title="${title}"
        loading="lazy"
        frameborder="0"${allowAttr}${sandboxAttr}
        allowfullscreen>
      </iframe>
    </div>
  </div>`;
}

function renderYouTubeEmbed(url: string, options: Record<string, string>): string {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        return createErrorEmbed('Invalid YouTube URL', url);
    }

    const params = new URLSearchParams();
    if (options.autoplay === '1') params.set('autoplay', '1');
    if (options.mute === '1') params.set('mute', '1');
    if (options.loop === '1') {
        params.set('loop', '1');
        params.set('playlist', videoId);
    }
    if (options.controls === '0') params.set('controls', '0');
    if (options.start) params.set('start', options.start);

    params.set('rel', '0');
    params.set('modestbranding', '1');

    const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

    return renderAspectRatioEmbed({
        provider: 'youtube',
        src: embedUrl,
        title: 'YouTube video player',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    });
}

function renderCodePenEmbed(url: string, options: Record<string, string>): string {
    const match = url.match(/codepen\.io\/([^\/]+)\/(?:pen|embed)\/([^\/\?#]+)/);

    if (!match) {
        return createErrorEmbed('Invalid CodePen URL', url);
    }

    const [, user, penId] = match;
    const height = options.height || '400';
    const theme = options.theme === 'light' ? 'light' : 'dark';
    const defaultTab = options.tab || 'result';

    const embedParams = new URLSearchParams({
        'default-tab': defaultTab,
        'theme-id': theme,
        'editable': 'true'
    });

    const embedUrl = `https://codepen.io/${user}/embed/${penId}?${embedParams.toString()}`;

    return renderFixedHeightEmbed({
        provider: 'codepen',
        src: embedUrl,
        title: `CodePen Embed - ${penId}`,
        height,
        allow: 'clipboard-write',
        extraStyle: ' overflow: hidden;'
    });
}

function renderVimeoEmbed(url: string, options: Record<string, string>): string {
    const videoId = extractVimeoId(url);
    if (!videoId) {
        return createErrorEmbed('Invalid Vimeo URL', url);
    }

    const params = new URLSearchParams();
    if (options.autoplay === '1') params.set('autoplay', '1');
    if (options.mute === '1') params.set('muted', '1');
    if (options.loop === '1') params.set('loop', '1');

    const embedUrl = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;

    return renderAspectRatioEmbed({
        provider: 'vimeo',
        src: embedUrl,
        title: 'Vimeo video player',
        allow: 'autoplay; fullscreen; picture-in-picture'
    });
}

function renderSpotifyEmbed(url: string, options: Record<string, string>): string {
    const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
    const height = options.height || '380';

    return renderFixedHeightEmbed({
        provider: 'spotify',
        src: embedUrl,
        title: 'Spotify player',
        height,
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        extraStyle: ' border-radius: 12px;'
    });
}

function renderCodeSandboxEmbed(url: string, options: Record<string, string>): string {
    let embedUrl = url;
    if (url.includes('/s/')) {
        embedUrl = url.replace('/s/', '/embed/');
    }

    const height = options.height || '500';
    const view = options.view || 'preview';

    if (!embedUrl.includes('?')) {
        embedUrl += `?view=${view}`;
    }

    return renderFixedHeightEmbed({
        provider: 'codesandbox',
        src: embedUrl,
        title: 'CodeSandbox Embed',
        height,
        allow: 'accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking',
        sandbox: 'allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts',
        extraStyle: ' border-radius: 4px;'
    });
}

function renderFigmaEmbed(url: string, options: Record<string, string>): string {
    const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    const height = options.height || '450';

    return renderFixedHeightEmbed({
        provider: 'figma',
        src: embedUrl,
        title: 'Figma embed'
        ,
        height
    });
}

function renderTwitterEmbed(url: string): string {
    return `<div class="${baseClasses}">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3">
        <svg class="w-6 h-6 fill-current text-blue-500" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
        <div>
          <div class="font-semibold text-foreground">Twitter Post</div>
          <div class="text-sm text-muted-foreground">External Link</div>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
        View on Twitter
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    </div>
  </div>`;
}

function renderGitHubEmbed(url: string): string {
    const parts = url.replace('https://github.com/', '').split('/');
    const owner = parts[0];
    const repo = parts[1];

    if (!owner || !repo) {
        return createErrorEmbed('Invalid GitHub URL', url);
    }

    return `<div class="${baseClasses}">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3">
        <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <div>
          <div class="font-semibold text-foreground text-lg">${owner}/${repo}</div>
          <div class="text-sm text-muted-foreground">GitHub Repository</div>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
        View on GitHub
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    </div>
  </div>`;
}

function renderGenericEmbed(url: string): string {
    const domain = extractDomain(url);

    return `<div class="${baseClasses}">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <div>
          <div class="font-semibold text-foreground">External Link</div>
          <div class="text-sm text-muted-foreground">${domain}</div>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors break-all">
        ${url}
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    </div>
  </div>`;
}

function createErrorEmbed(error: string, url: string): string {
    return `<div class="${baseClasses}">
    <div class="p-4 text-destructive">
      <div class="font-medium flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ${error}
      </div>
      <div class="text-sm text-muted-foreground mt-1 break-all">${url}</div>
    </div>
  </div>`;
}

// Utility functions for extracting IDs

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1] || null;
    }

    return null;
}

function extractVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
    return match?.[1] ?? null;
}
