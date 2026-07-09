import type { Alerte, TypeAlerte } from '../types'

export type Gravite = 'critique' | 'surveillance' | 'stable'

// Types d'alerte considérés comme cliniquement critiques lorsqu'ils sont cumulés.
const TYPES_CRITIQUES: TypeAlerte[] = ['tension', 'frequence']

/**
 * Détermine la gravité d'un patient à partir de ses alertes non traitées.
 * - stable       : aucune alerte non lue
 * - surveillance : au moins une alerte non lue
 * - critique     : plusieurs alertes non lues dont au moins une sur tension/fréquence
 */
export function computeGravite(alertesPatient: Alerte[]): Gravite {
    const nonLues = alertesPatient.filter((a) => a.statut === 'non_lue')
    if (nonLues.length === 0) return 'stable'

    const aUneAlerteVitale = nonLues.some((a) => TYPES_CRITIQUES.includes(a.type))
    if (aUneAlerteVitale && nonLues.length > 1) return 'critique'
    return 'surveillance'
}

export const GRAVITE_LABEL: Record<Gravite, string> = {
    critique: 'Critique',
    surveillance: 'Surveillance',
    stable: 'Stable',
}

export const GRAVITE_COLOR_VAR: Record<Gravite, string> = {
    critique: 'var(--ht-coral)',
    surveillance: 'var(--ht-amber)',
    stable: 'var(--ht-teal)',
}
