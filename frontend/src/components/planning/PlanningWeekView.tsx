import type { EvenementPlanning, IndisponibilitePlanning } from '../../types'
import PlanningEventBlock from './PlanningEventBlock'

export const HEURE_DEBUT = 7
export const HEURE_FIN = 19
export const HAUTEUR_HEURE = 56 // px

export interface EvenementPositionne {
    evenement: EvenementPlanning
    colonne: number
    nbColonnes: number
}

/**
 * Regroupe les événements qui se chevauchent en clusters, et attribue à
 * chacun une colonne à l'intérieur de son cluster — division de la largeur
 * en N (comme Google Calendar / Doctolib), pas d'empilement vertical qui
 * masquerait un événement derrière un autre.
 */
export function disposerEvenements(evenements: EvenementPlanning[]): EvenementPositionne[] {
    const tries = [...evenements].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    const resultat: EvenementPositionne[] = []
    let cluster: EvenementPositionne[] = []
    let clusterFin = -Infinity

    const flush = () => {
        if (cluster.length === 0) return
        const nbColonnes = Math.max(...cluster.map(c => c.colonne)) + 1
        cluster.forEach(c => resultat.push({ ...c, nbColonnes }))
        cluster = []
    }

    for (const e of tries) {
        const debut = new Date(e.start_time).getTime()
        const fin = new Date(e.end_time).getTime()
        if (debut >= clusterFin) {
            flush()
            clusterFin = fin
            cluster.push({ evenement: e, colonne: 0, nbColonnes: 1 })
        } else {
            const colonnesOccupees = new Set(
                cluster.filter(c => new Date(c.evenement.end_time).getTime() > debut).map(c => c.colonne)
            )
            let colonne = 0
            while (colonnesOccupees.has(colonne)) colonne++
            cluster.push({ evenement: e, colonne, nbColonnes: 1 })
            clusterFin = Math.max(clusterFin, fin)
        }
    }
    flush()
    return resultat
}

export function offsetMinutes(iso: string): number {
    const d = new Date(iso)
    return (d.getHours() - HEURE_DEBUT) * 60 + d.getMinutes()
}

function estIndisponible(jour: Date, indisponibilites: IndisponibilitePlanning[]) {
    const iso = jour.toISOString().slice(0, 10)
    return indisponibilites.find(i => i.date_debut <= iso && i.date_fin >= iso)
}

interface Props {
    lundi: Date
    evenements: EvenementPlanning[]
    indisponibilites: IndisponibilitePlanning[]
    onSelectEvenement: (e: EvenementPlanning) => void
}

export default function PlanningWeekView({ lundi, evenements, indisponibilites, onSelectEvenement }: Props) {
    const jours = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lundi)
        d.setDate(lundi.getDate() + i)
        return d
    })
    const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i)
    const hauteurTotale = (HEURE_FIN - HEURE_DEBUT) * HAUTEUR_HEURE

    return (
        <div className="ht-card overflow-x-auto">
            <div className="flex min-w-[720px]">
                {/* Colonne des heures */}
                <div className="flex-shrink-0 w-14 border-r" style={{ borderColor: 'var(--ht-border)' }}>
                    <div className="h-12 border-b" style={{ borderColor: 'var(--ht-border)' }} />
                    {heures.map(h => (
                        <div key={h} style={{ height: HAUTEUR_HEURE }} className="text-right pr-2 -mt-2.5">
                            <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{h}h</span>
                        </div>
                    ))}
                </div>

                {/* Colonnes des jours */}
                {jours.map(jour => {
                    const iso = jour.toISOString().slice(0, 10)
                    const evenementsJour = evenements.filter(e => e.start_time.slice(0, 10) === iso)
                    const positionnes = disposerEvenements(evenementsJour)
                    const indispo = estIndisponible(jour, indisponibilites)
                    const aujourdhui = iso === new Date().toISOString().slice(0, 10)

                    return (
                        <div key={iso} className="flex-1 min-w-[90px] border-r last:border-r-0" style={{ borderColor: 'var(--ht-border)' }}>
                            <div className="h-12 flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--ht-border)' }}>
                                <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--ht-text-muted)' }}>
                                    {jour.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                </span>
                                <span
                                    className="text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center"
                                    style={aujourdhui ? { backgroundColor: 'var(--ht-primary)', color: 'white' } : { color: 'var(--ht-text)' }}
                                >
                                    {jour.getDate()}
                                </span>
                            </div>
                            <div className="relative" style={{ height: hauteurTotale }} title={indispo?.motif}>
                                {indispo && (
                                    <div
                                        className="absolute inset-0 z-0"
                                        style={{
                                            backgroundImage: 'repeating-linear-gradient(45deg, var(--ht-muted-bg), var(--ht-muted-bg) 6px, var(--ht-border) 6px, var(--ht-border) 12px)',
                                        }}
                                    />
                                )}
                                {positionnes.slice(0, 4).map(({ evenement, colonne, nbColonnes }, idx) => {
                                    if (idx === 3 && positionnes.length > 4) {
                                        return (
                                            <button
                                                key="plus"
                                                className="absolute text-xs font-semibold rounded px-1"
                                                style={{
                                                    top: (offsetMinutes(evenement.start_time) / 60) * HAUTEUR_HEURE,
                                                    left: `${(colonne / Math.min(nbColonnes, 4)) * 100}%`,
                                                    width: `${100 / Math.min(nbColonnes, 4)}%`,
                                                    backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text)',
                                                }}
                                                onClick={() => onSelectEvenement(positionnes[3].evenement)}
                                            >
                                                +{positionnes.length - 3}
                                            </button>
                                        )
                                    }
                                    const top = (offsetMinutes(evenement.start_time) / 60) * HAUTEUR_HEURE
                                    const hauteur = Math.max(
                                        ((offsetMinutes(evenement.end_time) - offsetMinutes(evenement.start_time)) / 60) * HAUTEUR_HEURE,
                                        24
                                    )
                                    const largeur = 100 / Math.min(nbColonnes, 4)
                                    return (
                                        <div
                                            key={evenement.id}
                                            className="absolute px-0.5"
                                            style={{ top, height: hauteur, left: `${colonne * largeur}%`, width: `${largeur}%` }}
                                        >
                                            <PlanningEventBlock evenement={evenement} onClick={() => onSelectEvenement(evenement)} compact={hauteur < 40} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
