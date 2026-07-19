import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMonPlanning, updateRendezVous } from '../../api/rendezvous'
import { getFileAttente } from '../../api/urgences'
import { useAuth } from '../../contexts/AuthContext'
import type { EvenementPlanning, IndisponibilitePlanning, StatutRendezVous } from '../../types'

export type VuePlanning = 'jour' | 'semaine' | 'mois'

/**
 * Forme commune utilisée par les vues du calendrier, qu'il s'agisse d'un
 * rendez-vous planifié (`kind: 'rdv'`) ou d'un passage aux urgences
 * intercalé dans la journée du médecin (`kind: 'urgence'`, cf. §3.2 de la
 * spec — hors scope de `mon_planning`, fusionné ici côté frontend).
 */
export interface PlanningBlock {
    kind: 'rdv' | 'urgence'
    id: number
    start: Date
    end: Date
    statut: StatutRendezVous | string
    statutLabel: string
    motif: string
    patientId: number
    patientNom: string
    patientAge?: number
    patientDossier?: string
    aAlerteCritique: boolean
    consultationId: number | null
}

function toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10)
}

function lundiDeLaSemaine(d: Date): Date {
    const copie = new Date(d)
    const jour = copie.getDay() // 0 = dimanche
    const decalage = jour === 0 ? -6 : 1 - jour
    copie.setDate(copie.getDate() + decalage)
    copie.setHours(0, 0, 0, 0)
    return copie
}

function ajouterJours(d: Date, n: number): Date {
    const copie = new Date(d)
    copie.setDate(copie.getDate() + n)
    return copie
}

function premierJourDuMois(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1)
}

