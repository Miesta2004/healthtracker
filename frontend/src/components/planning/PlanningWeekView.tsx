import { Fragment, useEffect, useRef } from 'react'
import type { EvenementPlanning, IndisponibilitePlanning } from '../../types'
import PlanningEventBlock from './PlanningEventBlock'
import { usePlanningDrag } from './usePlanningDrag'

export const HEURE_DEBUT = 0
export const HEURE_FIN = 24
export const HAUTEUR_DEMI_HEURE = 44 // px par tranche de 30 min
export const HAUTEUR_HEURE = HAUTEUR_DEMI_HEURE * 2 // pour compatibilité et calculs

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

export function getHeureActuelle(): number {
    const now = new Date()
    return (now.getHours() - HEURE_DEBUT) * 60 + now.getMinutes()
}

export interface HeureAffichage {
    heure: number
    minutes: number
    estDemiHeure: boolean
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
    onDeplacer: (id: number, nouveauDebutISO: string) => void
    onRedimensionner: (id: number, nouvelleDureeMinutes: number) => void
}

export default function PlanningWeekView({ lundi, evenements, indisponibilites, onSelectEvenement, onDeplacer, onRedimensionner }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const colonneRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const drag = usePlanningDrag({
        hauteurDemiHeure: HAUTEUR_DEMI_HEURE, heureDebut: HEURE_DEBUT, heureFin: HEURE_FIN,
        onDeplacer, onRedimensionner,
    })

    const jours = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lundi)
        d.setDate(lundi.getDate() + i)
        return d
    })

    // Générer les heures et demi-heures
    const heuresAffichage: HeureAffichage[] = []
    for (let h = HEURE_DEBUT; h < HEURE_FIN; h++) {
        heuresAffichage.push({ heure: h, minutes: 0, estDemiHeure: false })
        heuresAffichage.push({ heure: h, minutes: 30, estDemiHeure: true })
    }

    const hauteurTotale = (HEURE_FIN - HEURE_DEBUT) * 2 * HAUTEUR_DEMI_HEURE
    const heureActuelle = getHeureActuelle()

    // Centrer le scroll sur l'heure actuelle au montage
    useEffect(() => {
        if (containerRef.current && heureActuelle >= 0 && heureActuelle < (HEURE_FIN - HEURE_DEBUT) * 60) {
            const scrollTop = (heureActuelle / 60) * HAUTEUR_DEMI_HEURE * 2 - containerRef.current.clientHeight / 2
            containerRef.current.scrollTop = Math.max(0, scrollTop)
        }
    }, [])

    return (
        <Fragment>
            <div className="ht-card overflow-auto" ref={containerRef} style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="flex min-w-[720px]">
                    {/* Colonne des heures */}
                    <div className="flex-shrink-0 w-14 border-r" style={{ borderColor: 'var(--ht-border)' }}>
                        <div className="h-12 border-b" style={{ borderColor: 'var(--ht-border)' }} />
                        {heuresAffichage.map((h, idx) => (
                            <div
                                key={idx}
                                style={{ height: HAUTEUR_DEMI_HEURE }}
                                className="text-right pr-2 -mt-2.5 relative"
                            >
                                {!h.estDemiHeure ? (
                                    <span className="text-xs font-semibold" style={{ color: 'var(--ht-text-muted)' }}>
                                    {h.heure.toString().padStart(2, '0')}h
                                </span>
                                ) : (
                                    <span
                                        className="text-xs opacity-40"
                                        style={{ color: 'var(--ht-text-muted)' }}
                                    >
                                    :30
                                </span>
                                )}
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
                            <div key={iso} ref={el => { colonneRefs.current[iso] = el }} className="flex-1 min-w-[90px] border-r last:border-r-0 relative" style={{ borderColor: 'var(--ht-border)' }}>
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
                                <div className="relative overflow-hidden" style={{ height: hauteurTotale }} title={indispo?.motif}>
                                    {/* Grille des heures et demi-heures */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {heuresAffichage.map((h, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: HAUTEUR_DEMI_HEURE,
                                                    transform: `translateY(${idx * HAUTEUR_DEMI_HEURE}px)`,
                                                    borderTop: h.estDemiHeure
                                                        ? `1px solid var(--ht-border)`
                                                        : `2px solid var(--ht-border)`,
                                                    opacity: h.estDemiHeure ? 0.4 : 1,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {indispo && (
                                        <div
                                            className="absolute inset-0 z-0"
                                            style={{
                                                backgroundImage: 'repeating-linear-gradient(45deg, var(--ht-muted-bg), var(--ht-muted-bg) 6px, var(--ht-border) 6px, var(--ht-border) 12px)',
                                            }}
                                        />
                                    )}

                                    {/* Ligne "heure actuelle" */}
                                    {aujourdhui && heureActuelle >= 0 && heureActuelle < (HEURE_FIN - HEURE_DEBUT) * 60 && (
                                        <>
                                            <div
                                                className="current-time-indicator"
                                                style={{
                                                    top: `${(heureActuelle / 60) * HAUTEUR_DEMI_HEURE * 2}px`,
                                                }}
                                            />
                                            <div
                                                className="current-time-label"
                                                style={{
                                                    top: `${(heureActuelle / 60) * HAUTEUR_DEMI_HEURE * 2}px`,
                                                }}
                                            >
                                                {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </>
                                    )}

                                    {positionnes.slice(0, 4).map(({ evenement, colonne, nbColonnes }, idx) => {
                                        if (idx === 3 && positionnes.length > 4) {
                                            return (
                                                <button
                                                    key="plus"
                                                    className="absolute text-xs font-semibold rounded px-1 relative z-20"
                                                    style={{
                                                        top: (offsetMinutes(evenement.start_time) / 30) * HAUTEUR_DEMI_HEURE,
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
                                        const dragEtat = drag.enDrag(evenement.id)
                                        const pxParMinute = HAUTEUR_DEMI_HEURE / 30
                                        let top = (offsetMinutes(evenement.start_time) / 30) * HAUTEUR_DEMI_HEURE
                                        let hauteur = Math.max(
                                            ((offsetMinutes(evenement.end_time) - offsetMinutes(evenement.start_time)) / 30) * HAUTEUR_DEMI_HEURE,
                                            24
                                        )
                                        let heureApercu: string | undefined
                                        if (dragEtat?.mode === 'deplacer') {
                                            top += dragEtat.decalageMinutes * pxParMinute
                                            const apercu = new Date(evenement.start_time)
                                            apercu.setMinutes(apercu.getMinutes() + dragEtat.decalageMinutes)
                                            heureApercu = apercu.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                        } else if (dragEtat?.mode === 'redimensionner') {
                                            hauteur = Math.max(hauteur + dragEtat.decalageMinutes * pxParMinute, HAUTEUR_DEMI_HEURE / 2)
                                        }
                                        const largeur = 100 / Math.min(nbColonnes, 4)
                                        return (
                                            <div
                                                key={evenement.id}
                                                className="absolute px-0.5"
                                                style={{ top, height: hauteur, left: `${colonne * largeur}%`, width: `${largeur}%`, zIndex: dragEtat ? 30 : 20 }}
                                            >
                                                <PlanningEventBlock
                                                    evenement={evenement}
                                                    onClick={() => onSelectEvenement(evenement)}
                                                    compact={hauteur < 40}
                                                    enDeplacement={!!dragEtat}
                                                    heureApercu={heureApercu}
                                                    onPointerDownDeplacer={(e) => drag.demarrerDeplacement(
                                                        e, evenement, colonneRefs.current[iso]?.offsetWidth ?? 0,
                                                        () => onSelectEvenement(evenement)
                                                    )}
                                                    onPointerDownRedimensionner={(e) => drag.demarrerRedimensionnement(e, evenement)}
                                                    onPointerMove={drag.bouger}
                                                    onPointerUp={drag.relacher}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Vignette flottante : suit le curseur pendant un déplacement, indique
            le jour et l'heure cibles — utile en semaine où le drag peut traverser
            plusieurs colonnes, ce que le déplacement en place dans la colonne
            d'origine ne montre pas à lui seul. */}
            {drag.etat?.mode === 'deplacer' && (() => {
                const origine = evenements.find(e => e.id === drag.etat!.evenementId)
                if (!origine) return null
                const apercu = new Date(origine.start_time)
                apercu.setDate(apercu.getDate() + drag.etat!.decalageJours)
                apercu.setMinutes(apercu.getMinutes() + drag.etat!.decalageMinutes)
                return (
                    <div
                        className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                            left: drag.etat!.curseur.x + 14,
                            top: drag.etat!.curseur.y + 14,
                            backgroundColor: 'var(--ht-text)',
                            color: 'var(--ht-card-bg)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        }}
                    >
                        {apercu.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {apercu.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )
            })()}
        </Fragment>
    )
}