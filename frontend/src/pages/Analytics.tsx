import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getVueEnsemble } from '../api/services'
import type { RoleEmploye, VueEnsemble } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonKpiGrid, SkeletonChartCard, SkeletonTable } from '../components/Skeleton'
import PageBanner from '../components/PageBanner.tsx'
import { BarChart3, Users, UserPlus, UserCheck, Building2, ChevronRight } from 'lucide-react'

// ─── Constantes rôles (mêmes libellés/couleurs que Services / EmployeDetail) ──
const ROLE_LABELS: Record<RoleEmploye, string> = {
    admin: 'Administrateur',
    medecin: 'Médecin',
    infirmier: 'Infirmier(ère)',
    secretaire: 'Secrétaire',
    laborantin: 'Laborantin',
    chef_chirurgie : 'Chef(fe) de chirurgie'
}
const ROLE_COLORS: Record<RoleEmploye, string> = {
    admin: 'var(--ht-primary)',
    medecin: 'var(--role-medecin)',
    infirmier: 'var(--role-infirmier)',
    secretaire: 'var(--role-secretaire)',
    laborantin: 'var(--role-laborantin)',
    chef_chirurgie: 'var(--role-chirurgie)',
}

// ─── Carte KPI (même style que ServiceDetail.tsx) ────────────────────────────
function KpiCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="ht-card ht-card-padded-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}>
                {icon}
            </div>
            <div>
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--ht-text)' }}>{value}</p>
            </div>
        </div>
    )
}

export default function Analytics() {
    const navigate = useNavigate()
    const [vue, setVue] = useState<VueEnsemble | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getVueEnsemble()
            .then(setVue)
            .catch(() => setError("Impossible de charger les statistiques."))
            .finally(() => setLoading(false))
    }, [])

    const parServiceData = vue?.par_service.map(s => ({ nom: s.nom, patients: s.nb_patients })) ?? []
    const parRoleData = vue
        ? (Object.entries(vue.employes.par_role) as [RoleEmploye, number][])
            .map(([role, count]) => ({ role, label: ROLE_LABELS[role], count }))
        : []

    return (
        <div className="ht-page">
            <Sidebar />
            <main className="ht-page-content max-w-6xl space-y-6">
                <PageBanner
                    icon={BarChart3}
                    title="Analytics"
                    subtitle="Vue d'ensemble de l'activité de l'établissement"
                    decorIcons={[Users, Building2]}
                />

                {error && (
                    <div className="ht-card ht-card-padded-sm">
                        <p className="text-sm" style={{ color: 'var(--ht-danger)' }}>{error}</p>
                    </div>
                )}

                {loading ? (
                    <>
                        <SkeletonKpiGrid count={4} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SkeletonChartCard />
                            <SkeletonChartCard />
                        </div>
                        <SkeletonTable rows={5} columns={3} />
                    </>
                ) : vue && (
                    <>
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard label="Patients actifs" value={vue.patients.actifs} icon={<UserCheck size={18} />} />
                            <KpiCard label="Nouveaux ce mois" value={vue.patients.nouveaux_mois} icon={<UserPlus size={18} />} />
                            <KpiCard label="Employés actifs" value={vue.employes.total} icon={<Users size={18} />} />
                            <KpiCard label="Services" value={vue.nb_services} icon={<Building2 size={18} />} />
                        </div>

                        {/* Graphiques */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="ht-card ht-card-padded-sm">
                                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                                    Patients actifs par service
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={parServiceData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                                        <XAxis dataKey="nom" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="patients" fill="var(--ht-primary)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="ht-card ht-card-padded-sm">
                                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                                    Employés par rôle
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={parRoleData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={90} />
                                        <Tooltip />
                                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                            {parRoleData.map(d => (
                                                <Cell key={d.role} fill={ROLE_COLORS[d.role]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Tableau services — clic pour le détail complet (déjà existant) */}
                        <div className="ht-card">
                            <div className="px-5 pt-5 pb-3">
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                                    Services — clique pour le détail complet (médecins, activité, congés)
                                </h3>
                            </div>
                            {vue.par_service.map(s => (
                                <div key={s.id}
                                     onClick={() => navigate(`/services/${s.id}`)}
                                     className="ht-table-row group" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                                    <p className="text-sm font-medium text-[var(--ht-text)] group-hover:text-[var(--ht-primary)] transition-colors">
                                        {s.nom}
                                    </p>
                                    <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{s.nb_patients} patients</span>
                                    <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{s.nb_employes} employés</span>
                                    <ChevronRight size={14} style={{ color: 'var(--ht-text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}