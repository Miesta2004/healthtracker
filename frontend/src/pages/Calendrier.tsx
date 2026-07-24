import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import RappelsPanel from '../components/RappelsPanel.tsx'
import { useAuth } from '../contexts/AuthContext'
import { usePlanning, useCreerEvenement, useModifierEvenement, useSupprimerEvenement } from '../hooks/useCalendrier'
import CalendarHeader, { type VueCalendrier } from '../components/calendrier/CalendarHeader'
import CalendarStats from '../components/calendrier/CalendarStats'
import CalendarWeekView from '../components/calendrier/CalendarWeekView'
import CalendarDayView from '../components/calendrier/CalendarDayView'
import CalendarMonthView from '../components/calendrier/CalendarMonthView'
import CalendarAgendaView from '../components/calendrier/CalendarAgendaView'
import CalendarBlocOperatoireView from '../components/calendrier/CalendarBlocOperatoireView'
import OperationDetailsPanel from '../components/calendrier/OperationDetailsPanel'
import EventFormDialog, { type EventFormInitial } from '../components/calendrier/EventFormDialog'
import EventDetailsPanel from '../components/calendrier/EventDetailsPanel'
import { useSallesBloc, useOperationsPlanning, useModifierOperation, useDemarrerOperation, useCloturerOperation } from '../hooks/useBlocOperatoire'
import {
    TYPE_EVENEMENT_CONFIG, joursDeSemaine, joursGrilleMois, toISODate, AGENDA_JOURS_A_VENIR,
    extraireMessageErreur,
} from '../components/calendrier/calendrierConfig'
import type { EvenementPlanning, TypeEvenementRdv, Operation } from '../types'

