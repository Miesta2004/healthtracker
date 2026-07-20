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

    // Données optionnelles parfois présentes selon le type d'événement (salle, équipe)
    // Le type TypeEvenement n'inclut pas toujours ces champs, nous faisons des
    // accès défensifs pour ne pas casser l'affichage lorsque la donnée est absente.
    const salle = (evenement as any).salle_nom || (evenement as any).salle || null
    const equipeCount = Array.isArray((evenement as any).equipe)
        ? (evenement as any).equipe.length
        : (typeof (evenement as any).participant_count === 'number' ? (evenement as any).participant_count : null)

    // Déterminer l'ombre et l'espacement selon l'état de sélection
    const shadowStyle = selectionne
        ? '0 12px 32px rgba(0,0,0,0.16)'
        : '0 2px 8px rgba(0,0,0,0.08)'

    return (
        <div
            className="planning-event rounded-lg px-3 py-2 text-xs cursor-pointer h-full transition-all"
            style={{
                backgroundColor: style.bg,
                borderLeft: `${selectionne ? 5 : 4}px solid ${evenement.a_alerte_critique ? 'var(--ht-danger)' : style.border}`,
                boxShadow: shadowStyle,
                borderRadius: 'var(--ht-radius)',
                textDecoration: annule ? 'line-through' : 'none',
                opacity: annule ? 0.65 : 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: compact ? 2 : 4,
                overflow: 'hidden',
            }}
            onClick={onClick}
            role="button"
            aria-pressed={!!selectionne}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClick()
                }
            }}
        >
            {/* En-tête : icône + heure + alerte */}
            <div className="flex items-start justify-between gap-1.5 leading-tight">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Icon size={13} className="shrink-0" style={{ color: style.text }} aria-hidden />
                    <span className="font-semibold text-xs whitespace-nowrap" style={{ color: style.text }}>
                        {formatHeure(evenement.start_time)}
                    </span>
                </div>

                {evenement.a_alerte_critique && (
                    <AlertTriangle size={13} style={{ color: 'var(--ht-danger)' }} className="shrink-0" />
                )}
            </div>

            {/* Titre et type d'événement */}
            <div className="min-w-0">
                <p className="truncate font-medium text-xs" style={{ color: 'var(--ht-text)' }}>
                    {evenement.type_evenement_label}
                </p>
                {!compact && (
                    <p className="truncate text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                        {evenement.patient?.nom_complet}
                    </p>
                )}
            </div>

            {/* Badge salle/participants en bas */}
            {(salle || equipeCount) && (
                <span className="badge-event-info" style={{
                    fontSize: '0.65rem',
                    padding: '0.2rem 0.5rem',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    color: style.text,
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {salle ? String(salle) : `${equipeCount} pers`}
                </span>
            )}
        </div>
    )
}
