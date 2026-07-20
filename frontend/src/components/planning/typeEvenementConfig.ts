import { Stethoscope, Scissors, Users, ShieldAlert, HeartPulse, Calendar, type LucideIcon } from 'lucide-react'
import type { TypeEvenementRdv } from '../../types'

interface TypeEvenementStyle {
    bg: string
    border: string
    text: string
    icon: LucideIcon
}

// Couleurs calquées sur les maquettes fournies : vert=Consultation,
// bleu=Intervention, violet=Réunion, bleu clair=Garde, corail=Visite postop.
// Utilise les variables de thème existantes (index.css) pour rester
// cohérent en mode sombre — pas de couleurs codées en dur.
export const TYPE_EVENEMENT_STYLE: Record<TypeEvenementRdv, TypeEvenementStyle> = {
    consultation: {
        bg: 'var(--ht-success-bg)', border: 'var(--ht-success)', text: 'var(--ht-success)',
        icon: Stethoscope,
    },
    intervention: {
        bg: 'var(--ht-primary-tint-bg)', border: 'var(--ht-primary)', text: 'var(--ht-primary-tint-text)',
        icon: Scissors,
    },
    reunion: {
        bg: 'var(--ht-evenement-violet-bg)', border: 'var(--ht-violet)', text: 'var(--ht-violet)',
        icon: Users,
    },
    garde: {
        bg: 'var(--ht-evenement-blue-tint-bg)', border: 'var(--ht-blue)', text: 'var(--ht-blue)',
        icon: ShieldAlert,
    },
    visite_postoperatoire: {
        bg: 'var(--ht-danger-bg)', border: 'var(--ht-danger)', text: 'var(--ht-danger)',
        icon: HeartPulse,
    },
    autre: {
        bg: 'var(--ht-muted-bg)', border: 'var(--ht-muted)', text: 'var(--ht-muted)',
        icon: Calendar,
    },
}
