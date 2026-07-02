import api from './client.ts'
import type { Hospitalisation } from '../types'

export const getHospitalisations = async (patientId: number): Promise<Hospitalisation[]> => {
    const response = await api.get(`/hospitalisations/?patient=${patientId}`)
    return response.data
}

export const getHospitalisation = async (id: number): Promise<Hospitalisation> => {
    const response = await api.get(`/hospitalisations/${id}/`)
    return response.data
}

export const getHospitalisationsEnCours = async (): Promise<Hospitalisation[]> => {
    const response = await api.get('/hospitalisations/?statut=en_cours')
    return response.data
}

export const createHospitalisation = async (
    data: Omit<Hospitalisation, 'id' | 'date_creation' | 'date_modification' | 'patient_nom' | 'patient_dossier' | 'service_nom' | 'medecin_nom' | 'statut_label' | 'duree_jours'>
): Promise<Hospitalisation> => {
    const response = await api.post('/hospitalisations/', data)
    return response.data
}

export const updateHospitalisation = async (id: number, data: Partial<Hospitalisation>): Promise<Hospitalisation> => {
    const response = await api.patch(`/hospitalisations/${id}/`, data)
    return response.data
}

export const deleteHospitalisation = async (id: number): Promise<void> => {
    await api.delete(`/hospitalisations/${id}/`)
}

export const enregistrerSortie = async (
    id: number,
    data: { date_sortie?: string; diagnostic_sortie?: string; notes?: string; statut?: string }
): Promise<Hospitalisation> => {
    const response = await api.post(`/hospitalisations/${id}/sortie/`, data)
    return response.data
}
