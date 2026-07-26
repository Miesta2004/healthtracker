import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getPlanning, createRendezVous, updateRendezVous, deleteRendezVous,
} from '../api/rendezvous'
import {
    createEvenementAdministratif, updateEvenementAdministratif, deleteEvenementAdministratif,
} from '../api/evenementsAdministratifs'
import type { RendezVous, EvenementAdministratif } from '../types'

const PLANNING_KEY = 'calendrier-planning'

export function usePlanning(debut: string, fin: string) {
    return useQuery({
        queryKey: [PLANNING_KEY, debut, fin],
        queryFn: () => getPlanning(debut, fin),
        placeholderData: (previousData: any) => previousData,
    })
}

// Chaque mutation accepte une `source` ('medical' par défaut, pour ne rien
// changer au comportement existant des appelants qui ne la précisent pas) et
// route vers le bon endpoint — un RendezVous et un EvenementAdministratif
// vivent dans deux tables distinctes avec des id qui peuvent se chevaucher,
// donc router sur le mauvais endpoint modifierait/supprimerait la mauvaise
// ligne silencieusement.
//
// Le résultat (RendezVous | EvenementAdministratif) est explicitement passé
// en générique à useMutation : sans ça, TypeScript infère le type de retour
// du ternaire comme `Promise<RendezVous> | Promise<EvenementAdministratif>`
// (une union de deux Promise), qui n'est PAS assignable à
// `MutationFunction<TData, ...>` (qui attend `Promise<TData>` — une seule
// Promise dont la valeur résolue est une union). Le fournir explicitement
// lève l'ambiguïté et corrige l'erreur TS2322.

type SourceEvenement = 'medical' | 'administratif'
type ResultatEvenement = RendezVous | EvenementAdministratif

export function useCreerEvenement() {
    const queryClient = useQueryClient()
    return useMutation<ResultatEvenement, unknown, { data: Record<string, unknown>; source?: SourceEvenement }>({
        mutationFn: ({ data, source = 'medical' }) =>
            source === 'administratif' ? createEvenementAdministratif(data) : createRendezVous(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}

export function useModifierEvenement() {
    const queryClient = useQueryClient()
    return useMutation<
        ResultatEvenement,
        unknown,
        { id: number; data: Partial<RendezVous> | Record<string, unknown>; source?: SourceEvenement }
    >({
        mutationFn: ({ id, data, source = 'medical' }) =>
            source === 'administratif' ? updateEvenementAdministratif(id, data) : updateRendezVous(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}

export function useSupprimerEvenement() {
    const queryClient = useQueryClient()
    return useMutation<void, unknown, { id: number; source?: SourceEvenement }>({
        mutationFn: ({ id, source = 'medical' }) =>
            source === 'administratif' ? deleteEvenementAdministratif(id) : deleteRendezVous(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}
