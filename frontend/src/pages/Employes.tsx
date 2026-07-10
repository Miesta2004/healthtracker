import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEmployes, updateEmploye, deleteEmploye } from '../api/comptes'
import { getServices } from '../api/services'
import type { Employe, RoleEmploye, Service } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonChartCard, SkeletonTable } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import { Users, Stethoscope, Syringe, UserPlus, Search, SearchX, UserCog } from 'lucide-react'

const PAGE_SIZE = 20



// ─── Constantes rôles ─────────────────────────────────────────────────────────
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

// ─── Mini barre ───────────────────────────────────────────────────────────────
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-[var(--ht-text-muted)]">
                <span>{label}</span>
                <span className="font-medium text-[var(--ht-text-secondary)]">{value}</span>
            </div>
            <div className="h-2 bg-[var(--ht-muted-bg)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

// ─── Donut actif/inactif ──────────────────────────────────────────────────────
function DonutChart({ actif, inactif }: { actif: number; inactif: number }) {
    const total = actif + inactif
    if (total === 0) return <div className="flex items-center justify-center h-28 text-[var(--ht-text-muted)] text-sm">Aucune donnée</div>
    const pct = actif / total
    const r = 40
    const circ = 2 * Math.PI * r
    const dash = pct * circ
    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ht-border-input)" strokeWidth="14" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ht-primary)" strokeWidth="14"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={circ / 4} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="bold" fill="var(--ht-primary)">
                    {Math.round(pct * 100)}%
                </text>
            </svg>
            <div className="flex gap-4 text-xs text-[var(--ht-text-muted)]">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--ht-primary)' }} />
                    Actifs ({actif})
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--ht-border-input)] inline-block" />
                    Inactifs ({inactif})
                </span>
            </div>
        </div>
    )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent }: {
    label: string; value: string | number; sub?: string; icon: any; accent?: boolean
}) {
    return (
        <div className={`ht-kpi ${accent ? 'accent' : ''}`}>
            <div className="ht-kpi-icon">
                <Icon size={20} style={{ color: accent ? 'var(--ht-primary-tint)' : 'var(--ht-primary)' }} />
            </div>
            <div>
                <p className="ht-kpi-label">{label}</p>
                <p className="ht-kpi-value">{value}</p>
                {sub && <p className="ht-kpi-sub">{sub}</p>}
            </div>
        </div>
    )
}


