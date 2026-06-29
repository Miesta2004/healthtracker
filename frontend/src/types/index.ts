export interface Patient {
    id: number
    nom: string
    prenom: string
    date_naissance: string
    sexe: 'M' | 'F'
    groupe_sanguin?: string
    telephone?: string
    adresse: string
    allergies?: string
    antecedents?: string
    actif: boolean
    date_creation: string
}

export interface AuthTokens {
    access: string
    refresh: string
}

export interface LoginCredentials {
    username: string
    password: string
}

export interface SignesVitaux {
    id: number
    patient: number
    date: string
    tension_systolique: number | null
    tension_diastolique: number | null
    temperature: number | null
    poids: number | null
    glycemie: number | null
    frequence_cardiaque: number | null
}

export type ConsultationStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee'
export type TypeEvenement = 'consultation' | 'examen' | 'operation' | 'autre'

// ─── Comptes / Employés ─────────────────────────────────────────────────────
export type RoleEmploye = 'admin' | 'medecin' | 'infirmier' | 'secretaire' | 'laborantin'

export interface Employe {
    id: number
    username: string
    email: string
    nom: string
    prenom: string
    date_naissance: string
    sexe: 'M' | 'F'
    age: number
    telephone?: string
    adresse?: string
    photo_path?: string | null
    role: RoleEmploye
    role_label: string
    specialite?: string
    matricule: string
    actif: boolean
    date_creation: string
}

// Réponse de /employes/me/ : soit un Employe complet, soit un fallback minimal
// pour un superuser Django sans fiche Employe associée.
export interface CurrentUser {
    username: string
    role: RoleEmploye
    role_label: string
    id?: number
    nom?: string
    prenom?: string
}

export interface Consultation {
    id: number
    patient: number
    type_evenement: TypeEvenement
    date: string
    motif: string
    symptomes: string
    examens_realises: string
    diagnostic: string
    ordonnance: string
    notes: string
    statut: ConsultationStatut
    date_creation: string
    date_modification: string
}