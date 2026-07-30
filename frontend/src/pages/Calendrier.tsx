import { useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar.tsx'
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
import MiniMonthCalendar from '../components/calendrier/MiniMonthCalendar'
import UpcomingEventsToday from '../components/calendrier/UpcomingEventsToday'
import OperationDetailsPanel from '../components/calendrier/OperationDetailsPanel'
import EventFormDialog, { type EventFormInitial } from '../components/calendrier/EventFormDialog'
import EventAdminFormDialog, { type EventAdminFormInitial } from '../components/calendrier/EventAdminFormDialog'
import EventDetailsPanel from '../components/calendrier/EventDetailsPanel'
import { useSallesBloc, useOperationsPlanning, useModifierOperation, useAnnulerOperation, useDemarrerOperation, useCloturerOperation } from '../hooks/useBlocOperatoire'
import { useGardesPlanning } from '../hooks/useGardesPlanning'
import { useRealtimeCalendrier } from '../hooks/useRealtimeCalendrier'
import GardeDetailsPanel from '../components/calendrier/GardeDetailsPanel'
import {
    TYPE_EVENEMENT_CONFIG, joursDeSemaine, joursGrilleMois, toISODate, AGENDA_JOURS_A_VENIR,
    extraireMessageErreur,
} from '../components/calendrier/calendrierConfig'
import type { EvenementPlanning, TypeEvenementRdv, Operation, GardeOccurrence } from '../types'

export default function CalendrierPage() {
    const { user, hasRole } = useAuth()
    useRealtimeCalendrier()
    // « Admin ou Chef de Service » — IsAdminRole côté backend correspond
    // exactement à hasRole('admin') côté frontend. Contrôle réel toujours
    // fait côté serveur ; ceci évite juste d'afficher un bouton qui
    // échouerait de toute façon.
    const peutGererEvenementsAdmin = hasRole('admin')

    const [vue, setVue] = useState<VueCalendrier>('semaine')
    const [ancre, setAncre] = useState(new Date())
    const [typesActifs, setTypesActifs] = useState<Set<TypeEvenementRdv>>(
        () => new Set(Object.keys(TYPE_EVENEMENT_CONFIG) as TypeEvenementRdv[])
    )

    const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementPlanning | null>(null)
    const [operationSelectionnee, setOperationSelectionnee] = useState<Operation | null>(null)
    const [gardeSelectionnee, setGardeSelectionnee] = useState<GardeOccurrence | null>(null)
    const [formulaire, setFormulaire] = useState<EventFormInitial | null>(null)
    const [formulaireAdmin, setFormulaireAdmin] = useState<EventAdminFormInitial | null>(null)
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

    const { data: gardesPlanning } = useGardesPlanning(toISODate(debut), toISODate(fin), vue !== 'bloc')

    const enBloc = vue === 'bloc'
    const { data: salles, isLoading: sallesEnChargement } = useSallesBloc(user?.service ?? undefined, enBloc)
    const { data: planningBloc, isLoading: blocEnChargement } = useOperationsPlanning(toISODate(ancre), toISODate(ancre), enBloc)
    const modifierOperation = useModifierOperation()
    const annulerOp = useAnnulerOperation()
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

    const ouvrirCreationAdmin = () => {
        setErreurFormulaire('')
        setFormulaireAdmin({})
    }

    const ouvrirEdition = (e: EvenementPlanning) => {
        const debutEvt = new Date(e.start_time)
        const finEvt = new Date(e.end_time)
        setErreurFormulaire('')
        setEvenementSelectionne(null)

        if (e.source === 'administratif') {
            setFormulaireAdmin({
                id: e.id,
                titre: e.motif,
                type_evenement: e.type_evenement as EventAdminFormInitial['type_evenement'],
                service: e.service ?? null,
                date: toISODate(debutEvt),
                heureDebut: debutEvt.toTimeString().slice(0, 5),
                heureFin: finEvt.toTimeString().slice(0, 5),
                lieu: e.lieu ?? '',
                description: e.notes,
                statut: e.statut === 'annule' ? 'annule' : e.statut === 'termine' ? 'termine' : 'planifie',
            })
            return
        }

        setFormulaire({
            id: e.id,
            patientId: e.patient?.id ?? null,
            patientLabel: e.patient?.nom_complet,
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
            modifier.mutate({ id: formulaire.id, data, source: 'medical' }, options)
        } else {
            creer.mutate({ data, source: 'medical' }, options)
        }
    }

    const soumettreFormulaireAdmin = (data: Record<string, unknown>) => {
        setErreurFormulaire('')
        const options = {
            onError: (err: unknown) => setErreurFormulaire(extraireMessageErreur(err)),
            onSuccess: () => {
                setFormulaireAdmin(null)
            },
        }
        if (formulaireAdmin?.id) {
            modifier.mutate({ id: formulaireAdmin.id, data, source: 'administratif' }, options)
        } else {
            creer.mutate({ data, source: 'administratif' }, options)
        }
    }

    const annulerEvenement = (e: EvenementPlanning) => {
        modifier.mutate({ id: e.id, data: { statut: 'annule' }, source: e.source }, {
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

    const annulerIntervention = () => {
        if (!operationSelectionnee) return
        setErreurOperation('')
        annulerOp.mutate({ id: operationSelectionnee.id }, {
            onSuccess: () => setOperationSelectionnee(null),
            onError: (err) => setErreurOperation(extraireMessageErreur(err)),
        })
    }

    const modifierEquipeOperation = (ids: number[]) => {
        if (!operationSelectionnee) return
        setErreurOperation('')
        modifierOperation.mutate({ id: operationSelectionnee.id, data: { equipe: ids } }, {
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
        supprimer.mutate({ id: formulaire.id, source: 'medical' }, {
            onSuccess: () => setFormulaire(null),
            onError: () => setErreurFormulaire("Suppression impossible (droits insuffisants)."),
        })
    }

    const supprimerEvenementAdmin = () => {
        if (!formulaireAdmin?.id) return
        if (!window.confirm('Supprimer définitivement cet événement ?')) return
        supprimer.mutate({ id: formulaireAdmin.id, source: 'administratif' }, {
            onSuccess: () => setFormulaireAdmin(null),
            onError: () => setErreurFormulaire("Suppression impossible (droits insuffisants)."),
        })
    }

    const peutModifier = user?.role !== 'laborantin'
    const peutModifierEvenement = (e: EvenementPlanning) =>
        e.source === 'administratif' ? peutGererEvenementsAdmin : peutModifier

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-7xl mx-auto">
                {/* ===== SECTION 1 : SALUTATION + KPI ===== */}
                <section className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>
                            Bonjour {user?.prenom ?? ''} 👋
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--ht-text-secondary)' }}>
                            Voici votre planning et vos activités du jour.
                        </p>
                    </div>
                    {!enBloc && <CalendarStats evenements={evenements} />}
                </section>

                {/* ===== SECTION 2 : CALENDRIER ===== */}
                <section>
                    {/* Filtres */}
                    {!enBloc && (
                        <div className="flex flex-wrap gap-2">
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
                    )}

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
                            onNouvelEvenementAdmin={peutGererEvenementsAdmin ? ouvrirCreationAdmin : undefined}
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
                                gardes={gardesPlanning?.gardes ?? []}
                                onSelectEvenement={setEvenementSelectionne}
                                onSelectGarde={setGardeSelectionnee}
                                onSelectCreneau={ouvrirCreation}
                                onSelectJour={(d: Date) => { setAncre(d); setVue('jour') }}
                                //deplacable={peutModifier}
                                onDeplacerEvenement={deplacerEvenement}
                                onRedimensionnerEvenement={redimensionnerEvenement}
                            />
                        ) : vue === 'mois' ? (
                            <CalendarMonthView
                                ancre={ancre}
                                evenements={evenements}
                                gardes={gardesPlanning?.gardes ?? []}
                                onSelectJour={(d: Date) => { setAncre(d); setVue('jour') }}
                            />
                        ) : vue === 'agenda' ? (
                            <CalendarAgendaView
                                evenements={evenements}
                                gardes={gardesPlanning?.gardes ?? []}
                                onSelectEvenement={setEvenementSelectionne}
                                onSelectGarde={setGardeSelectionnee}
                            />
                        ) : (
                            <CalendarDayView
                                ancre={ancre}
                                evenements={evenements}
                                gardes={gardesPlanning?.gardes ?? []}
                                onSelectEvenement={setEvenementSelectionne}
                                onSelectGarde={setGardeSelectionnee}
                                onSelectCreneau={ouvrirCreation}
                                //deplacable={peutModifier}
                                onDeplacerEvenement={deplacerEvenement}
                                onRedimensionnerEvenement={redimensionnerEvenement}
                            />
                        )}
                    </div>
                </section>

                {/* ===== SECTION 3 : ÉVÉNEMENTS À VENIR / RAPPELS / MINI-CALENDRIER ===== */}
                {!enBloc && (
                    <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <UpcomingEventsToday evenements={evenements} onSelect={setEvenementSelectionne} />
                        <RappelsPanel />
                        <MiniMonthCalendar
                            ancre={ancre}
                            evenements={evenements}
                            onSelectDate={(d: Date) => { setAncre(d); setVue('jour') }}
                        />
                    </section>
                )}
            </main>

            {/* ===== PANNEAUX MODAUX ===== */}
            {evenementSelectionne && (
                <EventDetailsPanel
                    evenement={evenementSelectionne}
                    medecinLabel={evenementSelectionne.medecin_nom ? `Dr. ${evenementSelectionne.medecin_prenom} ${evenementSelectionne.medecin_nom}` : null}
                    onClose={() => setEvenementSelectionne(null)}
                    onModifier={() => ouvrirEdition(evenementSelectionne)}
                    onAnnuler={() => annulerEvenement(evenementSelectionne)}
                    peutModifier={peutModifierEvenement(evenementSelectionne)}
                />
            )}

            {operationSelectionnee && (
                <OperationDetailsPanel
                    operation={operationSelectionnee}
                    onClose={() => { setOperationSelectionnee(null); setErreurOperation('') }}
                    onAnnuler={annulerIntervention}
                    onDemarrer={demarrerIntervention}
                    onCloturer={cloturerIntervention}
                    onModifierEquipe={modifierEquipeOperation}
                    enCours={demarrer.isPending || cloturer.isPending || annulerOp.isPending || modifierOperation.isPending}
                    erreur={erreurOperation}
                />
            )}

            {gardeSelectionnee && (
                <GardeDetailsPanel
                    garde={gardeSelectionnee}
                    onClose={() => setGardeSelectionnee(null)}
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

            {formulaireAdmin && (
                <EventAdminFormDialog
                    initial={formulaireAdmin}
                    serviceParDefaut={user?.service ?? null}
                    peutChoisirService={false}
                    onClose={() => setFormulaireAdmin(null)}
                    onSubmit={soumettreFormulaireAdmin}
                    onDelete={formulaireAdmin.id ? supprimerEvenementAdmin : undefined}
                    submitting={creer.isPending || modifier.isPending}
                    erreur={erreurFormulaire}
                />
            )}
        </div>
    )
}