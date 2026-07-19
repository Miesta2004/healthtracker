import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { VuePlanning } from './usePlanning'

interface Props {
    vue: VuePlanning
    onVueChange: (v: VuePlanning) => void
    dateReference: Date
    onNavigate: (direction: -1 | 0 | 1) => void
    onNouveau: () => void
}

const VUES: { key: VuePlanning; label: string }[] = [
    { key: 'jour', label: 'Jour' },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
]

function formatPeriode(vue: VuePlanning, d: Date): string {
    if (vue === 'jour') {
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (vue === 'mois') {
        return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
    const jour = d.getDay()
    const decalage = jour === 0 ? -6 : 1 - jour
    const lundi = new Date(d)
    lundi.setDate(d.getDate() + decalage)
    const dimanche = new Date(lundi)
    dimanche.setDate(lundi.getDate() + 6)
    const memeMois = lundi.getMonth() === dimanche.getMonth()
    const debutLabel = lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: memeMois ? undefined : 'short' })
    const finLabel = dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return `${debutLabel} – ${finLabel}`
}

export default function PlanningToolbar({ vue, onVueChange, dateReference, onNavigate, onNouveau }: Props) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <button onClick={() => onNavigate(0)} className="btn btn-secondary btn-sm">Aujourd'hui</button>
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onNavigate(-1)} className="btn btn-ghost btn-sm !p-1.5">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => onNavigate(1)} className="btn btn-ghost btn-sm !p-1.5">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <span className="text-sm font-semibold capitalize" style={{ color: 'var(--ht-text)' }}>
                    {formatPeriode(vue, dateReference)}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                    {VUES.map(v => (
                        <button
                            key={v.key}
                            onClick={() => onVueChange(v.key)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={vue === v.key
                                ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                : { color: 'var(--ht-text-secondary)' }}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
                <button onClick={onNouveau} className="btn btn-primary btn-sm">
                    <Plus size={14} /> Nouveau
                </button>
            </div>
        </div>
    )
}
