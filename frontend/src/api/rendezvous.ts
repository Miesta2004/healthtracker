import api from './client.ts'
import type { RendezVous } from '../types'

export const getRendezVous = async (): Promise<RendezVous[]> => {
    const response = await api.get('/rendez_vous/')
    return response.data
}

export const getRendezVousPatient = async (patientId: number): Promise<RendezVous[]> => {
    const response = await api.get(`/rendez_vous/?patient=${patientId}`)
    return response.data
}

export const createRendezVous = async (data: Record<string, unknown>): Promise<RendezVous> => {
    const response = await api.post('/rendez_vous/', data)
    return response.data
}

export const updateRendezVous = async (id: number, data: Partial<RendezVous>): Promise<RendezVous> => {
    const response = await api.patch(`/rendez_vous/${id}/`, data)
    return response.data
}

export const deleteRendezVous = async (id: number): Promise<void> => {
    await api.delete(`/rendez_vous/${id}/`)
}