import { AlertTriangle } from 'lucide-react'
import type { EvenementPlanning, StatutRendezVous } from '../../types'
import { TYPE_EVENEMENT_STYLE } from './typeEvenementConfig'

// Conservées pour l'usage dans les badges de statut (modale de détail,
// liste des widgets) — la couleur des BLOCS du calendrier, elle, est
// désormais pilotée par type_evenement (voir TYPE_EVENEMENT_STYLE).
export const STATUT_BLOCK_BG: Record<StatutRendezVous, string> = {
    planifie: 'var(--ht-warning-bg)',
    confirme: 'var(--ht-primary-tint-bg)',
    termine:  'var(--ht-success-bg)',
    annule:   'var(--ht-muted-bg)',
}
export const STATUT_BLOCK_TEXT: Record<StatutRendezVous, string> = {
    planifie: 'var(--ht-warning)',
    confirme: 'var(--ht-primary-tint-text)',
    termine:  'var(--ht-success)',
    annule:   'var(--ht-muted)',
}

function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
    evenement: EvenementPlanning
    onClick: () => void
    compact?: boolean
    selectionne?: boolean
}

export default function PlanningEventBlock({ evenement, onClick, compact, selectionne }: Props) {
    const annule = evenement.statut === 'annule'
    const style = TYPE_EVENEMENT_STYLE[evenement.type_evenement] ?? TYPE_EVENEMENT_STYLE.autre
    const Icon = style.icon

    return (
        <div
            className="rounded-lg px-2 py-1.5 text-xs cursor-pointer h-full transition-shadow"
            style={{
                backgroundColor: style.bg,
                borderLeft: `3px solid ${evenement.a_alerte_critique ? 'var(--ht-danger)' : style.border}`,
                boxShadow: selectionne ? `0 0 0 2px ${style.border}` : 'none',
                textDecoration: annule ? 'line-through' : 'none',
                opacity: annule ? 0.6 : 1,
            }}
            onClick={onClick}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="font-semibold flex items-center gap-1" style={{ color: style.text }}>
                    <Icon size={11} className="flex-shrink-0" />
                    {formatHeure(evenement.start_time)}
                </span>
                {evenement.a_alerte_critique && (
                    <AlertTriangle size={12} style={{ color: 'var(--ht-danger)' }} className="flex-shrink-0" />
                )}
            </div>
            <p className="truncate font-medium" style={{ color: 'var(--ht-text)' }}>
                {evenement.type_evenement_label}
            </p>
            {!compact && (
                <p className="truncate" style={{ color: 'var(--ht-text-muted)' }}>
                    {evenement.patient.nom_complet}
                </p>
            )}
        </div>
    )
}
