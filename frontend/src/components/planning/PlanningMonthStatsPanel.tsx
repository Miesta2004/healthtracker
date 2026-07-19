import type { EvenementPlanning, TypeEvenementRdv } from '../../types'
import { TYPE_EVENEMENT_STYLE } from './typeEvenementConfig'

const ORDRE_TYPES: TypeEvenementRdv[] = ['intervention', 'consultation', 'reunion', 'garde', 'visite_postoperatoire', 'autre']

interface Props {
    evenements: EvenementPlanning[]
    onSelectJour: (jour: Date) => void
}

export default function PlanningMonthStatsPanel({ evenements, onSelectJour }: Props) {
    const actifs = evenements.filter(e => e.statut !== 'annule')
    const total = actifs.length

    const compteurs = ORDRE_TYPES.map(type => ({
        type,
        label: TYPE_EVENEMENT_STYLE[type] ? actifs.find(e => e.type_evenement === type)?.type_evenement_label ?? type : type,
        nb: actifs.filter(e => e.type_evenement === type).length,
        style: TYPE_EVENEMENT_STYLE[type],
    }))

    const maintenant = new Date()
    const aVenir = actifs
        .filter(e => new Date(e.start_time) > maintenant)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5)

    return (
        <div className="space-y-4">
            <div className="ht-card ht-card-padded-sm">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ht-text)' }}>Statistiques du mois</h3>
                <div className="space-y-2">
                    {compteurs.map(c => (
                        <div key={c.type} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2" style={{ color: c.style?.text ?? 'var(--ht-text)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.style?.border ?? 'var(--ht-muted)' }} />
                                {c.label}
                            </span>
                            <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{c.nb}</span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between text-xs pt-2 mt-1" style={{ borderTop: '1px solid var(--ht-border)' }}>
                        <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>Total</span>
                        <span className="font-bold" style={{ color: 'var(--ht-text)' }}>{total}</span>
                    </div>
                </div>
            </div>

            <div className="ht-card ht-card-padded-sm">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ht-text)' }}>Événements à venir</h3>
                {aVenir.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Rien de prévu prochainement.</p>
                ) : (
                    <div className="space-y-2.5">
                        {aVenir.map(e => (
                            <button
                                key={e.id}
                                onClick={() => onSelectJour(new Date(e.start_time))}
                                className="flex items-center gap-2.5 w-full text-left"
                            >
                                <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                    {new Date(e.start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                    {' – '}
                                    {new Date(e.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-xs truncate" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {e.type_evenement_label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
