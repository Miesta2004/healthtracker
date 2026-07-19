import type { EvenementPlanning, IndisponibilitePlanning } from '../../types'
import PlanningEventBlock from './PlanningEventBlock'
import { HEURE_DEBUT, HEURE_FIN, HAUTEUR_HEURE, disposerEvenements, offsetMinutes } from './PlanningWeekView'

interface Props {
    jour: Date
    evenements: EvenementPlanning[]
    indisponibilites: IndisponibilitePlanning[]
    evenementSelectionneId?: number | null
    onSelectEvenement: (e: EvenementPlanning) => void
}

export default function PlanningDayView({ jour, evenements, indisponibilites, evenementSelectionneId, onSelectEvenement }: Props) {
    const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i)
    const hauteurTotale = (HEURE_FIN - HEURE_DEBUT) * HAUTEUR_HEURE
    const iso = jour.toISOString().slice(0, 10)
    const evenementsJour = evenements.filter(e => e.start_time.slice(0, 10) === iso)
    const positionnes = disposerEvenements(evenementsJour)
    const indispo = indisponibilites.find(i => i.date_debut <= iso && i.date_fin >= iso)

    return (
        <div className="ht-card overflow-x-auto">
            <div className="flex min-w-[420px]">
                <div className="flex-shrink-0 w-14 border-r" style={{ borderColor: 'var(--ht-border)' }}>
                    {heures.map(h => (
                        <div key={h} style={{ height: HAUTEUR_HEURE }} className="text-right pr-2 -mt-2.5">
                            <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{h}h</span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative" style={{ height: hauteurTotale }} title={indispo?.motif}>
                    {indispo && (
                        <div
                            className="absolute inset-0 z-0"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, var(--ht-muted-bg), var(--ht-muted-bg) 6px, var(--ht-border) 6px, var(--ht-border) 12px)',
                            }}
                        />
                    )}
                    {positionnes.length === 0 && !indispo && (
                        <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun rendez-vous ce jour-là.
                        </p>
                    )}
                    {positionnes.map(({ evenement, colonne, nbColonnes }) => {
                        const top = (offsetMinutes(evenement.start_time) / 60) * HAUTEUR_HEURE
                        const hauteur = Math.max(
                            ((offsetMinutes(evenement.end_time) - offsetMinutes(evenement.start_time)) / 60) * HAUTEUR_HEURE,
                            28
                        )
                        const largeur = 100 / nbColonnes
                        return (
                            <div
                                key={evenement.id}
                                className="absolute px-1"
                                style={{ top, height: hauteur, left: `${colonne * largeur}%`, width: `${largeur}%` }}
                            >
                                <PlanningEventBlock
                                    evenement={evenement}
                                    onClick={() => onSelectEvenement(evenement)}
                                    selectionne={evenement.id === evenementSelectionneId}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
