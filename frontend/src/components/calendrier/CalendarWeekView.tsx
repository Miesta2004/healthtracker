import { useEffect, useRef } from 'react'
import type { EvenementPlanning } from '../../types'
import EventBlock from './EventBlock'
import CurrentTimeLine from './CurrentTimeLine'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    joursDeSemaine, estAujourdhui, memeJour, disposerEvenements, dateACreneauHoraire,
} from './calendrierConfig'

interface Props {
    ancre: Date
    evenements: EvenementPlanning[]
    onSelectEvenement: (e: EvenementPlanning) => void
    onSelectCreneau: (date: Date) => void
    onSelectJour: (date: Date) => void
}

export default function CalendarWeekView({ ancre, evenements, onSelectEvenement, onSelectCreneau, onSelectJour }: Props) {
    const jours = joursDeSemaine(ancre)
    const heures = heuresGrille()
    const hauteurGrille = heures.length * PX_PAR_HEURE
    const scrollRef = useRef<HTMLDivElement>(null)

    // Ouvre la grille sur les heures ouvrées plutôt que de partir de minuit —
    // la grille couvre bien 00:00–24:00 mais on ne veut pas forcer à scroller
    // à chaque fois pour voir la journée de travail.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: HEURE_SCROLL_INITIAL * PX_PAR_HEURE - 12 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="ht-card overflow-hidden">
            {/* En-tête : jours de la semaine */}
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
                <div className="border-b" style={{ borderColor: 'var(--ht-border)' }} />
                {jours.map(jour => (
                    <button
                        key={jour.toISOString()}
                        onClick={() => onSelectJour(jour)}
                        className="flex flex-col items-center py-2 border-b border-l transition-colors hover:bg-[var(--ht-bg)]"
                        style={{ borderColor: 'var(--ht-border)' }}
                    >
                        <span className="text-[11px] uppercase font-medium" style={{ color: 'var(--ht-text-muted)' }}>
                            {jour.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </span>
                        <span
                            className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                            style={{
                                backgroundColor: estAujourdhui(jour) ? 'var(--ht-primary)' : 'transparent',
                                color: estAujourdhui(jour) ? 'var(--ht-primary-contrast)' : 'var(--ht-text)',
                            }}
                        >
                            {jour.getDate()}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grille horaire */}
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 640 }}>
                <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
                    <div>
                        {heures.map(h => (
                            <div key={h} style={{ height: PX_PAR_HEURE }} className="relative">
                                <span className="absolute -top-2 right-2 text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {jours.map(jour => {
                        const evtsJour = evenements.filter(e => memeJour(new Date(e.start_time), jour))
                        const disposes = disposerEvenements(evtsJour)
                        return (
                            <div
                                key={jour.toISOString()}
                                className="relative border-l"
                                style={{ borderColor: 'var(--ht-border)', height: hauteurGrille }}
                            >
                                {heures.map(h => (
                                    <div key={h} style={{ height: PX_PAR_HEURE }}>
                                        <div
                                            onClick={() => onSelectCreneau(dateACreneauHoraire(jour, h, 0))}
                                            className="border-b border-dashed cursor-pointer transition-colors hover:bg-[var(--ht-bg)]"
                                            style={{ height: PX_PAR_DEMI_HEURE, borderColor: 'var(--ht-border)' }}
                                        />
                                        <div
                                            onClick={() => onSelectCreneau(dateACreneauHoraire(jour, h, 30))}
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
                                {estAujourdhui(jour) && <CurrentTimeLine />}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
