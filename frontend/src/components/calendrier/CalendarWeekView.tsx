import { useEffect, useRef } from 'react'
import type { EvenementPlanning, GardeOccurrence } from '../../types'
import EventBlock from './EventBlock'
import GardeStrip from './GardeStrip'
import CurrentTimeLine from './CurrentTimeLine'
import CalendarSlotCell from './CalendarSlotCell'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    joursDeSemaine, memeJour, disposerEvenements, estAujourdhui, dateACreneauHoraire,
} from './calendrierConfig'

interface Props {
    ancre?: Date
    evenements: EvenementPlanning[]
    gardes?: GardeOccurrence[]
    onSelectEvenement?: (e: EvenementPlanning) => void
    onSelectGarde?: (g: GardeOccurrence) => void
    onSelectCreneau?: (d: Date) => void
    onSelectJour?: (d: Date) => void
    /** Fonction par événement plutôt qu'un booléen global — un événement
     * administratif peut être verrouillé même si l'utilisateur peut par
     * ailleurs déplacer des RDV médicaux (et inversement). Si absente,
     * rien n'est déplaçable. */
    peutDeplacer?: (e: EvenementPlanning) => boolean
    onDeplacerEvenement?: (id: number, nouvelleDate: Date) => void
    onRedimensionnerEvenement?: (id: number, dureeMinutes: number) => void
}

export default function CalendarWeekView({
                                             ancre = new Date(), evenements, gardes = [], onSelectEvenement, onSelectGarde, onSelectCreneau, onSelectJour,
                                             peutDeplacer, onDeplacerEvenement, onRedimensionnerEvenement,
                                         }: Props) {
    const jours = joursDeSemaine(ancre)
    const heures = heuresGrille()
    const hauteurGrille = heures.length * PX_PAR_HEURE
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: HEURE_SCROLL_INITIAL * PX_PAR_HEURE - 12 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ancre])

    return (
        <div className="ht-card overflow-hidden">
            {/* En-têtes des jours — le jour courant est mis en évidence par un
                fond plein sur son numéro, comme sur la maquette. */}
            <div className="grid border-b" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', borderColor: 'var(--ht-border)' }}>
                <div />
                {jours.map(jour => {
                    const aujourdhui = estAujourdhui(jour)
                    return (
                        <button
                            key={jour.toISOString()}
                            onClick={() => onSelectJour?.(jour)}
                            className="py-3 text-center border-l transition-colors hover:bg-[var(--ht-bg)]"
                            style={{ borderColor: 'var(--ht-border)' }}
                        >
                            <div
                                className="text-[11px] font-medium uppercase tracking-wide"
                                style={{ color: aujourdhui ? 'var(--ht-primary)' : 'var(--ht-text-muted)' }}
                            >
                                {jour.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                            </div>
                            <div
                                className="mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                                style={{
                                    backgroundColor: aujourdhui ? 'var(--ht-primary)' : 'transparent',
                                    color: aujourdhui ? 'var(--ht-primary-contrast)' : 'var(--ht-text)',
                                }}
                            >
                                {jour.getDate()}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Grille horaire — même logique que CalendarDayView.tsx, tuilée
                sur 7 colonnes : créneaux cliquables/dépôt drag&drop par
                demi-heure, blocs événements positionnés par horaire réel,
                bandes de garde, ligne "heure actuelle" limitée à la colonne
                du jour courant. */}
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 450 }}>
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
                        const evtsJour = evenements.filter(e => memeJour(new Date(e.start_time), jour) && e.statut !== 'annule')
                        const disposes = disposerEvenements(evtsJour)
                        const gardesJour = gardes.filter(g => memeJour(new Date(g.start_time), jour))

                        return (
                            <div
                                key={jour.toISOString()}
                                className="relative border-l"
                                style={{ borderColor: 'var(--ht-border)', height: hauteurGrille }}
                            >
                                {heures.map(h => (
                                    <div key={h} style={{ height: PX_PAR_HEURE }}>
                                        <CalendarSlotCell
                                            hauteur={PX_PAR_DEMI_HEURE}
                                            pointille
                                            onClick={() => onSelectCreneau?.(dateACreneauHoraire(jour, h, 0))}
                                            onDrop={(id) => onDeplacerEvenement?.(id, dateACreneauHoraire(jour, h, 0))}
                                        />
                                        <CalendarSlotCell
                                            hauteur={PX_PAR_DEMI_HEURE}
                                            onClick={() => onSelectCreneau?.(dateACreneauHoraire(jour, h, 30))}
                                            onDrop={(id) => onDeplacerEvenement?.(id, dateACreneauHoraire(jour, h, 30))}
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
                                        onClick={() => onSelectEvenement?.(evenement)}
                                        deplacable={peutDeplacer ? peutDeplacer(evenement) : false}
                                        onRedimensionner={(duree) => onRedimensionnerEvenement?.(evenement.id, duree)}
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