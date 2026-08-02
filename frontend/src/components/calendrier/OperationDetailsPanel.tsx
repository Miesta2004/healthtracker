import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, FileText, PlayCircle, TriangleAlert, Ban } from 'lucide-react'
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

/** Libellé "Dr. Prénom Nom (Rôle)" / "Infirmier : Prénom Nom" pour un membre d'équipe. */
function ligneMembre(membre: NonNullable<Operation['equipe_detail']>[number]) {
    if (membre.role === 'infirmier') {
        return `Infirmier : ${membre.prenom} ${membre.nom}`
    }
    const role = membre.specialite_principale_nom || membre.role_label
    return `Dr. ${membre.prenom} ${membre.nom} (${role})`
}

export default function OperationDetailsPanel({
                                                  operation, onClose, onAnnuler, onDemarrer, onCloturer, onModifierEquipe, enCours, erreur,
                                              }: Props) {
    const navigate = useNavigate()
    const cfg = STATUT_INTERVENTION_CONFIG[operation.statut]
    const debut = new Date(operation.heure_debut)
    const fin = new Date(operation.heure_fin)

    const [compteRendu, setCompteRendu] = useState(operation.compte_rendu_operatoire)
    const [complications, setComplications] = useState(operation.complications)
    const [editionEquipe, setEditionEquipe] = useState(false)

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

    const sectionBorder = { borderColor: 'var(--ht-border)' }
    const equipeModifiable = operation.statut === 'programmee' || operation.statut === 'en_cours'
    const aDesNotes = !!(operation.compte_rendu_operatoire || operation.complications)

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
                    <div className="flex items-start justify-between p-5 pb-4">
                        <div>
                            <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                                Intervention : {operation.type_acte}
                            </h3>
                            {operation.salle_nom && (
                                <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    Salle {operation.salle_nom}
                                </p>
                            )}
                        </div>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {erreur && (
                        <div className="mx-5 mb-4 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                            {erreur}
                        </div>
                    )}

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
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                        >
                            {cfg.label}
                        </span>
                    </div>

                    <div className="px-5 py-4 border-t" style={sectionBorder}>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Patient</h4>
                        <p className="text-[15px] font-bold" style={{ color: 'var(--ht-text)' }}>
                            {operation.patient_prenom} {operation.patient_nom}
                        </p>
                        {operation.patient_age != null && operation.patient_sexe && (
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                {operation.patient_age} ans - {operation.patient_sexe === 'F' ? 'Femme' : 'Homme'}
                            </p>
                        )}
                        {operation.patient_numero_dossier && (
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                                ID : {operation.patient_numero_dossier}
                            </p>
                        )}
                        <button
                            onClick={() => navigate(`/patients/${operation.patient}`)}
                            className="btn btn-secondary gap-1.5 mt-3"
                        >
                            <FileText size={14} /> Voir le dossier
                        </button>
                    </div>

                    <div className="px-5 py-4 border-t" style={sectionBorder}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Équipe</h4>
                            {equipeModifiable && (
                                <button
                                    onClick={() => setEditionEquipe(v => !v)}
                                    className="text-xs font-medium"
                                    style={{ color: 'var(--ht-primary)' }}
                                >
                                    {editionEquipe ? 'Terminer' : 'Modifier'}
                                </button>
                            )}
                        </div>

                        <p className="text-sm mb-1.5" style={{ color: 'var(--ht-text)' }}>
                            Dr. {operation.chirurgien_prenom} {operation.chirurgien_nom} (Chirurgien)
                        </p>

                        {editionEquipe ? (
                            <EquipePicker
                                serviceId={operation.service_chirurgie}
                                selectionnes={operation.equipe}
                                onChange={onModifierEquipe}
                            />
                        ) : operation.equipe_detail && operation.equipe_detail.length > 0 ? (
                            <div className="space-y-1.5">
                                {operation.equipe_detail.map(membre => (
                                    <p key={membre.id} className="text-sm" style={{ color: 'var(--ht-text)' }}>
                                        {ligneMembre(membre)}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun autre membre assigné</p>
                        )}
                    </div>

                    {operation.statut === 'en_cours' ? (
                        <div className="px-5 py-4 border-t space-y-3" style={sectionBorder}>
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Notes</h4>
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
                        </div>
                    ) : aDesNotes && (
                        <div className="px-5 py-4 border-t" style={sectionBorder}>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Notes</h4>
                            {operation.compte_rendu_operatoire && (
                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {operation.compte_rendu_operatoire}
                                </p>
                            )}
                            {operation.complications && (
                                <p className="text-sm whitespace-pre-wrap mt-2" style={{ color: 'var(--ht-danger)' }}>
                                    {operation.complications}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="px-5 py-4 border-t" style={sectionBorder}>
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
                            <div className="flex flex-col gap-2">
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
