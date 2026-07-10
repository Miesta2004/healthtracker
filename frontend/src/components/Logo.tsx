interface LogoProps {
    /** Taille de la pastille (px) */
    size?: number
    /** Taille du SVG à l'intérieur de la pastille (px). Par défaut ~65% de `size`. */
    iconSize?: number
    /** Affiche ou non le texte "HealthTracker" à côté du logo */
    showText?: boolean
    /** Classes tailwind appliquées au texte (taille, graisse, etc.) */
    textClassName?: string
    /** Style additionnel appliqué au texte (ex: couleur sur fond sombre) */
    textStyle?: React.CSSProperties
    className?: string
}

export default function Logo({
                                 size = 40,
                                 iconSize,
                                 showText = true,
                                 textClassName = 'font-bold tracking-wide text-sm',
                                 textStyle,
                                 className = '',
                             }: LogoProps) {
    const icon = iconSize ?? Math.round(size * 0.65)

    return (
        <div className={`relative z-10 flex items-center gap-3 ${className}`}>
            <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    width: size,
                    height: size,
                    backgroundColor: 'var(--ht-brand-bg)',
                    border: '1.5px solid var(--ht-brand-tint)',
                }}
            >
                <svg viewBox="0 0 120 120" width={icon} height={icon} xmlns="http://www.w3.org/2000/svg">
                    <g fill="var(--ht-brand-tint)">
                        <rect x="25" y="22" width="12" height="12" rx="2"/>
                        <rect x="39" y="22" width="12" height="12" rx="2"/>
                        <rect x="67" y="22" width="12" height="12" rx="2"/>
                        <rect x="81" y="22" width="12" height="12" rx="2"/>
                        <rect x="11" y="36" width="12" height="12" rx="2"/>
                        <rect x="25" y="36" width="12" height="12" rx="2"/>
                        <rect x="39" y="36" width="12" height="12" rx="2"/>
                        <rect x="53" y="36" width="12" height="12" rx="2"/>
                        <rect x="67" y="36" width="12" height="12" rx="2"/>
                        <rect x="81" y="36" width="12" height="12" rx="2"/>
                        <rect x="95" y="36" width="12" height="12" rx="2"/>
                        <rect x="11" y="50" width="12" height="12" rx="2"/>
                        <rect x="25" y="50" width="12" height="12" rx="2"/>
                        <rect x="39" y="50" width="12" height="12" rx="2"/>
                        <rect x="53" y="50" width="12" height="12" rx="2"/>
                        <rect x="67" y="50" width="12" height="12" rx="2"/>
                        <rect x="81" y="50" width="12" height="12" rx="2"/>
                        <rect x="95" y="50" width="12" height="12" rx="2"/>
                        <rect x="25" y="64" width="12" height="12" rx="2"/>
                        <rect x="39" y="64" width="12" height="12" rx="2"/>
                        <rect x="53" y="64" width="12" height="12" rx="2"/>
                        <rect x="67" y="64" width="12" height="12" rx="2"/>
                        <rect x="81" y="64" width="12" height="12" rx="2"/>
                        <rect x="39" y="78" width="12" height="12" rx="2"/>
                        <rect x="53" y="78" width="12" height="12" rx="2"/>
                        <rect x="67" y="78" width="12" height="12" rx="2"/>
                        <rect x="53" y="92" width="12" height="12" rx="2"/>
                    </g>
                    <g fill="#eafbf6" opacity="0.5">
                        <rect x="25" y="36" width="12" height="12" rx="2"/>
                        <rect x="11" y="50" width="12" height="12" rx="2"/>
                        <rect x="25" y="50" width="12" height="12" rx="2"/>
                    </g>
                </svg>
            </div>
            {showText && (
                <span className={textClassName} style={{ color: 'var(--ht-text)', ...textStyle }}>
                    HealthTracker
                </span>
            )}
        </div>
    )
}
