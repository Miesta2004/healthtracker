import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { useAuth } from '../contexts/AuthContext'
import { usePlanning, useCreerEvenement, useModifierEvenement, useSupprimerEvenement } from '../hooks/useCalendrier'
import CalendarHeader, { type VueCalendrier } from '../components/calendrier/CalendarHeader'
import CalendarStats from '../components/calendrier/CalendarStats'
import CalendarWeekView from '../components/calendrier/CalendarWeekView'
import CalendarDayView from '../components/calendrier/CalendarDayView'
import CalendarMonthView from '../components/calendrier/CalendarMonthView'
import CalendarAgendaView from '../components/calendrier/CalendarAgendaView'
import EventFormDialog, { type EventFormInitial } from '../components/calendrier/EventFormDialog'
import EventDetailsPanel from '../components/calendrier/EventDetailsPanel'
import {
    TYPE_EVENEMENT_CONFIG, joursDeSemaine, joursGrilleMois, toISODate, AGENDA_JOURS_A_VENIR,
} from '../components/calendrier/calendrierConfig'
import type { EvenementPlanning, TypeEvenementRdv } from '../types'

export default function CalendrierPage() {
    const { user } = useAuth()

    const [vue, setVue] = useState<VueCalendrier>('semaine')
    const [ancre, setAncre] = useState(new Date())
    const [typesActifs, setTypesActifs] = useState<Set<TypeEvenementRdv>>(
        () => new Set(Object.keys(TYPE_EVENEMENT_CONFIG) as TypeEvenementRdv[])
    )

    const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementPlanning | null>(null)
    const [formulaire, setFormulaire] = useState<EventFormInitial | null>(null)
    const [erreurFormulaire, setErreurFormulaire] = useState('')

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
            next.setDate(next.getDate() + (vue === 'jour' ? delta : delta * 7))
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
            onError: (err: unknown) => {
                const message = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data
                const texte = message ? Object.values(message).flat().join(' ') : "Une erreur est survenue."
                setErreurFormulaire(texte || "Une erreur est survenue.")
            },
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

            <main className="ht-page-content max-w-6xl mx-auto space-y-5">
                <PageHeader
                    title="Calendrier"
                    subtitle="Vue d'ensemble des consultations, interventions et gardes"
                    icon={CalendarClock}
                />

                <CalendarStats evenements={evenements} />

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

                <CalendarHeader
                    ancre={ancre}
                    vue={vue}
                    onVueChange={setVue}
                    onPrecedent={() => naviguer(-1)}
                    onSuivant={() => naviguer(1)}
                    onAujourdhui={() => setAncre(new Date())}
                    onNouvelEvenement={() => ouvrirCreation(new Date())}
                />

                {isError && (
                    <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                        Impossible de charger le planning. Réessayez dans un instant.
                    </div>
                )}

                {isLoading && !data ? (
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
                    />
                )}
            </main>

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
