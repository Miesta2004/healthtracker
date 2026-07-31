import { useEffect, useRef } from 'react'
import type { EvenementPlanning, GardeOccurrence } from '../../types'
import EventBlock from './EventBlock'
import GardeStrip from './GardeStrip'
import CurrentTimeLine from './CurrentTimeLine'
import CalendarSlotCell from './CalendarSlotCell'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    memeJour, disposerEvenements, estAujourdhui, dateACreneauHoraire,
} from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    gardes?: GardeOccurrence[]
    onSelectEvenement: (e: EvenementPlanning) => void
    onSelectGarde?: (g: GardeOccurrence) => void
    onSelectCreneau: (date: Date) => void
    peutDeplacer?: (e: EvenementPlanning) => boolean
    onDeplacerEvenement?: (id: number, nouvelleDate: Date) => void
    onRedimensionnerEvenement?: (id: number, dureeMinutes: number) => void
}

export default function CalendarDayView({
                                            ancre, evenements, gardes = [], onSelectEvenement, onSelectGarde, onSelectCreneau,
                                            peutDeplacer, onDeplacerEvenement, onRedimensionnerEvenement,
                                        }: Props) {
    const heures = heuresGrille()
    const hauteurGrille = heures.length * PX_PAR_HEURE
    const evtsJour = evenements.filter(e => memeJour(new Date(e.start_time), ancre))
    const disposes = disposerEvenements(evtsJour)
    const gardesJour = gardes.filter(g => memeJour(new Date(g.start_time), ancre))
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: HEURE_SCROLL_INITIAL * PX_PAR_HEURE - 12 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ancre])

    return (
        <div className="ht-card overflow-hidden">
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 500 }}>
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
                                <CalendarSlotCell
                                    hauteur={PX_PAR_DEMI_HEURE}
                                    pointille
                                    onClick={() => onSelectCreneau(dateACreneauHoraire(ancre, h, 0))}
                                    onDrop={(id) => onDeplacerEvenement?.(id, dateACreneauHoraire(ancre, h, 0))}
                                />
                                <CalendarSlotCell
                                    hauteur={PX_PAR_DEMI_HEURE}
                                    onClick={() => onSelectCreneau(dateACreneauHoraire(ancre, h, 30))}
                                    onDrop={(id) => onDeplacerEvenement?.(id, dateACreneauHoraire(ancre, h, 30))}
                                />
                            </div>
                        ))}
                        {gardesJour.map((g, i) => (
                            <GardeStrip key={g.id} garde={g} decalage={i * 5} onClick={() => onSelectGarde?.(g)} />
                        ))}
                        {disposes.map(({ evenement, colonnes, indexColonne }) => (
                            <EventBlock
                                key={evenement.id}
                                evenement={evenement}
                                colonnes={colonnes}
                                indexColonne={indexColonne}
                                onClick={() => onSelectEvenement(evenement)}
                                deplacable={peutDeplacer ? peutDeplacer(evenement) : false}
                                onRedimensionner={(duree) => onRedimensionnerEvenement?.(evenement.id, duree)}
                            />
                        ))}
                        {estAujourdhui(ancre) && <CurrentTimeLine />}
                    </div>
                </div>
            </div>
        </div>
    )
}
