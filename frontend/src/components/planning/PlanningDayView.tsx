import { useEffect, useRef } from 'react'
import type { EvenementPlanning, IndisponibilitePlanning } from '../../types'
import PlanningEventBlock from './PlanningEventBlock'
import { HEURE_DEBUT, HEURE_FIN, HAUTEUR_DEMI_HEURE, disposerEvenements, offsetMinutes, getHeureActuelle, type HeureAffichage } from './PlanningWeekView'
import { usePlanningDrag } from './usePlanningDrag'

interface Props {
    jour: Date
    evenements: EvenementPlanning[]
    indisponibilites: IndisponibilitePlanning[]
    evenementSelectionneId?: number | null
    onSelectEvenement: (e: EvenementPlanning) => void
    onDeplacer: (id: number, nouveauDebutISO: string) => void
    onRedimensionner: (id: number, nouvelleDureeMinutes: number) => void
}

export default function PlanningDayView({ jour, evenements, indisponibilites, evenementSelectionneId, onSelectEvenement, onDeplacer, onRedimensionner }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const drag = usePlanningDrag({
        hauteurDemiHeure: HAUTEUR_DEMI_HEURE, heureDebut: HEURE_DEBUT, heureFin: HEURE_FIN,
        onDeplacer, onRedimensionner,
    })

    // Générer les heures et demi-heures
    const heuresAffichage: HeureAffichage[] = []
    for (let h = HEURE_DEBUT; h < HEURE_FIN; h++) {
        heuresAffichage.push({ heure: h, minutes: 0, estDemiHeure: false })
        heuresAffichage.push({ heure: h, minutes: 30, estDemiHeure: true })
    }

    const hauteurTotale = (HEURE_FIN - HEURE_DEBUT) * 2 * HAUTEUR_DEMI_HEURE
    const iso = jour.toISOString().slice(0, 10)
    const evenementsJour = evenements.filter(e => e.start_time.slice(0, 10) === iso)
    const positionnes = disposerEvenements(evenementsJour)
    const indispo = indisponibilites.find(i => i.date_debut <= iso && i.date_fin >= iso)

    const heureActuelle = getHeureActuelle()
    const isToday = iso === new Date().toISOString().slice(0, 10)

    // Centrer le scroll sur l'heure actuelle au montage
    useEffect(() => {
        if (containerRef.current && isToday && heureActuelle >= 0 && heureActuelle < (HEURE_FIN - HEURE_DEBUT) * 60) {
            const scrollTop = (heureActuelle / 60) * HAUTEUR_DEMI_HEURE * 2 - containerRef.current.clientHeight / 2
            containerRef.current.scrollTop = Math.max(0, scrollTop)
        }
    }, [isToday])

    return (
        <div className="ht-card overflow-auto" ref={containerRef} style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="flex min-w-[420px]">
                <div className="flex-shrink-0 w-14 border-r" style={{ borderColor: 'var(--ht-border)' }}>
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

                <div className="flex-1 relative" style={{ height: hauteurTotale }} title={indispo?.motif}>
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
                    {isToday && heureActuelle >= 0 && heureActuelle < (HEURE_FIN - HEURE_DEBUT) * 60 && (
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

                    {positionnes.length === 0 && !indispo && (
                        <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun rendez-vous ce jour-là.
                        </p>
                    )}
                    {positionnes.map(({ evenement, colonne, nbColonnes }) => {
                        const dragEtat = drag.enDrag(evenement.id)
                        const pxParMinute = HAUTEUR_DEMI_HEURE / 30
                        let top = (offsetMinutes(evenement.start_time) / 30) * HAUTEUR_DEMI_HEURE
                        let hauteur = Math.max(
                            ((offsetMinutes(evenement.end_time) - offsetMinutes(evenement.start_time)) / 30) * HAUTEUR_DEMI_HEURE,
                            28
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
                        const largeur = 100 / nbColonnes
                        return (
                            <div
                                key={evenement.id}
                                className="absolute px-1 relative"
                                style={{ top, height: hauteur, left: `${colonne * largeur}%`, width: `${largeur}%`, zIndex: dragEtat ? 30 : 20 }}
                            >
                                <PlanningEventBlock
                                    evenement={evenement}
                                    onClick={() => onSelectEvenement(evenement)}
                                    selectionne={evenement.id === evenementSelectionneId}
                                    enDeplacement={!!dragEtat}
                                    heureApercu={heureApercu}
                                    onPointerDownDeplacer={(e) => drag.demarrerDeplacement(e, evenement, 0, () => onSelectEvenement(evenement))}
                                    onPointerDownRedimensionner={(e) => drag.demarrerRedimensionnement(e, evenement)}
                                    onPointerMove={drag.bouger}
                                    onPointerUp={drag.relacher}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}