// Petite pastille de pouls animée : sa vitesse reflète la fréquence cardiaque réelle du patient.
export default function PulseDot({
                                     freq, color = 'currentColor', size = 8,
                                 }: { freq?: number | null; color?: string; size?: number }) {
    const duration = freq && freq > 0 ? Math.min(1.6, Math.max(0.45, 60 / freq)) : 1

    return (
        <span
            className="ht-pulse-dot"
            style={{
                width: size,
                height: size,
                color,
                ['--ht-pulse-duration' as string]: `${duration}s`,
            }}
        />
    )
}
