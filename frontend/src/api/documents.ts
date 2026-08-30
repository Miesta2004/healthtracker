import api from './client.ts'
import type { ModeleDocument, DocumentGenere, DonneesDocument, StatutDocument, Medicament, TypeDocument } from '../types'

export const getTousLesModeles = async (): Promise<ModeleDocument[]> => {
    const response = await api.get('/modeles-documents/')
    return response.data
}

export const creerModele = async (
    data: { nom: string; type_document: string; entete: string; pied_de_page: string; actif?: boolean }
): Promise<ModeleDocument> => {
    const response = await api.post('/modeles-documents/', data)
    return response.data
}

export const modifierModele = async (
    id: number,
    data: Partial<{ nom: string; type_document: string; entete: string; pied_de_page: string; actif: boolean }>
): Promise<ModeleDocument> => {
    const response = await api.patch(`/modeles-documents/${id}/`, data)
    return response.data
}

export const supprimerModele = async (id: number): Promise<void> => {
    await api.delete(`/modeles-documents/${id}/`)
}

export const creerDocument = async (
    data: { patient: number; consultation?: number; type_document: TypeDocument }
): Promise<DocumentGenere> => {
    const response = await api.post('/documents-generes/', data)
    return response.data
}

export const getDocument = async (id: number): Promise<DocumentGenere> => {
    const response = await api.get(`/documents-generes/${id}/`)
    return response.data
}

export const getDocumentsPatient = async (patientId: number): Promise<DocumentGenere[]> => {
    const response = await api.get(`/documents-generes/?patient=${patientId}`)
    return response.data
}

export const sauvegarderDocument = async (
    id: number,
    data: Partial<{ titre: string; donnees: DonneesDocument; statut: StatutDocument }>
): Promise<DocumentGenere> => {
    const response = await api.patch(`/documents-generes/${id}/`, data)
    return response.data
}

export const supprimerDocument = async (id: number): Promise<void> => {
    await api.delete(`/documents-generes/${id}/`)
}

export const telechargerDocumentPdf = async (id: number): Promise<Blob> => {
    const response = await api.get(`/documents-generes/${id}/pdf/`, { responseType: 'blob' })
    return response.data
}

export const rechercherMedicaments = async (recherche: string): Promise<Medicament[]> => {
    if (!recherche.trim()) return []
    const response = await api.get('/medicaments/', { params: { search: recherche } })
    return response.data
}
