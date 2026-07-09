import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getServiceStats } from '../api/services'
import type { RoleEmploye, ServiceStats, MedecinPerf } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonDetailPage } from '../components/Skeleton'
import {
    ArrowLeft, Users, UserCheck, CalendarDays, CalendarRange,
    Calendar, Stethoscope, Activity, ShieldCheck, ShieldAlert,
} from 'lucide-react'

// ─── Constantes rôles (mêmes libellés/couleurs que la page Employés) ──────────
const ROLE_LABELS: Record<RoleEmploye, string> = {
    admin: 'Administrateur',
    medecin: 'Médecin',
    infirmier: 'Infirmier(ère)',
    secretaire: 'Secrétaire',
    laborantin: 'Laborantin',
}
const ROLE_COLORS: Record<RoleEmploye, string> = {
    admin: 'var(--ht-primary)',
    medecin: 'var(--role-medecin)',
    infirmier: 'var(--role-infirmier)',
    secretaire: 'var(--role-secretaire)',
    laborantin: 'var(--role-laborantin)',
}
const ROLES: RoleEmploye[] = ['admin', 'medecin', 'infirmier', 'secretaire', 'laborantin']

// ─── Carte KPI ─────────────────────────────────────────────────────────────────
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

// ─── Ligne répartition par rôle ────────────────────────────────────────────────
function RoleBar({ role, count, max }: { role: RoleEmploye; count: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                <span>{ROLE_LABELS[role]}</span>
                <span className="font-medium" style={{ color: 'var(--ht-text)' }}>{count}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, backgroundColor: ROLE_COLORS[role] }} />
            </div>
        </div>
    )
}

// ─── Ligne médecin (performance) ───────────────────────────────────────────────
function MedecinRow({ medecin }: { medecin: MedecinPerf }) {
    return (
        <div className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-t"
             style={{ borderColor: 'var(--ht-border)' }}>
            <div className="col-span-5 flex items-center gap-2 min-w-0">
                <div className="ht-avatar ht-avatar-sm flex-shrink-0"
                     style={{ backgroundColor: 'var(--ht-primary-tint)', color: 'var(--ht-primary)' }}>
                    {medecin.nom.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ht-text)' }}>Dr {medecin.nom}</p>
                    {medecin.specialite && (
                        <p className="text-xs truncate" style={{ color: 'var(--ht-text-muted)' }}>{medecin.specialite}</p>
                    )}
                </div>
            </div>
            <div className="col-span-2 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{medecin.nb_patients}</p>
                <p className="text-[10px] uppercase" style={{ color: 'var(--ht-text-muted)' }}>Patients</p>
            </div>
            <div className="col-span-2 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{medecin.nb_consultations}</p>
                <p className="text-[10px] uppercase" style={{ color: 'var(--ht-text-muted)' }}>Consultations</p>
            </div>
            <div className="col-span-2 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{medecin.nb_operations}</p>
                <p className="text-[10px] uppercase" style={{ color: 'var(--ht-text-muted)' }}>Opérations</p>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ServiceDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [stats, setStats] = useState<ServiceStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getServiceStats(Number(id))
            .then(setStats)
            .catch(() => setError("Impossible de charger le tableau de bord de ce service."))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <div className="ht-page">
                <Sidebar />
                <main className="ht-page-content max-w-7xl">
                    <SkeletonDetailPage />
                </main>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="ht-page">
                <Sidebar />
                <main className="ht-page-content max-w-7xl">
                    <div className="ht-card text-center py-16">
                        <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                            {error || "Service introuvable."}
                        </p>
                        <button onClick={() => navigate('/services')} className="btn btn-secondary mt-4">
                            <ArrowLeft size={14} /> Retour aux services
                        </button>
                    </div>
                </main>
            </div>
        )
    }

    const { service, patients, employes, medecins } = stats
    const maxRoleCount = Math.max(...ROLES.map(r => employes.par_role[r] ?? 0), 1)

    return (
        <div className="ht-page">
            <Sidebar />
            <main className="ht-page-content max-w-7xl space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
                     style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <div className="flex items-start gap-3">
                        <button onClick={() => navigate('/services')}
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 hover:opacity-75 transition-opacity"
                                style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}
                                title="Retour aux services">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>{service.nom}</h1>
                                <span className={`badge ${service.actif ? 'badge-tint' : 'badge-muted'} flex items-center gap-1`}>
                                    {service.actif ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                    {service.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                {service.chef_nom ? `Dr. ${service.chef_nom} · ` : ''}
                                {service.description || 'Tableau de bord du service'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPIs patients */}
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                        Patients
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <KpiCard label="Total" value={patients.total} icon={<UserCheck size={18} />} />
                        <KpiCard label="Actifs" value={patients.actifs} icon={<ShieldCheck size={18} />} />
                        <KpiCard label="Nouveaux aujourd'hui" value={patients.nouveaux_jour} icon={<CalendarDays size={18} />} />
                        <KpiCard label="Nouveaux ce mois" value={patients.nouveaux_mois} icon={<CalendarRange size={18} />} />
                        <KpiCard label="Nouveaux cette année" value={patients.nouveaux_annee} icon={<Calendar size={18} />} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Répartition employés */}
                    <div className="ht-card ht-card-padded-sm lg:col-span-1">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                            <Users size={16} style={{ color: 'var(--ht-text-muted)' }} /> Équipe ({employes.total})
                        </h3>
                        <div className="space-y-3">
                            {ROLES.map(r => (
                                <RoleBar key={r} role={r} count={employes.par_role[r] ?? 0} max={maxRoleCount} />
                            ))}
                        </div>
                    </div>

                    {/* Performance des médecins */}
                    <div className="ht-card ht-card-padded-sm lg:col-span-2">
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                            <Stethoscope size={16} style={{ color: 'var(--ht-text-muted)' }} /> Performance des médecins
                        </h3>
                        <p className="text-xs mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                            Patients dont le médecin est référent, et activité de ces patients.
                        </p>
                        {medecins.length === 0 ? (
                            <div className="text-center py-10">
                                <Stethoscope size={28} className="mx-auto mb-2" style={{ color: 'var(--ht-text-muted)', opacity: 0.4 }} />
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun médecin affecté à ce service</p>
                            </div>
                        ) : (
                            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--ht-border)' }}>
                                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                                     style={{ backgroundColor: 'var(--ht-bg)', color: 'var(--ht-text-muted)' }}>
                                    <div className="col-span-5">Médecin</div>
                                    <div className="col-span-2 text-center">Patients</div>
                                    <div className="col-span-2 text-center">Consultations</div>
                                    <div className="col-span-2 text-center">Opérations</div>
                                </div>
                                {medecins.map(m => <MedecinRow key={m.id} medecin={m} />)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Placeholder décès — à connecter une fois le module morgue en place */}
                <div className="ht-card ht-card-padded-sm flex items-center gap-3" style={{ opacity: 0.6 }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}>
                        <Activity size={18} />
                    </div>
                    <div>
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Décès (module à venir)</p>
                        <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>Sera affiché ici une fois le registre des décès en place</p>
                    </div>
                </div>

            </main>
        </div>
    )
}