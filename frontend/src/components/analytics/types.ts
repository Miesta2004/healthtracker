import type { RoleEmploye } from '../../types'

export type OngletAnalytics = 'apercu' | 'services' | 'qualite' | 'chirurgiens'

// ─── KPI ──────────────────────────────────────────────────────────────────
export interface KpiData {
    label: string
    valeur: string
    delta?: string
    hausse?: boolean
    sparkline?: number[]
    estime?: boolean   // true = donnée simulée (mock), pas encore branchée à l'API
}

// ─── Interventions (mock — le backend `chirurgie` existe mais n'est pas ───
// encore exposé côté API pour ces agrégats) ─────────────────────────────────
export interface InterventionRecente {
    date: string
    patient: string
    type: string
    chirurgien: string
    duree: string
    issue: 'succes' | 'complication'
}

export interface RepartitionItem {
    nom: string
    valeur: number
    couleur: string
}

export interface ActivitePeriodePoint {
    heure: string
    consultations: number
}

// ─── Qualité (mock — aucun modèle de suivi qualité n'existe encore) ───────
export interface IndicateurQualite {
    label: string
    valeur: string
    delta: string
    hausse: boolean
    bon: boolean   // true = une hausse est une bonne nouvelle (ex: taux de succès)
}

export interface EvenementIndesirable {
    date: string
    type: string
    service: string
    gravite: 'mineure' | 'moderee' | 'majeure'
    statut: 'ouvert' | 'en_cours' | 'cloture'
}

export interface EvolutionQualitePoint {
    semaine: string
    infection: number
    reamission: number
    annulation: number
}

// ─── Chirurgien (mock — pas encore d'agrégat par praticien exposé) ────────
export interface ChirurgienPerf {
    id: number
    nom: string
    specialite: string
    nbInterventions: number
    dureeMoyenne: string
    tauxSucces: number
    patientsOperes: number
}

export interface RoleData {
    role: RoleEmploye
    label: string
    count: number
}