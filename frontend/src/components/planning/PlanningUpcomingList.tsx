import type { EvenementPlanning } from '../../types'
import { TYPE_EVENEMENT_STYLE } from './typeEvenementConfig'

interface Props {
    evenements: EvenementPlanning[]
}

export default function PlanningUpcomingList({ evenements }: Props) {
    const maintenant = new Date()
    const iso = maintenant.toISOString().slice(0, 10)

    const aVenir = evenements
        .filter(e => e.start_time.slice(0, 10) === iso && new Date(e.start_time) > maintenant && e.statut !== 'annule')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return (
        <div className="ht-card ht-card-padded-sm">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ht-text)' }}>
                Événements à venir aujourd'hui
            </h3>
            {aVenir.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Rien de plus prévu aujourd'hui.</p>
            ) : (
                <div className="space-y-2.5">
                    {aVenir.map(e => {
                        const style = TYPE_EVENEMENT_STYLE[e.type_evenement] ?? TYPE_EVENEMENT_STYLE.autre
                        return (
                            <div key={e.id} className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.border }} />
                                <span className="text-xs font-semibold w-11 flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                    {new Date(e.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-xs truncate" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {e.type_evenement_label} — {e.patient.nom_complet}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
