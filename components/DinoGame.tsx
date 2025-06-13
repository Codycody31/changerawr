// components/DinoGame.tsx

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DinoGameProps {
    isOpen: boolean
    onClose: () => void
}

interface Dino {
    x: number
    y: number
    width: number
    height: number
    dy: number
    grounded: boolean
    isJumping: boolean
    isDucking: boolean
    runFrame: number
}

interface Obstacle {
    x: number
    y: number
    width: number
    height: number
    type: 'cactus_small' | 'cactus_large' | 'bird_high' | 'bird_low'
}

interface Cloud {
    x: number
    y: number
    width: number
    height: number
    speed: number
}

interface GameState {
    dino: Dino
    obstacles: Obstacle[]
    clouds: Cloud[]
    speed: number
    score: number
    highScore: number
    gameOver: boolean
    gameStarted: boolean
    keys: Record<string, boolean>
    frameCount: number
}

const DinoGame: React.FC<DinoGameProps> = ({ isOpen, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gameLoopRef = useRef<number | null>(null)
    const [score, setScore] = useState(0)
    const [highScore, setHighScore] = useState(0)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [gameOver, setGameOver] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)

    const GRAVITY = 0.8
    const JUMP_STRENGTH = -16
    const GROUND_Y = 300
    const CANVAS_WIDTH = 900
    const CANVAS_HEIGHT = 400
    const DINO_WIDTH = 44
    const DINO_HEIGHT = 48
    const DINO_DUCK_HEIGHT = 28

    // Game state
    const gameState = useRef<GameState>({
        dino: {
            x: 80,
            y: GROUND_Y - DINO_HEIGHT,
            width: DINO_WIDTH,
            height: DINO_HEIGHT,
            dy: 0,
            grounded: true,
            isJumping: false,
            isDucking: false,
            runFrame: 0
        },
        obstacles: [],
        clouds: [],
        speed: 6,
        score: 0,
        highScore: 0,
        gameOver: false,
        gameStarted: false,
        keys: {},
        frameCount: 0
    })

    // Load high score from localStorage
    useEffect(() => {
        const savedHighScore = localStorage.getItem('dino-high-score')
        if (savedHighScore) {
            const score = parseInt(savedHighScore, 10)
            setHighScore(score)
            gameState.current.highScore = score
        }
    }, [])

    const saveHighScore = useCallback((newScore: number) => {
        if (newScore > gameState.current.highScore) {
            gameState.current.highScore = newScore
            setHighScore(newScore)
            localStorage.setItem('dino-high-score', newScore.toString())
        }
    }, [])

    const resetGame = useCallback(() => {
        gameState.current = {
            ...gameState.current,
            dino: {
                x: 80,
                y: GROUND_Y - DINO_HEIGHT,
                width: DINO_WIDTH,
                height: DINO_HEIGHT,
                dy: 0,
                grounded: true,
                isJumping: false,
                isDucking: false,
                runFrame: 0
            },
            obstacles: [],
            clouds: [
                { x: 200, y: 60, width: 60, height: 25, speed: 0.8 },
                { x: 450, y: 40, width: 80, height: 30, speed: 0.6 },
                { x: 700, y: 80, width: 70, height: 20, speed: 0.7 },
                { x: 300, y: 100, width: 50, height: 18, speed: 0.5 }
            ],
            speed: 6,
            score: 0,
            gameOver: false,
            gameStarted: true,
            keys: {},
            frameCount: 0
        }
        setScore(0)
        setGameOver(false)
        setGameStarted(true)
    }, [])

    const jump = useCallback(() => {
        const state = gameState.current
        if (state.dino.grounded && !state.gameOver && !state.dino.isDucking) {
            state.dino.dy = JUMP_STRENGTH
            state.dino.grounded = false
            state.dino.isJumping = true
        }
    }, [])

    const duck = useCallback((isDucking: boolean) => {
        const state = gameState.current
        if (!state.gameOver) {
            if (isDucking && state.dino.grounded) {
                state.dino.isDucking = true
                state.dino.height = DINO_DUCK_HEIGHT
                state.dino.y = GROUND_Y - DINO_DUCK_HEIGHT
            } else if (!isDucking && state.dino.isDucking) {
                state.dino.isDucking = false
                state.dino.height = DINO_HEIGHT
                if (state.dino.grounded) {
                    state.dino.y = GROUND_Y - DINO_HEIGHT
                }
            }
        }
    }, [])

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault()
            if (!gameState.current.gameStarted) {
                resetGame()
            } else {
                jump()
            }
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault()
            duck(true)
        }
        gameState.current.keys[e.code] = true
    }, [jump, resetGame, duck])

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.code === 'ArrowDown') {
            duck(false)
        }
        gameState.current.keys[e.code] = false
    }, [duck])

    const spawnObstacle = useCallback(() => {
        const state = gameState.current
        const obstacleTypes: Obstacle['type'][] = ['cactus_small', 'cactus_large', 'bird_high', 'bird_low']
        const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]

        let obstacle: Obstacle

        switch (obstacleType) {
            case 'cactus_small':
                obstacle = {
                    x: CANVAS_WIDTH,
                    y: GROUND_Y - 35,
                    width: 17,
                    height: 35,
                    type: 'cactus_small'
                }
                break
            case 'cactus_large':
                obstacle = {
                    x: CANVAS_WIDTH,
                    y: GROUND_Y - 50,
                    width: 25,
                    height: 50,
                    type: 'cactus_large'
                }
                break
            case 'bird_high':
                obstacle = {
                    x: CANVAS_WIDTH,
                    y: GROUND_Y - 90,
                    width: 42,
                    height: 30,
                    type: 'bird_high'
                }
                break
            case 'bird_low':
                obstacle = {
                    x: CANVAS_WIDTH,
                    y: GROUND_Y - 40,
                    width: 42,
                    height: 30,
                    type: 'bird_low'
                }
                break
        }

        state.obstacles.push(obstacle)
    }, [])

    const updateClouds = useCallback(() => {
        const state = gameState.current

        state.clouds.forEach(cloud => {
            cloud.x -= cloud.speed
            if (cloud.x + cloud.width < 0) {
                cloud.x = CANVAS_WIDTH + Math.random() * 300
                cloud.y = 40 + Math.random() * 80
                cloud.width = 50 + Math.random() * 40
                cloud.height = 15 + Math.random() * 15
            }
        })
    }, [])

    const update = useCallback(() => {
        const state = gameState.current
        if (state.gameOver || !state.gameStarted) return

        state.frameCount++

        // Update dino animation
        if (state.dino.grounded && !state.dino.isDucking) {
            state.dino.runFrame = Math.floor((state.frameCount / 8) % 2)
        }

        // Update dino physics
        state.dino.dy += GRAVITY
        state.dino.y += state.dino.dy

        // Ground collision
        const targetGroundY = state.dino.isDucking ? GROUND_Y - DINO_DUCK_HEIGHT : GROUND_Y - DINO_HEIGHT
        if (state.dino.y >= targetGroundY) {
            state.dino.y = targetGroundY
            state.dino.dy = 0
            state.dino.grounded = true
            state.dino.isJumping = false
        }

        // Spawn obstacles with better timing
        const spawnChance = 0.012 + (state.speed - 6) * 0.002
        if (Math.random() < spawnChance && state.frameCount > 90) {
            const lastObstacle = state.obstacles[state.obstacles.length - 1]
            if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - 300) {
                spawnObstacle()
            }
        }

        // Update obstacles
        state.obstacles = state.obstacles.filter(obstacle => {
            obstacle.x -= state.speed
            return obstacle.x > -obstacle.width
        })

        // Update clouds
        updateClouds()

        // Collision detection
        for (const obstacle of state.obstacles) {
            const dinoLeft = state.dino.x + 4
            const dinoRight = state.dino.x + state.dino.width - 4
            const dinoTop = state.dino.y + 4
            const dinoBottom = state.dino.y + state.dino.height - 4

            if (
                dinoLeft < obstacle.x + obstacle.width - 4 &&
                dinoRight > obstacle.x + 4 &&
                dinoTop < obstacle.y + obstacle.height - 4 &&
                dinoBottom > obstacle.y + 4
            ) {
                state.gameOver = true
                setGameOver(true)
                saveHighScore(Math.floor(state.score / 10))
                return
            }
        }

        // Update score and speed
        state.score += 1
        if (state.score % 300 === 0) {
            state.speed += 0.4
        }

        const currentScore = Math.floor(state.score / 10)
        setScore(currentScore)
    }, [spawnObstacle, updateClouds, saveHighScore])

    const drawDino = useCallback((ctx: CanvasRenderingContext2D, dino: Dino) => {
        const { x, y, width, height, isJumping, isDucking, runFrame } = dino

        // Main body color
        const bodyColor = gameState.current.gameOver ? '#ef4444' : '#22c55e'
        const darkColor = gameState.current.gameOver ? '#dc2626' : '#16a34a'

        if (isDucking) {
            // Ducking dino - horizontal body
            ctx.fillStyle = bodyColor
            ctx.fillRect(x, y, width, height)

            // Head
            ctx.fillRect(x + width - 18, y - 8, 18, 20)

            // Eye
            ctx.fillStyle = '#000'
            ctx.fillRect(x + width - 8, y - 4, 3, 3)

            // Tail
            ctx.fillStyle = darkColor
            ctx.fillRect(x - 8, y + 4, 10, 8)

            // Legs (running)
            ctx.fillStyle = bodyColor
            const legOffset = Math.floor(gameState.current.frameCount / 6) % 2
            ctx.fillRect(x + 8, y + height, 6, 8 + legOffset)
            ctx.fillRect(x + 20, y + height, 6, 8 + (1 - legOffset))

        } else {
            // Standing/jumping dino - vertical body
            ctx.fillStyle = bodyColor
            ctx.fillRect(x, y, width, height)

            // Head details
            ctx.fillStyle = darkColor
            ctx.fillRect(x, y, width, 12) // head

            // Eye
            ctx.fillStyle = '#000'
            ctx.fillRect(x + width - 12, y + 3, 4, 4)

            // Nostril
            ctx.fillRect(x + width - 6, y + 6, 2, 2)

            // Arms
            ctx.fillStyle = bodyColor
            ctx.fillRect(x - 6, y + 15, 8, 4)
            ctx.fillRect(x - 4, y + 19, 6, 8)

            // Tail
            ctx.fillStyle = darkColor
            ctx.fillRect(x - 10, y + 10, 12, 6)

            if (!isJumping) {
                // Running legs animation
                ctx.fillStyle = bodyColor
                if (runFrame === 0) {
                    ctx.fillRect(x + 8, y + height, 8, 12)
                    ctx.fillRect(x + 20, y + height, 8, 8)
                } else {
                    ctx.fillRect(x + 8, y + height, 8, 8)
                    ctx.fillRect(x + 20, y + height, 8, 12)
                }

                // Feet
                ctx.fillStyle = darkColor
                ctx.fillRect(x + 6, y + height + (runFrame === 0 ? 12 : 8), 12, 4)
                ctx.fillRect(x + 22, y + height + (runFrame === 0 ? 8 : 12), 12, 4)
            } else {
                // Jumping legs - together
                ctx.fillStyle = bodyColor
                ctx.fillRect(x + 12, y + height, 12, 10)
                ctx.fillStyle = darkColor
                ctx.fillRect(x + 10, y + height + 10, 16, 4)
            }
        }

        // Belly detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        if (isDucking) {
            ctx.fillRect(x + 4, y + 4, width - 8, height - 8)
        } else {
            ctx.fillRect(x + 4, y + 16, width - 8, height - 20)
        }
    }, [])

    const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
        const { x, y, width, height, type } = obstacle

        if (type.startsWith('cactus')) {
            // Cactus green
            ctx.fillStyle = '#16a34a'
            ctx.fillRect(x, y, width, height)

            // Cactus details
            ctx.fillStyle = '#15803d'

            if (type === 'cactus_large') {
                // Large cactus with arms
                ctx.fillRect(x - 6, y + 15, 12, 6)
                ctx.fillRect(x + width - 6, y + 25, 12, 6)
                // Vertical segments
                ctx.fillRect(x + 2, y, 4, height)
                ctx.fillRect(x + width - 6, y, 4, height)
                // Spikes
                for (let i = 0; i < height; i += 8) {
                    ctx.fillRect(x - 2, y + i, 2, 3)
                    ctx.fillRect(x + width, y + i + 4, 2, 3)
                }
            } else {
                // Small cactus
                ctx.fillRect(x + 2, y, 4, height)
                // Spikes
                for (let i = 0; i < height; i += 6) {
                    ctx.fillRect(x - 1, y + i, 2, 2)
                    ctx.fillRect(x + width - 1, y + i + 3, 2, 2)
                }
            }
        } else {
            // Bird/Pterodactyl
            ctx.fillStyle = '#525252'

            // Body
            ctx.fillRect(x + 8, y + 8, width - 16, height - 16)

            // Head
            ctx.fillRect(x + width - 12, y + 4, 12, 12)

            // Beak
            ctx.fillRect(x + width - 4, y + 8, 6, 4)

            // Wing animation
            const wingFlap = Math.floor(gameState.current.frameCount / 6) % 2
            if (wingFlap) {
                // Wings up
                ctx.fillRect(x, y, width, 8)
                ctx.fillRect(x + 4, y - 4, width - 8, 4)
            } else {
                // Wings down
                ctx.fillRect(x, y + height - 8, width, 8)
                ctx.fillRect(x + 4, y + height, width - 8, 4)
            }

            // Eye
            ctx.fillStyle = '#000'
            ctx.fillRect(x + width - 8, y + 6, 2, 2)

            // Tail
            ctx.fillStyle = '#404040'
            ctx.fillRect(x - 4, y + 12, 8, 6)
        }
    }, [])

    const drawCloud = useCallback((ctx: CanvasRenderingContext2D, cloud: Cloud) => {
        ctx.fillStyle = '#e5e7eb'

        // Draw cloud with multiple circles for fluffy effect
        const circles = [
            { x: cloud.x, y: cloud.y, r: cloud.height * 0.4 },
            { x: cloud.x + cloud.width * 0.3, y: cloud.y - cloud.height * 0.2, r: cloud.height * 0.5 },
            { x: cloud.x + cloud.width * 0.6, y: cloud.y, r: cloud.height * 0.4 },
            { x: cloud.x + cloud.width * 0.8, y: cloud.y + cloud.height * 0.1, r: cloud.height * 0.3 },
            { x: cloud.x + cloud.width, y: cloud.y, r: cloud.height * 0.4 }
        ]

        ctx.beginPath()
        circles.forEach(circle => {
            ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2)
        })
        ctx.fill()
    }, [])

    const drawGround = useCallback((ctx: CanvasRenderingContext2D) => {
        const state = gameState.current
        const isDark = Math.floor(state.score / 2000) % 2 === 1

        // Ground line
        ctx.fillStyle = isDark ? '#666' : '#404040'
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 3)

        // Ground texture - moving dots and lines
        ctx.fillStyle = isDark ? '#555' : '#333'

        // Moving ground pattern
        const offset = (state.frameCount * state.speed / 2) % 40
        for (let i = -40; i < CANVAS_WIDTH; i += 40) {
            const x = i + offset
            // Small rocks/debris
            ctx.fillRect(x, GROUND_Y + 4, 3, 2)
            ctx.fillRect(x + 15, GROUND_Y + 5, 2, 1)
            ctx.fillRect(x + 25, GROUND_Y + 4, 4, 2)

            // Ground cracks
            ctx.fillRect(x + 8, GROUND_Y + 3, 8, 1)
            ctx.fillRect(x + 30, GROUND_Y + 3, 6, 1)
        }
    }, [])

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const state = gameState.current

        // Day/night cycle
        const isDark = Math.floor(state.score / 2000) % 2 === 1
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const bgColor = isDark ? '#1a1a1a' : '#f0f9ff'

        // Gradient sky
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
        if (isDark) {
            gradient.addColorStop(0, '#0f172a')
            gradient.addColorStop(1, '#1e293b')
        } else {
            gradient.addColorStop(0, '#dbeafe')
            gradient.addColorStop(1, '#f0f9ff')
        }

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw stars if dark
        if (isDark) {
            ctx.fillStyle = '#ffffff'
            for (let i = 0; i < 20; i++) {
                const x = (i * 73 + state.frameCount * 0.1) % CANVAS_WIDTH
                const y = 20 + (i * 31) % 80
                if (Math.sin(state.frameCount * 0.05 + i) > 0.5) {
                    ctx.fillRect(x, y, 1, 1)
                }
            }
        }

        // Draw clouds
        state.clouds.forEach(cloud => drawCloud(ctx, cloud))

        // Draw ground
        drawGround(ctx)

        // Draw dino
        drawDino(ctx, state.dino)

        // Draw obstacles
        state.obstacles.forEach(obstacle => drawObstacle(ctx, obstacle))

        // Draw UI
        ctx.fillStyle = isDark ? '#fff' : '#1f2937'
        ctx.font = 'bold 20px monospace'
        ctx.fillText(`${Math.floor(state.score / 10).toString().padStart(5, '0')}`, CANVAS_WIDTH - 120, 35)

        ctx.font = '14px monospace'
        ctx.fillText(`HI ${state.highScore.toString().padStart(5, '0')}`, CANVAS_WIDTH - 120, 55)

        if (!state.gameStarted) {
            // Start screen
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            ctx.fillStyle = '#fff'
            ctx.font = 'bold 32px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('🦖 CHANGERAWR DINO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40)

            ctx.font = '18px monospace'
            ctx.fillText('Press SPACE to start running!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

            ctx.font = '14px monospace'
            ctx.fillStyle = '#bbb'
            ctx.fillText('↑ SPACE: Jump  •  ↓: Duck', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30)
            ctx.textAlign = 'left'
        }

        if (state.gameOver) {
            // Game over overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            ctx.fillStyle = '#fff'
            ctx.font = 'bold 36px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

            ctx.font = '20px monospace'
            ctx.fillText(`Score: ${Math.floor(state.score / 10)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10)

            if (Math.floor(state.score / 10) === state.highScore && state.highScore > 0) {
                ctx.fillStyle = '#ffd700'
                ctx.font = 'bold 18px monospace'
                ctx.fillText('🏆 NEW HIGH SCORE! 🏆', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
            }

            ctx.fillStyle = '#ccc'
            ctx.font = '16px monospace'
            ctx.fillText('Press Start Game to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70)
            ctx.textAlign = 'left'
        }
    }, [drawDino, drawObstacle, drawCloud, drawGround])

    const gameLoop = useCallback(() => {
        update()
        draw()
        gameLoopRef.current = requestAnimationFrame(gameLoop)
    }, [update, draw])

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
            window.addEventListener('keyup', handleKeyUp)
            gameLoopRef.current = requestAnimationFrame(gameLoop)

            return () => {
                window.removeEventListener('keydown', handleKeyDown)
                window.removeEventListener('keyup', handleKeyUp)
                if (gameLoopRef.current) {
                    cancelAnimationFrame(gameLoopRef.current)
                }
            }
        }
    }, [isOpen, handleKeyDown, handleKeyUp, gameLoop])

    useEffect(() => {
        if (!isOpen) {
            setGameStarted(false)
            setGameOver(false)
            setScore(0)
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current)
                gameLoopRef.current = null
            }
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="bg-background border-2 border-border rounded-xl p-6 w-full max-w-5xl shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                🦖 Changerawr Dino
                            </h2>
                            <div className="text-lg font-mono text-muted-foreground">
                                {score.toString().padStart(5, '0')}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="bg-gradient-to-b from-sky-100 to-sky-50 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 mb-6 shadow-inner">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="w-full rounded border-2 border-slate-300 dark:border-slate-600 shadow-lg"
                            tabIndex={0}
                        />
                    </div>

                    <div className="text-center space-y-4">
                        <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <kbd className="px-3 py-1 bg-muted rounded-md font-mono text-xs border">SPACE</kbd>
                                <span>Jump</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-3 py-1 bg-muted rounded-md font-mono text-xs border">↓</kbd>
                                <span>Duck</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={resetGame}
                                variant="default"
                                size="lg"
                                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                {gameStarted ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                {gameStarted ? 'Restart Game' : 'Start Game'}
                            </Button>
                            <Button onClick={onClose} variant="outline" size="lg">
                                Close
                            </Button>
                        </div>

                        {highScore > 0 && (
                            <div className="text-sm text-muted-foreground">
                                High Score: <span className="font-mono font-bold">{highScore}</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default DinoGame