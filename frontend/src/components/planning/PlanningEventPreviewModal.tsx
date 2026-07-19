import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertTriangle } from 'lucide-react'
import { getSignesVitaux } from '../../api/patients'
import type { EvenementPlanning, SignesVitaux, StatutRendezVous } from '../../types'
import { STATUT_BLOCK_BG, STATUT_BLOCK_TEXT } from './PlanningEventBlock'

function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Seuils simples pour signaler une constante hors norme dans l'aperçu rapide
// (pas un diagnostic — juste un repère visuel, cohérent avec l'esprit "le
// calendrier signale, la fiche patient explique" de la spec).
function horsSeuil(signe: SignesVitaux) {
    return {
        tension: (signe.tension_systolique != null && (signe.tension_systolique > 140 || signe.tension_systolique < 90))
            || (signe.tension_diastolique != null && (signe.tension_diastolique > 90 || signe.tension_diastolique < 60)),
        temperature: signe.temperature != null && (Number(signe.temperature) > 38 || Number(signe.temperature) < 36),
        glycemie: signe.glycemie != null && (Number(signe.glycemie) > 7 || Number(signe.glycemie) < 3.9),
        frequence: signe.frequence_cardiaque != null && (signe.frequence_cardiaque > 100 || signe.frequence_cardiaque < 60),
    }
}

interface Props {
    evenement: EvenementPlanning
    onClose: () => void
    onStatutChange: (id: number, statut: StatutRendezVous) => void
}

export default function PlanningEventPreviewModal({ evenement, onClose, onStatutChange }: Props) {
    const navigate = useNavigate()
    const [dernierSigne, setDernierSigne] = useState<SignesVitaux | null>(null)
    const [loadingSignes, setLoadingSignes] = useState(true)

    useEffect(() => {
        let cancelled = false
        getSignesVitaux(evenement.patient.id)
            .then((liste: SignesVitaux[]) => { if (!cancelled) setDernierSigne(liste[0] ?? null) })
            .catch(() => { if (!cancelled) setDernierSigne(null) })
            .finally(() => { if (!cancelled) setLoadingSignes(false) })
        return () => { cancelled = true }
    }, [evenement.patient.id])

    const alertesSeuil = dernierSigne ? horsSeuil(dernierSigne) : null

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
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                            {evenement.patient.nom_complet} · {evenement.patient.age} ans
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                            {formatHeure(evenement.start_time)} – {formatHeure(evenement.end_time)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="badge" style={{ backgroundColor: STATUT_BLOCK_BG[evenement.statut], color: STATUT_BLOCK_TEXT[evenement.statut] }}>
                            {evenement.statut_label}
                        </span>
                        <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="space-y-3 py-2" style={{ borderTop: '1px solid var(--ht-border)', borderBottom: '1px solid var(--ht-border)' }}>
                    <p className="text-sm pt-2" style={{ color: 'var(--ht-text)' }}>
                        <span className="font-semibold">Motif :</span> {evenement.motif}
                    </p>

                    <div>
                        <p className="ht-label mb-1.5">Dernières constantes</p>
                        {loadingSignes ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                        ) : !dernierSigne ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucune mesure enregistrée.</p>
                        ) : (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                {dernierSigne.tension_systolique != null && (
                                    <span style={{ color: alertesSeuil?.tension ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                                        Tension {dernierSigne.tension_systolique}/{dernierSigne.tension_diastolique}
                                        {alertesSeuil?.tension && ' ⚠'}
                                    </span>
                                )}
                                {dernierSigne.temperature != null && (
                                    <span style={{ color: alertesSeuil?.temperature ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                                        Temp {dernierSigne.temperature}°{alertesSeuil?.temperature && ' ⚠'}
                                    </span>
                                )}
                                {dernierSigne.glycemie != null && (
                                    <span style={{ color: alertesSeuil?.glycemie ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                                        Glyc {dernierSigne.glycemie}{alertesSeuil?.glycemie && ' ⚠'}
                                    </span>
                                )}
                                {dernierSigne.frequence_cardiaque != null && (
                                    <span style={{ color: alertesSeuil?.frequence ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                                        FC {dernierSigne.frequence_cardiaque}{alertesSeuil?.frequence && ' ⚠'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {evenement.a_alerte_critique && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ht-danger)' }}>
                            <AlertTriangle size={13} /> Ce patient a une alerte non lue.
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 pt-3">
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
                    <button onClick={handleConsultation} className="btn btn-primary justify-center">
                        {evenement.consultation_id ? 'Reprendre la consultation →' : 'Démarrer la consultation →'}
                    </button>
                </div>
            </div>
        </div>
    )
}
