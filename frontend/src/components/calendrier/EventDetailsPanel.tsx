import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Stethoscope, FileText, StickyNote, TriangleAlert, Pencil, Ban, PlayCircle } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { TYPE_EVENEMENT_CONFIG, STATUT_LABELS } from './calendrierConfig'

interface Props {
    evenement: EvenementPlanning
    medecinLabel?: string | null
    onClose: () => void
    onModifier: () => void
    onAnnuler: () => void
    peutModifier: boolean
}

export default function EventDetailsPanel({ evenement, medecinLabel, onClose, onModifier, onAnnuler, peutModifier }: Props) {
    const navigate = useNavigate()
    const cfg = TYPE_EVENEMENT_CONFIG[evenement.type_evenement]
    const debut = new Date(evenement.start_time)
    const fin = new Date(evenement.end_time)

    const demarrerConsultation = () => {
        if (evenement.consultation_id) {
            navigate(`/patients/${evenement.patient.id}/consultations/${evenement.consultation_id}`)
        } else {
            navigate(`/patients/${evenement.patient.id}/consultations/new?rdv_origine=${evenement.id}`)
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(17, 24, 39, 0.35)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'tween', duration: 0.2 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto"
                    style={{ backgroundColor: 'var(--ht-card-bg)', boxShadow: 'var(--ht-shadow-modal)' }}
                >
                    <div className="ht-card-header justify-between" style={{ borderColor: 'var(--ht-border)' }}>
                        <div className="flex items-center gap-2">
                            <cfg.Icon size={16} style={{ color: cfg.color }} />
                            <h3>{cfg.label}</h3>
                        </div>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        <div>
                            <p className="text-lg font-bold" style={{ color: 'var(--ht-text)' }}>
                                {evenement.patient.nom_complet}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                Dossier {evenement.patient.numero_dossier} · {evenement.patient.age} ans
                            </p>
                            {evenement.a_alerte_critique && (
                                <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--ht-danger)' }}>
                                    <TriangleAlert size={13} /> Alerte critique en cours sur ce patient
                                </p>
                            )}
                        </div>

                        <div className="ht-card p-3 space-y-2">
                            <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>
                                {debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {' – '}
                                {fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className="badge badge-tint">{STATUT_LABELS[evenement.statut]}</span>
                        </div>

                        {medecinLabel && (
                            <div className="flex items-start gap-2">
                                <Stethoscope size={15} style={{ color: 'var(--ht-text-muted)', marginTop: 2 }} />
                                <p className="text-sm" style={{ color: 'var(--ht-text)' }}>{medecinLabel}</p>
                            </div>
                        )}

                        <div className="flex items-start gap-2">
                            <FileText size={15} style={{ color: 'var(--ht-text-muted)', marginTop: 2 }} />
                            <p className="text-sm" style={{ color: 'var(--ht-text)' }}>{evenement.motif || '—'}</p>
                        </div>

                        {evenement.notes && (
                            <div className="flex items-start gap-2">
                                <StickyNote size={15} style={{ color: 'var(--ht-text-muted)', marginTop: 2 }} />
                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-text-secondary)' }}>{evenement.notes}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2">
                            {evenement.type_evenement === 'consultation' && evenement.statut !== 'annule' && (
                                <button onClick={demarrerConsultation} className="btn btn-primary gap-1.5">
                                    <PlayCircle size={15} />
                                    {evenement.consultation_id ? 'Reprendre la consultation' : 'Démarrer la consultation'}
                                </button>
                            )}
                            {peutModifier && (
                                <button onClick={onModifier} className="btn btn-ghost gap-1.5">
                                    <Pencil size={14} /> Modifier
                                </button>
                            )}
                            {peutModifier && evenement.statut !== 'annule' && (
                                <button onClick={onAnnuler} className="btn btn-secondary gap-1.5">
                                    <Ban size={14} /> Annuler ce rendez-vous
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
