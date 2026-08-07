import { useNavigate } from 'react-router-dom'
import { FlaskConical, TestTube } from 'lucide-react'
import type { DemandeAnalyse } from '../../types'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    demandes: DemandeAnalyse[] | null
    userId?: number
}

/**
 * Vue laborantin : réutilise `demandes` (getDemandes, déjà chargée pour ce
 * rôle) plutôt que de dupliquer un second appel réseau. « En attente de
 * prélèvement » = demandes non encore prises en charge (pool partagé,
 * même logique que l'ancien getDemandesEnAttente). « Mes analyses en
 * cours » = celles que ce laborantin a personnellement prises en charge.
 */
export default function LabQueueCard({ demandes, userId }: Props) {
    const navigate = useNavigate()
    const loading = demandes === null

    const enAttente = (demandes ?? []).filter(d => d.statut === 'en_attente')
    const enCours = (demandes ?? []).filter(d => d.statut === 'en_cours' && d.laborantin === userId)

    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ht-border)] mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Laboratoire</h3>
                <button onClick={() => navigate('/laboratoire')} className="text-xs font-medium" style={{ color: 'var(--ht-primary)' }}>
                    Ouvrir le laboratoire
                </button>
            </div>

            {loading ? (
                <SkeletonSimpleList rows={3} />
            ) : (enAttente.length === 0 && enCours.length === 0) ? (
                <div className="ht-empty flex flex-col items-center gap-2">
                    <FlaskConical size={20} style={{ color: 'var(--ht-text-muted)' }} />
                    Aucune analyse en attente
                </div>
            ) : (
                <div className="space-y-4">
                    {enCours.length > 0 && (
                        <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                <TestTube size={13} /> Mes analyses en cours ({enCours.length})
                            </p>
                            <div className="divide-y divide-[var(--ht-border)]">
                                {enCours.slice(0, 4).map(d => (
                                    <div key={d.id} onClick={() => navigate('/laboratoire')} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 cursor-pointer gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                                {d.patient_prenom ? `${d.patient_prenom} ${d.patient_nom}` : (d.patient_nom || `Patient #${d.patient}`)}
                                            </p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{d.type_label}</p>
                                        </div>
                                        <span className="badge badge-muted flex-shrink-0">À valider</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {enAttente.length > 0 && (
                        <div className={enCours.length > 0 ? 'pt-3 border-t border-[var(--ht-border)]' : ''}>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                <FlaskConical size={13} /> En attente de prélèvement ({enAttente.length})
                            </p>
                            <div className="divide-y divide-[var(--ht-border)]">
                                {enAttente.slice(0, 4).map(d => (
                                    <div key={d.id} onClick={() => navigate('/laboratoire')} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 cursor-pointer gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                                {d.patient_prenom ? `${d.patient_prenom} ${d.patient_nom}` : (d.patient_nom || `Patient #${d.patient}`)}
                                            </p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{d.type_label}</p>
                                        </div>
                                        {d.urgence === 'urgente' && <span className="badge badge-danger flex-shrink-0">Urgent</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}