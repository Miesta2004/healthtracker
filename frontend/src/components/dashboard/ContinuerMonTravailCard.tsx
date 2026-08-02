import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { SkeletonSimpleList } from '../Skeleton'

export interface WorkItem {
    id: string
    icon: LucideIcon
    title: string
    subtitle: string
    ctaLabel: string
    onClick?: () => void
}

interface Props {
    items: WorkItem[] | null
    /** Tâches en attente (rappels), affichées en détail via un simple accordéon local — pas de nouvelle page. */
    rappelsDetail?: string[]
}

/**
 * Vue « reprendre là où je me suis arrêté(e) » : une seule carte premium
 * regroupant les tâches en cours de l'utilisateur connecté, construites à
 * partir des données déjà chargées par Dashboard.tsx (consultations,
 * planning du bloc opératoire) + deux appels à des fonctions d'API déjà
 * existantes (getDemandes, getRappels) qui n'étaient simplement pas encore
 * consommées ici. Aucune nouvelle route ni nouvel endpoint créé.
 */
export default function ContinuerMonTravailCard({ items, rappelsDetail }: Props) {
    const [detailOuvert, setDetailOuvert] = useState(false)
    const loading = items === null

    return (
        <div className="ht-card ht-card-padded">
            <h3 className="text-sm font-semibold pb-4 mb-1 border-b border-[var(--ht-border)]" style={{ color: 'var(--ht-text)' }}>
                Continuer mon travail
            </h3>

            {loading ? (
                <div className="pt-4"><SkeletonSimpleList rows={3} /></div>
            ) : items.length === 0 ? (
                <div className="ht-empty flex flex-col items-center gap-2">
                    <CheckCircle2 size={22} style={{ color: 'var(--ht-primary)' }} />
                    Tout est à jour. Aucune tâche en attente.
                </div>
            ) : (
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="rounded-2xl p-4 flex flex-col gap-3"
                            style={{ backgroundColor: 'var(--ht-bg)' }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: 'var(--ht-card-bg)' }}
                                >
                                    <item.icon size={16} style={{ color: 'var(--ht-primary)' }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{item.title}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{item.subtitle}</p>
                                </div>
                            </div>

                            {item.id === 'rappels' && rappelsDetail && rappelsDetail.length > 0 ? (
                                <div>
                                    <button
                                        onClick={() => setDetailOuvert(o => !o)}
                                        className="text-xs font-semibold flex items-center gap-1 self-start"
                                        style={{ color: 'var(--ht-primary)' }}
                                    >
                                        {item.ctaLabel} <ChevronDown size={13} className={detailOuvert ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                    </button>
                                    {detailOuvert && (
                                        <ul className="mt-2 space-y-1.5">
                                            {rappelsDetail.map((texte, i) => (
                                                <li key={i} className="text-xs pl-2 border-l-2" style={{ color: 'var(--ht-text-secondary)', borderColor: 'var(--ht-border)' }}>
                                                    {texte}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={item.onClick}
                                    className="text-xs font-semibold self-start"
                                    style={{ color: 'var(--ht-primary)' }}
                                >
                                    {item.ctaLabel} →
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}