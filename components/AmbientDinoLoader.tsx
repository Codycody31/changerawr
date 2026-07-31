'use client'
import dynamic from 'next/dynamic'

const AmbientDino = dynamic(
    () => import('./AmbientDino').then(m => m.AmbientDino),
    { ssr: false },
)

export function AmbientDinoLoader() {
    return <AmbientDino />
}
