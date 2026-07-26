import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, ShieldAlert, ArrowRight } from 'lucide-react'
import type { GardeOccurrence } from '../../types'
import { GARDE_COULEUR } from './calendrierConfig'

interface Props {
    garde: GardeOccurrence
    onClose: () => void
}

export default function GardeDetailsPanel({ garde, onClose }: Props) {
    const navigate = useNavigate()
    const debut = new Date(garde.start_time)
    const fin = new Date(garde.end_time)

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
                        <h3>{garde.type_label}</h3>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        <div>
                            <p className="text-lg font-bold" style={{ color: 'var(--ht-text)' }}>
                                {garde.employe_prenom} {garde.employe_nom}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{garde.employe_role_label}</p>
                        </div>

                        <div className="ht-card p-3 space-y-2">
                            <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>
                                {debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                <Clock size={13} />
                                {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {' – '}
                                {fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>

                        <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${GARDE_COULEUR}1A`, color: GARDE_COULEUR }}
                        >
                            {garde.source === 'exception' && <ShieldAlert size={12} />}
                            {garde.source === 'recurrent' ? 'Créneau récurrent' : 'Garde exceptionnelle validée'}
                        </span>

                        {garde.motif && (
                            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-text-secondary)' }}>
                                {garde.motif}
                            </p>
                        )}

                        <button
                            onClick={() => navigate('/settings?tab=disponibilites')}
                            className="btn btn-ghost w-full justify-center gap-1.5"
                        >
                            Gérer dans Mes disponibilités <ArrowRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
