import api from './client.ts'
import type { Antecedent } from '../types'

export const getAntecedents = async (patientId:number): Promise<Antecedent[]> => {
    const response = await api.get(`/antecedents/?patient=${patientId}`)
    return response.data
}

export const createAntecedent = async (data:object): Promise<Antecedent> => {
    const response = await api.post(`/antecedents/`,data)
    return response.data
}

export const updateAntecedent = async (id: number, data: object): Promise<Antecedent> => {
    const response = await api.patch(`/antecedents/${id}/`, data)
    return response.data
}

export const deleteAntecedent = async (id: number): Promise<void> => {
    await api.delete(`/antecedents/${id}/`)
}

// Transforme le diagnostic d'une consultation en antécédent durable au dossier.
// Action manuelle déclenchée par le médecin à la clôture de la consultation.
export const promouvoirAntecedent = async (
    consultationId: number,
    data?: { libelle?: string; type_antecedent?: string; observations?: string; date_diagnostic?: string }
): Promise<Antecedent> => {
    const response = await api.post(`/consultations/${consultationId}/promouvoir_antecedent/`, data ?? {})
    return response.data
}
