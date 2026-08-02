import { useNavigate } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { TYPE_EVENEMENT_CONFIG, memeJour } from '../calendrier/calendrierConfig'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    evenements: EvenementPlanning[] | null
}

/**
 * Chronologie verticale des événements du jour (consultations, interventions,
 * réunions, visites postopératoires...) — lecture seule, purement visuelle.
 * Réutilise EvenementPlanning (usePlanning) et TYPE_EVENEMENT_CONFIG déjà
 * utilisés par le module Calendrier : aucune nouvelle donnée, aucune nouvelle
 * logique métier. Un clic renvoie vers /calendrier pour l'action (le
 * Dashboard ne modifie jamais un événement, cf. Design System §7).
 */
export default function DayTimeline({ evenements }: Props) {
    const navigate = useNavigate()
    const aujourdhui = new Date()

    const evtsJour = (evenements ?? [])
        .filter(e => e.statut !== 'annule' && memeJour(new Date(e.start_time), aujourdhui))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return (
        <div className="ht-card ht-card-padded flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-1 border-b border-[var(--ht-border)]">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                    Timeline de la journée
                    {evtsJour.length > 0 && <span className="badge badge-muted">{evtsJour.length}</span>}
                </h3>
                <button
                    onClick={() => navigate('/calendrier')}
                    className="text-xs font-medium transition-colors"
                    style={{ color: 'var(--ht-primary)' }}
                >
                    Ouvrir le calendrier
                </button>
            </div>

            {evenements === null ? (
                <div className="pt-4"><SkeletonSimpleList rows={4} /></div>
            ) : evtsJour.length === 0 ? (
                <div className="ht-empty flex flex-col items-center gap-2">
                    <Clock3 size={20} style={{ color: 'var(--ht-text-muted)' }} />
                    Aucun événement prévu aujourd'hui
                </div>
            ) : (
                <div className="relative pt-4 pl-2">
                    {/* Ligne de chronologie */}
                    <div className="absolute left-[1.15rem] top-4 bottom-2 w-px" style={{ backgroundColor: 'var(--ht-border)' }} />

                    <div className="space-y-5">
                        {evtsJour.map(e => {
                            const cfg = TYPE_EVENEMENT_CONFIG[e.type_evenement]
                            const Icon = cfg.Icon
                            const debut = new Date(e.start_time)
                            const fin = new Date(e.end_time)
                            return (
                                <button
                                    key={`${e.source}-${e.id}`}
                                    onClick={() => navigate('/calendrier')}
                                    className="relative flex items-start gap-3 w-full text-left group"
                                >
                                    <span
                                        className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                                    >
                                        <Icon size={14} style={{ color: cfg.text }} />
                                    </span>
                                    <div className="min-w-0 flex-1 pb-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                                {e.patient ? e.patient.nom_complet : e.motif || cfg.label}
                                            </span>
                                            <span className="badge" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                                                {cfg.label}
                                            </span>
                                            {e.alerte_critique && <span className="badge badge-danger">Critique</span>}
                                        </div>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ht-text-muted)' }}>
                                            {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            {' – '}
                                            {fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            {e.lieu ? ` · ${e.lieu}` : ''}
                                            {e.medecin_nom ? ` · Dr ${e.medecin_prenom ?? ''} ${e.medecin_nom}` : ''}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}