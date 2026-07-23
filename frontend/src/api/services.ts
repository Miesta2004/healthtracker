import api from './client'
import type {Service, ServiceStats, VueEnsemble, ActiviteJour, Patient, Employe, QualiteIndicateurs} from '../types'

export const getServices = async (): Promise<Service[]> => {
    const response = await api.get('/services/')
    return response.data
}

export const getService = async (id: number): Promise<Service> => {
    const response = await api.get(`/services/${id}/`)
    return response.data
}

export const getServiceStats = async (id: number): Promise<ServiceStats> => {
    const response = await api.get(`/services/${id}/stats/`)
    return response.data
}

export const getVueEnsemble = async (): Promise<VueEnsemble> => {
    const response = await api.get('/services/vue-ensemble/')
    return response.data
}

export const getServiceActivite = async (id: number, jours = 30): Promise<ActiviteJour[]> => {
    const response = await api.get(`/services/${id}/activite/`, { params: { jours } })
    return response.data
}

export const getQualiteIndicateurs = async (jours = 30): Promise<QualiteIndicateurs> => {
    const response = await api.get('/services/qualite/', { params: { jours } })
    return response.data
}

export const getServicePatients = async (id: number): Promise<Patient[]> => {
    const response = await api.get(`/services/${id}/patients/`)
    return response.data
}

export const getServiceEmployes = async (id: number): Promise<Employe[]> => {
    const response = await api.get(`/services/${id}/employes/`)
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