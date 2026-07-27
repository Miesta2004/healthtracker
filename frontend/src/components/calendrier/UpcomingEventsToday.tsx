import type { EvenementPlanning } from '../../types'
import { TYPE_EVENEMENT_CONFIG, memeJour } from './calendrierConfig'

interface Props {
    evenements: EvenementPlanning[]
    onSelect: (e: EvenementPlanning) => void
}

/** Liste compacte des événements du jour même, triés par heure — pendant de
 * RappelsPanel et MiniMonthCalendar dans la rangée basse du calendrier. */
export default function UpcomingEventsToday({ evenements, onSelect }: Props) {
    const aujourdhui = new Date()
    const evtsJour = evenements
        .filter(e => e.statut !== 'annule' && memeJour(new Date(e.start_time), aujourdhui))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <h3 className="text-sm font-semibold pb-4 mb-4 border-b" style={{ color: 'var(--ht-text)', borderColor: 'var(--ht-border)' }}>
                Événements à venir aujourd'hui
            </h3>

            {evtsJour.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun événement aujourd'hui.</p>
            ) : (
                <div className="space-y-3 overflow-y-auto">
                    {evtsJour.map(e => {
                        const cfg = TYPE_EVENEMENT_CONFIG[e.type_evenement]
                        const debut = new Date(e.start_time)
                        return (
                            <button
                                key={e.id}
                                onClick={() => onSelect(e)}
                                className="flex items-center gap-3 w-full text-left group"
                            >
                                <span className="text-xs font-medium w-11 flex-shrink-0" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.text }} />
                                <span className="text-sm font-medium truncate flex-1 group-hover:underline" style={{ color: 'var(--ht-text)' }}>
                                    {e.patient ? e.patient.nom_complet : e.motif}
                                </span>
                                {e.lieu && (
                                    <span className="text-xs flex-shrink-0 truncate max-w-[35%]" style={{ color: 'var(--ht-text-muted)' }}>
                                        {e.lieu}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}