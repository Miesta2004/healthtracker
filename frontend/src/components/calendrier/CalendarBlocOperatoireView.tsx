import { useEffect, useRef } from 'react'
import type { Operation, SalleBloc } from '../../types'
import OperationBlock from './OperationBlock'
import CurrentTimeLine from './CurrentTimeLine'
import CalendarSlotCell from './CalendarSlotCell'
import {
    heuresGrille, PX_PAR_HEURE, PX_PAR_DEMI_HEURE, HEURE_SCROLL_INITIAL,
    estAujourdhui, dateACreneauHoraire, disposerEvenements,
} from './calendrierConfig'

interface Props {
    ancre: Date
    salles: SalleBloc[]
    operations: Operation[]
    onSelectOperation: (o: Operation) => void
    onDeplacerOperation?: (id: number, salleId: number, nouvelleDate: Date) => void
    onRedimensionnerOperation?: (id: number, dureeMinutes: number) => void
}

export default function CalendarBlocOperatoireView({
                                                       ancre, salles, operations, onSelectOperation, onDeplacerOperation, onRedimensionnerOperation,
                                                   }: Props) {
    const heures = heuresGrille()
    const hauteurGrille = heures.length * PX_PAR_HEURE
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: HEURE_SCROLL_INITIAL * PX_PAR_HEURE - 12 })
    }, [ancre])

    if (salles.length === 0) {
        return (
            <div className="ht-card flex flex-col items-center justify-center gap-2 py-20" style={{ color: 'var(--ht-text-muted)' }}>
                <p className="text-sm">Aucune salle de bloc configurée pour votre service.</p>
            </div>
        )
    }

    return (
        <div className="ht-card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${salles.length}, 1fr)` }}>
                <div className="border-b" style={{ borderColor: 'var(--ht-border)' }} />
                {salles.map(salle => (
                    <div
                        key={salle.id}
                        className="flex flex-col items-center py-2 border-b border-l"
                        style={{ borderColor: 'var(--ht-border)' }}
                    >
                        <span className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{salle.nom}</span>
                    </div>
                ))}
            </div>

            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 640 }}>
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(${salles.length}, 1fr)` }}>
                    <div>
                        {heures.map(h => (
                            <div key={h} style={{ height: PX_PAR_HEURE }} className="relative">
                                <span className="absolute -top-2 right-2 text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {salles.map(salle => {
                        const opsSalle = operations.filter(o => o.salle === salle.id)
                        const disposes = disposerEvenements(opsSalle, o => o.heure_debut, o => o.heure_fin)
                        return (
                            <div
                                key={salle.id}
                                className="relative border-l"
                                style={{ borderColor: 'var(--ht-border)', height: hauteurGrille }}
                            >
                                {heures.map(h => (
                                    <div key={h} style={{ height: PX_PAR_HEURE }}>
                                        <CalendarSlotCell
                                            hauteur={PX_PAR_DEMI_HEURE}
                                            pointille
                                            onDrop={(id) => onDeplacerOperation?.(id, salle.id, dateACreneauHoraire(ancre, h, 0))}
                                        />
                                        <CalendarSlotCell
                                            hauteur={PX_PAR_DEMI_HEURE}
                                            onDrop={(id) => onDeplacerOperation?.(id, salle.id, dateACreneauHoraire(ancre, h, 30))}
                                        />
                                    </div>
                                ))}
                                {disposes.map(({ evenement: operation, colonnes, indexColonne }) => (
                                    <OperationBlock
                                        key={operation.id}
                                        operation={operation}
                                        colonnes={colonnes}
                                        indexColonne={indexColonne}
                                        onClick={() => onSelectOperation(operation)}
                                        onRedimensionner={(duree) => onRedimensionnerOperation?.(operation.id, duree)}
                                    />
                                ))}
                                {estAujourdhui(ancre) && <CurrentTimeLine />}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
