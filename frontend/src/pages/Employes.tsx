import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEmployes, getMe, updateEmploye, deleteEmploye } from '../api/comptes'
import type { Employe, RoleEmploye, CurrentUser } from '../types'


// ─── Constantes rôles ─────────────────────────────────────────────────────────
const ROLE_LABELS: Record<RoleEmploye, string> = {
    admin: 'Administrateur',
    medecin: 'Médecin',
    infirmier: 'Infirmier(ère)',
    secretaire: 'Secrétaire',
    laborantin: 'Laborantin',
}
const ROLE_COLORS: Record<RoleEmploye, string> = {
    admin: '#003152',
    medecin: '#0e7490',
    infirmier: '#16a34a',
    secretaire: '#9333ea',
    laborantin: '#ea580c',
}
const ROLES: RoleEmploye[] = ['admin', 'medecin', 'infirmier', 'secretaire', 'laborantin']

// ─── Mini barre ───────────────────────────────────────────────────────────────
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
                <span>{label}</span>
                <span className="font-medium text-gray-700">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

// ─── Donut actif/inactif ──────────────────────────────────────────────────────
function DonutChart({ actif, inactif }: { actif: number; inactif: number }) {
    const total = actif + inactif
    if (total === 0) return <div className="flex items-center justify-center h-28 text-gray-300 text-sm">Aucune donnée</div>
    const pct = actif / total
    const r = 40
    const circ = 2 * Math.PI * r
    const dash = pct * circ
    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="#003152" strokeWidth="14"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={circ / 4} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#003152">
                    {Math.round(pct * 100)}%
                </text>
            </svg>
            <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#003152' }} />
                    Actifs ({actif})
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
                    Inactifs ({inactif})
                </span>
            </div>
        </div>
    )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent }: {
    label: string; value: string | number; sub?: string; icon: string; accent?: boolean
}) {
    return (
        <div className="rounded-xl border p-5 flex items-start gap-4"
             style={accent
                 ? { backgroundColor: '#003152', borderColor: '#003152' }
                 : { backgroundColor: 'white', borderColor: '#f3f4f6' }
             }
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={accent
                     ? { backgroundColor: 'rgba(173,223,241,0.15)' }
                     : { backgroundColor: '#f8fafc' }
                 }>
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


// ─── Page principale ──────────────────────────────────────────────────────────
export default function Employes() {
    const navigate = useNavigate()
    const [employes, setEmployes] = useState<Employe[]>([])
    const [loading, setLoading] = useState(true)
    const [checkingAccess, setCheckingAccess] = useState(true)
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
    const [actionError, setActionError] = useState('')

    // Filtres
    const [search, setSearch] = useState('')
    const [filterRole, setFilterRole] = useState<'tous' | RoleEmploye>('tous')
    const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'inactif'>('tous')
    const [sortBy, setSortBy] = useState<'nom' | 'date'>('nom')

    // ── Vérification d'accès (admin uniquement) ──
    useEffect(() => {
        getMe()
            .then(me => {
                setCurrentUser(me)
                if (me.role !== 'admin') {
                    navigate('/dashboard')
                    return
                }
                setCheckingAccess(false)
                return getEmployes().then(setEmployes)
            })
            .catch(() => navigate('/login'))
            .finally(() => setLoading(false))
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
    }

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

        result.sort((a, b) => {
            if (sortBy === 'nom') return a.nom.localeCompare(b.nom)
            return new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
        })

        return result
    }, [employes, search, filterRole, filterStatut, sortBy])

    const hasActiveFilters = search || filterRole !== 'tous' || filterStatut !== 'tous'

    const resetFilters = () => {
        setSearch('')
        setFilterRole('tous')
        setFilterStatut('tous')
    }

    if (checkingAccess) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-300 text-sm">Vérification des droits...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── Navbar ── */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                        ← Tableau de bord
                    </button>
                    <span className="text-gray-200">|</span>
                    <span className="font-semibold text-gray-900 text-base">Employés</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/employes/newEmploye')}
                        className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: '#003152' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                    >
                        + Nouvel employé
                    </button>
                    <button onClick={() => navigate('/services')}
                            className="text-sm text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                        Services
                    </button>
                    <button onClick={handleLogout}
                            className="text-sm text-gray-400 hover:text-gray-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-8 w-full space-y-8">

                {/* ── Titre ── */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des employés</h1>
                    <p className="text-gray-400 text-sm mt-1">Comptes et rôles du personnel médical et administratif</p>
                </div>

                {actionError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {actionError}
                    </div>
                )}

                {/* ── 4 KPIs ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                        label="Total employés" value={total} icon="👥"
                        sub={total > 0 ? `${actif} actif${actif > 1 ? 's' : ''}` : 'Aucun employé'}
                        accent
                    />
                    <KpiCard
                        label="Médecins" value={roleCounts.find(r => r.role === 'medecin')?.count ?? 0} icon="🩺"
                        sub={total > 0 ? `${Math.round((roleCounts.find(r => r.role === 'medecin')?.count ?? 0) / total * 100)}% de l'équipe` : '—'}
                    />
                    <KpiCard
                        label="Infirmiers(ères)" value={roleCounts.find(r => r.role === 'infirmier')?.count ?? 0} icon="💉"
                        sub={total > 0 ? `${Math.round((roleCounts.find(r => r.role === 'infirmier')?.count ?? 0) / total * 100)}% de l'équipe` : '—'}
                    />
                    <KpiCard
                        label="Ajoutés ce mois" value={nouveauCeMois} icon="🆕"
                        sub={nouveauCeMois > 0 ? 'depuis le 1er du mois' : 'Aucun ce mois'}
                    />
                </div>

                {/* ── Graphiques ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Statut des comptes</h3>
                        {loading
                            ? <div className="text-center text-gray-300 text-sm py-8">Chargement...</div>
                            : <DonutChart actif={actif} inactif={inactif} />
                        }
                    </div>

                    <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition par rôle</h3>
                        {loading
                            ? <div className="text-center text-gray-300 text-sm py-8">Chargement...</div>
                            : (
                                <div className="space-y-3">
                                    {roleCounts.map(({ role, count }) => (
                                        <MiniBar key={role} label={ROLE_LABELS[role]} value={count} max={maxRoleCount} color={ROLE_COLORS[role]} />
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* ── Tableau employés avec filtres ── */}
                <div className="bg-white rounded-xl border border-gray-100">

                    {/* Header + filtres */}
                    <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-900">Liste des employés</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {hasActiveFilters
                                        ? `${employesFiltres.length} résultat${employesFiltres.length > 1 ? 's' : ''} sur ${total}`
                                        : `${total} employé${total > 1 ? 's' : ''} au total`
                                    }
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasActiveFilters && (
                                    <button onClick={resetFilters}
                                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                        Réinitialiser
                                    </button>
                                )}
                                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'nom' | 'date')}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none"
                                        onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                        onBlur={e => e.target.style.boxShadow = 'none'}
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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
                                <input
                                    type="text" value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Rechercher un employé..."
                                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                    onBlur={e => e.target.style.boxShadow = 'none'}
                                />
                            </div>

                            {/* Statut */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                {(['tous', 'actif', 'inactif'] as const).map(s => (
                                    <button key={s} onClick={() => setFilterStatut(s)}
                                            className="px-3 py-1.5 transition-colors capitalize"
                                            style={filterStatut === s
                                                ? { backgroundColor: '#003152', color: 'white' }
                                                : { backgroundColor: 'white', color: '#6b7280' }
                                            }>
                                        {s === 'tous' ? 'Tous' : s === 'actif' ? '● Actifs' : '○ Inactifs'}
                                    </button>
                                ))}
                            </div>

                            {/* Rôle */}
                            <select value={filterRole} onChange={e => setFilterRole(e.target.value as 'tous' | RoleEmploye)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none"
                                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                    onBlur={e => e.target.style.boxShadow = 'none'}
                            >
                                <option value="tous">Tous les rôles</option>
                                {ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* En-têtes colonnes */}
                    {!loading && employesFiltres.length > 0 && (
                        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
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
                        <div className="px-6 py-12 text-center text-gray-300 text-sm">Chargement...</div>
                    ) : employes.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-4xl mb-3">🧑‍⚕️</p>
                            <p className="text-gray-400 text-sm">Aucun employé pour le moment</p>
                            <button onClick={() => navigate('/employes/new')}
                                    className="mt-4 text-sm font-medium px-4 py-2 rounded-lg text-white"
                                    style={{ backgroundColor: '#003152' }}>
                                Ajouter le premier employé
                            </button>
                        </div>
                    ) : employesFiltres.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-3xl mb-3">🔍</p>
                            <p className="text-gray-400 text-sm">Aucun employé ne correspond aux filtres</p>
                            <button onClick={resetFilters}
                                    className="mt-3 text-sm text-red-400 hover:text-red-600">
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {employesFiltres.map(employe => {
                                const isSelf = currentUser?.username === employe.username
                                return (
                                    <div key={employe.id}
                                         className="px-6 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Employé */}
                                        <div className="col-span-3 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                                                 style={{ backgroundColor: ROLE_COLORS[employe.role] }}>
                                                {employe.prenom[0]}{employe.nom[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {employe.prenom} {employe.nom}
                                                </p>
                                                <p className="text-xs text-gray-400">{employe.matricule}</p>
                                            </div>
                                        </div>

                                        {/* Rôle (modifiable) */}
                                        <div className="col-span-2">
                                            <select
                                                value={employe.role}
                                                onChange={e => handleRoleChange(employe, e.target.value as RoleEmploye)}
                                                disabled={isSelf}
                                                title={isSelf ? 'Tu ne peux pas changer ton propre rôle' : undefined}
                                                className="text-xs font-semibold px-2 py-1 rounded-full border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ backgroundColor: `${ROLE_COLORS[employe.role]}1A`, color: ROLE_COLORS[employe.role] }}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Spécialité */}
                                        <div className="col-span-2">
                                            <span className="text-xs text-gray-500">
                                                {employe.specialite || <span className="text-gray-300">—</span>}
                                            </span>
                                        </div>

                                        {/* Téléphone */}
                                        <div className="col-span-2">
                                            <span className="text-xs text-gray-500">
                                                {employe.telephone || <span className="text-gray-300">—</span>}
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
                                                    ? { backgroundColor: '#003152', color: 'white' }
                                                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
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
                                                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-red-50 transition-colors"
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
                        <div className="px-6 py-3 border-t border-gray-50 flex justify-between items-center">
                            <p className="text-xs text-gray-400">
                                {employesFiltres.length} employé{employesFiltres.length > 1 ? 's' : ''} affiché{employesFiltres.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-300">Le rôle et le statut sont modifiables directement dans le tableau</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
