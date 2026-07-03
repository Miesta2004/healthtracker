import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getFileAttente } from '../api/urgences'
import { getHospitalisationsEnCours } from '../api/hospitalisations'
import { getConsultations } from '../api/consultations'
import { getRendezVous } from '../api/rendezvous'
import { getEmployes } from '../api/comptes'
import { getServices } from '../api/services'
import { getDemandesEnAttente } from '../api/analyses'
import type { Patient, PassageUrgence, Hospitalisation, Consultation, RendezVous, NiveauTri } from '../types'
import Navbar from '../components/NavBar'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonKpiCard, SkeletonSimpleList } from '../components/Skeleton'

// ─── Config triage ────────────────────────────────────────────────────────────
const TRI_COLORS: Record<NiveauTri, string> = {
    1: '#b91c1c', 2: '#ea580c', 3: '#ca8a04', 4: '#16a34a', 5: '#6b7280',
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent, onClick }: {
    label: string; value: string | number; sub?: string; icon: string; accent?: boolean; onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`rounded-xl border p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
            style={accent
                ? { backgroundColor: '#003152', borderColor: '#003152' }
                : { backgroundColor: 'white', borderColor: '#f3f4f6' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={accent ? { backgroundColor: 'rgba(173,223,241,0.15)' } : { backgroundColor: '#f8fafc' }}>
                {icon}
            </div>
            <div>
                <p className={`text-xs font-medium ${accent ? 'text-blue-200' : 'text-gray-400'}`}>{label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-blue-300' : 'text-gray-400'}`}>{sub}</p>}
            </div>
        </div>
    )
}

