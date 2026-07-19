import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const JOURS_LABEL = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

interface Props {
    dateSelectionnee: Date
    onSelectDate: (d: Date) => void
}

export default function PlanningMiniCalendar({ dateSelectionnee, onSelectDate }: Props) {
    const [moisAffiche, setMoisAffiche] = useState(new Date(dateSelectionnee.getFullYear(), dateSelectionnee.getMonth(), 1))

    const annee = moisAffiche.getFullYear()
    const mois = moisAffiche.getMonth()
    const premierJourMois = new Date(annee, mois, 1)
    const decalage = (premierJourMois.getDay() + 6) % 7
    const debutGrille = new Date(premierJourMois)
    debutGrille.setDate(premierJourMois.getDate() - decalage)

    const jours = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(debutGrille)
        d.setDate(debutGrille.getDate() + i)
        return d
    })

    const isoSelectionne = dateSelectionnee.toISOString().slice(0, 10)

    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setMoisAffiche(new Date(annee, mois - 1, 1))} className="btn btn-ghost btn-sm !p-1">
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold capitalize" style={{ color: 'var(--ht-text)' }}>
                    {moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setMoisAffiche(new Date(annee, mois + 1, 1))} className="btn btn-ghost btn-sm !p-1">
                    <ChevronRight size={14} />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {JOURS_LABEL.map(j => (
                    <div key={j} className="text-center text-[9px] uppercase font-semibold py-1" style={{ color: 'var(--ht-text-muted)' }}>
                        {j}
                    </div>
                ))}
                {jours.map((jour, idx) => {
                    const iso = jour.toISOString().slice(0, 10)
                    const horsMois = jour.getMonth() !== mois
                    const selectionne = iso === isoSelectionne
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelectDate(jour)}
                            className="text-xs w-7 h-7 rounded-full mx-auto flex items-center justify-center"
                            style={{
                                opacity: horsMois ? 0.35 : 1,
                                backgroundColor: selectionne ? 'var(--ht-primary)' : 'transparent',
                                color: selectionne ? 'white' : 'var(--ht-text)',
                                fontWeight: selectionne ? 700 : 400,
                            }}
                        >
                            {jour.getDate()}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
