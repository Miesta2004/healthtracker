import api from './client.ts'
import type {Patient, SignesVitaux, PatientSearchResult, BadgePatient, BadgeAccompagnant, Accompagnant} from '../types'

export const getPatients = async (q?: string): Promise<Patient[]> => {
    const response = await api.get('/patients/', q ? { params: { q } } : {})
    return response.data
}

export const getMesPatientsSuivis = async (): Promise<Patient[]> => {
    const response = await api.get('/patients/', { params: { mine: 'true' } })
    return response.data
}

export const getPatient = async (id: number): Promise<Patient> => {
    const response = await api.get(`/patients/${id}/`)
    return response.data
}

export const deletePatient = async (id: number): Promise<void> => {
    await api.delete(`/patients/${id}/`)
}

export const updatePatient = async (id: number, data: object): Promise<Patient> => {
    const response = await api.patch(`/patients/${id}/`, data)
    return response.data
}

export const getSignesVitaux = async (patientId: number) => {
    const response = await api.get(`/signes_vitaux/?patient=${patientId}`)
    return response.data
}

export const ajouterAntecedent = async (patientId: number, antecedent: string): Promise<Patient> => {
    const response = await api.post(`/patients/${patientId}/ajouter_antecedent/`, { antecedent })
    return response.data
}

// ─── Service des Admissions — formulaire unique ────────────────────────────
export interface AccompagnantAdmissionPayload {
    nom: string
    prenom: string
    lien_parente?: string
    cni?: string
    telephone?: string
}

export interface AdmissionPayload {
    nom?: string
    prenom?: string
    date_naissance: string
    date_naissance_estimee?: boolean
    sexe: 'M' | 'F'
    telephone?: string
    adresse?: string
    contact_urgence_nom?: string
    contact_urgence_telephone?: string
    contact_urgence_lien?: string
    mutuelle?: string
    numero_mutuelle?: string
    groupe_sanguin?: string
    allergies?: string
    antecedents?: string
    accompagnants?: AccompagnantAdmissionPayload[]
    // Service de destination — requis hors mode urgence.
    service?: number
    // Mode "Urgence Vitale / Identité Provisoire" : nom/prénom optionnels,
    // service forcé sur "Urgences" côté serveur quoi qu'on envoie ici.
    mode_urgence_vitale?: boolean
}

export const createAdmission = async (data: AdmissionPayload): Promise<Patient> => {
    const response = await api.post('/patients/admission/', data)
    return response.data
}

export interface RegularisationPayload {
    nom?: string
    prenom?: string
    date_naissance?: string
    date_naissance_estimee?: boolean
    sexe?: 'M' | 'F'
    telephone?: string
    adresse?: string
    contact_urgence_nom?: string
    contact_urgence_telephone?: string
    contact_urgence_lien?: string
    mutuelle?: string
    numero_mutuelle?: string
}

// « Régulariser / Compléter le dossier » d'une identité provisoire créée en
// mode urgence — ne touche que l'identité, jamais l'historique médical.
export const regulariserPatient = async (patientId: number, data: RegularisationPayload): Promise<Patient> => {
    const response = await api.patch(`/patients/${patientId}/regulariser/`, data)
    return response.data
}

// Affecte/réaffecte un patient à un service — premier routage par les
// Admissions ou transfert mi-parcours par un médecin/secrétaire.
// `confirmationImmediate` saute la reconfirmation par le service receveur
// (coordination déjà faite, ex. par téléphone).
export const transfererPatient = async (
    patientId: number, serviceId: number, confirmationImmediate = false
): Promise<Patient> => {
    const response = await api.patch(`/patients/${patientId}/transferer/`, {
        service: serviceId,
        confirmation_immediate: confirmationImmediate,
    })
    return response.data
}

// Secrétariat de service : confirme l'arrivée physique d'un patient orienté.
export const confirmerArriveePatient = async (patientId: number): Promise<Patient> => {
    const response = await api.patch(`/patients/${patientId}/confirmer-arrivee/`)
    return response.data
}

export const getPatientsEnAttenteValidation = async (q?: string): Promise<Patient[]> => {
    const response = await api.get('/patients/', {
        params: { statut_orientation: 'en_attente_validation_service', ...(q ? { q } : {}) },
    })
    return response.data
}

// File d'attente / inbox du secrétariat de service : patients tout juste
// orientés vers MON service, en attente que je confirme leur arrivée (le
// backend restreint déjà /patients/ au service de l'employé connecté).
export const getFileAttenteAccueil = async (): Promise<Patient[]> => {
    const response = await api.get('/patients/', { params: { statut_orientation: 'en_attente_validation_service' } })
    return response.data
}

// ─── Recherche & identitovigilance ─────────────────────────────────────────
export const searchPatients = async (query: string): Promise<PatientSearchResult[]> => {
    const response = await api.get('/patients/search/', { params: { query } })
    return response.data
}

// ─── Badge / bracelet patient & pass accompagnant ──────────────────────────
export const getBadgePatient = async (patientId: number): Promise<BadgePatient> => {
    const response = await api.get(`/patients/${patientId}/badge/`)
    return response.data
}

export const getBadgeAccompagnant = async (accompagnantId: number): Promise<BadgeAccompagnant> => {
    const response = await api.get(`/accompagnants/${accompagnantId}/badge/`)
    return response.data
}

// ─── Accompagnants (traçabilité / contrôle d'accès) ────────────────────────
export const getAccompagnants = async (params?: { statut?: 'present' | 'sorti'; q?: string; patient?: number }): Promise<Accompagnant[]> => {
    const response = await api.get('/accompagnants/', { params })
    return response.data
}

export const ajouterAccompagnant = async (patientId: number, data: AccompagnantAdmissionPayload): Promise<Accompagnant> => {
    const response = await api.post('/accompagnants/', { ...data, patient: patientId })
    return response.data
}

export const marquerSortieAccompagnant = async (id: number): Promise<Accompagnant> => {
    const response = await api.patch(`/accompagnants/${id}/marquer-sortie/`)
    return response.data
}

export const marquerPresentAccompagnant = async (id: number): Promise<Accompagnant> => {
    const response = await api.patch(`/accompagnants/${id}/marquer-present/`)
    return response.data
}

export const postSignesVitaux = async (
    patientId: number,
    data: Omit<SignesVitaux, 'id' | 'patient'>
): Promise<SignesVitaux> => {
    const response = await api.post('/signes_vitaux/', { ...data, patient: patientId })
    return response.data
}
