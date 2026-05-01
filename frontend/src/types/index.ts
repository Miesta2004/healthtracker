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