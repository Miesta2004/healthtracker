import { useNavigate } from 'react-router-dom'
import { UserCheck, IdCard } from 'lucide-react'
import type { Patient } from '../../types'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    admissionsEnAttente: Patient[] | null
    patients: Patient[] | null
}

/**
 * Vue secrétariat : deux files réelles, aucune inventée.
 * - Admissions en attente : getFileAttenteAccueil() (déjà utilisée par
 *   FileAttenteService.tsx, juste jamais appelée depuis le Dashboard).
 * - Dossiers incomplets : filtre `identite_provisoire` sur `patients`,
 *   déjà chargé pour ce rôle — aucun nouvel appel réseau.
 * Les rendez-vous du jour ne sont pas dupliqués ici : ils sont déjà
 * visibles dans la Timeline.
 */
export default function SecretaryQueueCard({ admissionsEnAttente, patients }: Props) {
    const navigate = useNavigate()
    const loading = admissionsEnAttente === null || patients === null
    const dossiersIncomplets = (patients ?? []).filter(p => p.identite_provisoire)

    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ht-border)] mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Accueil & admissions</h3>
                <button onClick={() => navigate('/file-attente')} className="text-xs font-medium" style={{ color: 'var(--ht-primary-tint-text)' }}>
                    Ouvrir la file d'attente
                </button>
            </div>

            {loading ? (
                <SkeletonSimpleList rows={3} />
            ) : (admissionsEnAttente!.length === 0 && dossiersIncomplets.length === 0) ? (
                <div className="ht-empty">Aucune admission ni dossier en attente</div>
            ) : (
                <div className="space-y-4">
                    {admissionsEnAttente!.length > 0 && (
                        <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                <UserCheck size={13} /> Admissions en attente ({admissionsEnAttente!.length})
                            </p>
                            <div className="divide-y divide-[var(--ht-border)]">
                                {admissionsEnAttente!.slice(0, 4).map(p => (
                                    <div key={p.id} onClick={() => navigate('/file-attente')} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 cursor-pointer">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{p.prenom} {p.nom}</p>
                                        <span className="badge badge-muted">À confirmer</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {dossiersIncomplets.length > 0 && (
                        <div className={admissionsEnAttente!.length > 0 ? 'pt-3 border-t border-[var(--ht-border)]' : ''}>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                <IdCard size={13} /> Dossiers incomplets ({dossiersIncomplets.length})
                            </p>
                            <div className="divide-y divide-[var(--ht-border)]">
                                {dossiersIncomplets.slice(0, 4).map(p => (
                                    <div key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 cursor-pointer">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{p.prenom} {p.nom}</p>
                                        <span className="badge badge-danger">Identité provisoire</span>
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