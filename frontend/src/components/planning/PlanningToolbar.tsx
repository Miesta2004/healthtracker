import { ChevronLeft, ChevronRight, Plus, AlertTriangle } from 'lucide-react'
import type { VuePlanning } from './usePlanning'
import { libellePeriode } from '../../utils/planningUtils.ts'

const VUES: { value: VuePlanning; label: string }[] = [
    { value: 'jour', label: 'Jour' },
    { value: 'semaine', label: 'Semaine' },
    { value: 'mois', label: 'Mois' },
]

export default function PlanningToolbar({
                                            vue, setVue, debut, fin, alerteNouveaute,
                                            onAujourdhui, onPrecedent, onSuivant, onNouveau,
                                        }: {
    vue: VuePlanning
    setVue: (v: VuePlanning) => void
    debut: Date
    fin: Date
    alerteNouveaute: boolean
    onAujourdhui: () => void
    onPrecedent: () => void
    onSuivant: () => void
    onNouveau: () => void
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={onAujourdhui} className="btn btn-secondary btn-sm">
                    Aujourd'hui
                </button>
                <div className="flex items-center gap-0.5">
                    <button onClick={onPrecedent} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--ht-bg)]" style={{ color: 'var(--ht-text-secondary)' }} title="Période précédente">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={onSuivant} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--ht-bg)]" style={{ color: 'var(--ht-text-secondary)' }} title="Période suivante">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <span className="text-sm font-semibold capitalize flex items-center gap-1.5" style={{ color: 'var(--ht-text)' }}>
                    {libellePeriode(vue, debut, fin)}
                    {alerteNouveaute && (
                        <span
                            className="ht-pulse-dot"
                            style={{ color: 'var(--ht-danger)' }}
                            title="Un ou plusieurs rendez-vous de cette période nécessitent votre attention"
                        />
                    )}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg p-0.5 border" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-bg)' }}>
                    {VUES.map(v => (
                        <button
                            key={v.value}
                            onClick={() => setVue(v.value)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                            style={vue === v.value
                                ? { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-text)', boxShadow: 'var(--ht-shadow-card)' }
                                : { color: 'var(--ht-text-muted)' }
                            }
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
                <button onClick={onNouveau} className="btn btn-primary btn-sm gap-1.5">
                    <Plus size={14} /> Nouveau
                </button>
            </div>
        </div>
    )
}

// Petit badge exporté pour un usage éventuel dans le bandeau du bas (V2,
// hors scope §2.1) — évite de dupliquer l'icône d'alerte ailleurs.
export function BadgeAlerteCritique() {
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--ht-danger)' }}>
            <AlertTriangle size={12} /> Attention requise
        </span>
    )
}