import api from './client.ts'
import type {Patient, SignesVitaux, PatientSearchResult, BadgePatient, Accompagnant} from '../types'

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

export const createPatient = async (data: object): Promise<Patient> => {
    const response = await api.post('/patients/', data)
    return response.data
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

// ─── Service des Admissions ────────────────────────────────────────────────
export interface AccompagnantAdmissionPayload {
    nom: string
    prenom: string
    lien_parente?: string
    cni?: string
    telephone?: string
}

export interface AdmissionPayload {
    nom: string
    prenom: string
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
}

export const createAdmission = async (data: AdmissionPayload): Promise<Patient> => {
    const response = await api.post('/patients/admission/', data)
    return response.data
}

export const getPatientsEnAttenteOrientation = async (q?: string): Promise<Patient[]> => {
    const response = await api.get('/patients/', {
        params: { statut_orientation: 'en_attente_orientation', ...(q ? { q } : {}) },
    })
    return response.data
}

export const orienterPatient = async (patientId: number, serviceId: number): Promise<Patient> => {
    const response = await api.patch(`/patients/${patientId}/orienter/`, { service: serviceId })
    return response.data
}

// File d'attente / inbox du secrétariat de service : patients tout juste
// orientés vers MON service (le backend restreint déjà /patients/ au service
// de l'employé connecté pour une secrétaire — voir PatientViewSet.get_queryset).
export const getFileAttenteOrientation = async (): Promise<Patient[]> => {
    const response = await api.get('/patients/', { params: { statut_orientation: 'oriente' } })
    return response.data
}

// ─── Recherche & identitovigilance ─────────────────────────────────────────
export const searchPatients = async (query: string): Promise<PatientSearchResult[]> => {
    const response = await api.get('/patients/search/', { params: { query } })
    return response.data
}

// ─── Badge / bracelet patient ──────────────────────────────────────────────
export const getBadgePatient = async (patientId: number): Promise<BadgePatient> => {
    const response = await api.get(`/patients/${patientId}/badge/`)
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