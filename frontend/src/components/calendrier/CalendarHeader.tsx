import { ChevronLeft, ChevronRight, Plus, CalendarDays, Rows3, Grid3x3, List } from 'lucide-react'
import { joursDeSemaine } from './calendrierConfig'

export type VueCalendrier = 'jour' | 'semaine' | 'mois' | 'agenda'

interface Props {
    ancre: Date
    vue: VueCalendrier
    onVueChange: (v: VueCalendrier) => void
    onPrecedent: () => void
    onSuivant: () => void
    onAujourdhui: () => void
    onNouvelEvenement: () => void
}

const MOIS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const VUES: { value: VueCalendrier; label: string; Icon: typeof Rows3 }[] = [
    { value: 'jour', label: 'Jour', Icon: Rows3 },
    { value: 'semaine', label: 'Semaine', Icon: CalendarDays },
    { value: 'mois', label: 'Mois', Icon: Grid3x3 },
    { value: 'agenda', label: 'Agenda', Icon: List },
]

function titreVue(ancre: Date, vue: VueCalendrier): string {
    if (vue === 'agenda') return 'Agenda'
    if (vue === 'jour') {
        return ancre.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (vue === 'mois') {
        return `${MOIS[ancre.getMonth()]} ${ancre.getFullYear()}`
    }
    const jours = joursDeSemaine(ancre)
    const debut = jours[0]
    const fin = jours[6]
    if (debut.getMonth() === fin.getMonth()) {
        return `${debut.getDate()} – ${fin.getDate()} ${MOIS[fin.getMonth()]} ${fin.getFullYear()}`
    }
    return `${debut.getDate()} ${MOIS[debut.getMonth()]} – ${fin.getDate()} ${MOIS[fin.getMonth()]} ${fin.getFullYear()}`
}

export default function CalendarHeader({
                                           ancre, vue, onVueChange, onPrecedent, onSuivant, onAujourdhui, onNouvelEvenement,
                                       }: Props) {
    // La vue Agenda est une liste "à venir" ancrée sur aujourd'hui : naviguer
    // par période n'a pas de sens, donc on masque prev/next/Aujourd'hui.
    const navigationPossible = vue !== 'agenda'

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                {navigationPossible && (
                    <>
                        <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: 'var(--ht-border-input)' }}>
                            <button
                                onClick={onPrecedent}
                                className="p-2 transition-colors"
                                style={{ color: 'var(--ht-text-secondary)' }}
                                aria-label="Période précédente"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="w-px self-stretch" style={{ backgroundColor: 'var(--ht-border-input)' }} />
                            <button
                                onClick={onSuivant}
                                className="p-2 transition-colors"
                                style={{ color: 'var(--ht-text-secondary)' }}
                                aria-label="Période suivante"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <button onClick={onAujourdhui} className="btn btn-ghost">
                            Aujourd'hui
                        </button>
                    </>
                )}
                <h2 className="text-base sm:text-lg font-semibold capitalize ml-1" style={{ color: 'var(--ht-text)' }}>
                    {titreVue(ancre, vue)}
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: 'var(--ht-border-input)' }}>
                    {VUES.map((v, i) => (
                        <div key={v.value} className="flex items-center">
                            {i > 0 && <div className="w-px self-stretch" style={{ backgroundColor: 'var(--ht-border-input)' }} />}
                            <button
                                onClick={() => onVueChange(v.value)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
                                style={{
                                    backgroundColor: vue === v.value ? 'var(--ht-primary-tint-bg)' : 'transparent',
                                    color: vue === v.value ? 'var(--ht-primary)' : 'var(--ht-text-secondary)',
                                }}
                            >
                                <v.Icon size={15} /> {v.label}
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={onNouvelEvenement} className="btn btn-primary gap-1.5">
                    <Plus size={16} /> Nouvel événement
                </button>
            </div>
        </div>
    )
}
