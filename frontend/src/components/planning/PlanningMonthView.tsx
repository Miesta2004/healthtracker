import type { EvenementPlanning } from '../../types'

const JOURS_LABEL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface Props {
    dateReference: Date
    evenements: EvenementPlanning[]
    onSelectJour: (jour: Date) => void
}

export default function PlanningMonthView({ dateReference, evenements, onSelectJour }: Props) {
    const annee = dateReference.getFullYear()
    const mois = dateReference.getMonth()
    const premierJourMois = new Date(annee, mois, 1)
    const decalage = (premierJourMois.getDay() + 6) % 7 // lundi = 0
    const debutGrille = new Date(premierJourMois)
    debutGrille.setDate(premierJourMois.getDate() - decalage)

    const jours = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(debutGrille)
        d.setDate(debutGrille.getDate() + i)
        return d
    })

    const comptageParJour = (d: Date) => {
        const iso = d.toISOString().slice(0, 10)
        return evenements.filter(e => e.start_time.slice(0, 10) === iso).length
    }

    const aujourdhuiISO = new Date().toISOString().slice(0, 10)

    return (
        <div className="ht-card overflow-hidden">
            <div className="grid grid-cols-7">
                {JOURS_LABEL.map(j => (
                    <div key={j} className="text-center text-[10px] uppercase font-semibold py-2 border-b" style={{ color: 'var(--ht-text-muted)', borderColor: 'var(--ht-border)' }}>
                        {j}
                    </div>
                ))}
                {jours.map((jour, idx) => {
                    const iso = jour.toISOString().slice(0, 10)
                    const horsMois = jour.getMonth() !== mois
                    const nb = comptageParJour(jour)
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelectJour(jour)}
                            className="min-h-20 p-2 flex flex-col items-start gap-1 border-b border-r text-left"
                            style={{
                                borderColor: 'var(--ht-border)',
                                opacity: horsMois ? 0.4 : 1,
                            }}
                        >
                            <span
                                className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                                style={iso === aujourdhuiISO ? { backgroundColor: 'var(--ht-primary)', color: 'white' } : { color: 'var(--ht-text)' }}
                            >
                                {jour.getDate()}
                            </span>
                            {nb > 0 && (
                                <span className="badge badge-tint text-[10px]">
                                    {nb} RDV
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
