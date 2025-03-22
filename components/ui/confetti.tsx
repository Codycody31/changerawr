'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function Confetti() {
    const [particles, setParticles] = useState<{ id: number; x: number; color: string; size: number; delay: number }[]>([])

    useEffect(() => {
        // Create confetti particles
        const colors = ['#FF5252', '#FF9600', '#FFDE03', '#48FF00', '#00E5FF', '#8B6FFB', '#FF00C6']
        const newParticles = Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100, // random horizontal position (percentage)
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 7 + 3, // between 3-10px
            delay: Math.random() * 0.5 // random delay for varied animation
        }))

        setParticles(newParticles)
    }, [])

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute top-0 rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color
                    }}
                    initial={{ y: -20, opacity: 1 }}
                    animate={{
                        y: ['0%', '100%'],
                        x: [
                            `${particle.x}%`,
                            `${particle.x + (Math.random() * 20 - 10)}%`,
                            `${particle.x + (Math.random() * 40 - 20)}%`
                        ],
                        opacity: [1, 1, 0],
                        rotate: [0, Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1)]
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        ease: "easeOut",
                        delay: particle.delay,
                    }}
                />
            ))}
        </div>
    )
}

export default Confetti