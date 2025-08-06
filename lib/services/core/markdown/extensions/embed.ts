import {Extension} from '../types';

// Debug flag - set to true to output unsanitized HTML for debugging
const DEBUG_EMBEDS = true;

export const EmbedExtension: Extension = {
    name: 'embed',
    parseRules: [
        {
            name: 'embed',
            pattern: /\[embed:(\w+)\]\(([^)]+)\)(?:\{([^}]+)\})?/,
            render: (match) => {
                // console.log('🎬 Embed match found:', match);
                return {
                    type: 'embed',
                    content: match[2], // URL
                    raw: match[0],
                    attributes: {
                        provider: match[1],
                        url: match[2],
                        options: match[3] || ''
                    }
                };
            }
        }
    ],
    renderRules: [
        {
            type: 'embed',
            render: (token) => {
                const provider = token.attributes?.provider || 'generic';
                const url = token.attributes?.url || '';
                const options = token.attributes?.options || '';

                // console.log(`🎬 Rendering embed: ${provider} - ${url}`);
                const html = renderEmbed(provider, url, options);

                if (DEBUG_EMBEDS) {
                    console.log('🚨 DEBUG - Raw HTML output:', html);
                    console.log('🚨 DEBUG - HTML length:', html.length);
                }

                return html;
            }
        }
    ]
};

function renderEmbed(provider: string, url: string, options: string): string {
    const baseClasses = 'rounded-lg border bg-card text-card-foreground shadow-sm mb-6 overflow-hidden';

    // Parse common options
    const parsedOptions = parseOptions(options);

    switch (provider.toLowerCase()) {
        case 'youtube':
            return renderYouTubeEmbed(url, parsedOptions, baseClasses);
        case 'codepen':
            return renderCodePenEmbed(url, parsedOptions, baseClasses);
        case 'figma':
            return renderFigmaEmbed(url, parsedOptions, baseClasses);
        case 'twitter':
        case 'tweet':
            return renderTwitterEmbed(url, parsedOptions, baseClasses);
        case 'github':
            return renderGitHubEmbed(url, parsedOptions, baseClasses);
        case 'vimeo':
            return renderVimeoEmbed(url, parsedOptions, baseClasses);
        case 'spotify':
            return renderSpotifyEmbed(url, parsedOptions, baseClasses);
        case 'codesandbox':
            return renderCodeSandboxEmbed(url, parsedOptions, baseClasses);
        default:
            return renderGenericEmbed(url, parsedOptions, baseClasses);
    }
}

function parseOptions(options: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    if (!options) return parsed;

    // Parse options like "height:400,theme:dark,autoplay:1"
    options.split(',').forEach(option => {
        const [key, value] = option.split(':').map(s => s.trim());
        if (key && value) {
            parsed[key] = value;
        }
    });

    return parsed;
}

function renderYouTubeEmbed(url: string, options: Record<string, string>, classes: string): string {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        return createErrorEmbed('Invalid YouTube URL', url, classes);
    }

    // Build YouTube parameters
    const params = new URLSearchParams();
    if (options.autoplay === '1') params.set('autoplay', '1');
    if (options.mute === '1') params.set('mute', '1');
    if (options.loop === '1') {
        params.set('loop', '1');
        params.set('playlist', videoId); // Required for looping
    }
    if (options.controls === '0') params.set('controls', '0');
    if (options.start) params.set('start', options.start);

    // Default parameters for better embeds
    params.set('rel', '0'); // Reduce related videos
    params.set('modestbranding', '1'); // Reduce YouTube branding

    const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

    return `
    <div class="${classes}">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                src="${embedUrl}" 
                title="YouTube video player"
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
            </iframe>
        </div>
    </div>`;
}

