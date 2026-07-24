import type { StatutIntervention } from '../types'

interface StatutInterventionConfig {
    label: string
    bg: string
    border: string
    text: string
    /** Une intervention en cours/terminée/décès/annulée ne doit plus pouvoir être glissée-déposée. */
    deplacable: boolean
}

export const STATUT_INTERVENTION_CONFIG: Record<StatutIntervention, StatutInterventionConfig> = {
    programmee:    { label: 'Programmée',      bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', deplacable: true },
    en_cours:      { label: 'En cours',        bg: '#FEF3C7', border: '#FCD34D', text: '#B45309', deplacable: false },
    terminee:      { label: 'Terminée',        bg: '#DCFCE7', border: '#86EFAC', text: '#15803D', deplacable: false },
    deces_au_bloc: { label: 'Décès au bloc',   bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C', deplacable: false },
    annulee:       { label: 'Annulée',         bg: '#F3F4F6', border: '#E5E7EB', text: '#9CA3AF', deplacable: false },
}
