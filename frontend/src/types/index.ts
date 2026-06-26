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