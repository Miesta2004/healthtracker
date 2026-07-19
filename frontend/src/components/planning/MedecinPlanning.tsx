import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePlanning, type PlanningBlock } from './usePlanning'
import PlanningToolbar from './PlanningToolbar'
import PlanningWeekView from './PlanningWeekView'
import PlanningDayView from './PlanningDayView'
import PlanningMonthView from './PlanningMonthView'
import PlanningEventBlock from './PlanningEventBlock'
import PlanningEventPreviewModal from './PlanningEventPreviewModal'
import { formatHeure, formatJourLong } from '../../utils/planningUtils.ts'
import type { StatutRendezVous } from '../../types'

function lundiDeLaSemaine(d: Date): Date {
    const copie = new Date(d)
    const jour = copie.getDay()
    const decalage = jour === 0 ? -6 : 1 - jour
    copie.setDate(copie.getDate() + decalage)
    copie.setHours(0, 0, 0, 0)
    return copie
}

/** Popover listant les événements masqués derrière un badge "+N" (§3.2). */
function DebordementPopover({ jour, blocs, onClose, onSelect }: {
    jour: Date
    blocs: PlanningBlock[]
    onClose: () => void
    onSelect: (bloc: PlanningBlock) => void
}) {
    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                    <h3 className="ht-modal-title capitalize">{formatJourLong(jour)}</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={16} />
                    </button>
                </div>
                <div className="mt-3 space-y-2">
                    {blocs
                        .sort((a, b) => a.start.getTime() - b.start.getTime())
                        .map(bloc => (
                            <button
                                key={`${bloc.kind}-${bloc.id}`}
                                onClick={() => { onSelect(bloc); onClose() }}
                                className="w-full text-left px-3 py-2 rounded-lg border flex items-center gap-3 transition-colors hover:bg-[var(--ht-bg)]"
                                style={{ borderColor: 'var(--ht-border)' }}
                            >
                                <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                    {formatHeure(bloc.start)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ht-text)' }}>{bloc.patientNom}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--ht-text-muted)' }}>{bloc.motif}</p>
                                </div>
                            </button>
                        ))}
                </div>
            </div>
        </div>
    )
}

export default function MedecinPlanning() {
    const navigate = useNavigate()
    const {
        vue, setVue, ancre, debut, fin, blocs, indisponibilites,
        loading, error, alerteNouveaute,
        goAujourdhui, goPrecedent, goSuivant, goToJour, changerStatut, recharger,
    } = usePlanning()

    const [previewBloc, setPreviewBloc] = useState<PlanningBlock | null>(null)
    const [debordement, setDebordement] = useState<{ jour: Date; blocs: PlanningBlock[] } | null>(null)

    const handleChangerStatut = (id: number, statut: StatutRendezVous) => {
        changerStatut(id, statut).catch(() => {
            // L'erreur est déjà gérée par un rechargement dans le hook ;
            // ici on pourrait ajouter un toast si le système en propose un.
        })
    }

    const handleDemarrerConsultation = (bloc: PlanningBlock) => {
        setPreviewBloc(null)
        if (bloc.consultationId) {
            navigate(`/patients/${bloc.patientId}/consultations/${bloc.consultationId}`)
        } else {
            navigate(`/patients/${bloc.patientId}/consultations/new`, {
                state: { motif: bloc.motif, rendezVousId: bloc.id },
            })
        }
    }

    // Renvoie vers la page de gestion complète des rendez-vous, en lui
    // passant l'id du RDV via location.state pour qu'elle ouvre directement
    // sa modale d'édition (cf. RendezVousPage.tsx) plutôt que de laisser
    // l'utilisateur le rechercher dans la liste.
    const handleModifierHoraire = (bloc: PlanningBlock) => {
        if (bloc.kind !== 'rdv') return
        navigate('/rendez_vous', { state: { rdvId: bloc.id } })
    }

    const jourAffiche = vue === 'jour' ? ancre : undefined
    const lundiAffiche = vue === 'semaine' ? lundiDeLaSemaine(ancre) : undefined

    return (
        <div className="ht-card ht-card-padded-sm space-y-4">
            <PlanningToolbar
                vue={vue}
                setVue={setVue}
                debut={debut}
                fin={fin}
                alerteNouveaute={alerteNouveaute}
                onAujourdhui={goAujourdhui}
                onPrecedent={goPrecedent}
                onSuivant={goSuivant}
                onNouveau={() => navigate('/rendez_vous')}
            />

            {error && (
                <div className="ht-alert ht-alert-danger flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={recharger} className="text-xs font-semibold underline flex-shrink-0">Réessayer</button>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                    Chargement du planning…
                </div>
            ) : (
                <>
                    {vue === 'jour' && jourAffiche && (
                        <PlanningDayView
                            jour={jourAffiche}
                            blocs={blocs}
                            indisponibilites={indisponibilites}
                            onOpenPreview={setPreviewBloc}
                            onChangerStatut={handleChangerStatut}
                            onModifierHoraire={handleModifierHoraire}
                            onVoirDebordement={(blocsCaches, jour) => setDebordement({ jour, blocs: blocsCaches })}
                        />
                    )}
                    {vue === 'semaine' && lundiAffiche && (
                        <PlanningWeekView
                            lundi={lundiAffiche}
                            blocs={blocs}
                            indisponibilites={indisponibilites}
                            onOpenPreview={setPreviewBloc}
                            onChangerStatut={handleChangerStatut}
                            onModifierHoraire={handleModifierHoraire}
                            onVoirDebordement={(blocsCaches, jour) => setDebordement({ jour, blocs: blocsCaches })}
                        />
                    )}
                    {vue === 'mois' && (
                        <PlanningMonthView
                            mois={ancre}
                            blocs={blocs}
                            onSelectJour={goToJour}
                        />
                    )}

                    {!loading && blocs.length === 0 && vue !== 'mois' && (
                        <div className="ht-empty">Aucun rendez-vous sur cette période</div>
                    )}
                </>
            )}

            {previewBloc && (
                <PlanningEventPreviewModal
                    bloc={previewBloc}
                    onClose={() => setPreviewBloc(null)}
                    onChangerStatut={handleChangerStatut}
                    onDemarrerConsultation={handleDemarrerConsultation}
                />
            )}

            {debordement && (
                <DebordementPopover
                    jour={debordement.jour}
                    blocs={debordement.blocs}
                    onClose={() => setDebordement(null)}
                    onSelect={setPreviewBloc}
                />
            )}
        </div>
    )
}

// Ré-export pour un usage direct dans PlanningEventBlock si besoin ailleurs
export { PlanningEventBlock }