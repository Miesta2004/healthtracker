import { useNavigate } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import type { Operation } from '../../types'
import { STATUT_INTERVENTION_CONFIG } from '../../utils/blocOperatoireConfig'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    operations: Operation[] | undefined
    loading: boolean
}

/**
 * Interventions programmées aujourd'hui : salle, équipe, statut. Alimenté par
 * useOperationsPlanning (déjà utilisé par le module Calendrier / vue Bloc
 * opératoire) — aucune nouvelle requête, aucune nouvelle logique.
 */
export default function BlocOperatoireCard({ operations, loading }: Props) {
    const navigate = useNavigate()
    const ops = [...(operations ?? [])].sort(
        (a, b) => new Date(a.heure_debut).getTime() - new Date(b.heure_debut).getTime()
    )

    return (
        <div className="ht-card ht-card-padded flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-1 border-b border-[var(--ht-border)]">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                    Bloc opératoire
                    {!loading && <span className="badge badge-muted">{ops.length}</span>}
                </h3>
                <button onClick={() => navigate('/calendrier')} className="text-xs font-medium" style={{ color: 'var(--ht-primary)' }}>
                    Voir le planning
                </button>
            </div>

            {loading ? (
                <div className="pt-4"><SkeletonSimpleList rows={3} /></div>
            ) : ops.length === 0 ? (
                <div className="ht-empty flex flex-col items-center gap-2">
                    <Scissors size={20} style={{ color: 'var(--ht-text-muted)' }} />
                    Aucune intervention programmée aujourd'hui
                </div>
            ) : (
                <div className="pt-3 divide-y divide-[var(--ht-border)]">
                    {ops.map(op => {
                        const cfg = STATUT_INTERVENTION_CONFIG[op.statut]
                        return (
                            <div key={op.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                        {op.patient_prenom ? `${op.patient_prenom} ${op.patient_nom}` : `Patient #${op.patient}`}
                                    </p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                        {new Date(op.heure_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        {' · '}{op.salle_nom || 'Salle non assignée'}
                                        {' · Dr '}{op.chirurgien_prenom ?? ''} {op.chirurgien_nom ?? ''}
                                        {op.equipe?.length ? ` · Équipe de ${op.equipe.length}` : ''}
                                    </p>
                                </div>
                                <span className="badge flex-shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                                    {cfg.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}