function renderCodePenEmbed(url: string, options: Record<string, string>, classes: string): string {
    // Extract user and pen ID from various CodePen URL formats
    let match = url.match(/codepen\.io\/([^\/]+)\/(?:pen|embed)\/([^\/\?#]+)/);

    // Try alternative patterns for CodePen URLs
    if (!match) {
        match = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/\?#]+)/);
    }
    if (!match) {
        match = url.match(/codepen\.io\/([^\/]+)\/details\/([^\/\?#]+)/);
    }

    if (!match) {
        console.warn('Failed to parse CodePen URL:', url);
        return createErrorEmbed('Invalid CodePen URL - Could not extract user and pen ID', url, classes);
    }

    const [, user, penId] = match;
    // console.log(`🎨 CodePen: user=${user}, penId=${penId}`);

    const height = options.height || '400';
    const theme = options.theme === 'light' ? 'light' : 'dark';
    const defaultTab = options.tab || 'result';

    // Build CodePen embed URL with proper parameters
    const embedParams = new URLSearchParams({
        'default-tab': defaultTab,
        'theme-id': theme,
        'editable': 'true'
    });

    const embedUrl = `https://codepen.io/${user}/embed/${penId}?${embedParams.toString()}`;
    // console.log(`🎨 CodePen embed URL: ${embedUrl}`);

    // CodePen requires specific iframe attributes for proper embedding
    return `
    <div class="${classes}">
        <iframe 
            height="${height}" 
            style="width: 100%; border: 0;" 
            scrolling="no" 
            title="CodePen Embed - ${penId}" 
            src="${embedUrl}" 
            frameborder="0" 
            loading="lazy" 
            allowtransparency="true" 
            allowfullscreen="true"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; vr; xr-spatial-tracking">
            <p>
                See the Pen <a href="${url}">${penId}</a> by ${user} 
                (<a href="https://codepen.io/${user}">@${user}</a>) on 
                <a href="https://codepen.io">CodePen</a>.
            </p>
        </iframe>
    </div>`;
}

function renderVimeoEmbed(url: string, options: Record<string, string>, classes: string): string {
    const videoId = extractVimeoId(url);
    if (!videoId) {
        return createErrorEmbed('Invalid Vimeo URL', url, classes);
    }

    const params = new URLSearchParams();
    if (options.autoplay === '1') params.set('autoplay', '1');
    if (options.mute === '1') params.set('muted', '1');
    if (options.loop === '1') params.set('loop', '1');

    const embedUrl = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;

    return `
    <div class="${classes}">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                src="${embedUrl}" 
                title="Vimeo video player"
                frameborder="0" 
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
    </div>`;
}

function renderSpotifyEmbed(url: string, options: Record<string, string>, classes: string): string {
    // Convert Spotify URLs to embed format
    const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
    const height = options.height || '380';

    return `
    <div class="${classes}">
        <iframe 
            style="border-radius: 12px;" 
            src="${embedUrl}" 
            width="100%" 
            height="${height}" 
            frameborder="0" 
            allowfullscreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy">
        </iframe>
    </div>`;
}

function renderCodeSandboxEmbed(url: string, options: Record<string, string>, classes: string): string {
    // Convert CodeSandbox URLs to embed format
    let embedUrl = url;
    if (url.includes('/s/')) {
        embedUrl = url.replace('/s/', '/embed/');
    }

    const height = options.height || '500';
    const view = options.view || 'preview';

    if (!embedUrl.includes('?')) {
        embedUrl += `?view=${view}`;
    }

    return `
    <div class="${classes}">
        <iframe 
            src="${embedUrl}"
            style="width: 100%; height: ${height}px; border: 0; border-radius: 4px; overflow: hidden;"
            title="CodeSandbox Embed"
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts">
        </iframe>
    </div>`;
}

function renderFigmaEmbed(url: string, options: Record<string, string>, classes: string): string {
    const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    const height = options.height || '450';

    return `
    <div class="${classes}">
        <iframe 
            style="border: none;" 
            width="100%" 
            height="${height}" 
            src="${embedUrl}" 
            allowfullscreen>
        </iframe>
    </div>`;
}

function renderTwitterEmbed(url: string, options: Record<string, string>, classes: string): string {
    return `
    <div class="${classes}">
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
            <a href="${url}" target="_blank" 
               class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
                View on Twitter
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        </div>
    </div>`;
}

function renderGitHubEmbed(url: string, options: Record<string, string>, classes: string): string {
    const parts = url.replace('https://github.com/', '').split('/');
    const owner = parts[0];
    const repo = parts[1];

    if (!owner || !repo) {
        return createErrorEmbed('Invalid GitHub URL', url, classes);
    }

    return `
    <div class="${classes}">
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
            <a href="${url}" target="_blank" 
               class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
                View on GitHub
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        </div>
    </div>`;
}

function renderGenericEmbed(url: string, options: Record<string, string>, classes: string): string {
    const domain = extractDomain(url);

    return `
    <div class="${classes}">
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
            <a href="${url}" target="_blank" 
               class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors break-all">
                ${url}
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        </div>
    </div>`;
}

function createErrorEmbed(error: string, url: string, classes: string): string {
    return `
    <div class="${classes}">
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
        if (match) return match[1];
    }

    return null;
}

function extractVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
    return match ? match[1] : null;
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

// Usage examples with options:
// [embed:youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ){autoplay:1,mute:1}
// [embed:codepen](https://codepen.io/username/pen/abc123){height:500,theme:dark}
// [embed:figma](https://www.figma.com/file/abc123/Design-File){height:600}
// [embed:github](https://github.com/user/repo)
// [embed:spotify](https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh)
// [embed:vimeo](https://vimeo.com/123456789){autoplay:1}