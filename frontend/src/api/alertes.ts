import api from './client.ts'
import type { Alerte } from '../types'

export const getAlertes = async (): Promise<Alerte[]> => {
    const response = await api.get('/alertes/')
    return response.data
}

export const marquerAlerteLue = async (id: number): Promise<Alerte> => {
    const response = await api.patch(`/alertes/${id}/`, { statut: 'lue' })
    return response.data
}
