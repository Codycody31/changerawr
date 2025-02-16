'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for handling media queries
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)')
 * const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
 * ```
 */
export function useMediaQuery(query: string): boolean {
    // Initialize with null and update on mount to avoid hydration mismatch
    const [matches, setMatches] = useState<boolean | null>(null)

    useEffect(() => {
        // Create media query list
        const mediaQuery = window.matchMedia(query)

        // Set initial value
        setMatches(mediaQuery.matches)

        // Create event listener
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Add listener
        mediaQuery.addEventListener('change', handleChange)

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleChange)
        }
    }, [query]) // Only re-run effect if query changes

    // Return false during SSR to avoid hydration mismatch
    return matches ?? false
}

// Predefined breakpoint queries
export const breakpoints = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
    '2xl': '(min-width: 1536px)',
    // Mobile first approach
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',
    // Feature queries
    dark: '(prefers-color-scheme: dark)',
    light: '(prefers-color-scheme: light)',
    reducedMotion: '(prefers-reduced-motion: reduce)',
    highContrast: '(prefers-contrast: high)',
    portrait: '(orientation: portrait)',
    landscape: '(orientation: landscape)',
} as const

/**
 * Hook creator for predefined breakpoints
 * @param breakpoint - Key of predefined breakpoint
 * @returns boolean indicating if the breakpoint matches
 *
 * @example
 * ```tsx
 * const isMobile = useBreakpoint('mobile')
 * const isTablet = useBreakpoint('tablet')
 * const prefersReducedMotion = useBreakpoint('reducedMotion')
 * ```
 */
export function useBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
    return useMediaQuery(breakpoints[breakpoint])
}