import type { StatutRendezVous } from '../types'

// ─── Palette fonctionnelle des statuts — réutilise exactement STATUT_CONFIG
// de RendezVousPage.tsx (§2.3 de la spec) : mêmes variables --ht-*, jamais
// --ht-primary brut comme texte sur fond teinté (illisible en dark mode).
export const STATUT_BLOCK_BG: Record<string, string> = {
    planifie: 'var(--ht-warning-bg)',
    confirme: 'var(--ht-primary-tint-bg)',
    termine: 'var(--ht-success-bg)',
    annule: 'var(--ht-muted-bg)',
}

export const STATUT_BLOCK_TEXT: Record<string, string> = {
    planifie: 'var(--ht-warning)',
    confirme: 'var(--ht-primary-tint-text)',
    termine: 'var(--ht-success)',
    annule: 'var(--ht-muted)',
}

export const STATUT_LABEL_COURT: Record<StatutRendezVous, string> = {
    planifie: 'Planifié',
    confirme: 'Confirmé',
    termine: 'Terminé',
    annule: 'Annulé',
}

export function formatHeure(iso: string | Date): string {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function formatJourCourt(d: Date): string {
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function formatJourLong(d: Date): string {
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function estMemeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function estAujourdhui(d: Date): boolean {
    return estMemeJour(d, new Date())
}

// ─── Constantes de la grille horaire (vues Jour / Semaine) ──────────────────
export const HEURE_DEBUT_GRILLE = 7   // 07:00
export const HEURE_FIN_GRILLE = 20    // 20:00
export const HAUTEUR_HEURE_PX = 60

/** Position verticale (en px) d'une date dans la grille, bornée à la plage visible. */
export function positionVerticale(d: Date): number {
    const heures = d.getHours() + d.getMinutes() / 60
    const bornee = Math.min(Math.max(heures, HEURE_DEBUT_GRILLE), HEURE_FIN_GRILLE)
    return (bornee - HEURE_DEBUT_GRILLE) * HAUTEUR_HEURE_PX
}

export function hauteurBloc(debut: Date, fin: Date): number {
    const h = positionVerticale(fin) - positionVerticale(debut)
    return Math.max(h, 22) // hauteur minimale lisible pour un RDV très court
}


export function libellePeriode(vue: 'jour' | 'semaine' | 'mois', debut: Date, fin: Date): string {
    if (vue === 'jour') {
        return debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (vue === 'mois') {
        return debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
    const memeMois = debut.getMonth() === fin.getMonth()
    const debutStr = debut.toLocaleDateString('fr-FR', { day: 'numeric', month: memeMois ? undefined : 'short' })
    const finStr = fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${debutStr} – ${finStr}`
}