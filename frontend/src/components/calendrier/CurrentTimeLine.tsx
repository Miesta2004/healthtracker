import { useEffect, useState } from 'react'
import { positionHeureActuelle } from './calendrierConfig'

export default function CurrentTimeLine() {
    const [top, setTop] = useState<number | null>(positionHeureActuelle())

    useEffect(() => {
        const id = setInterval(() => setTop(positionHeureActuelle()), 60_000)
        return () => clearInterval(id)
    }, [])

    if (top === null) return null

    const label = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
            <div className="flex items-center">
                <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded -translate-x-1/2 -translate-y-1/2"
                    style={{ backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' }}
                >
                    {label}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--ht-primary)' }} />
            </div>
        </div>
    )
}
