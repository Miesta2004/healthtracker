import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getPlanning, createRendezVous, updateRendezVous, deleteRendezVous,
} from '../api/rendezvous'
import type { RendezVous } from '../types'

const PLANNING_KEY = 'calendrier-planning'

export function usePlanning(debut: string, fin: string) {
    return useQuery({
        queryKey: [PLANNING_KEY, debut, fin],
        queryFn: () => getPlanning(debut, fin),
        placeholderData: (previousData: any) => previousData,
    })
}

export function useCreerEvenement() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => createRendezVous(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}

export function useModifierEvenement() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<RendezVous> }) =>
            updateRendezVous(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}

export function useSupprimerEvenement() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => deleteRendezVous(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PLANNING_KEY] })
        },
    })
}
