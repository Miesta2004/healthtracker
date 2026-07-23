import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRappels, createRappel, updateRappel, deleteRappel } from '../api/rappels'
import type { Rappel } from '../types'

const RAPPELS_KEY = 'rappels'

export function useRappels() {
    return useQuery({
        queryKey: [RAPPELS_KEY],
        queryFn: getRappels,
    })
}

export function useCreerRappel() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { texte: string; date_echeance?: string | null }) => createRappel(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [RAPPELS_KEY] }),
    })
}

export function useModifierRappel() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Rappel> }) => updateRappel(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [RAPPELS_KEY] }),
    })
}

export function useSupprimerRappel() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => deleteRappel(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [RAPPELS_KEY] }),
    })
}
