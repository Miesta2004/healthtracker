import api from './client.ts'
import type { ModeleDocument, DocumentGenere } from '../types'

export const getModeles = async (typeDocument?: string): Promise<ModeleDocument[]> => {
    const response = await api.get('/modeles-documents/', {
        params: { actifs_seulement: 'true', ...(typeDocument ? { type_document: typeDocument } : {}) },
    })
    return response.data
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

export const supprimerDocument = async (id: number): Promise<void> => {
    await api.delete(`/documents-generes/${id}/`)
}
