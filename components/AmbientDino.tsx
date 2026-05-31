'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Runner, AMBIENT_ENABLED_KEY } from './dino/offline'
import { IS_HIDPI } from './dino/constants'

const SPRITE_SRC = IS_HIDPI
    ? '/dino/default_200_percent/200-offline-sprite.png'
    : '/dino/default_100_percent/100-offline-sprite.png'

const STRIP_H = 130

export function AmbientDino() {
    // Read localStorage synchronously on first render (component is client-only
    // via ssr:false dynamic import, so window is always available here).
    const [enabled, setEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem(AMBIENT_ENABLED_KEY) === '1' } catch { return false }
    })
    const [spriteReady, setSpriteReady] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const spriteRef    = useRef<HTMLImageElement | null>(null)
    const blobUrlRef   = useRef<string | null>(null)

    // ── React to enable/disable events from the DinoGame popup ───────────────
    useEffect(() => {
        const handler = (e: Event) => {
            setEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled)
        }
        window.addEventListener('dino-ambient-changed', handler)
        return () => window.removeEventListener('dino-ambient-changed', handler)
    }, [])

    // ── Sprite load — also owns the sprite resource lifecycle ─────────────────
    useEffect(() => {
        if (!enabled) {
            // Tear down sprite resources when disabled.
            setSpriteReady(false)
            spriteRef.current = null
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = null
            }
            return
        }
        const ctrl = new AbortController()
        fetch(SPRITE_SRC, { signal: ctrl.signal })
            .then(async res => {
                const reader = res.body!.getReader()
                const chunks: Uint8Array[] = []
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    if (value) chunks.push(value)
                }
                const url = URL.createObjectURL(new Blob(chunks, { type: 'image/png' }))
                blobUrlRef.current = url
                const img = new Image()
                img.onload = () => { spriteRef.current = img; setSpriteReady(true) }
                img.src = url
            })
            .catch(() => {})
        return () => { ctrl.abort() }
    }, [enabled])

    // ── Runner lifecycle — sprite cleanup is intentionally NOT done here so
    //    React strict-mode's double-invoke doesn't null out spriteRef before
    //    the second effect call can use it. ────────────────────────────────────
    useEffect(() => {
        if (!enabled || !spriteReady || !containerRef.current || !spriteRef.current) return
        const r = Runner.initializeAmbientInstance(containerRef.current, spriteRef.current)
        r.startImmediately()
        return () => { Runner.destroyAmbientInstance() }
    }, [enabled, spriteReady])

    if (!enabled) return null

    return (
        <div style={{
            position:      'fixed',
            bottom:        0,
            left:          0,
            width:         '100%',
            height:        STRIP_H,
            overflow:      'hidden',
            zIndex:        40,
            background:    'transparent',
            pointerEvents: 'none',
        }}>
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    bottom:   0,
                    left:     0,
                    right:    0,
                    height:   150,
                }}
            />
        </div>
    )
}
