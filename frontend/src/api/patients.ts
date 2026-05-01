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