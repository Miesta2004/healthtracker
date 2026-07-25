import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSallesBloc, getOperationsPlanning, updateOperation, annulerOperation, demarrerOperation, cloturerOperation } from '../api/chirurgie'
import type { Operation } from '../types'

const BLOC_PLANNING_KEY = 'bloc-operatoire-planning'
const SALLES_KEY = 'salles-bloc'

export function useSallesBloc(serviceId?: number, enabled: boolean = true) {
    return useQuery({
        queryKey: [SALLES_KEY, serviceId ?? 'toutes'],
        queryFn: () => getSallesBloc(serviceId),
        enabled,
    })
}

export function useOperationsPlanning(debut: string, fin: string, enabled: boolean = true) {
    return useQuery({
        queryKey: [BLOC_PLANNING_KEY, debut, fin],
        queryFn: () => getOperationsPlanning(debut, fin),
        placeholderData: (previousData) => previousData,
        enabled,
    })
}

export function useModifierOperation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Operation> }) => updateOperation(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [BLOC_PLANNING_KEY] }),
    })
}

export function useAnnulerOperation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, motif }: { id: number; motif?: string }) => annulerOperation(id, motif),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [BLOC_PLANNING_KEY] }),
    })
}

export function useDemarrerOperation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => demarrerOperation(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [BLOC_PLANNING_KEY] }),
    })
}

export function useCloturerOperation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: {
            id: number
            data: { resultat: 'terminee' | 'deces_au_bloc'; compte_rendu_operatoire: string; complications?: string }
        }) => cloturerOperation(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [BLOC_PLANNING_KEY] }),
    })
}
