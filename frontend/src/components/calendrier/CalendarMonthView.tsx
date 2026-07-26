import type { EvenementPlanning, TypeEvenementRdv, GardeOccurrence } from '../../types'
import { TYPE_EVENEMENT_CONFIG, GARDE_COULEUR, joursGrilleMois, memeJour, estAujourdhui } from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    gardes?: GardeOccurrence[]
    onSelectJour: (date: Date) => void
}

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function CalendarMonthView({ ancre, evenements, gardes = [], onSelectJour }: Props) {
    const jours = joursGrilleMois(ancre)
    const moisCourant = ancre.getMonth()

    return (
        <div className="ht-card overflow-hidden">
            <div className="grid grid-cols-7">
                {JOURS_SEMAINE.map(j => (
                    <div
                        key={j}
                        className="text-center py-2 text-[11px] font-medium uppercase border-b"
                        style={{ color: 'var(--ht-text-muted)', borderColor: 'var(--ht-border)' }}
                    >
                        {j}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {jours.map(jour => {
                    const horsMois = jour.getMonth() !== moisCourant
                    const evtsJour = evenements.filter(e => memeJour(new Date(e.start_time), jour) && e.statut !== 'annule')

                    const parType = new Map<TypeEvenementRdv, number>()
                    evtsJour.forEach(e => parType.set(e.type_evenement, (parType.get(e.type_evenement) ?? 0) + 1))

                    // Nombre d'employés distincts de garde ce jour-là (pas le
                    // nombre d'occurrences — un même employé peut apparaître
                    // dans les deux sources, on ne veut compter qu'une fois).
                    const gardesJour = gardes.filter(g => memeJour(new Date(g.start_time), jour))
                    const employesGarde = new Set(gardesJour.map(g => g.employe_id)).size

                    return (
                        <button
                            key={jour.toISOString()}
                            onClick={() => onSelectJour(jour)}
                            className="flex flex-col items-start gap-1 p-1.5 border-b border-r text-left transition-colors hover:bg-[var(--ht-bg)]"
                            style={{ borderColor: 'var(--ht-border)', opacity: horsMois ? 0.4 : 1, minHeight: 96 }}
                        >
                            <span
                                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: estAujourdhui(jour) ? 'var(--ht-primary)' : 'transparent',
                                    color: estAujourdhui(jour) ? 'var(--ht-primary-contrast)' : 'var(--ht-text)',
                                }}
                            >
                                {jour.getDate()}
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {[...parType.entries()].map(([type, count]) => {
                                    const cfg = TYPE_EVENEMENT_CONFIG[type]
                                    return (
                                        <span
                                            key={type}
                                            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: cfg.bg, color: cfg.text }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.text }} />
                                            {count}
                                        </span>
                                    )
                                })}
                                {employesGarde > 0 && (
                                    <span
                                        className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: `${GARDE_COULEUR}1A`, color: GARDE_COULEUR }}
                                        title={`${employesGarde} de garde`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: GARDE_COULEUR }} />
                                        {employesGarde}
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
