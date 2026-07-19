import type { PlanningBlock } from './usePlanning'
import type { IndisponibilitePlanning, StatutRendezVous } from '../../types'
import { ColonneJour } from './PlanningDayView'
import {
    HEURE_DEBUT_GRILLE, HEURE_FIN_GRILLE, HAUTEUR_HEURE_PX,
    formatJourCourt, estAujourdhui,
} from '../../utils/planningUtils.ts'

function ajouterJours(d: Date, n: number): Date {
    const copie = new Date(d)
    copie.setDate(copie.getDate() + n)
    return copie
}

export default function PlanningWeekView({
                                             lundi, blocs, indisponibilites, onOpenPreview, onChangerStatut, onModifierHoraire, onVoirDebordement,
                                         }: {
    lundi: Date
    blocs: PlanningBlock[]
    indisponibilites: IndisponibilitePlanning[]
    onOpenPreview: (bloc: PlanningBlock) => void
    onChangerStatut: (id: number, statut: StatutRendezVous) => void
    onModifierHoraire: (bloc: PlanningBlock) => void
    onVoirDebordement: (blocs: PlanningBlock[], jour: Date) => void
}) {
    const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i))
    const HEURES = Array.from(
        { length: HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE + 1 },
        (_, i) => HEURE_DEBUT_GRILLE + i
    )

    return (
        <div className="overflow-x-auto">
            <div className="flex min-w-[700px]">
                {/* Rail des heures */}
                <div className="flex-shrink-0 w-14 relative" style={{ marginTop: '2.25rem', height: (HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX }}>
                    {HEURES.map(h => (
                        <div
                            key={h}
                            className="absolute right-2 -translate-y-1/2 text-[11px]"
                            style={{ top: (h - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX, color: 'var(--ht-text-muted)' }}
                        >
                            {String(h).padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* 7 colonnes jour */}
                <div className="flex-1 grid grid-cols-7">
                    {jours.map(jour => (
                        <div key={jour.toISOString()} className="min-w-0">
                            <div
                                className="h-9 flex flex-col items-center justify-center text-xs font-semibold capitalize sticky top-0"
                                style={{
                                    color: estAujourdhui(jour) ? 'var(--ht-primary-tint-text)' : 'var(--ht-text-secondary)',
                                    backgroundColor: estAujourdhui(jour) ? 'var(--ht-primary-tint-bg)' : 'transparent',
                                    borderRadius: 'var(--ht-radius-sm)',
                                }}
                            >
                                {formatJourCourt(jour)}
                            </div>
                            <ColonneJour
                                jour={jour}
                                blocs={blocs}
                                indisponibilites={indisponibilites}
                                onOpenPreview={onOpenPreview}
                                onChangerStatut={onChangerStatut}
                                onModifierHoraire={onModifierHoraire}
                                onVoirDebordement={onVoirDebordement}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}