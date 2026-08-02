import api from './client.ts'
import type {
    Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance,
    NouvelleFacturePayload, NouvelleLigneFacturePayload, NouveauPaiementPayload,
    NouvelEcheancierPayload,
} from '../types'

// ─── Factures ────────────────────────────────────────────────────────────────

export const getFactures = async (params?: {
    patient?: number; statut?: string; numero_facture?: string
}): Promise<Facture[]> => {
    const query = new URLSearchParams()
    if (params?.patient) query.set('patient', String(params.patient))
    if (params?.statut) query.set('statut', params.statut)
    if (params?.numero_facture) query.set('numero_facture', params.numero_facture)
    const qs = query.toString()
    const response = await api.get(`/factures/${qs ? `?${qs}` : ''}`)
    return response.data
}

export const getFacture = async (id: number): Promise<Facture> => {
    const response = await api.get(`/factures/${id}/`)
    return response.data
}

export const createFacture = async (data: NouvelleFacturePayload): Promise<Facture> => {
    const response = await api.post('/factures/', data)
    return response.data
}

export const ajouterLigneFacture = async (
    factureId: number, data: NouvelleLigneFacturePayload
): Promise<LigneFacture> => {
    const response = await api.post(`/factures/${factureId}/ajouter-ligne/`, data)
    return response.data
}

export const supprimerLigneFacture = async (ligneId: number): Promise<void> => {
    await api.delete(`/lignes-facture/${ligneId}/`)
}

export const validerFacture = async (id: number): Promise<Facture> => {
    const response = await api.post(`/factures/${id}/valider/`)
    return response.data
}

export const cloturerFacture = async (id: number): Promise<Facture> => {
    const response = await api.post(`/factures/${id}/cloturer/`)
    return response.data
}

export const annulerFacture = async (id: number): Promise<Facture> => {
    const response = await api.post(`/factures/${id}/annuler/`)
    return response.data
}

export const mettreEnPlaceEcheancier = async (
    factureId: number, data: NouvelEcheancierPayload
): Promise<EcheancierPaiement> => {
    const response = await api.post(`/factures/${factureId}/echeancier/`, data)
    return response.data
}

// ─── Paiements ───────────────────────────────────────────────────────────────

export const getPaiements = async (factureId: number): Promise<Paiement[]> => {
    const response = await api.get(`/paiements/?facture=${factureId}`)
    return response.data
}

export const creerPaiement = async (data: NouveauPaiementPayload): Promise<Paiement> => {
    const response = await api.post('/paiements/', data)
    return response.data
}

export const supprimerPaiement = async (id: number): Promise<void> => {
    await api.delete(`/paiements/${id}/`)
}

// ─── Échéancier / échéances ──────────────────────────────────────────────────

export const signerEcheancier = async (
    id: number, documentSigneUrl?: string
): Promise<EcheancierPaiement> => {
    const response = await api.post(`/echeanciers-paiement/${id}/signer/`, {
        document_signe_url: documentSigneUrl,
    })
    return response.data
}

export const marquerEcheanceImpayee = async (id: number): Promise<Echeance> => {
    const response = await api.post(`/echeances/${id}/marquer-impayee/`)
    return response.data
}