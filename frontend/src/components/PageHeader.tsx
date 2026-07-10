import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
    title: string
    subtitle: string
    icon: LucideIcon
    ctaLabel?: string
    onCtaClick?: () => void
}

/**
 * Header compact : titre + sous-titre + action, sans illustration.
 * À utiliser pour les pages à fort trafic, consultées plusieurs fois par jour
 * (ex: Patients, Employés, Rendez-vous, Facturation) — voir PageBanner pour
 * les pages peu visitées ou les états d'accueil.
 */
export default function PageHeader({ title, subtitle, icon: Icon, ctaLabel, onCtaClick }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--ht-primary-tint-bg)' }}
                >
                    <Icon size={20} style={{ color: 'var(--ht-primary)' }} />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>
                        {title}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        {subtitle}
                    </p>
                </div>
            </div>
            {ctaLabel && (
                <button onClick={onCtaClick} className="btn btn-primary gap-1.5 self-start sm:self-auto">
                    <Plus size={16} /> {ctaLabel}
                </button>
            )}
        </div>
    )
}
