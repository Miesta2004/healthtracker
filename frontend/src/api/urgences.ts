import api from './client.ts'
import type { PassageUrgence } from '../types'

export const getFileAttente = async (): Promise<PassageUrgence[]> => {
    const response = await api.get('/urgences/?actif=1')
    return response.data
}

export const getUrgencesPatient = async (patientId: number): Promise<PassageUrgence[]> => {
    const response = await api.get(`/urgences/?patient=${patientId}`)
    return response.data
}

export const getUrgence = async (id: number): Promise<PassageUrgence> => {
    const response = await api.get(`/urgences/${id}/`)
    return response.data
}

export const createUrgence = async (data: Record<string, unknown>): Promise<PassageUrgence> => {
    const response = await api.post('/urgences/', data)
    return response.data
}

export const updateUrgence = async (id: number, data: Partial<PassageUrgence>): Promise<PassageUrgence> => {
    const response = await api.patch(`/urgences/${id}/`, data)
    return response.data
}

export const deleteUrgence = async (id: number): Promise<void> => {
    await api.delete(`/urgences/${id}/`)
}

export const priseEnCharge = async (id: number, medecinId?: number): Promise<PassageUrgence> => {
    const response = await api.post(`/urgences/${id}/prise_en_charge/`, medecinId ? { medecin_examinateur: medecinId } : {})
    return response.data
}

export const enregistrerSortieUrgence = async (
    id: number,
    data: { decision: string; diagnostic?: string; notes?: string }
): Promise<PassageUrgence> => {
    const response = await api.post(`/urgences/${id}/sortie/`, data)
    return response.data
}

export const admettreUrgence = async (
    id: number,
    data: { chambre?: string; lit?: string; service?: number; motif_admission?: string; diagnostic_entree?: string; notes?: string }
): Promise<PassageUrgence> => {
    const response = await api.post(`/urgences/${id}/admettre/`, data)
    return response.data
}
