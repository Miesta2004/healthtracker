import { AlertTriangle } from 'lucide-react'
import type { PlanningBlock } from './usePlanning'
import { estAujourdhui, estMemeJour } from '../../utils/planningUtils.ts'

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function ajouterJours(d: Date, n: number): Date {
    const copie = new Date(d)
    copie.setDate(copie.getDate() + n)
    return copie
}

function lundiDeLaSemaine(d: Date): Date {
    const copie = new Date(d)
    const jour = copie.getDay()
    const decalage = jour === 0 ? -6 : 1 - jour
    copie.setDate(copie.getDate() + decalage)
    copie.setHours(0, 0, 0, 0)
    return copie
}

export default function PlanningMonthView({
                                              mois, blocs, onSelectJour,
                                          }: {
    mois: Date
    blocs: PlanningBlock[]
    onSelectJour: (jour: Date) => void
}) {
    const premierJourMois = new Date(mois.getFullYear(), mois.getMonth(), 1)
    const dernierJourMois = new Date(mois.getFullYear(), mois.getMonth() + 1, 0)
    const debutGrille = lundiDeLaSemaine(premierJourMois)

    const nbSemaines = Math.ceil(
        (Math.round((dernierJourMois.getTime() - debutGrille.getTime()) / 86400000) + 1) / 7
    )
    const jours = Array.from({ length: nbSemaines * 7 }, (_, i) => ajouterJours(debutGrille, i))

    return (
        <div>
            <div className="grid grid-cols-7 mb-1">
                {JOURS_SEMAINE.map(j => (
                    <div key={j} className="text-center text-[11px] font-semibold uppercase tracking-wider py-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                        {j}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {jours.map(jour => {
                    const horsMois = jour.getMonth() !== mois.getMonth()
                    const blocsDuJour = blocs.filter(b => estMemeJour(b.start, jour))
                    const nbCritiques = blocsDuJour.filter(b => b.aAlerteCritique).length

                    return (
                        <button
                            key={jour.toISOString()}
                            onClick={() => onSelectJour(jour)}
                            className="aspect-square rounded-lg p-1.5 flex flex-col items-start gap-1 text-left transition-colors hover:bg-[var(--ht-bg)]"
                            style={{
                                border: estAujourdhui(jour) ? '1.5px solid var(--ht-primary-tint)' : '1px solid var(--ht-border)',
                                opacity: horsMois ? 0.4 : 1,
                                backgroundColor: 'var(--ht-card-bg)',
                            }}
                        >
                            <span
                                className="text-xs font-semibold"
                                style={{ color: estAujourdhui(jour) ? 'var(--ht-primary-tint-text)' : 'var(--ht-text)' }}
                            >
                                {jour.getDate()}
                            </span>
                            {blocsDuJour.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' }}
                                    >
                                        {blocsDuJour.length}
                                    </span>
                                    {nbCritiques > 0 && (
                                        <AlertTriangle size={11} style={{ color: 'var(--ht-danger)' }} />
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}