function dernierJourDuMois(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** Calcule (début, fin) de la plage à charger selon la vue et la date ancre. */
function calculerPlage(vue: VuePlanning, ancre: Date): { debut: Date; fin: Date } {
    if (vue === 'jour') {
        const debut = new Date(ancre)
        debut.setHours(0, 0, 0, 0)
        return { debut, fin: debut }
    }
    if (vue === 'mois') {
        return { debut: premierJourDuMois(ancre), fin: dernierJourDuMois(ancre) }
    }
    // semaine
    const debut = lundiDeLaSemaine(ancre)
    return { debut, fin: ajouterJours(debut, 6) }
}

function evenementVersBloc(e: EvenementPlanning): PlanningBlock {
    return {
        kind: 'rdv',
        id: e.id,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        statut: e.statut,
        statutLabel: e.statut_label,
        motif: e.motif,
        patientId: e.patient.id,
        patientNom: e.patient.nom_complet,
        patientAge: e.patient.age,
        patientDossier: e.patient.numero_dossier,
        aAlerteCritique: e.a_alerte_critique,
        consultationId: e.consultation_id,
    }
}

// Durée conventionnelle d'affichage pour un passage aux urgences intercalé
// dans le planning : ce flux n'a pas de notion de durée (contrairement aux
// RDV planifiés), on lui donne juste une largeur visuelle raisonnable.
const DUREE_URGENCE_MINUTES = 30

export function usePlanning() {
    const { user } = useAuth()
    const medecinId = user?.id

    const [vue, setVue] = useState<VuePlanning>('semaine')
    const [ancre, setAncre] = useState<Date>(() => new Date())

    const [evenements, setEvenements] = useState<EvenementPlanning[]>([])
    const [indisponibilites, setIndisponibilites] = useState<IndisponibilitePlanning[]>([])
    const [urgencesBlocs, setUrgencesBlocs] = useState<PlanningBlock[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Cache par plage (clé "debut|fin") pour éviter de re-fetcher quand on
    // navigue d'avant en arrière sur des plages déjà visitées dans cette
    // session — invalidé explicitement par recharger().
    const cache = useRef<Map<string, { evenements: EvenementPlanning[]; indisponibilites: IndisponibilitePlanning[] }>>(new Map())

    const { debut, fin } = useMemo(() => calculerPlage(vue, ancre), [vue, ancre])
    const debutStr = toDateOnly(debut)
    const finStr = toDateOnly(fin)
    const cleCache = `${debutStr}|${finStr}`

    const charger = useCallback((forcer = false) => {
        if (!medecinId) return

        const enCache = cache.current.get(cleCache)
        if (enCache && !forcer) {
            setEvenements(enCache.evenements)
            setIndisponibilites(enCache.indisponibilites)
            setLoading(false)
            return
        }

        setLoading(true)
        setError('')
        getMonPlanning(debutStr, finStr)
            .then(res => {
                cache.current.set(cleCache, { evenements: res.evenements, indisponibilites: res.indisponibilites })
                setEvenements(res.evenements)
                setIndisponibilites(res.indisponibilites)
            })
            .catch(() => setError("Impossible de charger votre planning pour cette période."))
            .finally(() => setLoading(false))

        // Fusion des urgences en cours (best-effort, ne bloque jamais
        // l'affichage du planning principal si ça échoue) — cf. §3.2 spec.
        getFileAttente()
            .then(passages => {
                const pertinents = passages.filter(p =>
                    p.medecin_examinateur === medecinId &&
                    p.statut !== 'sorti' &&
                    p.date_arrivee
                )
                const blocs: PlanningBlock[] = pertinents.map(p => {
                    const start = new Date(p.date_arrivee)
                    const end = new Date(start.getTime() + DUREE_URGENCE_MINUTES * 60000)
                    return {
                        kind: 'urgence',
                        id: p.id,
                        start, end,
                        statut: p.statut,
                        statutLabel: p.statut_label || p.statut,
                        motif: p.motif || "Passage aux urgences",
                        patientId: p.patient,
                        patientNom: p.patient_prenom ? `${p.patient_prenom} ${p.patient_nom}` : (p.patient_nom || `Patient #${p.patient}`),
                        patientAge: p.patient_age,
                        patientDossier: p.patient_dossier,
                        aAlerteCritique: false,
                        consultationId: null,
                    }
                })
                setUrgencesBlocs(blocs)
            })
            .catch(() => setUrgencesBlocs([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cleCache, medecinId])

    useEffect(() => {
        charger()
    }, [charger])

    const recharger = useCallback(() => {
        cache.current.delete(cleCache)
        charger(true)
    }, [cleCache, charger])

    const goAujourdhui = useCallback(() => setAncre(new Date()), [])

    /** Bascule en vue Jour sur une date précise (ex. clic sur une case de la vue Mois). */
    const goToJour = useCallback((jour: Date) => {
        setAncre(jour)
        setVue('jour')
    }, [])

    const goPrecedent = useCallback(() => {
        setAncre(prev => {
            if (vue === 'jour') return ajouterJours(prev, -1)
            if (vue === 'mois') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
            return ajouterJours(prev, -7)
        })
    }, [vue])

    const goSuivant = useCallback(() => {
        setAncre(prev => {
            if (vue === 'jour') return ajouterJours(prev, 1)
            if (vue === 'mois') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
            return ajouterJours(prev, 7)
        })
    }, [vue])

    /** Changement de statut optimiste — rollback via rechargement en cas d'échec. */
    const changerStatut = useCallback(async (id: number, statut: StatutRendezVous) => {
        setEvenements(prev => prev.map(e => e.id === id ? { ...e, statut } : e))
        try {
            await updateRendezVous(id, { statut })
            cache.current.delete(cleCache)
        } catch {
            recharger()
            throw new Error("La mise à jour du statut a échoué.")
        }
    }, [cleCache, recharger])

    const blocs: PlanningBlock[] = useMemo(() => {
        const rdvBlocs = evenements.map(evenementVersBloc)
        return [...rdvBlocs, ...urgencesBlocs].sort((a, b) => a.start.getTime() - b.start.getTime())
    }, [evenements, urgencesBlocs])

    // Détection simple d'un nouvel événement critique pour le badge pulsant
    // de la toolbar (§2.4 — pas de clignotement par bloc, un seul indicateur
    // ponctuel). Valeur purement dérivée de `evenements`, pas besoin d'état
    // séparé ni d'effet.
    const alerteNouveaute = useMemo(
        () => evenements.some(e => e.a_alerte_critique),
        [evenements]
    )

    return {
        vue, setVue,
        ancre, debut, fin, debutStr, finStr,
        blocs, indisponibilites,
        loading, error,
        alerteNouveaute,
        goAujourdhui, goPrecedent, goSuivant, goToJour,
        changerStatut,
        recharger,
    }
}