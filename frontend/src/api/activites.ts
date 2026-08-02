import api from './client.ts'
import type { JournalActivite, TypeObjetActivite, ActionActivite } from '../types'

export interface FiltresActivites {
    type_objet?: TypeObjetActivite
    action_type?: ActionActivite
    employe?: number
    debut?: string
    fin?: string
}

export const getActivites = async (filtres: FiltresActivites = {}): Promise<JournalActivite[]> => {
    const response = await api.get('/activites/', { params: filtres })
    return response.data
}

export const getActivitesRecentes = async (limite = 8): Promise<JournalActivite[]> => {
    const response = await api.get('/activites/recentes/', { params: { limite } })
    return response.data
}