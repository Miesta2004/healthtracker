import api from './client'
import type {Service} from '../types'

export const getServices = async (): Promise<Service[]> => {
    const response = await api.get('/services/')
    return response.data
}

export const createService = async (data: Partial<Service>): Promise<Service> => {
    const response = await api.post('/services/', data)
    return response.data
}

export const updateService = async (id: number, data: Partial<Service>): Promise<Service> => {
    const response = await api.patch(`/services/${id}/`, data)
    return response.data
}

export const deleteService = async (id: number): Promise<void> => {
    await api.delete(`/services/${id}/`)
}