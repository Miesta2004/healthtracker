import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

interface PageBannerProps {
    title: ReactNode
    subtitle: string
    icon: LucideIcon
    ctaLabel?: string
    onCtaClick?: () => void
    /** Pour remplacer le CTA unique par plusieurs actions (ex: Dashboard) */
    actions?: ReactNode
    /** Icônes secondaires affichées dans la mosaïque décorative (2 à 4 conseillées) */
    decorIcons?: LucideIcon[]
    /** 'large' = bandeau plus haut/plus large, pour les pages d'accueil */
    size?: 'default' | 'large'
}

/**
 * Bandeau complet illustré.
 * À réserver aux pages peu visitées ou aux états d'accueil/onboarding
 * (ex: Accueil, Services, Rapports, Paramètres) — voir PageHeader pour
 * les pages à fort trafic.
 */
export default function PageBanner({
                                       title,
                                       subtitle,
                                       icon: Icon,
                                       ctaLabel,
                                       onCtaClick,
                                       actions,
                                       decorIcons = [],
                                       size = 'default',
                                   }: PageBannerProps) {
    const large = size === 'large'
    const mosaicW = large ? 300 : 220
    const mosaicH = large ? 190 : 140
    const scale = large ? 1.35 : 1

    return (
        <div
            className={`relative overflow-hidden rounded-2xl flex items-center justify-between gap-6 ${
                large ? 'px-8 py-10 sm:px-12 sm:py-12' : 'px-6 py-7 sm:px-8 sm:py-8'
            }`}
            style={{ backgroundColor: 'var(--ht-primary-tint-bg)' }}
        >
            {/* ── Texte + CTA ── */}
            <div className={large ? 'relative z-10 max-w-xl' : 'relative z-10 max-w-md'}>
                <div
                    className={`rounded-xl flex items-center justify-center ${large ? 'w-14 h-14 mb-5' : 'w-11 h-11 mb-4'}`}
                    style={{ backgroundColor: 'var(--ht-brand-bg)' }}
                >
                    <Icon size={large ? 26 : 20} style={{ color: 'var(--ht-brand-tint)' }} />
                </div>
                <h1 className={`font-bold ${large ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`} style={{ color: 'var(--ht-text)' }}>
                    {title}
                </h1>
                <p className={`leading-relaxed ${large ? 'text-base mt-2.5' : 'text-sm mt-1.5'}`} style={{ color: 'var(--ht-text-secondary)' }}>
                    {subtitle}
                </p>
                {actions ? (
                    <div className={`flex flex-wrap items-center gap-2.5 ${large ? 'mt-6' : 'mt-4'}`}>
                        {actions}
                    </div>
                ) : ctaLabel && (
                    <button onClick={onCtaClick} className={`btn btn-primary gap-1.5 ${large ? 'mt-6' : 'mt-4'}`}>
                        <Plus size={16} /> {ctaLabel}
                    </button>
                )}
            </div>

            {/* ── Mosaïque décorative (masquée sur mobile) ── */}
            <div className="relative z-10 hidden md:block flex-shrink-0" style={{ width: mosaicW, height: mosaicH }}>
                <div className="absolute rounded-xl" style={{ top: 8 * scale, left: 130 * scale, width: 44 * scale, height: 44 * scale, backgroundColor: 'var(--ht-brand-bg)' }} />
                <div className="absolute rounded-xl" style={{ top: 0, left: 60 * scale, width: 56 * scale, height: 56 * scale, backgroundColor: 'var(--ht-brand-tint)' }} />
                <div className="absolute rounded-xl flex items-center justify-center" style={{ top: 40 * scale, left: 88 * scale, width: 64 * scale, height: 64 * scale, backgroundColor: 'var(--ht-primary)' }}>
                    <Icon size={28 * scale} className="text-white" strokeWidth={1.8} />
                </div>
                <div className="absolute rounded-lg" style={{ top: 24 * scale, left: 20 * scale, width: 36 * scale, height: 36 * scale, backgroundColor: 'var(--ht-coral, #E8836B)', opacity: 0.85 }} />
                <div className="absolute rounded-xl" style={{ top: 90 * scale, left: 130 * scale, width: 48 * scale, height: 48 * scale, backgroundColor: 'var(--ht-brand-tint)', opacity: 0.6 }} />
                <div className="absolute rounded-lg" style={{ top: 88 * scale, left: 60 * scale, width: 32 * scale, height: 32 * scale, backgroundColor: 'var(--ht-primary)', opacity: 0.35 }} />
                <div className="absolute rounded-lg" style={{ top: 4 * scale, left: 178 * scale, width: 24 * scale, height: 24 * scale, backgroundColor: 'var(--ht-primary)', opacity: 0.25 }} />

                {decorIcons.slice(0, 2).map((DecorIcon, i) => (
                    <div
                        key={i}
                        className="absolute rounded-xl flex items-center justify-center"
                        style={{
                            top: (i === 0 ? 100 : 12) * scale,
                            left: (i === 0 ? 170 : 158) * scale,
                            width: 36 * scale, height: 36 * scale,
                            backgroundColor: 'var(--ht-body-secondary, #fff)',
                            border: '1px solid var(--ht-border)',
                        }}
                    >
                        <DecorIcon size={16 * scale} style={{ color: 'var(--ht-primary)' }} />
                    </div>
                ))}
            </div>
        </div>
    )
}