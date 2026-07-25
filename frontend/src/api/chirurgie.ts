import api from './client.ts'
import type { Operation, SalleBloc, OperationStats } from '../types'

export const getOperationStats = async (): Promise<OperationStats> => {
    const response = await api.get('/operations/stats/')
    return response.data
}

export const getSallesBloc = async (serviceId?: number): Promise<SalleBloc[]> => {
    const response = await api.get('/salles-bloc/', { params: serviceId ? { service: serviceId } : {} })
    return response.data
}

export const getOperations = async (patientId?: number): Promise<Operation[]> => {
    const response = await api.get('/operations/', { params: patientId ? { patient: patientId } : {} })
    return response.data
}

export interface PlanningOperationsResponse {
    debut: string
    fin: string
    operations: Operation[]
}

// Alimente la grille salle × heure du Bloc opératoire (module Calendrier) —
// même convention debut/fin que /rendez_vous/planning/.
export const getOperationsPlanning = async (
    debut: string, fin: string, salleId?: number
): Promise<PlanningOperationsResponse> => {
    const response = await api.get('/operations/planning/', {
        params: { debut, fin, ...(salleId ? { salle: salleId } : {}) },
    })
    return response.data
}

export const getOperation = async (id: number): Promise<Operation> => {
    const response = await api.get(`/operations/${id}/`)
    return response.data
}

export const createOperation = async (
    data: Omit<Operation,
        'id' | 'statut' | 'statut_label' | 'date_creation' | 'date_modification' |
        'date_debut_reelle' | 'date_fin_reelle' | 'compte_rendu_operatoire' | 'complications' |
        'patient_nom' | 'patient_prenom' | 'service_chirurgie_nom' | 'salle_nom' |
        'chirurgien_nom' | 'chirurgien_prenom'
    >
): Promise<Operation> => {
    const response = await api.post('/operations/', data)
    return response.data
}

export const updateOperation = async (id: number, data: Partial<Operation>): Promise<Operation> => {
    const response = await api.patch(`/operations/${id}/`, data)
    return response.data
}

export const deleteOperation = async (id: number): Promise<void> => {
    await api.delete(`/operations/${id}/`)
}

// Pas de confirmerOperation() : le statut 'confirmee' n'existe plus dans le
// nouveau modèle très simplifié (programmee → en_cours → terminee|deces_au_bloc).

export const annulerOperation = async (id: number, motif?: string): Promise<Operation> => {
    const response = await api.post(`/operations/${id}/annuler/`, motif ? { motif } : {})
    return response.data
}

export const demarrerOperation = async (id: number): Promise<Operation> => {
    const response = await api.post(`/operations/${id}/demarrer/`)
    return response.data
}

export const cloturerOperation = async (
    id: number,
    data: { resultat: 'terminee' | 'deces_au_bloc'; compte_rendu_operatoire: string; complications?: string }
): Promise<Operation> => {
    const response = await api.post(`/operations/${id}/cloturer/`, data)
    return response.data
}

export const getSallesDisponibles = async (
    serviceId: number, dateHeure: string, dureeMin: number = 60
): Promise<SalleBloc[]> => {
    const response = await api.get('/salles-bloc/disponibles/', {
        params: { service: serviceId, date_heure: dateHeure, duree_min: dureeMin }
    })
    return response.data
}
