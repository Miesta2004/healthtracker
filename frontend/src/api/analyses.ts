import api from './client.ts'
import type { DemandeAnalyse } from '../types'

export const getDemandes = async (): Promise<DemandeAnalyse[]> => {
    const response = await api.get('/analyses/')
    return response.data
}

export const getDemandesEnAttente = async (): Promise<DemandeAnalyse[]> => {
    const response = await api.get('/analyses/en-attente/')
    return response.data
}

export const getDemandesPatient = async (patientId: number): Promise<DemandeAnalyse[]> => {
    const response = await api.get(`/analyses/?patient=${patientId}`)
    return response.data
}

export const getDemande = async (id: number): Promise<DemandeAnalyse> => {
    const response = await api.get(`/analyses/${id}/`)
    return response.data
}

export const createDemande = async (data: Record<string, unknown>): Promise<DemandeAnalyse> => {
    const response = await api.post('/analyses/', data)
    return response.data
}

export const prendreEnCharge = async (id: number): Promise<DemandeAnalyse> => {
    const response = await api.post(`/analyses/${id}/prendre-en-charge/`)
    return response.data
}

export const annulerDemande = async (id: number): Promise<DemandeAnalyse> => {
    const response = await api.post(`/analyses/${id}/annuler/`)
    return response.data
}

export const soumettreResultats = async (
    id: number,
    data: { resultats: string; valeurs_normales?: string }
): Promise<DemandeAnalyse> => {
    const response = await api.post(`/analyses/${id}/soumettre-resultats/`, data)
    return response.data
}
