'use client'

import React, { useEffect, useRef, useState, useCallback, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Runner, AMBIENT_UNLOCK_KEY, AMBIENT_ENABLED_KEY } from './dino/offline'
import type { TrexDebugConfigSetting } from './dino/offline'
import { IS_HIDPI } from './dino/constants'

interface DinoGameProps { isOpen: boolean; onClose: () => void }

const SPRITE_SRC    = IS_HIDPI
    ? '/dino/default_200_percent/200-offline-sprite.png'
    : '/dino/default_100_percent/100-offline-sprite.png'
const BLOCKS        = 14
const ANIM_DURATION = 700
const C             = '#535353'   // game colour
const IS_DEV        = process.env.NODE_ENV === 'development'

// ── Pixel-art icons ──────────────────────────────────────────────────────────
function IconX() {
    return (
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ imageRendering: 'pixelated', display: 'block' }}>
            <rect fill={C} x="0" y="0" width="2" height="2"/>
            <rect fill={C} x="8" y="0" width="2" height="2"/>
            <rect fill={C} x="2" y="2" width="2" height="2"/>
            <rect fill={C} x="6" y="2" width="2" height="2"/>
            <rect fill={C} x="4" y="4" width="2" height="2"/>
            <rect fill={C} x="2" y="6" width="2" height="2"/>
            <rect fill={C} x="6" y="6" width="2" height="2"/>
            <rect fill={C} x="0" y="8" width="2" height="2"/>
            <rect fill={C} x="8" y="8" width="2" height="2"/>
        </svg>
    )
}


