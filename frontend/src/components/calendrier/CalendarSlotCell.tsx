import { useState } from 'react'

interface Props {
    hauteur: number
    pointille?: boolean
    onClick: () => void
    onDrop: (idEvenement: number) => void
}

export default function CalendarSlotCell({ hauteur, pointille, onClick, onDrop }: Props) {
    const [survole, setSurvole] = useState(false)

    return (
        <div
            onClick={onClick}
            onDragOver={e => { e.preventDefault(); setSurvole(true) }}
            onDragLeave={() => setSurvole(false)}
            onDrop={e => {
                e.preventDefault()
                setSurvole(false)
                const id = Number(e.dataTransfer.getData('text/plain'))
                if (id) onDrop(id)
            }}
            className={`cursor-pointer transition-colors border-b ${pointille ? 'border-dashed' : ''}`}
            style={{
                height: hauteur,
                borderColor: 'var(--ht-border)',
                backgroundColor: survole ? 'var(--ht-primary-tint-bg)' : undefined,
            }}
        />
    )
}
