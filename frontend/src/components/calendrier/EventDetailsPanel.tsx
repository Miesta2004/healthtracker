import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, FileText, TriangleAlert, Pencil, Ban, PlayCircle } from 'lucide-react'
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
    const sectionBorder = { borderColor: 'var(--ht-border)' }
    const aDesNotes = !!(evenement.motif || evenement.notes)

    const demarrerConsultation = () => {
        if (!evenement.patient) return
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
                    {/* En-tête : titre (type d'événement) + sous-titre (service/lieu) */}
                    <div className="flex items-start justify-between p-5 pb-4">
                        <div>
                            <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                                {cfg.label}
                            </h3>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                {evenement.service_nom ?? "Tout l'hôpital"}
                                {evenement.lieu && ` · ${evenement.lieu}`}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {evenement.alerte_critique && (
                        <div className="mx-5 mb-4 flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                            <TriangleAlert size={14} /> Alerte critique en cours sur ce patient
                        </div>
                    )}

                    {/* Date / heure + statut */}
                    <div className="px-5 py-4 flex items-start justify-between border-t" style={sectionBorder}>
                        <div>
                            <p className="text-sm font-semibold capitalize" style={{ color: 'var(--ht-text)' }}>
                                {debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {' – '}
                                {fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <span className="badge badge-tint flex-shrink-0">{STATUT_LABELS[evenement.statut]}</span>
                    </div>

                    {/* Patient */}
                    {evenement.patient && (
                        <div className="px-5 py-4 border-t" style={sectionBorder}>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Patient</h4>
                            <p className="text-[15px] font-bold" style={{ color: 'var(--ht-text)' }}>
                                {evenement.patient.nom_complet}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                {evenement.patient.age} ans - {evenement.patient.sexe === 'F' ? 'Femme' : 'Homme'}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                                ID : {evenement.patient.numero_dossier}
                            </p>
                            <button
                                onClick={() => navigate(`/patients/${evenement.patient!.id}`)}
                                className="btn btn-secondary gap-1.5 mt-3"
                            >
                                <FileText size={14} /> Voir le dossier
                            </button>
                        </div>
                    )}

                    {/* Médecin */}
                    {medecinLabel && (
                        <div className="px-5 py-4 border-t" style={sectionBorder}>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Médecin</h4>
                            <p className="text-sm" style={{ color: 'var(--ht-text)' }}>{medecinLabel}</p>
                        </div>
                    )}

                    {/* Notes */}
                    {aDesNotes && (
                        <div className="px-5 py-4 border-t" style={sectionBorder}>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Notes</h4>
                            {evenement.motif && (
                                <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{evenement.motif}</p>
                            )}
                            {evenement.notes && (
                                <p className="text-sm whitespace-pre-wrap mt-1" style={{ color: 'var(--ht-text-secondary)' }}>{evenement.notes}</p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="px-5 py-4 border-t flex flex-col gap-2" style={sectionBorder}>
                        {evenement.type_evenement === 'consultation' && evenement.statut !== 'annule' && (
                            <button onClick={demarrerConsultation} className="btn btn-primary gap-1.5 justify-center">
                                <PlayCircle size={15} />
                                {evenement.consultation_id ? 'Reprendre la consultation' : 'Démarrer la consultation'}
                            </button>
                        )}
                        {peutModifier && (
                            <button onClick={onModifier} className="btn btn-secondary gap-1.5 justify-center">
                                <Pencil size={14} /> Modifier l'événement
                            </button>
                        )}
                        {peutModifier && evenement.statut !== 'annule' && (
                            <button onClick={onAnnuler} className="btn btn-secondary gap-1.5 justify-center">
                                <Ban size={14} /> {evenement.patient ? 'Annuler ce rendez-vous' : "Annuler l'événement"}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
