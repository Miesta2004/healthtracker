import { Users, Building2, ShieldAlert, BedDouble } from 'lucide-react'

interface Props {
    effectif: { employes: number; services: number } | null
    totalPatients: number | null
    totalUrgences: number | null
    totalHospitalisations: number | null
}

/**
 * Seul endroit du Dashboard avec des chiffres globaux — explicitement
 * réservé à l'admin (spec : « peut conserver les statistiques globales »).
 * Réutilise `effectif`, déjà fetché par Dashboard.tsx mais jamais affiché
 * jusqu'ici, plus les compteurs déjà chargés (patients/urgences/hospit).
 */
export default function AdminOverviewCard({ effectif, totalPatients, totalUrgences, totalHospitalisations }: Props) {
    const items = [
        { label: 'Patients actifs', value: totalPatients, icon: Users },
        { label: 'Aux urgences', value: totalUrgences, icon: ShieldAlert },
        { label: 'Hospitalisations', value: totalHospitalisations, icon: BedDouble },
        { label: 'Employés actifs', value: effectif?.employes ?? null, icon: Users },
        { label: 'Services actifs', value: effectif?.services ?? null, icon: Building2 },
    ]

    return (
        <div className="ht-card ht-card-padded-sm">
            <h3 className="text-sm font-semibold pb-4 border-b border-[var(--ht-border)] mb-4" style={{ color: 'var(--ht-text)' }}>
                Vue d'ensemble de l'établissement
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {items.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--ht-bg)' }}>
                        <Icon size={15} style={{ color: 'var(--ht-primary-tint-text)' }} />
                        <p className="text-lg font-bold mt-1.5" style={{ color: 'var(--ht-text)' }}>{value ?? '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}