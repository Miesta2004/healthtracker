import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import type { PassageUrgence, Hospitalisation, NiveauTri } from '../../types'
import { SkeletonSimpleList } from '../Skeleton'

const TRI_BADGE: Record<NiveauTri, string> = {
    1: 'badge-tri-1',
    2: 'badge-tri-2',
    3: 'badge-tri-3',
    4: 'badge-tri-4',
    5: 'badge-tri-5',
}

interface Props {
    urgences: PassageUrgence[] | null
    hospitalisations: Hospitalisation[] | null
}

/**
 * Vue curatée des patients nécessitant une attention particulière : les cas
 * les plus critiques aux urgences (niveau de tri 1-2) et les hospitalisations
 * les plus longues. Ne fait aucun nouvel appel réseau — réutilise les
 * mêmes `urgences` / `hospitalisations` déjà chargées par Dashboard.tsx.
 * La liste complète des urgences (tous niveaux) reste disponible plus bas
 * dans « File d'attente aux urgences », rien n'est retiré.
 */
export default function PriorityPatientsCard({ urgences, hospitalisations }: Props) {
    const navigate = useNavigate()
    const loading = urgences === null && hospitalisations === null

    const urgencesCritiques = (urgences ?? [])
        .filter(u => u.niveau_tri === 1 || u.niveau_tri === 2)
        .sort((a, b) => (a.niveau_tri ?? 5) - (b.niveau_tri ?? 5))
        .slice(0, 3)

    const hospitLongues = [...(hospitalisations ?? [])]
        .sort((a, b) => (b.duree_jours ?? 0) - (a.duree_jours ?? 0))
        .slice(0, 3)

    const total = urgencesCritiques.length + hospitLongues.length

    return (
        <div className="ht-card ht-card-padded flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-1 border-b border-[var(--ht-border)]">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                    Patients prioritaires
                    {!loading && total > 0 && <span className="badge badge-danger">{total}</span>}
                </h3>
            </div>

            {loading ? (
                <div className="pt-4"><SkeletonSimpleList rows={3} /></div>
            ) : total === 0 ? (
                <div className="ht-empty">Aucun patient prioritaire pour le moment</div>
            ) : (
                <div className="pt-3 space-y-2">
                    {urgencesCritiques.map(u => (
                        <div
                            key={`urg-${u.id}`}
                            onClick={() => navigate('/urgences')}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-transparent hover:border-[var(--ht-border)] hover:bg-[var(--ht-bg)] cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`badge ${u.niveau_tri ? TRI_BADGE[u.niveau_tri] : 'badge-muted'}`} style={{ width: '0.625rem', height: '0.625rem', padding: 0 }} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                        {u.patient_prenom ? `${u.patient_prenom} ${u.patient_nom}` : (u.patient_nom || `Patient #${u.patient}`)}
                                    </p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                        {u.niveau_tri_label || 'Non trié'} · {u.motif}
                                    </p>
                                </div>
                            </div>
                            <span className="badge badge-muted flex-shrink-0">Urgences</span>
                        </div>
                    ))}

                    {hospitLongues.map(h => (
                        <div
                            key={`hosp-${h.id}`}
                            onClick={() => navigate(`/patients/${h.patient}`)}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-transparent hover:border-[var(--ht-border)] hover:bg-[var(--ht-bg)] cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--ht-primary-tint)' }} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                        {h.patient_prenom ? `${h.patient_prenom} ${h.patient_nom}` : (h.patient_nom || `Patient #${h.patient}`)}
                                    </p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                        {h.chambre ? `Chambre ${h.chambre}` : 'Sans chambre'} · Admis depuis {h.duree_jours ?? 0} j
                                    </p>
                                </div>
                            </div>
                            <span className="badge badge-tint flex-shrink-0">Hospitalisé</span>
                        </div>
                    ))}
                </div>
            )}

            {urgencesCritiques.length === 0 && total > 0 && (
                <p className="text-xs mt-3 pt-3 border-t border-[var(--ht-border)] flex items-center gap-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                    <ShieldAlert size={12} /> Aucun cas critique aux urgences actuellement
                </p>
            )}
        </div>
    )
}