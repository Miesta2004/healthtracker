import api from './client.ts'
import type { Operation, SalleBloc, OperationStats } from '../types'

export const getOperationStats = async (): Promise<OperationStats> => {
    const response = await api.get('/operations/stats/')
    return response.data
}

export const getOperations = async (patientId?: number): Promise<Operation[]> => {
    const response = await api.get('/operations/', { params: patientId ? { patient: patientId } : {} })
    return response.data
}

export const getOperation = async (id: number): Promise<Operation> => {
    const response = await api.get(`/operations/${id}/`)
    return response.data
}

export const createOperation = async (
    data: Omit<Operation, 'id' | 'statut' | 'statut_label' | 'date_creation' | 'date_modification' | 'date_debut_reelle' | 'date_fin_reelle' | 'compte_rendu_operatoire' | 'complications' | 'patient_nom' | 'patient_prenom' | 'service_chirurgie_nom' | 'salle_nom' | 'chirurgien_nom' | 'chirurgien_prenom'>
): Promise<Operation> => {
    const response = await api.post('/operations/', data)
    return response.data
}

export const confirmerOperation = async (id: number): Promise<Operation> => {
    const response = await api.post(`/operations/${id}/confirmer/`)
    return response.data
}

export const demarrerOperation = async (id: number): Promise<Operation> => {
    const response = await api.post(`/operations/${id}/demarrer/`)
    return response.data
}

export const cloturerOperation = async (
    id: number,
    data: { avec_complication: boolean; compte_rendu_operatoire: string; complications?: string }
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