// ─── Widget card ──────────────────────────────────────────────────────────────
function WidgetCard({ title, count, linkLabel, onLink, children, loading, empty, emptyLabel }: {
    title: string; count?: number; linkLabel?: string; onLink?: () => void
    children: React.ReactNode; loading: boolean; empty: boolean; emptyLabel: string
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                    {title}
                    {typeof count === 'number' && !loading && (
                        <span className="ml-1.5 text-gray-400 font-normal">({count})</span>
                    )}
                </h3>
                {onLink && (
                    <button onClick={onLink} className="text-xs font-medium hover:underline" style={{ color: '#003152' }}>
                        {linkLabel} →
                    </button>
                )}
            </div>
            {loading ? (
                <SkeletonSimpleList rows={3} />
            ) : empty ? (
                <div className="px-5 py-10 text-center text-sm text-gray-300">{emptyLabel}</div>
            ) : children}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate()
    const { user, hasRole } = useAuth()

    const canSeePatients = hasRole('admin', 'medecin', 'secretaire')
    const canSeeUrgences = hasRole('admin', 'medecin', 'infirmier')
    const canSeeHospit   = hasRole('admin', 'medecin')
    const canSeeConsult  = hasRole('admin', 'medecin', 'infirmier')
    const canSeeRdv      = hasRole('admin', 'medecin', 'secretaire')
    const isAdmin        = hasRole('admin')
    const isNurse        = hasRole('infirmier')
    const isSecretaire   = hasRole('secretaire')

    const [patients,         setPatients]         = useState<Patient[] | null>(null)
    const [urgences,         setUrgences]         = useState<PassageUrgence[] | null>(null)
    const [hospitalisations, setHospitalisations] = useState<Hospitalisation[] | null>(null)
    const [consultations,    setConsultations]    = useState<Consultation[] | null>(null)
    const [rendezVous,       setRendezVous]       = useState<RendezVous[] | null>(null)
    const [effectif,         setEffectif]         = useState<{ employes: number; services: number } | null>(null)
    const [demandesEnAttente, setDemandesEnAttente] = useState<number | null>(null)


    useEffect(() => {
        if (canSeePatients) getPatients().then(setPatients).catch(() => setPatients([]))
        if (canSeeUrgences) getFileAttente().then(setUrgences).catch(() => setUrgences([]))
        if (canSeeHospit) getHospitalisationsEnCours().then(setHospitalisations).catch(() => setHospitalisations([]))
        if (canSeeConsult)  getConsultations().then(setConsultations).catch(() => setConsultations([]))
        if (canSeeRdv) getRendezVous().then(setRendezVous).catch(() => setRendezVous([]))
        if (hasRole('laborantin')) getDemandesEnAttente().then(d => setDemandesEnAttente(d.length)).catch(() => setDemandesEnAttente(0))
        if (isAdmin) {
            Promise.all([getEmployes(), getServices()])
                .then(([emps, servs]) => setEffectif({
                    employes: emps.filter(e => e.actif).length,
                    services: servs.filter(s => s.actif).length,
                }))
                .catch(() => setEffectif({ employes: 0, services: 0 }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const patientsRecents = patients
        ? [...patients]
            .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
            .slice(0, 5)
        : []

    const nouveauCeMois = patients?.filter(p => {
        const d = new Date(p.date_creation)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length ?? 0

    const urgencesTriees = urgences
        ? [...urgences].sort((a, b) => (a.niveau_tri ?? 5) - (b.niveau_tri ?? 5)).slice(0, 5)
        : []

    const consultationsAujourdhui = consultations?.filter(c => {
        const d = new Date(c.date)
        const now = new Date()
        return d.toDateString() === now.toDateString()
    }) ?? []

    const rdvAujourdhui = (rendezVous ?? [])
        .filter(r => {
            const d = new Date(r.date_heure)
            const now = new Date()
            return d.toDateString() === now.toDateString() && r.statut !== 'annule'
        })
        .sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime())

    const calcAge = (dateStr: string) => {
        const today = new Date()
        const birth = new Date(dateStr)
        let age = today.getFullYear() - birth.getFullYear()
        if (today.getMonth() < birth.getMonth() ||
            (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
        return age
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <div className="max-w-6xl mx-auto px-6 py-8 w-full space-y-8">

                {/* ── Titre ── */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {hasRole('admin')      && 'Tableau de bord — Administration'}
                        {hasRole('medecin')    && `Bonjour Dr. ${user?.nom} 👋`}
                        {hasRole('infirmier')  && `Bonjour ${user?.prenom} 👋`}
                        {hasRole('secretaire') && 'Accueil & Secrétariat'}
                        {hasRole('laborantin') && 'Espace Laboratoire'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {hasRole('admin')      && "Vue globale de l'établissement"}
                        {hasRole('medecin')    && 'Vos patients et consultations du jour'}
                        {hasRole('infirmier')  && 'Suivi des patients et signes vitaux'}
                        {hasRole('secretaire') && 'Gestion des rendez-vous et admissions'}
                        {hasRole('laborantin') && 'Analyses et résultats biologiques'}
                    </p>
                </div>

                {/* ── Actions rapides ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {hasRole('admin', 'medecin', 'secretaire') && (
                        <button
                            onClick={() => navigate('/patients/newPatient')}
                            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: '#003152' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                        >
                            + Nouveau patient
                        </button>
                    )}
                    {isSecretaire && (
                        <button
                            onClick={() => navigate('/rendez_vous')}
                            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            📅 Gérer les rendez-vous
                        </button>
                    )}
                    {isNurse && (
                        <button
                            onClick={() => navigate('/patients')}
                            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: '#003152' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                        >
                            🔍 Rechercher un patient
                        </button>
                    )}
                    {canSeeUrgences && (
                        <button
                            onClick={() => navigate('/urgences')}
                            className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
                            style={{ borderColor: '#fecaca', color: '#b91c1c', backgroundColor: '#fef2f2' }}
                        >
                            🚨 Voir les urgences
                        </button>
                    )}
                    {canSeePatients && (
                        <button
                            onClick={() => navigate('/patients')}
                            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Voir tous les patients
                        </button>
                    )}
                </div>

                {/* ── KPIs ── */}
                {(canSeePatients || canSeeUrgences || canSeeHospit || isAdmin) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {canSeePatients && (
                            patients === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Total patients" value={patients.length} icon="👥" accent
                                          sub={`${nouveauCeMois} ajouté${nouveauCeMois > 1 ? 's' : ''} ce mois`}
                                          onClick={() => navigate('/patients')} />
                            )
                        )}
                        {canSeeUrgences && (
                            urgences === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Aux urgences" value={urgences.length} icon="🚨"
                                          sub={urgences.length > 0 ? 'en attente ou en cours' : 'Aucun patient'}
                                          onClick={() => navigate('/urgences')} />
                            )
                        )}
                        {canSeeHospit && (
                            hospitalisations === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Hospitalisations en cours" value={hospitalisations.length} icon="🛏️"
                                          sub={hospitalisations.length > 0 ? 'lits occupés' : 'Aucune'} />
                            )
                        )}
                        {canSeeConsult && (
                            consultations === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Consultations aujourd'hui" value={consultationsAujourdhui.length} icon="🩺"
                                          sub={consultationsAujourdhui.length > 0 ? 'programmées ou réalisées' : 'Aucune'} />
                            )
                        )}
                        {canSeeRdv && (
                            rendezVous === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Rendez-vous aujourd'hui" value={rdvAujourdhui.length} icon="📅"
                                          sub={rdvAujourdhui.length > 0 ? 'planifiés aujourd\'hui' : 'Aucun'}
                                          onClick={() => navigate('/rendez_vous')} />
                            )
                        )}
                        {isAdmin && (
                            effectif === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Effectif actif" value={effectif.employes} icon="🧑‍⚕️"
                                          sub={`${effectif.services} service${effectif.services > 1 ? 's' : ''} actif${effectif.services > 1 ? 's' : ''}`}
                                          onClick={() => navigate('/employes')} />
                            )
                        )}
                    </div>
                )}

                {/* ── Widgets ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {canSeeUrgences && (
                        <WidgetCard
                            title="File d'attente aux urgences"
                            count={urgences?.length}
                            loading={urgences === null}
                            empty={(urgences?.length ?? 0) === 0}
                            emptyLabel="Aucun patient actuellement aux urgences"
                            linkLabel="Voir tout"
                            onLink={() => navigate('/urgences')}
                        >
                            <div className="divide-y divide-gray-50">
                                {urgencesTriees.map(u => (
                                    <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: u.niveau_tri ? TRI_COLORS[u.niveau_tri] : '#d1d5db' }} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {u.patient_nom || `Patient #${u.patient}`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {u.niveau_tri_label || 'Non trié'} · {u.motif}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-gray-500 bg-gray-100">
                                            {u.statut_label || u.statut}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeeHospit && (
                        <WidgetCard
                            title="Hospitalisations en cours"
                            count={hospitalisations?.length}
                            loading={hospitalisations === null}
                            empty={(hospitalisations?.length ?? 0) === 0}
                            emptyLabel="Aucune hospitalisation en cours"
                        >
                            <div className="divide-y divide-gray-50">
                                {(hospitalisations ?? []).slice(0, 5).map(h => (
                                    <div key={h.id} className="px-5 py-3 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {h.patient_nom || `Patient #${h.patient}`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {h.chambre ? `Chambre ${h.chambre}` : 'Chambre non assignée'}
                                                {h.lit ? ` · Lit ${h.lit}` : ''}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400">{h.duree_jours ?? 0} j</span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeePatients && (
                        <WidgetCard
                            title="Derniers patients ajoutés"
                            loading={patients === null}
                            empty={patientsRecents.length === 0}
                            emptyLabel="Aucun patient pour le moment"
                            linkLabel="Voir tous les patients"
                            onLink={() => navigate('/patients')}
                        >
                            <div className="divide-y divide-gray-50">
                                {patientsRecents.map(p => (
                                    <div key={p.id}
                                         onClick={() => navigate(`/patients/${p.id}`)}
                                         className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                                             style={{ backgroundColor: '#003152' }}>
                                            {p.prenom[0]}{p.nom[0]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{p.prenom} {p.nom}</p>
                                            <p className="text-xs text-gray-400">{calcAge(p.date_naissance)} ans</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeeRdv && (
                        <WidgetCard
                            title="Rendez-vous du jour"
                            count={rdvAujourdhui.length}
                            loading={rendezVous === null}
                            empty={rdvAujourdhui.length === 0}
                            emptyLabel="Aucun rendez-vous prévu aujourd'hui"
                            linkLabel="Voir tous les rendez-vous"
                            onLink={() => navigate('/rendez_vous')}
                        >
                            <div className="divide-y divide-gray-50">
                                {rdvAujourdhui.slice(0, 5).map(r => (
                                    <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {r.patient_prenom} {r.patient_nom}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">{r.motif}</p>
                                        </div>
                                        <span className="text-xs font-medium text-gray-500">
                                            {new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeeConsult && (
                        <WidgetCard
                            title="Consultations du jour"
                            count={consultationsAujourdhui.length}
                            loading={consultations === null}
                            empty={consultationsAujourdhui.length === 0}
                            emptyLabel="Aucune consultation prévue aujourd'hui"
                        >
                            <div className="divide-y divide-gray-50">
                                {consultationsAujourdhui.slice(0, 5).map(c => (
                                    <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{c.motif}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(c.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                {' · '}{c.type_evenement}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-gray-500 bg-gray-100 capitalize">
                                            {c.statut.replace('_', ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}
                </div>

                {hasRole('laborantin') && (
                    <div className="bg-white rounded-xl border border-gray-100 p-8 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                 style={{ backgroundColor: '#f0f7ff' }}>
                                🧪
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {demandesEnAttente === null
                                        ? 'Chargement des demandes…'
                                        : demandesEnAttente === 0
                                            ? 'Aucune demande en attente'
                                            : `${demandesEnAttente} demande${demandesEnAttente > 1 ? 's' : ''} en attente de traitement`}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Retrouve toutes les demandes d'analyses de ton service</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/laboratoire')}
                                className="text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors flex-shrink-0"
                                style={{ backgroundColor: '#003152' }}>
                            Ouvrir le laboratoire →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}