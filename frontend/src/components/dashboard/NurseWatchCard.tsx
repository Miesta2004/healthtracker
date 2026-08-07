import { useNavigate } from 'react-router-dom'
import { Activity, BedDouble } from 'lucide-react'
import type { Hospitalisation } from '../../types'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    hospitalisations: Hospitalisation[] | null
}

/**
 * Vue infirmière : patients hospitalisés à surveiller. Aucune donnée
 * « constantes dues » n'existe côté API (pas d'endpoint de planning de
 * relevés) — on ne fabrique donc pas une liste d'horaires fictifs. On
 * affiche honnêtement la liste réelle des patients hospitalisés, avec un
 * accès direct à la prise de constantes sur la fiche du patient
 * (route déjà existante : /patients/:id/signes_vitaux/newSignes).
 */
export default function NurseWatchCard({ hospitalisations }: Props) {
    const navigate = useNavigate()
    const loading = hospitalisations === null
    const liste = [...(hospitalisations ?? [])].sort((a, b) => (b.duree_jours ?? 0) - (a.duree_jours ?? 0))

    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ht-border)] mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                    Patients sous surveillance
                    {!loading && <span className="badge badge-muted">{liste.length}</span>}
                </h3>
            </div>

            {loading ? (
                <SkeletonSimpleList rows={3} />
            ) : liste.length === 0 ? (
                <div className="ht-empty flex flex-col items-center gap-2">
                    <BedDouble size={20} style={{ color: 'var(--ht-text-muted)' }} />
                    Aucun patient hospitalisé pour le moment
                </div>
            ) : (
                <div className="divide-y divide-[var(--ht-border)]">
                    {liste.slice(0, 6).map(h => (
                        <div key={h.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>
                                    {h.patient_prenom ? `${h.patient_prenom} ${h.patient_nom}` : (h.patient_nom || `Patient #${h.patient}`)}
                                </p>
                                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    {h.chambre ? `Chambre ${h.chambre}` : 'Sans chambre'} · Jour {h.duree_jours ?? 0}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(`/patients/${h.patient}/signes_vitaux/newSignes`)}
                                className="text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                                style={{ color: 'var(--ht-primary)' }}
                            >
                                <Activity size={13} /> Relever
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}