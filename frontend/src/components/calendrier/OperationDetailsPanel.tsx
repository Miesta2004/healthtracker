import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Stethoscope, Building2, PlayCircle, TriangleAlert, Ban } from 'lucide-react'
import type { Operation } from '../../types'
import { STATUT_INTERVENTION_CONFIG } from '../../utils/blocOperatoireConfig'
import EquipePicker from '../EquipePicker'

interface Props {
    operation: Operation
    onClose: () => void
    onAnnuler: () => void
    onDemarrer: () => void
    onCloturer: (data: { resultat: 'terminee' | 'deces_au_bloc'; compte_rendu_operatoire: string; complications?: string }) => void
    onModifierEquipe: (ids: number[]) => void
    enCours?: boolean
    erreur?: string
}

export default function OperationDetailsPanel({
                                                  operation, onClose, onAnnuler, onDemarrer, onCloturer, onModifierEquipe, enCours, erreur,
                                              }: Props) {
    const cfg = STATUT_INTERVENTION_CONFIG[operation.statut]
    const debut = new Date(operation.heure_debut)
    const fin = new Date(operation.heure_fin)

    const [compteRendu, setCompteRendu] = useState(operation.compte_rendu_operatoire)
    const [complications, setComplications] = useState(operation.complications)

    const terminer = () => {
        onCloturer({ resultat: 'terminee', compte_rendu_operatoire: compteRendu, complications })
    }

    const declarerDecesAuBloc = () => {
        // Action irréversible avec cascade clinique (patient → décédé, salle
        // → désinfection approfondie, lit libéré) : une confirmation
        // classique en un clic serait trop facile à déclencher par erreur.
        const confirmation = window.confirm(
            "Confirmez-vous un décès au bloc opératoire ?\n\n" +
            "Cette action va : marquer le patient comme décédé, créer l'enregistrement de décès, " +
            "faire basculer la salle en désinfection approfondie, et libérer son lit d'hospitalisation. " +
            "Cette action est irréversible."
        )
        if (!confirmation) return
        onCloturer({ resultat: 'deces_au_bloc', compte_rendu_operatoire: compteRendu, complications })
    }

    const annuler = () => {
        if (!window.confirm("Annuler cette intervention programmée ?")) return
        onAnnuler()
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
                        <h3>{operation.type_acte}</h3>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {erreur && (
                            <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                                {erreur}
                            </div>
                        )}

                        <div>
                            <p className="text-lg font-bold" style={{ color: 'var(--ht-text)' }}>
                                {operation.patient_prenom} {operation.patient_nom}
                            </p>
                            <span
                                className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                            >
                                {cfg.label}
                            </span>
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
                        </div>

                        {operation.salle_nom && (
                            <div className="flex items-center gap-2">
                                <Building2 size={15} style={{ color: 'var(--ht-text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--ht-text)' }}>Salle {operation.salle_nom}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Stethoscope size={15} style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--ht-text)' }}>
                                Dr {operation.chirurgien_prenom} {operation.chirurgien_nom}
                            </p>
                        </div>

                        {(operation.statut === 'programmee' || operation.statut === 'en_cours') ? (
                            <EquipePicker
                                serviceId={operation.service_chirurgie}
                                selectionnes={operation.equipe}
                                onChange={onModifierEquipe}
                            />
                        ) : operation.equipe.length > 0 && (
                            <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                {operation.equipe.length} membre{operation.equipe.length > 1 ? 's' : ''} d'équipe assigné{operation.equipe.length > 1 ? 's' : ''}
                            </p>
                        )}

                        {operation.statut === 'programmee' && (
                            <div className="flex flex-col gap-2">
                                <button onClick={onDemarrer} disabled={enCours} className="btn btn-primary w-full justify-center gap-1.5">
                                    <PlayCircle size={15} /> Démarrer l'intervention
                                </button>
                                <button
                                    onClick={annuler} disabled={enCours}
                                    className="btn btn-secondary w-full justify-center gap-1.5"
                                >
                                    <Ban size={14} /> Annuler l'intervention
                                </button>
                            </div>
                        )}

                        {operation.statut === 'en_cours' && (
                            <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--ht-border)' }}>
                                <div>
                                    <label className="ht-label">Compte rendu opératoire</label>
                                    <textarea
                                        className="ht-input" rows={3}
                                        value={compteRendu} onChange={e => setCompteRendu(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="ht-label">Complications (optionnel)</label>
                                    <textarea
                                        className="ht-input" rows={2}
                                        value={complications} onChange={e => setComplications(e.target.value)}
                                    />
                                </div>
                                <button onClick={terminer} disabled={enCours} className="btn btn-primary w-full justify-center">
                                    Terminer l'intervention
                                </button>
                                <button
                                    onClick={declarerDecesAuBloc} disabled={enCours}
                                    className="btn w-full justify-center gap-1.5"
                                    style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)', border: '1px solid var(--ht-danger)' }}
                                >
                                    <TriangleAlert size={15} /> Décès au bloc
                                </button>
                            </div>
                        )}

                        {(operation.compte_rendu_operatoire || operation.complications) &&
                            operation.statut !== 'en_cours' && (
                                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--ht-border)' }}>
                                    {operation.compte_rendu_operatoire && (
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-text-secondary)' }}>
                                            {operation.compte_rendu_operatoire}
                                        </p>
                                    )}
                                    {operation.complications && (
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-danger)' }}>
                                            {operation.complications}
                                        </p>
                                    )}
                                </div>
                            )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
