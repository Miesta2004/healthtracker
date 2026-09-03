import { useEffect, useRef } from 'react'
import { enregistrerActivite } from '../api/derniereActivite'
import type { SectionDerniereActivite } from '../types'

interface Params {
    /** Chemin frontend complet (avec querystring éventuelle) à ré-ouvrir au clic sur "Reprendre". */
    route: string
    section: SectionDerniereActivite
    patientId?: number
    consultationId?: number
    /** Passer `false` tant que les données ne sont pas prêtes (chargement, erreur, mode "new"...). */
    enabled?: boolean
}

/**
 * Enregistre la position de navigation courante comme "dernière activité"
 * de l'utilisateur connecté, pour la reprise après reconnexion — cf.
 * comptes/models.py:DerniereActivite. À n'appeler que sur des navigations
 * qui représentent une vraie activité de travail (ouverture d'un dossier,
 * d'une consultation, changement d'onglet significatif), jamais sur chaque
 * rendu : gardez les dépendances de l'effet limitées aux identifiants qui
 * définissent "où" l'utilisateur travaille.
 *
 * Best-effort et silencieux : une erreur réseau ici ne doit jamais gêner la
 * page en cours d'utilisation.
 */
export function useDerniereActivite({ route, section, patientId, consultationId, enabled = true }: Params) {
    // Évite un envoi en double si le composant est remonté avec un état
    // identique (ex. React StrictMode en dev, ou re-render sans changement réel).
    const dernierEnvoi = useRef<string | null>(null)

    useEffect(() => {
        if (!enabled || !route) return
        const cle = `${route}|${section}|${patientId ?? ''}|${consultationId ?? ''}`
        if (dernierEnvoi.current === cle) return
        dernierEnvoi.current = cle

        enregistrerActivite({
            route,
            section,
            patient_id: patientId,
            consultation_id: consultationId,
        }).catch(() => {
            // best-effort : on ne bloque jamais la navigation pour ça.
        })
    }, [enabled, route, section, patientId, consultationId])
}