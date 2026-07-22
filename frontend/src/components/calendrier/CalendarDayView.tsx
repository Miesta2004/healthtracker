import { useEffect, useRef } from 'react'
import type { EvenementPlanning } from '../../types'
import EventBlock from './EventBlock'
import CurrentTimeLine from './CurrentTimeLine'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    memeJour, disposerEvenements, estAujourdhui, dateACreneauHoraire,
} from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    onSelectEvenement: (e: EvenementPlanning) => void
    onSelectCreneau: (date: Date) => void
}

export default function CalendarDayView({ ancre, evenements, onSelectEvenement, onSelectCreneau }: Props) {
    const heures = heuresGrille()
    const hauteurGrille = heures.length * PX_PAR_HEURE
    const evtsJour = evenements.filter(e => memeJour(new Date(e.start_time), ancre))
    const disposes = disposerEvenements(evtsJour)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: HEURE_SCROLL_INITIAL * PX_PAR_HEURE - 12 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ancre])

    return (
        <div className="ht-card overflow-hidden">
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 680 }}>
                <div className="grid" style={{ gridTemplateColumns: '64px 1fr' }}>
                    <div>
                        {heures.map(h => (
                            <div key={h} style={{ height: PX_PAR_HEURE }} className="relative">
                                <span className="absolute -top-2 right-2 text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="relative border-l" style={{ borderColor: 'var(--ht-border)', height: hauteurGrille }}>
                        {heures.map(h => (
                            <div key={h} style={{ height: PX_PAR_HEURE }}>
                                <div
                                    onClick={() => onSelectCreneau(dateACreneauHoraire(ancre, h, 0))}
                                    className="border-b border-dashed cursor-pointer transition-colors hover:bg-[var(--ht-bg)]"
                                    style={{ height: PX_PAR_DEMI_HEURE, borderColor: 'var(--ht-border)' }}
                                />
                                <div
                                    onClick={() => onSelectCreneau(dateACreneauHoraire(ancre, h, 30))}
                                    className="border-b cursor-pointer transition-colors hover:bg-[var(--ht-bg)]"
                                    style={{ height: PX_PAR_DEMI_HEURE, borderColor: 'var(--ht-border)' }}
                                />
                            </div>
                        ))}
                        {disposes.map(({ evenement, colonnes, indexColonne }) => (
                            <EventBlock
                                key={evenement.id}
                                evenement={evenement}
                                colonnes={colonnes}
                                indexColonne={indexColonne}
                                onClick={() => onSelectEvenement(evenement)}
                            />
                        ))}
                        {estAujourdhui(ancre) && <CurrentTimeLine />}
                    </div>
                </div>
            </div>
        </div>
    )
}