export default function CalendrierPage() {
    const { user } = useAuth()

    const [vue, setVue] = useState<VueCalendrier>('semaine')
    const [ancre, setAncre] = useState(new Date())
    const [typesActifs, setTypesActifs] = useState<Set<TypeEvenementRdv>>(
        () => new Set(Object.keys(TYPE_EVENEMENT_CONFIG) as TypeEvenementRdv[])
    )

    const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementPlanning | null>(null)
    const [operationSelectionnee, setOperationSelectionnee] = useState<Operation | null>(null)
    const [formulaire, setFormulaire] = useState<EventFormInitial | null>(null)
    const [erreurFormulaire, setErreurFormulaire] = useState('')
    const [erreurAction, setErreurAction] = useState('')

    const { debut, fin } = useMemo(() => {
        if (vue === 'jour') return { debut: ancre, fin: ancre }
        if (vue === 'mois') {
            const jours = joursGrilleMois(ancre)
            return { debut: jours[0], fin: jours[jours.length - 1] }
        }
        if (vue === 'agenda') {
            const aujourdhui = new Date()
            const finAgenda = new Date(aujourdhui)
            finAgenda.setDate(finAgenda.getDate() + AGENDA_JOURS_A_VENIR)
            return { debut: aujourdhui, fin: finAgenda }
        }
        const jours = joursDeSemaine(ancre)
        return { debut: jours[0], fin: jours[6] }
    }, [ancre, vue])

    const { data, isLoading, isError } = usePlanning(toISODate(debut), toISODate(fin))
    const creer = useCreerEvenement()
    const modifier = useModifierEvenement()
    const supprimer = useSupprimerEvenement()

    const enBloc = vue === 'bloc'
    const { data: salles, isLoading: sallesEnChargement } = useSallesBloc(user?.service ?? undefined, enBloc)
    const { data: planningBloc, isLoading: blocEnChargement } = useOperationsPlanning(toISODate(ancre), toISODate(ancre), enBloc)
    const modifierOperation = useModifierOperation()
    const demarrer = useDemarrerOperation()
    const cloturer = useCloturerOperation()
    const [erreurOperation, setErreurOperation] = useState('')

    const evenements = useMemo(
        () => (data?.evenements ?? []).filter(e => typesActifs.has(e.type_evenement)),
        [data, typesActifs]
    )

    const toggleType = (t: TypeEvenementRdv) => {
        setTypesActifs(prev => {
            const next = new Set(prev)
            if (next.has(t)) next.delete(t); else next.add(t)
            return next
        })
    }

    const naviguer = (delta: number) => {
        setAncre(prev => {
            if (vue === 'mois') {
                return new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
            }
            const next = new Date(prev)
            next.setDate(next.getDate() + ((vue === 'jour' || vue === 'bloc') ? delta : delta * 7))
            return next
        })
    }

    const ouvrirCreation = (date: Date) => {
        setErreurFormulaire('')
        setFormulaire({
            date: toISODate(date),
            heure: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
        })
    }

    const ouvrirEdition = (e: EvenementPlanning) => {
        const debutEvt = new Date(e.start_time)
        const finEvt = new Date(e.end_time)
        setErreurFormulaire('')
        setEvenementSelectionne(null)
        setFormulaire({
            id: e.id,
            patientId: e.patient.id,
            patientLabel: e.patient.nom_complet,
            medecinId: e.medecin_id,
            medecinLabel: e.medecin_nom ? `Dr. ${e.medecin_prenom} ${e.medecin_nom}` : undefined,
            date: toISODate(debutEvt),
            heure: debutEvt.toTimeString().slice(0, 5),
            duree_minutes: Math.round((finEvt.getTime() - debutEvt.getTime()) / 60000),
            type_evenement: e.type_evenement,
            motif: e.motif,
            notes: e.notes,
            statut: e.statut,
        })
    }

    const soumettreFormulaire = (data: Record<string, unknown>) => {
        setErreurFormulaire('')
        const options = {
            onError: (err: unknown) => setErreurFormulaire(extraireMessageErreur(err)),
            onSuccess: () => {
                setFormulaire(null)
            },
        }
        if (formulaire?.id) {
            modifier.mutate({ id: formulaire.id, data }, options)
        } else {
            creer.mutate(data, options)
        }
    }

    const annulerEvenement = (e: EvenementPlanning) => {
        modifier.mutate({ id: e.id, data: { statut: 'annule' } }, {
            onSuccess: () => setEvenementSelectionne(null),
        })
    }

    const signalerErreurAction = (err: unknown) => {
        setErreurAction(extraireMessageErreur(err))
        window.setTimeout(() => setErreurAction(''), 6000)
    }

    const deplacerEvenement = (id: number, nouvelleDate: Date) => {
        setErreurAction('')
        modifier.mutate({ id, data: { date_heure: nouvelleDate.toISOString() } }, {
            onError: signalerErreurAction,
        })
    }

    const redimensionnerEvenement = (id: number, dureeMinutes: number) => {
        setErreurAction('')
        modifier.mutate({ id, data: { duree_minutes: dureeMinutes } }, {
            onError: signalerErreurAction,
        })
    }

    const deplacerOperation = (id: number, salleId: number, nouvelleDate: Date) => {
        const intervention = planningBloc?.operations.find(o => o.id === id)
        if (!intervention) return
        const dureeMs = new Date(intervention.heure_fin).getTime() - new Date(intervention.heure_debut).getTime()
        const nouvelleFin = new Date(nouvelleDate.getTime() + dureeMs)

        setErreurAction('')
        modifierOperation.mutate(
            { id, data: { salle: salleId, heure_debut: nouvelleDate.toISOString(), heure_fin: nouvelleFin.toISOString() } },
            { onError: signalerErreurAction }
        )
    }

    const redimensionnerOperation = (id: number, dureeMinutes: number) => {
        const intervention = planningBloc?.operations.find(o => o.id === id)
        if (!intervention) return
        const nouvelleFin = new Date(new Date(intervention.heure_debut).getTime() + dureeMinutes * 60_000)

        setErreurAction('')
        modifierOperation.mutate({ id, data: { heure_fin: nouvelleFin.toISOString() } }, {
            onError: signalerErreurAction,
        })
    }

    const demarrerIntervention = () => {
        if (!operationSelectionnee) return
        setErreurOperation('')
        demarrer.mutate(operationSelectionnee.id, {
            onSuccess: (mise_a_jour) => setOperationSelectionnee(mise_a_jour),
            onError: (err) => setErreurOperation(extraireMessageErreur(err)),
        })
    }

    const cloturerIntervention = (data: { resultat: 'terminee' | 'deces_au_bloc'; compte_rendu_operatoire: string; complications?: string }) => {
        if (!operationSelectionnee) return
        setErreurOperation('')
        cloturer.mutate({ id: operationSelectionnee.id, data }, {
            onSuccess: () => setOperationSelectionnee(null),
            onError: (err) => setErreurOperation(extraireMessageErreur(err)),
        })
    }

    const supprimerEvenement = () => {
        if (!formulaire?.id) return
        if (!window.confirm('Supprimer définitivement cet événement ?')) return
        supprimer.mutate(formulaire.id, {
            onSuccess: () => setFormulaire(null),
            onError: () => setErreurFormulaire("Suppression impossible (droits insuffisants)."),
        })
    }

    const peutModifier = user?.role !== 'laborantin'

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-7xl mx-auto">
                {/* ===== SECTION 1 : KPI ===== */}
                <section className="mb-8">
                    {!enBloc && <CalendarStats evenements={evenements} />}
                </section>

                {/* ===== SECTION 2 : RAPPELS ===== */}
                <section className="mb-10">
                    <RappelsPanel />
                </section>

                {/* ===== SECTION 3 : CALENDRIER ===== */}
                <section className="mb-6">
                    <PageHeader
                        title="Calendrier"
                        subtitle="Vue d'ensemble des consultations, interventions et gardes"
                        icon={CalendarClock}
                    />

                    {/* Filtres */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {(Object.keys(TYPE_EVENEMENT_CONFIG) as TypeEvenementRdv[]).map(t => {
                            const cfg = TYPE_EVENEMENT_CONFIG[t]
                            const actif = typesActifs.has(t)
                            return (
                                <button
                                    key={t}
                                    onClick={() => toggleType(t)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                                    style={{
                                        borderColor: actif ? cfg.text : 'var(--ht-border-input)',
                                        backgroundColor: actif ? cfg.bg : 'transparent',
                                        color: actif ? cfg.text : 'var(--ht-text-muted)',
                                        opacity: actif ? 1 : 0.6,
                                    }}
                                >
                                    <cfg.Icon size={12} /> {cfg.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* En-tête navigation */}
                    <div className="mt-4">
                        <CalendarHeader
                            ancre={ancre}
                            vue={vue}
                            onVueChange={setVue}
                            onPrecedent={() => naviguer(-1)}
                            onSuivant={() => naviguer(1)}
                            onAujourdhui={() => setAncre(new Date())}
                            onNouvelEvenement={() => ouvrirCreation(new Date())}
                        />
                    </div>

                    {/* Messages d'erreur */}
                    {isError && !enBloc && (
                        <div className="text-sm px-4 py-3 rounded-xl mt-4" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                            Impossible de charger le planning. Réessayez dans un instant.
                        </div>
                    )}

                    {erreurAction && (
                        <div className="text-sm px-4 py-3 rounded-xl mt-4 flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                            <span>{erreurAction}</span>
                            <button onClick={() => setErreurAction('')} className="text-xs underline flex-shrink-0">Fermer</button>
                        </div>
                    )}

                    {/* Vue calendrier */}
                    <div className="mt-6">
                        {enBloc ? (
                            (sallesEnChargement || blocEnChargement) && !planningBloc ? (
                                <div className="ht-card flex items-center justify-center py-24" style={{ color: 'var(--ht-text-muted)' }}>
                                    Chargement du bloc opératoire…
                                </div>
                            ) : (
                                <CalendarBlocOperatoireView
                                    ancre={ancre}
                                    salles={salles ?? []}
                                    operations={planningBloc?.operations ?? []}
                                    onSelectOperation={setOperationSelectionnee}
                                    onDeplacerOperation={deplacerOperation}
                                    onRedimensionnerOperation={redimensionnerOperation}
                                />
                            )
                        ) : isLoading && !data ? (
                            <div className="ht-card flex items-center justify-center py-24" style={{ color: 'var(--ht-text-muted)' }}>
                                Chargement du planning…
                            </div>
                        ) : vue === 'semaine' ? (
                            <CalendarWeekView
                                ancre={ancre}
                                evenements={evenements}
                                onSelectEvenement={setEvenementSelectionne}
                                onSelectCreneau={ouvrirCreation}
                                onSelectJour={(d) => { setAncre(d); setVue('jour') }}
                                deplacable={peutModifier}
                                onDeplacerEvenement={deplacerEvenement}
                                onRedimensionnerEvenement={redimensionnerEvenement}
                            />
                        ) : vue === 'mois' ? (
                            <CalendarMonthView
                                ancre={ancre}
                                evenements={evenements}
                                onSelectJour={(d) => { setAncre(d); setVue('jour') }}
                            />
                        ) : vue === 'agenda' ? (
                            <CalendarAgendaView
                                evenements={evenements}
                                onSelectEvenement={setEvenementSelectionne}
                            />
                        ) : (
                            <CalendarDayView
                                ancre={ancre}
                                evenements={evenements}
                                onSelectEvenement={setEvenementSelectionne}
                                onSelectCreneau={ouvrirCreation}
                                deplacable={peutModifier}
                                onDeplacerEvenement={deplacerEvenement}
                                onRedimensionnerEvenement={redimensionnerEvenement}
                            />
                        )}
                    </div>
                </section>
            </main>

            {/* ===== PANNEAUX MODAUX ===== */}
            {evenementSelectionne && (
                <EventDetailsPanel
                    evenement={evenementSelectionne}
                    medecinLabel={evenementSelectionne.medecin_nom ? `Dr. ${evenementSelectionne.medecin_prenom} ${evenementSelectionne.medecin_nom}` : null}
                    onClose={() => setEvenementSelectionne(null)}
                    onModifier={() => ouvrirEdition(evenementSelectionne)}
                    onAnnuler={() => annulerEvenement(evenementSelectionne)}
                    peutModifier={peutModifier}
                />
            )}

            {operationSelectionnee && (
                <OperationDetailsPanel
                    operation={operationSelectionnee}
                    onClose={() => { setOperationSelectionnee(null); setErreurOperation('') }}
                    onDemarrer={demarrerIntervention}
                    onCloturer={cloturerIntervention}
                    enCours={demarrer.isPending || cloturer.isPending}
                    erreur={erreurOperation}
                />
            )}

            {formulaire && (
                <EventFormDialog
                    initial={formulaire}
                    onClose={() => setFormulaire(null)}
                    onSubmit={soumettreFormulaire}
                    onDelete={formulaire.id ? supprimerEvenement : undefined}
                    submitting={creer.isPending || modifier.isPending}
                    erreur={erreurFormulaire}
                />
            )}
        </div>
    )
}