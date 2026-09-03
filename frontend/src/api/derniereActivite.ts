import api from './client'
import type { DerniereActivite, SectionDerniereActivite } from '../types'

export const getDerniereActivite = async (): Promise<DerniereActivite | null> => {
    const response = await api.get('/employes/ma_derniere_activite/')
    // Le backend renvoie 204 (pas de contenu) si aucune activité valide n'existe.
    if (response.status === 204 || !response.data) return null
    return response.data
}

export interface EnregistrerActiviteParams {
    route: string
    patient_id?: number
    consultation_id?: number
    section?: SectionDerniereActivite
}

export const enregistrerActivite = async (params: EnregistrerActiviteParams): Promise<void> => {
    await api.post('/employes/enregistrer_activite/', params)
}