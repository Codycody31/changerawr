import { useEffect, RefObject } from 'react';

/**
 * Domains to preconnect to for each embed provider, used to warm up the
 * connection (DNS + TLS) before the iframe itself starts loading.
 */
const PROVIDER_PRECONNECT: Record<string, string[]> = {
    youtube: ['https://www.youtube.com', 'https://i.ytimg.com'],
    vimeo: ['https://player.vimeo.com', 'https://i.vimeocdn.com'],
    codepen: ['https://codepen.io', 'https://cpwebassets.codepen.io'],
    spotify: ['https://open.spotify.com'],
    codesandbox: ['https://codesandbox.io'],
    figma: ['https://www.figma.com'],
};

/**
 * Wires up loading-skeleton removal and preconnect hints for embeds rendered
 * by the BetterEmbeds extension (`[embed:provider](url)`).
 *
 * Embeds are rendered with:
 * - `[data-embed-frame][data-embed-provider]` on the iframe
 * - `[data-embed-skeleton]` on a sibling placeholder shown while loading
 *
 * This hook hides the skeleton once the iframe's `load` event fires (with a
 * timeout fallback) and adds `<link rel="preconnect">` hints for the
 * providers present in the rendered content.
 *
 * @param containerRef - ref to the element containing the rendered markdown HTML
 * @param deps - dependency array that should change whenever the rendered HTML changes
 */
export function useEmbedEnhancements(containerRef: RefObject<HTMLElement | null>, deps: unknown[]): void {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const frames = container.querySelectorAll<HTMLIFrameElement>('iframe[data-embed-frame]');
        if (frames.length === 0) return;

        const cleanups: Array<() => void> = [];
        const preconnected = new Set(
            Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"]'))
                .map((link) => link.href)
        );

        frames.forEach((frame) => {
            const provider = frame.dataset.embedProvider;

            if (provider && PROVIDER_PRECONNECT[provider]) {
                PROVIDER_PRECONNECT[provider].forEach((href) => {
                    if (preconnected.has(href)) return;
                    preconnected.add(href);

                    const link = document.createElement('link');
                    link.rel = 'preconnect';
                    link.href = href;
                    link.crossOrigin = 'anonymous';
                    document.head.appendChild(link);
                });
            }

            const skeleton = frame.parentElement?.querySelector<HTMLElement>('[data-embed-skeleton]');
            if (!skeleton) return;

            const hideSkeleton = () => {
                skeleton.style.opacity = '0';
                skeleton.style.pointerEvents = 'none';
                window.setTimeout(() => skeleton.remove(), 300);
            };

            const onLoad = () => hideSkeleton();
            frame.addEventListener('load', onLoad, { once: true });
            cleanups.push(() => frame.removeEventListener('load', onLoad));

            // Fallback in case the load event never fires for this provider
            const timeout = window.setTimeout(hideSkeleton, 8000);
            cleanups.push(() => window.clearTimeout(timeout));
        });

        return () => cleanups.forEach((cleanup) => cleanup());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
