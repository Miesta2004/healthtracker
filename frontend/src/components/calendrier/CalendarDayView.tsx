import { useEffect, useRef } from 'react'
import type { EvenementPlanning, GardeOccurrence } from '../../types'
import EventBlock from './EventBlock'
import GardeStrip from './GardeStrip'
import CurrentTimeLine from './CurrentTimeLine'
import CalendarSlotCell from './CalendarSlotCell'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    disposerEvenements, segmenterParJour, estAujourdhui, dateACreneauHoraire,
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
    const evtsActifs = evenements.filter(e => e.statut !== 'annule')
    const segmentsJour = segmenterParJour(evtsActifs, ancre, e => e.start_time, e => e.end_time)
    const disposes = disposerEvenements(
        segmentsJour,
        s => s.debutSegment.toISOString(),
        s => s.finSegment.toISOString(),
    )
    const gardesSegments = segmenterParJour(gardes, ancre, g => g.start_time, g => g.end_time)
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
                        {gardesSegments.map((s, i) => (
                            <GardeStrip
                                key={s.item.id}
                                garde={s.item}
                                decalage={i * 5}
                                onClick={() => onSelectGarde?.(s.item)}
                                debutAffiche={s.debutSegment}
                                finAffiche={s.finSegment}
                            />
                        ))}
                        {disposes.map(({ evenement: segment, colonnes, indexColonne }) => (
                            <EventBlock
                                key={`${segment.item.id}-${segment.debutSegment.toISOString()}`}
                                evenement={segment.item}
                                colonnes={colonnes}
                                indexColonne={indexColonne}
                                onClick={() => onSelectEvenement(segment.item)}
                                deplacable={peutDeplacer ? peutDeplacer(segment.item) : false}
                                onRedimensionner={(duree) => onRedimensionnerEvenement?.(segment.item.id, duree)}
                                debutAffiche={segment.debutSegment}
                                finAffiche={segment.finSegment}
                                continueAvant={segment.continueAvant}
                                continueApres={segment.continueApres}
                            />
                        ))}
                        {estAujourdhui(ancre) && <CurrentTimeLine />}
                    </div>
                </div>
            </div>
        </div>
    )
}
