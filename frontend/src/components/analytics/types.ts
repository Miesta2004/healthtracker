import type { RoleEmploye } from '../../types'

export type OngletAnalytics = 'apercu' | 'services' | 'qualite' | 'chirurgiens'

// ─── KPI ──────────────────────────────────────────────────────────────────
export interface KpiData {
    label: string
    valeur: string
    delta?: string
    hausse?: boolean
    sparkline?: number[]
    estime?: boolean   // true = donnée manquante/insuffisante sur la période, pas une valeur simulée
}

export interface RoleData {
    role: RoleEmploye
    label: string
    count: number
}