'use client';

import {useEffect, useState, RefObject, ReactPortal} from 'react';
import {createPortal} from 'react-dom';
import {CopyButton} from './CopyButton';

/**
 * Finds the "Copy" button placeholders rendered by the syntax-highlight
 * extension's `code_block` rule (`[data-copy-button]` inside
 * `.code-block-wrapper`) and portals a `CopyButton` (lucide icons +
 * `useState` copy feedback, styled with Tailwind) into each one.
 *
 * @param containerRef - ref to the element containing the rendered markdown HTML
 * @param deps - dependency array that should change whenever the rendered HTML changes
 * @returns portals to render alongside the markdown container
 */
export function useCodeCopyButtons(containerRef: RefObject<HTMLElement | null>, deps: unknown[]): ReactPortal[] {
    const [portals, setPortals] = useState<ReactPortal[]>([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            setPortals([]);
            return;
        }

        const buttons = Array.from(container.querySelectorAll<HTMLElement>('[data-copy-button]'));

        setPortals(buttons.map((button, index) => {
            const wrapper = button.closest('.code-block-wrapper');
            const code = wrapper?.querySelector('code')?.textContent || '';

            return createPortal(<CopyButton code={code}/>, button, `copy-button-${index}`);
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return portals;
}
