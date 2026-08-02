import { BedDouble, UserPlus, Activity } from 'lucide-react'
import type { OccupationService, Hospitalisation } from '../../types'
import { SkeletonSimpleList } from '../Skeleton'

interface Props {
    occupation: OccupationService | null
    hospitalisations: Hospitalisation[] | null
}

/**
 * Occupation des lits + admissions du jour. `occupation` vient de
 * getServiceStats(service).occupation (médecin/infirmier d'un service) ou
 * d'une agrégation de getVueEnsemble() (admin, plusieurs services) — deux
 * endpoints déjà existants, aucun nouveau. Les « sorties du jour » ne sont
 * volontairement pas affichées : l'API n'expose aujourd'hui que les
 * hospitalisations en cours (statut=en_cours), pas un historique des
 * sorties du jour, et on ne fabrique pas cette donnée.
 */
export default function ServiceActivityCard({ occupation, hospitalisations }: Props) {
    const loading = hospitalisations === null
    const aujourdhui = new Date().toDateString()
    const admissionsAujourdhui = (hospitalisations ?? []).filter(
        h => new Date(h.date_admission).toDateString() === aujourdhui
    ).length

    const taux = occupation?.taux_occupation ?? (
        occupation?.capacite_lits ? Math.round((occupation.lits_occupes / occupation.capacite_lits) * 100) : null
    )

    return (
        <div className="ht-card ht-card-padded flex flex-col h-full">
            <h3 className="text-sm font-semibold pb-4 mb-1 border-b border-[var(--ht-border)]" style={{ color: 'var(--ht-text)' }}>
                Activité du service
            </h3>

            {loading ? (
                <div className="pt-4"><SkeletonSimpleList rows={2} /></div>
            ) : (
                <div className="pt-4 space-y-5">
                    {occupation && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                    <BedDouble size={14} /> Occupation des lits
                                </span>
                                <span className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>
                                    {occupation.lits_occupes}{occupation.capacite_lits ? ` / ${occupation.capacite_lits}` : ''}
                                    {taux !== null ? ` (${taux}%)` : ''}
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ht-bg)' }}>
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(taux ?? 0, 100)}%`,
                                        backgroundColor: (taux ?? 0) >= 90 ? 'var(--ht-danger)' : 'var(--ht-primary)',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--ht-bg)' }}>
                            <UserPlus size={16} style={{ color: 'var(--ht-primary)' }} />
                            <p className="text-lg font-bold mt-1.5" style={{ color: 'var(--ht-text)' }}>{admissionsAujourdhui}</p>
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Admissions aujourd'hui</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--ht-bg)' }}>
                            <Activity size={16} style={{ color: 'var(--ht-primary)' }} />
                            <p className="text-lg font-bold mt-1.5" style={{ color: 'var(--ht-text)' }}>{(hospitalisations ?? []).length}</p>
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Hospitalisations en cours</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}