// ─── Page principale ──────────────────────────────────────────────────────────
export default function Employes() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [employes, setEmployes] = useState<Employe[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const { user: currentUser } = useAuth()
    const [actionError, setActionError] = useState('')

    // Filtres
    const [search, setSearch] = useState('')
    const [filterRole, setFilterRole] = useState<'tous' | RoleEmploye>('tous')
    const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'inactif'>('tous')
    const [filterService, setFilterService] = useState<'tous' | number>(() => {
        const fromUrl = searchParams.get('service')
        return fromUrl ? Number(fromUrl) : 'tous'
    })
    const [sortBy, setSortBy] = useState<'nom' | 'date'>('nom')
    const [page, setPage] = useState(1)

    // ── Vérification d'accès (admin uniquement) ──
    useEffect(() => {
        getEmployes().then(setEmployes).finally(() => setLoading(false))
        getServices().then(setServices).catch(() => setServices([]))
    }, [])

    const refreshList = () => {
        getEmployes().then(setEmployes)
    }

    const handleRoleChange = async (employe: Employe, newRole: RoleEmploye) => {
        setActionError('')
        try {
            const updated = await updateEmploye(employe.id, { role: newRole })
            setEmployes(prev => prev.map(e => e.id === employe.id ? updated : e))
        } catch {
            setActionError(`Impossible de changer le rôle de ${employe.prenom} ${employe.nom}.`)
        }
    }

    const handleToggleActif = async (employe: Employe) => {
        setActionError('')
        try {
            const updated = await updateEmploye(employe.id, { actif: !employe.actif })
            setEmployes(prev => prev.map(e => e.id === employe.id ? updated : e))
        } catch {
            setActionError(`Impossible de mettre à jour le statut de ${employe.prenom} ${employe.nom}.`)
        }
    }

    const handleDelete = async (employe: Employe) => {
        if (!window.confirm(`Supprimer définitivement le compte de ${employe.prenom} ${employe.nom} ?`)) return
        setActionError('')
        try {
            await deleteEmploye(employe.id)
            refreshList()
        } catch {
            setActionError(`Impossible de supprimer ${employe.prenom} ${employe.nom}.`)
        }
    }

    // ── Stats ──
    const total = employes.length
    const actif = employes.filter(e => e.actif).length
    const inactif = total - actif
    const roleCounts = ROLES.map(r => ({ role: r, count: employes.filter(e => e.role === r).length }))
    const maxRoleCount = Math.max(...roleCounts.map(r => r.count), 1)
    const nouveauCeMois = employes.filter(e => {
        const d = new Date(e.date_creation)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    // ── Liste filtrée ──
    const employesFiltres = useMemo(() => {
        let result = [...employes]

        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(e =>
                e.nom.toLowerCase().includes(q) ||
                e.prenom.toLowerCase().includes(q) ||
                e.matricule.toLowerCase().includes(q) ||
                e.username.toLowerCase().includes(q)
            )
        }
        if (filterRole !== 'tous') result = result.filter(e => e.role === filterRole)
        if (filterStatut === 'actif') result = result.filter(e => e.actif)
        if (filterStatut === 'inactif') result = result.filter(e => !e.actif)
        if (filterService !== 'tous') result = result.filter(e => e.service === filterService)

        result.sort((a, b) => {
            if (sortBy === 'nom') return a.nom.localeCompare(b.nom)
            return new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
        })

        return result
    }, [employes, search, filterRole, filterStatut, filterService, sortBy])

    const hasActiveFilters = search || filterRole !== 'tous' || filterStatut !== 'tous' || filterService !== 'tous'

    useEffect(() => { setPage(1) }, [search, filterRole, filterStatut, filterService, sortBy])

    const totalPages   = Math.max(1, Math.ceil(employesFiltres.length / PAGE_SIZE))
    const pageCourante = Math.min(page, totalPages)
    const employesPage = employesFiltres.slice((pageCourante - 1) * PAGE_SIZE, pageCourante * PAGE_SIZE)

    const resetFilters = () => {
        setSearch('')
        setFilterRole('tous')
        setFilterStatut('tous')
        setFilterService('tous')
    }

    return (
        <div className="ht-page flex flex-col">

            {/* ── Sidebar ── */}
            <Sidebar />

            <div className="ht-page-content w-full space-y-8">

                {/* ── Titre ── */}
                <div>
                    <h1 className="text-2xl font-bold text-[var(--ht-text)]">Gestion des employés</h1>
                    <p className="text-[var(--ht-text-muted)] text-sm mt-1">Comptes et rôles du personnel médical et administratif</p>
                </div>

                {actionError && (
                    <div className="ht-alert ht-alert-danger">
                        {actionError}
                    </div>
                )}

                {/* ── 4 KPIs ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                        label="Total employés" value={total} icon={Users}
                        sub={total > 0 ? `${actif} actif${actif > 1 ? 's' : ''}` : 'Aucun employé'}
                        accent
                    />
                    <KpiCard
                        label="Médecins" value={roleCounts.find(r => r.role === 'medecin')?.count ?? 0} icon={Stethoscope}
                        sub={total > 0 ? `${Math.round((roleCounts.find(r => r.role === 'medecin')?.count ?? 0) / total * 100)}% de l'équipe` : '—'}
                    />
                    <KpiCard
                        label="Infirmiers(ères)" value={roleCounts.find(r => r.role === 'infirmier')?.count ?? 0} icon={Syringe}
                        sub={total > 0 ? `${Math.round((roleCounts.find(r => r.role === 'infirmier')?.count ?? 0) / total * 100)}% de l'équipe` : '—'}
                    />
                    <KpiCard
                        label="Ajoutés ce mois" value={nouveauCeMois} icon={UserPlus}
                        sub={nouveauCeMois > 0 ? 'depuis le 1er du mois' : 'Aucun ce mois'}
                    />
                </div>

                {/* ── Graphiques ── */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SkeletonChartCard /><SkeletonChartCard /><SkeletonChartCard />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="ht-card p-6">
                            <h3 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-4">Statut des comptes</h3>
                            <DonutChart actif={actif} inactif={inactif} />
                        </div>

                        <div className="md:col-span-2 ht-card p-6">
                            <h3 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-4">Répartition par rôle</h3>
                            {(
                                <div className="space-y-3">
                                    {roleCounts.map(({ role, count }) => (
                                        <MiniBar key={role} label={ROLE_LABELS[role]} value={count} max={maxRoleCount} color={ROLE_COLORS[role]} />
                                    ))}
                                </div>
                            )
                            }
                        </div>
                    </div>
                )}

                {/* ── Tableau employés avec filtres ── */}
                <div className="ht-card">

                    {/* Header + filtres */}
                    <div className="px-6 py-4 border-b border-[var(--ht-border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-[var(--ht-text)]">Liste des employés</h2>
                                <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">
                                    {hasActiveFilters
                                        ? `${employesFiltres.length} résultat${employesFiltres.length > 1 ? 's' : ''} sur ${total}`
                                        : `${total} employé${total > 1 ? 's' : ''} au total`
                                    }
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasActiveFilters && (
                                    <button onClick={resetFilters}
                                            className="text-xs text-[var(--ht-danger)] hover:text-[var(--ht-danger)] px-2 py-1 rounded hover:bg-[var(--ht-danger-bg)] transition-colors">
                                        Réinitialiser
                                    </button>
                                )}
                                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'nom' | 'date')}
                                        className="ht-input text-xs px-2 py-1.5 text-[var(--ht-text-secondary)]"
                                >
                                    <option value="nom">Trier : A → Z</option>
                                    <option value="date">Trier : plus récents</option>
                                </select>
                            </div>
                        </div>

                        {/* Barre de filtres */}
                        <div className="flex flex-wrap gap-2">
                            {/* Recherche */}
                            <div className="relative flex-1 min-w-48">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ht-text-muted)' }} />
                                <input
                                    type="text" value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Rechercher un employé..."
                                    className="ht-input w-full pl-8 pr-3 py-1.5 text-sm"
                                />
                            </div>

                            {/* Statut */}
                            <div className="flex rounded-lg border border-[var(--ht-border-input)] overflow-hidden text-xs">
                                {(['tous', 'actif', 'inactif'] as const).map(s => (
                                    <button key={s} onClick={() => setFilterStatut(s)} className="px-3 py-1.5 transition-colors capitalize"
                                            style={filterStatut === s ? { backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' } : { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-muted)' }}>
                                        {s === 'tous' ? 'Tous' : s === 'actif' ? '● Actifs' : '○ Inactifs'}
                                    </button>
                                ))}
                            </div>
                            {/* Rôle */}
                            <select value={filterRole} onChange={e => setFilterRole(e.target.value as 'tous' | RoleEmploye)}
                                    className="ht-input text-xs px-2 py-1.5 text-[var(--ht-text-secondary)]"
                            >
                                <option value="tous">Tous les rôles</option>
                                {ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                            </select>

                            {/* Service */}
                            <select value={filterService} onChange={e => setFilterService(e.target.value === 'tous' ? 'tous' : Number(e.target.value))}
                                    className="ht-input text-xs px-2 py-1.5 text-[var(--ht-text-secondary)]"
                            >
                                <option value="tous">Tous les services</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.nom}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* En-têtes colonnes */}
                    {!loading && employesFiltres.length > 0 && (
                        <div className="px-6 py-2 bg-[var(--ht-bg)] border-b border-[var(--ht-border)] grid grid-cols-12 gap-4 text-xs font-medium text-[var(--ht-text-muted)] uppercase tracking-wider">
                            <div className="col-span-3">Employé</div>
                            <div className="col-span-2">Rôle</div>
                            <div className="col-span-2">Spécialité</div>
                            <div className="col-span-2">Téléphone</div>
                            <div className="col-span-1 text-center">Statut</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>
                    )}

                    {/* Contenu */}
                    {loading ? (
                        <SkeletonTable rows={6} />
                    ) : employes.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <UserCog size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-[var(--ht-text-muted)] text-sm">Aucun employé pour le moment</p>
                            <button onClick={() => navigate('/employes/newEmploye')}
                                    className="mt-4 text-sm font-medium px-4 py-2 rounded-lg text-white"
                                    style={{ backgroundColor: 'var(--ht-primary)' }}>
                                Ajouter un employé
                            </button>
                        </div>
                    ) : employesFiltres.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <SearchX size={30} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-[var(--ht-text-muted)] text-sm">Aucun employé ne correspond aux filtres</p>
                            <button onClick={resetFilters}
                                    className="mt-3 text-sm text-[var(--ht-danger)] hover:text-[var(--ht-danger)]">
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        <div>
                            {employesPage.map(employe => {
                                const isSelf = currentUser?.username === employe.username
                                return (
                                    <div key={employe.id}
                                         className="px-6 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-[var(--ht-bg)] transition-colors"
                                    >
                                        {/* Employé — cliquable vers le détail */}
                                        <div className="col-span-3 flex items-center gap-3 cursor-pointer group"
                                             onClick={() => navigate(`/employes/${employe.id}`)}>
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                                                 style={{ backgroundColor: ROLE_COLORS[employe.role] }}>
                                                {employe.prenom[0]}{employe.nom[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[var(--ht-text)] truncate group-hover:text-[var(--ht-primary)] transition-colors">
                                                    {employe.prenom} {employe.nom}
                                                </p>
                                                <p className="text-xs text-[var(--ht-text-muted)]">{employe.matricule}</p>
                                            </div>
                                        </div>

                                        {/* Rôle (modifiable) */}
                                        <div className="col-span-2">
                                            <select
                                                value={employe.role}
                                                onChange={e => handleRoleChange(employe, e.target.value as RoleEmploye)}
                                                disabled={isSelf}
                                                title={isSelf ? 'Tu ne peux pas changer ton propre rôle' : undefined}
                                                className="ht-input text-xs font-semibold px-2 py-1 rounded-full border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ backgroundColor: `${ROLE_COLORS[employe.role]}1A`, color: ROLE_COLORS[employe.role] }}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Spécialité */}
                                        <div className="col-span-2">
                                            <span className="text-xs text-[var(--ht-text-muted)]">
                                                {employe.specialite || <span className="text-[var(--ht-text-muted)]">—</span>}
                                            </span>
                                        </div>

                                        {/* Téléphone */}
                                        <div className="col-span-2">
                                            <span className="text-xs text-[var(--ht-text-muted)]">
                                                {employe.telephone || <span className="text-[var(--ht-text-muted)]">—</span>}
                                            </span>
                                        </div>

                                        {/* Statut */}
                                        <div className="col-span-1 flex justify-center">
                                            <button
                                                onClick={() => handleToggleActif(employe)}
                                                disabled={isSelf}
                                                title={isSelf ? 'Tu ne peux pas désactiver ton propre compte' : 'Cliquer pour changer le statut'}
                                                className="text-xs px-2.5 py-1 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={employe.actif
                                                    ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                                    : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }
                                                }>
                                                {employe.actif ? 'Actif' : 'Inactif'}
                                            </button>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 flex justify-end">
                                            <button
                                                onClick={() => handleDelete(employe)}
                                                disabled={isSelf}
                                                title={isSelf ? 'Tu ne peux pas supprimer ton propre compte' : 'Supprimer'}
                                                className="text-xs text-[var(--ht-danger)] hover:text-[var(--ht-danger)] disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-[var(--ht-danger-bg)] transition-colors"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Footer tableau */}
                    {employesFiltres.length > 0 && (
                        <div className="px-6 py-3 border-t border-[var(--ht-border)]">
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-[var(--ht-text-muted)]">
                                    {employesFiltres.length} employé{employesFiltres.length > 1 ? 's' : ''} au total
                                </p>
                                <p className="text-xs text-[var(--ht-text-muted)]">Le rôle et le statut sont modifiables directement dans le tableau</p>
                            </div>
                            <Pagination
                                page={pageCourante}
                                totalPages={totalPages}
                                totalItems={employesFiltres.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}