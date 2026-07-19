import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanning, type VuePlanning } from './usePlanning'
import PlanningToolbar from './PlanningToolbar'
import PlanningWeekView from './PlanningWeekView'
import PlanningDayView from './PlanningDayView'
import PlanningMonthView from './PlanningMonthView'
import PlanningDayDetailPanel from './PlanningDayDetailPanel'
import PlanningEventPreviewModal from './PlanningEventPreviewModal'
import PlanningKpiCards from './PlanningKpiCards'
import PlanningMiniCalendar from './PlanningMiniCalendar'
import PlanningUpcomingList from './PlanningUpcomingList'
import PlanningReminders from './PlanningReminders'
import PlanningMonthStatsPanel from './PlanningMonthStatsPanel'
import { SkeletonSimpleList } from '../Skeleton'
import type { EvenementPlanning } from '../../types'

function lundiDeLaSemaine(d: Date): Date {
    const jour = d.getDay()
    const decalage = jour === 0 ? -6 : 1 - jour
    const lundi = new Date(d)
    lundi.setDate(d.getDate() + decalage)
    lundi.setHours(0, 0, 0, 0)
    return lundi
}

export default function MedecinPlanning() {
    const navigate = useNavigate()
    const [vue, setVue] = useState<VuePlanning>('semaine')
    const [dateReference, setDateReference] = useState(new Date())
    const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementPlanning | null>(null)

    const { evenements, indisponibilites, loading, erreur, changerStatut } = usePlanning(vue, dateReference)

    const naviguer = (direction: -1 | 0 | 1) => {
        if (direction === 0) { setDateReference(new Date()); return }
        const nouvelle = new Date(dateReference)
        if (vue === 'jour') nouvelle.setDate(nouvelle.getDate() + direction)
        else if (vue === 'mois') nouvelle.setMonth(nouvelle.getMonth() + direction)
        else nouvelle.setDate(nouvelle.getDate() + direction * 7)
        setDateReference(nouvelle)
    }

    const changerVue = (v: VuePlanning) => {
        setVue(v)
        setEvenementSelectionne(null)
    }

    const gererChangementStatut = (id: number, statut: EvenementPlanning['statut']) => {
        changerStatut(id, statut)
        setEvenementSelectionne(prev => prev ? { ...prev, statut } : prev)
    }

    return (
        <div className="space-y-4">
            <PlanningKpiCards />

            <PlanningToolbar
                vue={vue}
                onVueChange={changerVue}
                dateReference={dateReference}
                onNavigate={naviguer}
                onNouveau={() => navigate('/rendez_vous')}
            />

            {loading ? (
                <SkeletonSimpleList rows={3} />
            ) : erreur ? (
                <div className="ht-alert ht-alert-danger">{erreur}</div>
            ) : vue === 'jour' ? (
                // Vue Jour : calendrier + panneau de détail latéral persistant
                // (pas de modale) — cf. maquette "Vue par jour".
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
                    <PlanningDayView
                        jour={dateReference}
                        evenements={evenements}
                        indisponibilites={indisponibilites}
                        evenementSelectionneId={evenementSelectionne?.id ?? null}
                        onSelectEvenement={setEvenementSelectionne}
                    />
                    <PlanningDayDetailPanel
                        evenement={evenementSelectionne}
                        onStatutChange={gererChangementStatut}
                    />
                </div>
            ) : vue === 'mois' ? (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
                    <PlanningMonthView
                        dateReference={dateReference}
                        evenements={evenements}
                        onSelectJour={(jour) => { setDateReference(jour); setVue('jour') }}
                    />
                    <PlanningMonthStatsPanel
                        evenements={evenements}
                        onSelectJour={(jour) => { setDateReference(jour); setVue('jour') }}
                    />
                </div>
            ) : (
                <>
                    <PlanningWeekView
                        lundi={lundiDeLaSemaine(dateReference)}
                        evenements={evenements}
                        indisponibilites={indisponibilites}
                        onSelectEvenement={setEvenementSelectionne}
                    />

                    {/* ── Bandeau bas : événements du jour / rappels / mini-calendrier ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <PlanningUpcomingList evenements={evenements} />
                        <PlanningReminders />
                        <PlanningMiniCalendar
                            dateSelectionnee={dateReference}
                            onSelectDate={(d) => { setDateReference(d); setVue('jour') }}
                        />
                    </div>

                    {evenementSelectionne && (
                        <PlanningEventPreviewModal
                            evenement={evenementSelectionne}
                            onClose={() => setEvenementSelectionne(null)}
                            onStatutChange={gererChangementStatut}
                        />
                    )}
                </>
            )}
        </div>
    )
}
