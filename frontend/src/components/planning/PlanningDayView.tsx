import type { PlanningBlock, VuePlanning } from './usePlanning'
import type { IndisponibilitePlanning, StatutRendezVous } from '../../types'
import PlanningEventBlock from './PlanningEventBlock'
import { disposerBlocsJournee } from '../../utils/planningLayout'
import {
    HEURE_DEBUT_GRILLE, HEURE_FIN_GRILLE, HAUTEUR_HEURE_PX,
    positionVerticale, hauteurBloc, estMemeJour,
} from '../../utils/planningUtils.ts'

const HEURES = Array.from(
    { length: HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE + 1 },
    (_, i) => HEURE_DEBUT_GRILLE + i
)

/** Colonne d'un seul jour, réutilisée à l'identique par la vue Semaine. */
export function ColonneJour({
                                jour, blocs, indisponibilites, onOpenPreview, onChangerStatut, onModifierHoraire, onVoirDebordement,
                            }: {
    jour: Date
    blocs: PlanningBlock[]
    indisponibilites: IndisponibilitePlanning[]
    onOpenPreview: (bloc: PlanningBlock) => void
    onChangerStatut: (id: number, statut: StatutRendezVous) => void
    onModifierHoraire: (bloc: PlanningBlock) => void
    onVoirDebordement: (blocs: PlanningBlock[], jour: Date) => void
}) {
    const blocsDuJour = blocs.filter(b => estMemeJour(b.start, jour))
    const { positionnes, debordements } = disposerBlocsJournee(blocsDuJour)

    const indispoDuJour = indisponibilites.find(ind => {
        const debut = new Date(ind.date_debut)
        const fin = new Date(ind.date_fin)
        fin.setHours(23, 59, 59, 999)
        return jour >= debut && jour <= fin
    })

    return (
        <div
            className="relative border-l"
            style={{ height: (HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX, borderColor: 'var(--ht-border)' }}
        >
            {/* Lignes horaires de fond */}
            {HEURES.map(h => (
                <div key={h} className="absolute left-0 right-0 border-t" style={{ top: (h - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX, borderColor: 'var(--ht-border)', opacity: 0.5 }} />
            ))}

            {/* Bandeau hachuré d'indisponibilité (§3.2) */}
            {indispoDuJour && (
                <div
                    className="absolute inset-0 z-[1] pointer-events-none rounded"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(135deg, var(--ht-danger-bg) 0, var(--ht-danger-bg) 6px, transparent 6px, transparent 12px)',
                        opacity: 0.5,
                    }}
                    title={`${indispoDuJour.type_label} — ${indispoDuJour.motif}`}
                />
            )}

            {/* Blocs positionnés */}
            {positionnes.map(({ bloc, colIndex, colCount }) => (
                <div
                    key={`${bloc.kind}-${bloc.id}`}
                    className="absolute px-0.5"
                    style={{
                        top: positionVerticale(bloc.start),
                        height: hauteurBloc(bloc.start, bloc.end),
                        left: `${(colIndex / colCount) * 100}%`,
                        width: `${(1 / colCount) * 100}%`,
                        zIndex: 2,
                    }}
                >
                    <PlanningEventBlock
                        bloc={bloc}
                        compact={colCount > 2}
                        onOpenPreview={onOpenPreview}
                        onChangerStatut={onChangerStatut}
                        onModifierHoraire={onModifierHoraire}
                    />
                </div>
            ))}

            {/* Badges de débordement "+N" (>4 chevauchements) */}
            {debordements.map((d, i) => (
                <button
                    key={i}
                    onClick={() => onVoirDebordement(d.blocs, jour)}
                    className="absolute px-0.5 z-[3]"
                    style={{
                        top: positionVerticale(d.start),
                        height: Math.max(hauteurBloc(d.start, d.end), 22),
                        left: `${(d.colIndex / d.colCount) * 100}%`,
                        width: `${(1 / d.colCount) * 100}%`,
                    }}
                >
                    <div
                        className="w-full h-full rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-105"
                        style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}
                        title={`${d.blocs.length} événement(s) supplémentaire(s)`}
                    >
                        +{d.blocs.length}
                    </div>
                </button>
            ))}
        </div>
    )
}

export default function PlanningDayView({
                                            jour, blocs, indisponibilites, onOpenPreview, onChangerStatut, onModifierHoraire, onVoirDebordement,
                                        }: {
    jour: Date
    blocs: PlanningBlock[]
    indisponibilites: IndisponibilitePlanning[]
    onOpenPreview: (bloc: PlanningBlock) => void
    onChangerStatut: (id: number, statut: StatutRendezVous) => void
    onModifierHoraire: (bloc: PlanningBlock) => void
    onVoirDebordement: (blocs: PlanningBlock[], jour: Date) => void
}) {
    return (
        <div className="flex overflow-x-auto">
            {/* Rail des heures */}
            <div className="flex-shrink-0 w-14 relative" style={{ height: (HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX }}>
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
            <div className="flex-1 min-w-0">
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
        </div>
    )
}

export const _vueJourType: VuePlanning = 'jour'