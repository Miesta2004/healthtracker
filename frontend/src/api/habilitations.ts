import api from './client'
import type { HabilitationService } from '../types'

export const getHabilitations = async (params?: { service?: number; employe?: number; actif?: boolean }): Promise<HabilitationService[]> => {
    const response = await api.get('/habilitations-service/', { params })
    return response.data
}

export const createHabilitation = async (data: {
    employe: number
    service: number
    date_debut?: string | null
    date_fin?: string | null
    actif?: boolean
}): Promise<HabilitationService> => {
    const response = await api.post('/habilitations-service/', data)
    return response.data
}

export const updateHabilitation = async (id: number, data: Partial<HabilitationService>): Promise<HabilitationService> => {
    const response = await api.patch(`/habilitations-service/${id}/`, data)
    return response.data
}

export const deleteHabilitation = async (id: number): Promise<void> => {
    await api.delete(`/habilitations-service/${id}/`)
}