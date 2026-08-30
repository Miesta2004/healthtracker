import api from './client.ts'
import type {
    Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance, TarifActe, BordereauAssurance,
    NouvelleFacturePayload, NouvelleLigneFacturePayload, NouveauPaiementPayload,
    NouvelEcheancierPayload, NouveauTarifActePayload, ReponseAssurancePayload,
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

export const actualiserNuitees = async (
    factureId: number
): Promise<{ facture: Facture; nuitees_ajoutees: number; avertissements: string[] }> => {
    const response = await api.post(`/factures/${factureId}/actualiser-nuitees/`)
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

// ─── Grille tarifaire ────────────────────────────────────────────────────────

export const getTarifsActes = async (params?: { actif?: boolean; type_acte?: string }): Promise<TarifActe[]> => {
    const query = new URLSearchParams()
    if (params?.actif !== undefined) query.set('actif', String(params.actif))
    if (params?.type_acte) query.set('type_acte', params.type_acte)
    const qs = query.toString()
    const response = await api.get(`/tarifs-actes/${qs ? `?${qs}` : ''}`)
    return response.data
}

export const createTarifActe = async (data: NouveauTarifActePayload): Promise<TarifActe> => {
    const response = await api.post('/tarifs-actes/', data)
    return response.data
}

export const updateTarifActe = async (id: number, data: Partial<NouveauTarifActePayload>): Promise<TarifActe> => {
    const response = await api.patch(`/tarifs-actes/${id}/`, data)
    return response.data
}

// ─── Circuit de soumission à l'assurance ─────────────────────────────────────

export const getBordereauxAssurance = async (params?: { statut?: string; mutuelle_nom?: string }): Promise<BordereauAssurance[]> => {
    const query = new URLSearchParams()
    if (params?.statut) query.set('statut', params.statut)
    if (params?.mutuelle_nom) query.set('mutuelle_nom', params.mutuelle_nom)
    const qs = query.toString()
    const response = await api.get(`/bordereaux-assurance/${qs ? `?${qs}` : ''}`)
    return response.data
}

export const getBordereauAssurance = async (id: number): Promise<BordereauAssurance> => {
    const response = await api.get(`/bordereaux-assurance/${id}/`)
    return response.data
}

export const genererBordereau = async (mutuelleNom: string): Promise<BordereauAssurance> => {
    const response = await api.post('/bordereaux-assurance/generer/', { mutuelle_nom: mutuelleNom })
    return response.data
}

export const soumettreBordereau = async (id: number): Promise<BordereauAssurance> => {
    const response = await api.post(`/bordereaux-assurance/${id}/soumettre/`)
    return response.data
}

export const getLignesBordereau = async (bordereauId: number): Promise<LigneFacture[]> => {
    const response = await api.get(`/lignes-facture/?bordereau=${bordereauId}`)
    return response.data
}

export const enregistrerReponseAssurance = async (
    ligneId: number, data: ReponseAssurancePayload
): Promise<LigneFacture> => {
    const response = await api.post(`/lignes-facture/${ligneId}/reponse-assurance/`, data)
    return response.data
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

function ouvrirBlobPdf(blob: Blob) {
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Révoqué après un court délai plutôt qu'immédiatement — le temps que
    // l'onglet/le viewer PDF ait fini de charger l'URL.
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export const telechargerFacturePdf = async (factureId: number): Promise<void> => {
    const response = await api.get(`/factures/${factureId}/pdf/`, { responseType: 'blob' })
    ouvrirBlobPdf(response.data)
}

export const telechargerRecuPaiement = async (paiementId: number): Promise<void> => {
    const response = await api.get(`/paiements/${paiementId}/recu/`, { responseType: 'blob' })
    ouvrirBlobPdf(response.data)
}