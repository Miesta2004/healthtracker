import api from './client.ts'
import type { Employe, CurrentUser, MedecinPerf } from '../types'

export const getEmployes = async (): Promise<Employe[]> => {
    const response = await api.get('/employes/')
    return response.data
}

export const getEmploye = async (id: number): Promise<Employe> => {
    const response = await api.get(`/employes/${id}/`)
    return response.data
}

export const createEmploye = async (data: object): Promise<Employe> => {
    const response = await api.post('/employes/', data)
    return response.data
}

export const updateEmploye = async (id: number, data: object): Promise<Employe> => {
    const response = await api.patch(`/employes/${id}/`, data)
    return response.data
}

export const deleteEmploye = async (id: number): Promise<void> => {
    await api.delete(`/employes/${id}/`)
}

export const getMe = async (): Promise<CurrentUser> => {
    const response = await api.get('/employes/me/')
    return response.data
}

export const getPerformanceMedecin = async (id: number): Promise<MedecinPerf> => {
    const response = await api.get(`/employes/${id}/performance/`)
    return response.data
}