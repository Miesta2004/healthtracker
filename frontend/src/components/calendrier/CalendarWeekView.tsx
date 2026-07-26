import type { EvenementPlanning, GardeOccurrence } from '../../types'
import { joursDeSemaine, memeJour, TYPE_EVENEMENT_CONFIG } from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    gardes?: GardeOccurrence[]
    onSelectEvenement: (e: EvenementPlanning) => void
    onSelectGarde?: (g: GardeOccurrence) => void
    onSelectCreneau?: (date: Date) => void
    onSelectJour?: (date: Date) => void
    deplacable?: boolean
    onDeplacerEvenement?: (id: number, nouvelleDate: Date) => void
    onRedimensionnerEvenement?: (id: number, dureeMinutes: number) => void
}

export default function CalendarWeekView({
    ancre,
    evenements,
    gardes = [],
    onSelectEvenement,
    onSelectGarde,
    onSelectCreneau,
    onSelectJour,
}: Props) {
    const jours = joursDeSemaine(ancre)

    return (
        <div className="ht-card overflow-hidden">
            <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                {jours.map(jour => (
                    <div key={jour.toISOString()} className="p-3 text-xs font-medium text-center">
                        <div style={{ color: 'var(--ht-text-muted)' }}>{jour.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{jour.getDate()}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2 p-3">
                {jours.map(jour => {
                    const evts = evenements.filter(e => memeJour(new Date(e.start_time), jour) && e.statut !== 'annule')
                    const gardesJour = gardes.filter(g => memeJour(new Date(g.start_time), jour))
                    return (
                        <div key={jour.toISOString()} className="border p-2 rounded-lg" style={{ borderColor: 'var(--ht-border)', minHeight: 140 }}>
                            <div className="flex flex-col gap-2">
                                {evts.map(e => {
                                    const cfg = TYPE_EVENEMENT_CONFIG[e.type_evenement]
                                    const debut = new Date(e.start_time)
                                    return (
                                        <button key={e.id} onClick={() => onSelectEvenement(e)} className="text-sm text-left truncate" style={{ color: cfg.text }}>
                                            {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {e.patient ? e.patient.nom_complet : (e.lieu || e.motif)}
                                        </button>
                                    )
                                })}

                                {gardesJour.map(g => (
                                    <div key={g.id} className="text-xs text-muted" onClick={() => onSelectGarde?.(g)}>
                                        {g.type_label} · {g.employe_prenom}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 flex gap-2">
                                <button className="text-xs underline" onClick={() => onSelectJour?.(jour)}>Ouvrir jour</button>
                                <button className="text-xs underline" onClick={() => onSelectCreneau?.(jour)}>Nouveau</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
