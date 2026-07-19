import { useCallback, useEffect, useState } from 'react'
import { getMonPlanning, updateRendezVous } from '../../api/rendezvous'
import type { EvenementPlanning, IndisponibilitePlanning, StatutRendezVous } from '../../types'

export type VuePlanning = 'jour' | 'semaine' | 'mois'

function lundiDeLaSemaine(d: Date): Date {
    const jour = d.getDay() // 0 = dimanche
    const decalage = jour === 0 ? -6 : 1 - jour
    const lundi = new Date(d)
    lundi.setDate(d.getDate() + decalage)
    lundi.setHours(0, 0, 0, 0)
    return lundi
}

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10)
}

export function usePlanning(vue: VuePlanning, dateReference: Date) {
    const [evenements, setEvenements] = useState<EvenementPlanning[]>([])
    const [indisponibilites, setIndisponibilites] = useState<IndisponibilitePlanning[]>([])
    const [loading, setLoading] = useState(true)
    const [erreur, setErreur] = useState('')

    const { debut, fin } = (() => {
        if (vue === 'jour') {
            const iso = toISODate(dateReference)
            return { debut: iso, fin: iso }
        }
        if (vue === 'mois') {
            const premier = new Date(dateReference.getFullYear(), dateReference.getMonth(), 1)
            const dernier = new Date(dateReference.getFullYear(), dateReference.getMonth() + 1, 0)
            return { debut: toISODate(premier), fin: toISODate(dernier) }
        }
        const lundi = lundiDeLaSemaine(dateReference)
        const dimanche = new Date(lundi)
        dimanche.setDate(lundi.getDate() + 6)
        return { debut: toISODate(lundi), fin: toISODate(dimanche) }
    })()

    const charger = useCallback(() => {
        setLoading(true)
        setErreur('')
        getMonPlanning(debut, fin)
            .then(res => {
                setEvenements(res.evenements)
                setIndisponibilites(res.indisponibilites)
            })
            .catch(() => setErreur("Impossible de charger le planning."))
            .finally(() => setLoading(false))
    }, [debut, fin])

    useEffect(() => { charger() }, [charger])

    /**
     * Changement de statut avec mise à jour optimiste : le bloc change
     * immédiatement dans l'UI, sans attendre la réponse réseau. En cas
     * d'échec, on recharge le planning complet pour revenir à un état fiable
     * (rollback simple plutôt que de tenter de restaurer l'ancien statut en
     * mémoire, ce qui suffit largement pour un changement de statut isolé).
     */
    const changerStatut = async (id: number, statut: StatutRendezVous) => {
        setEvenements(prev => prev.map(e => e.id === id ? { ...e, statut } : e))
        try {
            await updateRendezVous(id, { statut })
        } catch {
            charger()
        }
    }

    return { evenements, indisponibilites, loading, erreur, debut, fin, recharger: charger, changerStatut }
}
