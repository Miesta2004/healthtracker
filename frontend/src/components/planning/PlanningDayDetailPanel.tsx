import { useNavigate } from 'react-router-dom'
import { CalendarDays, User } from 'lucide-react'
import type { EvenementPlanning, StatutRendezVous } from '../../types'
import { TYPE_EVENEMENT_STYLE } from './typeEvenementConfig'
import { STATUT_BLOCK_BG, STATUT_BLOCK_TEXT } from './PlanningEventBlock'

function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatDateLongue(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
    evenement: EvenementPlanning | null
    onStatutChange: (id: number, statut: StatutRendezVous) => void
}

export default function PlanningDayDetailPanel({ evenement, onStatutChange }: Props) {
    const navigate = useNavigate()

    if (!evenement) {
        return (
            <div className="ht-card ht-card-padded flex flex-col items-center justify-center text-center h-full min-h-[280px]">
                <CalendarDays size={28} style={{ color: 'var(--ht-text-muted)' }} className="mb-2" />
                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                    Sélectionnez un événement pour voir le détail.
                </p>
            </div>
        )
    }

    const style = TYPE_EVENEMENT_STYLE[evenement.type_evenement] ?? TYPE_EVENEMENT_STYLE.autre
    const Icon = style.icon

    const handleConsultation = () => {
        if (evenement.consultation_id) {
            navigate(`/patients/${evenement.patient.id}/consultations/${evenement.consultation_id}`)
        } else {
            navigate(`/patients/${evenement.patient.id}/consultations/new`, {
                state: { motif: evenement.motif, rdvOrigine: evenement.id },
            })
        }
    }

    return (
        <div className="ht-card ht-card-padded space-y-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: style.bg, color: style.text }}>
                        <Icon size={14} />
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>
                        {evenement.type_evenement_label} : {evenement.motif}
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                    {formatDateLongue(evenement.start_time)}
                </p>
                <span className="badge" style={{ backgroundColor: STATUT_BLOCK_BG[evenement.statut], color: STATUT_BLOCK_TEXT[evenement.statut] }}>
                    {evenement.statut_label}
                </span>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--ht-text-muted)' }}>
                {formatHeure(evenement.start_time)} – {formatHeure(evenement.end_time)}
            </p>

            <div className="pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
                <p className="ht-label mb-2">Patient</p>
                <div className="flex items-center gap-2.5">
                    <div className="ht-avatar ht-avatar-md" style={{ backgroundColor: 'var(--ht-primary-light)', color: 'var(--ht-primary)' }}>
                        <User size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{evenement.patient.nom_complet}</p>
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                            {evenement.patient.age} ans · {evenement.patient.numero_dossier}
                        </p>
                    </div>
                </div>
                <button onClick={() => navigate(`/patients/${evenement.patient.id}`)} className="btn btn-secondary btn-sm w-full justify-center mt-3">
                    Voir le dossier
                </button>
            </div>

            {evenement.notes && (
                <div className="pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
                    <p className="ht-label mb-1.5">Notes</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-text)' }}>{evenement.notes}</p>
                </div>
            )}

            <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--ht-border)' }}>
                <div className="flex gap-2">
                    {evenement.statut === 'planifie' && (
                        <button onClick={() => onStatutChange(evenement.id, 'confirme')} className="btn btn-secondary btn-sm flex-1 justify-center">
                            Confirmer
                        </button>
                    )}
                    {(evenement.statut === 'planifie' || evenement.statut === 'confirme') && (
                        <button onClick={() => onStatutChange(evenement.id, 'annule')} className="btn btn-danger btn-sm flex-1 justify-center">
                            Annuler
                        </button>
                    )}
                </div>
                <button onClick={handleConsultation} className="btn btn-primary w-full justify-center">
                    {evenement.consultation_id ? 'Reprendre la consultation →' : 'Démarrer la consultation →'}
                </button>
            </div>
        </div>
    )
}
