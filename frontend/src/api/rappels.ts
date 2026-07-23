import api from './client'
import type { Rappel } from '../types'

export const getRappels = async (): Promise<Rappel[]> => {
    const response = await api.get('/rappels/')
    return response.data
}

export const createRappel = async (data: { texte: string; date_echeance?: string | null }): Promise<Rappel> => {
    const response = await api.post('/rappels/', data)
    return response.data
}

export const updateRappel = async (id: number, data: Partial<Rappel>): Promise<Rappel> => {
    const response = await api.patch(`/rappels/${id}/`, data)
    return response.data
}

export const deleteRappel = async (id: number): Promise<void> => {
    await api.delete(`/rappels/${id}/`)
}
