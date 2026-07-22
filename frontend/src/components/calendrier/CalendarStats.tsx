import { Stethoscope, Scissors, Users, TriangleAlert } from 'lucide-react'
import type { EvenementPlanning } from '../../types'

interface Props {
    evenements: EvenementPlanning[]
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Stethoscope; label: string; value: number; color: string }) {
    return (
        <div className="ht-card flex items-center gap-3 px-4 py-3 flex-1 min-w-[140px]">
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}22` }}
            >
                <Icon size={16} style={{ color }} />
            </div>
            <div>
                <p className="text-lg font-bold leading-tight" style={{ color: 'var(--ht-text)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--ht-text-secondary)' }}>{label}</p>
            </div>
        </div>
    )
}

export default function CalendarStats({ evenements }: Props) {
    const actifs = evenements.filter(e => e.statut !== 'annule')
    const consultations = actifs.filter(e => e.type_evenement === 'consultation').length
    const interventions = actifs.filter(e => e.type_evenement === 'intervention').length
    const patientsUniques = new Set(actifs.map(e => e.patient.id)).size
    const alertes = actifs.filter(e => e.a_alerte_critique).length

    return (
        <div className="flex flex-wrap gap-3">
            <StatCard icon={Stethoscope} label="Consultations" value={consultations} color="var(--ht-blue)" />
            <StatCard icon={Scissors} label="Interventions" value={interventions} color="var(--ht-coral)" />
            <StatCard icon={Users} label="Patients concernés" value={patientsUniques} color="var(--ht-primary)" />
            <StatCard icon={TriangleAlert} label="Alertes critiques" value={alertes} color="var(--ht-amber)" />
        </div>
    )
}