// ── Loading / play screen ────────────────────────────────────────────────────
function LoadScreen({ barProgress, ready, onPlay }: {
    barProgress: number
    ready: boolean
    onPlay: () => void
}) {
    const filled = Math.floor(Math.min(1, barProgress) * BLOCKS)

    return (
        <div style={{
            position: 'absolute', inset: 0,
            background: '#f7f7f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
        }}>
            {ready ? (
                <button onClick={onPlay} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, outline: 'none', lineHeight: 0,
                }}>
                    <svg width="48" height="48" viewBox="0 0 12 12"
                        style={{ imageRendering: 'pixelated', display: 'block' }}>
                        <rect fill={C} x="2" y="1" width="2" height="10"/>
                        <rect fill={C} x="4" y="2" width="2" height="8"/>
                        <rect fill={C} x="6" y="3" width="2" height="6"/>
                        <rect fill={C} x="8" y="4" width="2" height="4"/>
                        <rect fill={C} x="10" y="5" width="2" height="2"/>
                    </svg>
                </button>
            ) : (
                <div style={{
                    border: `2px solid ${C}`,
                    padding: '2px',
                    lineHeight: 0,
                    display: 'inline-block',
                }}>
                    <div style={{ display: 'flex' }}>
                        {Array.from({ length: BLOCKS }).map((_, i) => (
                            <div key={i} style={{
                                width: 11, height: 8,
                                background: i < filled ? C : 'transparent',
                                transition: 'none',
                                flexShrink: 0,
                            }}/>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Debug field — must live outside DebugPanel so React sees a stable component
//    type across re-renders; defined inside would cause remount on every tick.
const dbgS: React.CSSProperties = { fontFamily: 'monospace', fontSize: 10, color: C, userSelect: 'none' }
const dbgLbl: React.CSSProperties = { ...dbgS, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }
const dbgInp: React.CSSProperties = { fontFamily: 'monospace', fontSize: 10, color: C, width: 58, background: '#f7f7f7', border: `1px solid ${C}`, padding: '1px 3px', outline: 'none' }

function DebugField({ label, initialValue, onChange }: {
    label: string
    initialValue: number | undefined
    onChange: (v: string) => void
}) {
    const [val, setVal]  = useState(String(initialValue ?? ''))
    const focusedRef     = useRef(false)
    // Only sync external updates when the input isn't focused.
    // Using a ref (not state) for focused keeps it out of the effect deps so the
    // effect never fires on blur — only on genuine external value changes.
    useEffect(() => {
        if (!focusedRef.current) setVal(String(initialValue ?? ''))
    }, [initialValue])
    return (
        <label style={dbgLbl}>
            <span style={dbgS}>{label}</span>
            <input
                style={dbgInp}
                type="number"
                step="any"
                value={val}
                onChange={e => setVal(e.target.value)}
                onFocus={() => { focusedRef.current = true }}
                onBlur={e => {
                    focusedRef.current = false
                    onChange(e.target.value)
                    // Keep showing what the user typed until the next tick syncs.
                    setVal(e.target.value)
                }}
                onKeyDown={e => { if (e.key === 'Enter') onChange((e.target as HTMLInputElement).value) }}
                tabIndex={-1}
            />
        </label>
    )
}

// ── Dev debug panel (only rendered in development) ───────────────────────────
function DebugPanel({ runner }: { runner: Runner | null }) {
    const [, tick]     = useReducer(n => n + 1, 0)
    const [open, setOpen] = useState(false)
    useEffect(() => {
        const id = setInterval(tick, 500)
        return () => clearInterval(id)
    }, [])

    const fps       = runner?.getDebugFps() ?? 0
    const collision = runner?.debugCollision ?? false
    const paused    = runner?.isGamePaused() ?? false
    const cfg       = runner?.getConfig()
    const trex      = runner?.getTrexDebugValues()

    const btn: React.CSSProperties = {
        ...dbgS, background: '#efefef', border: `1px solid ${C}`,
        cursor: 'pointer', padding: '1px 5px', outline: 'none',
    }

    function setRunnerCfg<K extends keyof ReturnType<Runner['getConfig']>>(key: K, raw: string) {
        if (!runner) return
        const v = parseFloat(raw)
        if (!isNaN(v)) runner.updateConfigSetting(key, v as never)
    }
    function setTrexCfg(key: TrexDebugConfigSetting, raw: string) {
        if (!runner) return
        const v = parseFloat(raw)
        if (!isNaN(v)) runner.updateTrexConfigSetting(key, v)
    }

    return (
        <div style={{ background: '#efefef', borderTop: `1px dashed ${C}` }}>
            {/* Header — always visible */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', flexWrap: 'wrap' }}>
                <button style={{ ...btn, padding: '1px 3px' }} tabIndex={-1} onClick={() => setOpen(v => !v)}>
                    {open ? '▾' : '▸'}
                </button>
                <span style={{ ...dbgS, fontWeight: 'bold' }}>DEV</span>
                <span style={dbgS}>FPS: {fps}</span>
                <span style={dbgS}>spd: {runner?.getCurrentSpeed().toFixed(2) ?? '—'}</span>
            </div>

            {/* Collapsible body */}
            {open && <div style={{ padding: '0 6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Toggles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button style={btn} tabIndex={-1}
                        onClick={() => { runner?.debugTogglePause(); tick() }}>
                        {paused ? '▶ resume' : '⏸ pause'}
                    </button>
                    <button style={btn} tabIndex={-1}
                        onClick={() => { if (runner) runner.debugCollision = !runner.debugCollision; tick() }}>
                        {collision ? '■' : '□'} hitboxes
                    </button>
                    <button style={btn} tabIndex={-1}
                        onClick={() => runner?.debugToggleNight()}>
                        toggle night
                    </button>
                </div>

                {/* Runner config */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <DebugField label="speed"     initialValue={cfg?.speed}          onChange={v => setRunnerCfg('speed', v)} />
                    <DebugField label="maxSpeed"  initialValue={cfg?.maxSpeed}       onChange={v => setRunnerCfg('maxSpeed', v)} />
                    <DebugField label="accel"     initialValue={cfg?.acceleration}   onChange={v => setRunnerCfg('acceleration', v)} />
                    <DebugField label="gapCoeff"  initialValue={cfg?.gapCoefficient} onChange={v => setRunnerCfg('gapCoefficient', v)} />
                    <DebugField label="nightDist" initialValue={cfg?.invertDistance} onChange={v => { const n = parseFloat(v); if (!isNaN(n) && runner) runner.setInvertDistance(n) }} />
                </div>

                {/* Trex physics */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <DebugField label="gravity"  initialValue={trex?.gravity}              onChange={v => setTrexCfg('gravity', v)} />
                    <DebugField label="jumpVel"  initialValue={trex?.initialJumpVelocity}  onChange={v => setTrexCfg('initialJumpVelocity', v)} />
                    <DebugField label="minJump"  initialValue={trex?.minJumpHeight}        onChange={v => setTrexCfg('minJumpHeight', v)} />
                    <DebugField label="spdDrop"  initialValue={trex?.speedDropCoefficient} onChange={v => setTrexCfg('speedDropCoefficient', v)} />
                </div>
            </div>}
        </div>
    )
}

// ── Shared pixel-art button style ────────────────────────────────────────────
const pixelBtn: React.CSSProperties = {
    background: '#f7f7f7',
    border: `2px solid ${C}`,
    cursor: 'pointer',
    padding: '4px',
    outline: 'none',
    lineHeight: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

// ── Main component ───────────────────────────────────────────────────────────
const DinoGame: React.FC<DinoGameProps> = ({ isOpen, onClose }) => {
    const containerRef  = useRef<HTMLDivElement>(null)
    const cardRef       = useRef<HTMLDivElement>(null)
    const spriteRef     = useRef<HTMLImageElement | null>(null)
    const blobUrlRef    = useRef<string | null>(null)
    const animRafRef    = useRef<number>(0)

    const [barProgress,      setBarProgress]      = useState(0)
    const [spriteReady,      setSpriteReady]      = useState(false)
    const [animDone,         setAnimDone]         = useState(false)
    const [showScreen,       setShowScreen]       = useState(false)
    const [isNight,          setIsNight]          = useState(false)
    const [runner,           setRunner]           = useState<Runner | null>(null)
    const [ambientUnlocked,  setAmbientUnlocked]  = useState(false)
    const [ambientEnabled,   setAmbientEnabled]   = useState(false)
    const [endScore,         setEndScore]         = useState(0)

    const ready = animDone && spriteReady

    // ── Cleanup ───────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        Runner.destroyInstance()
        setBarProgress(0); setSpriteReady(false); setAnimDone(false)
        setShowScreen(false)
        setIsNight(false)
        setEndScore(0)
        setRunner(null)
        spriteRef.current = null
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
        if (animRafRef.current) { cancelAnimationFrame(animRafRef.current); animRafRef.current = 0 }
    }, [])

    // ── Bar animation ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        setBarProgress(0); setAnimDone(false); setShowScreen(true)
        const start = performance.now()
        const tick = (now: number) => {
            const t = (now - start) / ANIM_DURATION
            if (t < 1) {
                setBarProgress(t)
                animRafRef.current = requestAnimationFrame(tick)
            } else {
                setBarProgress(1)
                setTimeout(() => setAnimDone(true), 200)
            }
        }
        animRafRef.current = requestAnimationFrame(tick)
        return () => { if (animRafRef.current) cancelAnimationFrame(animRafRef.current) }
    }, [isOpen])

    // ── Sprite load ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        setSpriteReady(false)
        const controller = new AbortController()
        fetch(SPRITE_SRC, { signal: controller.signal })
            .then(async (res) => {
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
            .catch(() => {
                if (controller.signal.aborted) return
                const img = new Image()
                img.onload  = () => { spriteRef.current = img; setSpriteReady(true) }
                img.onerror = () => setSpriteReady(true)
                img.src = SPRITE_SRC
            })
        return () => { controller.abort() }
    }, [isOpen])

    useEffect(() => { if (!isOpen) cleanup() }, [isOpen, cleanup])

    // ── Ambient dino state ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        try {
            setAmbientUnlocked(localStorage.getItem(AMBIENT_UNLOCK_KEY) === '1')
            setAmbientEnabled(localStorage.getItem(AMBIENT_ENABLED_KEY) === '1')
        } catch {}
        const handler = () => setAmbientUnlocked(true)
        window.addEventListener('dino-ambient-unlocked', handler)
        return () => window.removeEventListener('dino-ambient-unlocked', handler)
    }, [isOpen])

    const startGame = useCallback(() => {
        if (!containerRef.current || !spriteRef.current) return
        const r = Runner.initializeInstance(containerRef.current, spriteRef.current)
        r.onInvertChange = setIsNight
        r.onGameOver = (score) => setEndScore(score)
        setEndScore(0)
        r.startImmediately()
        setRunner(r)
        requestAnimationFrame(() => requestAnimationFrame(() => setShowScreen(false)))
    }, [])

    // Enter key triggers the play button when the load screen is visible and ready.
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && showScreen && ready) startGame()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, showScreen, ready, startGame])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    ref={cardRef}
                    initial={{ scale: 0.94, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 16 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                    style={{
                        width: 'min(660px,100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        border: `1px solid #d4d4d8`,
                        borderRadius: 12,
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        background: '#fff',
                        filter: isNight ? 'invert(1)' : 'invert(0)',
                        transition: 'filter 500ms ease',
                    }}
                >
                    {/* Game canvas area */}
                    <div style={{ position: 'relative', background: '#f7f7f7', minHeight: 150 }}>
                        {showScreen && (
                            <LoadScreen barProgress={barProgress} ready={ready} onPlay={startGame} />
                        )}
                        <div
                            ref={containerRef}
                            style={{ position: 'relative', minHeight: 150 }}
                        />
                    </div>

                    {/* Dev debug panel */}
                    {IS_DEV && <DebugPanel runner={runner} />}

                    {/* 8-bit footer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 6px',
                        background: '#f7f7f7',
                        borderTop: `2px solid ${C}`,
                        gap: 6,
                        flexWrap: 'wrap',
                    }}>
                        {/* Controls hint */}
                        <span style={{
                            fontFamily: 'monospace',
                            fontSize: 10,
                            color: C,
                            letterSpacing: '0.04em',
                            userSelect: 'none',
                            flexShrink: 0,
                        }}>
                            ↑/SPC JUMP &nbsp;·&nbsp; ↓ DUCK
                        </span>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {(ambientUnlocked || endScore >= 1000) && (
                                <button
                                    tabIndex={-1}
                                    onClick={() => {
                                        const next = !ambientEnabled
                                        setAmbientEnabled(next)
                                        try { localStorage.setItem(AMBIENT_ENABLED_KEY, next ? '1' : '0') } catch {}
                                        window.dispatchEvent(new CustomEvent('dino-ambient-changed', { detail: { enabled: next } }))
                                    }}
                                    style={{
                                        ...pixelBtn,
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                        color: C,
                                        padding: '3px 6px',
                                        lineHeight: 1,
                                    }}
                                    title="Toggle ambient dino strip"
                                >
                                    AMBIENT {ambientEnabled ? 'ON' : 'OFF'}
                                </button>
                            )}
                            <button onClick={onClose} style={pixelBtn} tabIndex={-1} title="Close">
                                <IconX />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default DinoGame
