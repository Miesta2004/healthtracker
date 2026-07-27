import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { joursGrilleMois, toISODate } from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    onSelectDate: (date: Date) => void
}

const JOURS_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Petit calendrier mensuel façon widget de sidebar — pastille pleine sur
 * aujourd'hui, point discret sous les jours qui ont au moins un événement. */
export default function MiniMonthCalendar({ ancre, evenements, onSelectDate }: Props) {
    const [moisAffiche, setMoisAffiche] = useState(() => new Date(ancre.getFullYear(), ancre.getMonth(), 1))
    const jours = joursGrilleMois(moisAffiche)
    const aujourdhui = new Date()

    const joursAvecEvenement = new Set(
        evenements.filter(e => e.statut !== 'annule').map(e => toISODate(new Date(e.start_time)))
    )

    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold capitalize" style={{ color: 'var(--ht-text)' }}>
                    {moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--ht-bg)]"
                    >
                        <ChevronLeft size={14} style={{ color: 'var(--ht-text-muted)' }} />
                    </button>
                    <button
                        onClick={() => setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--ht-bg)]"
                    >
                        <ChevronRight size={14} style={{ color: 'var(--ht-text-muted)' }} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1">
                {JOURS_LABELS.map((j, i) => (
                    <div key={i} className="text-[10px] font-medium text-center" style={{ color: 'var(--ht-text-muted)' }}>
                        {j}
                    </div>
                ))}
                {jours.map(jour => {
                    const horsMois = jour.getMonth() !== moisAffiche.getMonth()
                    const estAuj = jour.toDateString() === aujourdhui.toDateString()
                    const aEvt = joursAvecEvenement.has(toISODate(jour))
                    return (
                        <button
                            key={jour.toISOString()}
                            onClick={() => onSelectDate(jour)}
                            className="relative w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs transition-colors hover:bg-[var(--ht-bg)]"
                            style={{
                                backgroundColor: estAuj ? 'var(--ht-primary)' : 'transparent',
                                color: estAuj ? 'var(--ht-primary-contrast)' : 'var(--ht-text)',
                                opacity: horsMois ? 0.4 : 1,
                            }}
                        >
                            {jour.getDate()}
                            {aEvt && !estAuj && (
                                <span
                                    className="absolute bottom-0.5 w-1 h-1 rounded-full"
                                    style={{ backgroundColor: 'var(--ht-primary)' }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}