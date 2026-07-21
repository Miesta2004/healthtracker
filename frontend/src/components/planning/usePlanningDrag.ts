import { useCallback, useRef, useState } from 'react'
import type { EvenementPlanning } from '../../types'

const PAS_MINUTES = 15          // granularité de l'accroche (snap) au relâchement
const SEUIL_CLIC_PX = 4         // en-deçà, on considère que c'est un clic, pas un drag
const DUREE_MIN_MINUTES = 15

function arrondirAuPas(minutes: number): number {
    return Math.round(minutes / PAS_MINUTES) * PAS_MINUTES
}

/** Un événement en cours de déplacement ou de redimensionnement, et son état courant. */
interface EtatDrag {
    evenementId: number
    mode: 'deplacer' | 'redimensionner'
    decalageMinutes: number
    decalageJours: number
    curseur: { x: number; y: number }
}

interface Options {
    hauteurDemiHeure: number
    heureDebut: number
    heureFin: number
    onDeplacer: (id: number, nouveauDebutISO: string) => void
    onRedimensionner: (id: number, nouvelleDureeMinutes: number) => void
}

/**
 * Gère le déplacement (drag) et le redimensionnement (resize) des blocs
 * d'un calendrier en grille horaire. Volontairement agnostique de la mise
 * en page (vue Jour à une colonne, vue Semaine à sept) : le composant
 * appelant fournit la largeur de colonne au moment du drag et applique
 * lui-même les décalages retournés à son propre rendu.
 */
export function usePlanningDrag({ hauteurDemiHeure, heureDebut, heureFin, onDeplacer, onRedimensionner }: Options) {
    const [etat, setEtat] = useState<EtatDrag | null>(null)
    const origineRef = useRef<{
        x: number; y: number
        evenement: EvenementPlanning
        largeurColonne: number
        aBouge: boolean
        onClickReel: () => void
    } | null>(null)

    const demarrer = useCallback((
        e: React.PointerEvent,
        evenement: EvenementPlanning,
        mode: 'deplacer' | 'redimensionner',
        options: { largeurColonne?: number; onClick?: () => void } = {}
    ) => {
        // Un RDV terminé ou déjà annulé ne se replanifie pas depuis le calendrier.
        if (evenement.statut === 'annule' || evenement.statut === 'termine') return
        e.stopPropagation()
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        origineRef.current = {
            x: e.clientX, y: e.clientY, evenement,
            largeurColonne: options.largeurColonne ?? 0,
            aBouge: false,
            onClickReel: options.onClick ?? (() => {}),
        }
        setEtat({ evenementId: evenement.id, mode, decalageMinutes: 0, decalageJours: 0, curseur: { x: e.clientX, y: e.clientY } })
    }, [])

    const demarrerDeplacement = useCallback(
        (e: React.PointerEvent, evenement: EvenementPlanning, largeurColonne: number, onClick: () => void) =>
            demarrer(e, evenement, 'deplacer', { largeurColonne, onClick }),
        [demarrer]
    )

    const demarrerRedimensionnement = useCallback(
        (e: React.PointerEvent, evenement: EvenementPlanning) => demarrer(e, evenement, 'redimensionner'),
        [demarrer]
    )

    const bouger = useCallback((e: React.PointerEvent) => {
        const origine = origineRef.current
        if (!origine || !etat) return

        const deltaX = e.clientX - origine.x
        const deltaY = e.clientY - origine.y
        if (Math.abs(deltaX) > SEUIL_CLIC_PX || Math.abs(deltaY) > SEUIL_CLIC_PX) origine.aBouge = true

        const deltaMinutes = arrondirAuPas((deltaY / hauteurDemiHeure) * 30)
        const decalageJours = etat.mode === 'deplacer' && origine.largeurColonne > 0
            ? Math.round(deltaX / origine.largeurColonne)
            : 0

        setEtat(prev => prev && { ...prev, decalageMinutes: deltaMinutes, decalageJours, curseur: { x: e.clientX, y: e.clientY } })
    }, [etat, hauteurDemiHeure])

    const relacher = useCallback(() => {
        const origine = origineRef.current
        if (!origine || !etat) { setEtat(null); return }

        if (!origine.aBouge) {
            // Pas de déplacement significatif : c'était un clic normal.
            origine.onClickReel()
        } else if (etat.mode === 'deplacer') {
            if (etat.decalageMinutes !== 0 || etat.decalageJours !== 0) {
                const nouveauDebut = new Date(origine.evenement.start_time)
                nouveauDebut.setDate(nouveauDebut.getDate() + etat.decalageJours)
                nouveauDebut.setMinutes(nouveauDebut.getMinutes() + etat.decalageMinutes)
                // On ne laisse pas un événement sortir de la plage affichée (00h–24h) :
                // au-delà, l'heure calculée n'aurait plus de sens dans la grille.
                const heure = nouveauDebut.getHours()
                if (heure >= heureDebut && heure < heureFin) {
                    onDeplacer(origine.evenement.id, nouveauDebut.toISOString())
                }
            }
        } else {
            const dureeActuelle = (new Date(origine.evenement.end_time).getTime() - new Date(origine.evenement.start_time).getTime()) / 60000
            const nouvelleDuree = Math.max(DUREE_MIN_MINUTES, dureeActuelle + etat.decalageMinutes)
            if (nouvelleDuree !== dureeActuelle) {
                onRedimensionner(origine.evenement.id, nouvelleDuree)
            }
        }

        origineRef.current = null
        setEtat(null)
    }, [etat, heureDebut, heureFin, onDeplacer, onRedimensionner])

    const enDrag = (evenementId: number) => etat?.evenementId === evenementId ? etat : null

    return { etat, demarrerDeplacement, demarrerRedimensionnement, bouger, relacher, enDrag }
}