import api from './client.ts'
import type { Consultation } from '../types'

export const getConsultations = async (patientId: number): Promise<Consultation[]> => {
    const response = await api.get(`/consultations/?patient=${patientId}`)
    return response.data
}

export const createConsultation = async (data: Omit<Consultation, 'id' | 'date_creation' | 'date_modification'>): Promise<Consultation> => {
    const response = await api.post('/consultations/', data)
    return response.data
}

export const updateConsultation = async (id: number, data: Partial<Consultation>): Promise<Consultation> => {
    const response = await api.patch(`/consultations/${id}/`, data)
    return response.data
}

export const deleteConsultation = async (id: number): Promise<void> => {
    await api.delete(`/consultations/${id}/`)
}