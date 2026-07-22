import { TriangleAlert, CalendarX } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { TYPE_EVENEMENT_CONFIG, grouperAgenda, AGENDA_JOURS_A_VENIR } from './calendrierConfig'

interface Props {
    evenements: EvenementPlanning[]
    onSelectEvenement: (e: EvenementPlanning) => void
}

export default function CalendarAgendaView({ evenements, onSelectEvenement }: Props) {
    const sections = grouperAgenda(evenements)

    if (sections.length === 0) {
        return (
            <div className="ht-card flex flex-col items-center justify-center gap-2 py-20" style={{ color: 'var(--ht-text-muted)' }}>
                <CalendarX size={28} />
                <p className="text-sm">Aucun événement à venir sur les {AGENDA_JOURS_A_VENIR} prochains jours</p>
            </div>
        )
    }

    return (
        <div className="ht-card divide-y" style={{ borderColor: 'var(--ht-border)' }}>
            {sections.map(section => (
                <div key={section.label} className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        {section.label}
                        <span
                            className="text-xs font-normal px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}
                        >
                            {section.groupes.reduce((n, g) => n + g.items.length, 0)}
                        </span>
                    </h3>

                    <div className="space-y-3">
                        {section.groupes.map(groupe => (
                            <div key={groupe.date.toISOString()}>
                                {section.label !== "Aujourd'hui" && section.label !== 'Demain' && (
                                    <p className="text-xs font-medium mb-1.5 capitalize" style={{ color: 'var(--ht-text-muted)' }}>
                                        {groupe.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {groupe.items.map(e => {
                                        const cfg = TYPE_EVENEMENT_CONFIG[e.type_evenement]
                                        const debut = new Date(e.start_time)
                                        const annule = e.statut === 'annule'
                                        return (
                                            <button
                                                key={e.id}
                                                onClick={() => onSelectEvenement(e)}
                                                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--ht-bg)]"
                                                style={{ opacity: annule ? 0.55 : 1 }}
                                            >
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.text }} />
                                                <span className="text-sm font-semibold w-12 flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                                    {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span
                                                    className="text-sm font-medium truncate flex-1"
                                                    style={{ color: 'var(--ht-text)', textDecoration: annule ? 'line-through' : 'none' }}
                                                >
                                                    {cfg.label} · {e.patient.nom_complet}
                                                </span>
                                                {e.a_alerte_critique && (
                                                    <TriangleAlert size={14} style={{ color: 'var(--ht-danger)', flexShrink: 0 }} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
