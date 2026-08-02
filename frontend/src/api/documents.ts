import api from './client.ts'
import type { ModeleDocument, DocumentGenere } from '../types'

export const getModeles = async (typeDocument?: string): Promise<ModeleDocument[]> => {
    const response = await api.get('/modeles-documents/', {
        params: { actifs_seulement: 'true', ...(typeDocument ? { type_document: typeDocument } : {}) },
    })
    return response.data
}

// Pour la page de gestion (Paramètres) : inclut aussi les modèles désactivés,
// contrairement à getModeles() utilisée à la génération.
export const getTousLesModeles = async (): Promise<ModeleDocument[]> => {
    const response = await api.get('/modeles-documents/')
    return response.data
}

export const creerModele = async (
    data: { nom: string; type_document: string; corps: string; actif?: boolean }
): Promise<ModeleDocument> => {
    const response = await api.post('/modeles-documents/', data)
    return response.data
}

export const modifierModele = async (
    id: number,
    data: Partial<{ nom: string; type_document: string; corps: string; actif: boolean }>
): Promise<ModeleDocument> => {
    const response = await api.patch(`/modeles-documents/${id}/`, data)
    return response.data
}

export const supprimerModele = async (id: number): Promise<void> => {
    await api.delete(`/modeles-documents/${id}/`)
}

export const genererDocument = async (
    modeleId: number,
    data: { patient: number; consultation?: number }
): Promise<DocumentGenere> => {
    const response = await api.post(`/modeles-documents/${modeleId}/generer/`, data)
    return response.data
}

export const getDocumentsPatient = async (patientId: number): Promise<DocumentGenere[]> => {
    const response = await api.get(`/documents-generes/?patient=${patientId}`)
    return response.data
}

export const modifierDocument = async (
    id: number,
    data: { titre?: string; contenu?: string }
): Promise<DocumentGenere> => {
    const response = await api.patch(`/documents-generes/${id}/`, data)
    return response.data
}

export const supprimerDocument = async (id: number): Promise<void> => {
    await api.delete(`/documents-generes/${id}/`)
}
