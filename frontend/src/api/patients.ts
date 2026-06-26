import api from './client.ts'
import type {Patient} from '../types'

export const getPatients = async () : Promise <Patient[]> => {
    const response = await api.get('/patients')
    return response.data
}

export const getPatient = async (id: number): Promise<Patient> => {
    const response = await api.get(`/patients/${id}/`)
    return response.data
}

export const deletePatient = async (id: number): Promise<void> => {
    await api.delete(`/patients/${id}/`)
}

export const createPatient = async (data: object): Promise<Patient> => {
    const response = await api.post('/patients/', data)
    return response.data
}

export const updatePatient = async (id: number, data: object): Promise<Patient> => {
    const response = await api.post(`/patients/${id}/`, data)
    return response.data
}

export const getSignesVitaux = async (patientId: number) => {
    const response = await api.get(`/signes_vitaux/?patient=${patientId}`)
    return response.data
}