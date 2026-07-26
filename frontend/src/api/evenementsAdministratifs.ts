import api from './client.ts'
import type { EvenementAdministratif } from '../types'

export const getEvenementsAdministratifs = async (): Promise<EvenementAdministratif[]> => {
    const response = await api.get('/evenements_administratifs/')
    return response.data
}

export const createEvenementAdministratif = async (data: Record<string, unknown>): Promise<EvenementAdministratif> => {
    const response = await api.post('/evenements_administratifs/', data)
    return response.data
}

export const updateEvenementAdministratif = async (id: number, data: Record<string, unknown>): Promise<EvenementAdministratif> => {
    const response = await api.patch(`/evenements_administratifs/${id}/`, data)
    return response.data
}

export const deleteEvenementAdministratif = async (id: number): Promise<void> => {
    await api.delete(`/evenements_administratifs/${id}/`)
}
