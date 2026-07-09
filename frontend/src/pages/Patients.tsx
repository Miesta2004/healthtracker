import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import type { Patient } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonKpiGrid, SkeletonChartCard, SkeletonTable, SkeletonSimpleList } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import { Users, AlertTriangle, ClipboardList, UserPlus, Building2, Search, SearchX, Droplet, UserX } from 'lucide-react'

const PAGE_SIZE = 20

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

function DonutChart({ actif, inactif }: { actif: number; inactif: number }) {
    const total = actif + inactif
    if (total === 0) return <div className="flex items-center justify-center h-28 text-[var(--ht-text-muted)] text-sm">Aucune donnée</div>
    const pct = actif / total
    const r = 40, circ = 2 * Math.PI * r, dash = pct * circ
    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ht-border-input)" strokeWidth="14" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ht-primary)" strokeWidth="14"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={circ / 4} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }} />
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

export default function Patients() {
    const navigate = useNavigate()
    const { user, hasRole } = useAuth()
    const isNurse = hasRole('infirmier')

    const [patients, setPatients] = useState<Patient[]>([])
    const [loading,  setLoading]  = useState(true)

    const [search,       setSearch]       = useState('')
    const [filterSexe,   setFilterSexe]   = useState<'tous' | 'M' | 'F'>('tous')
    const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'inactif'>('tous')
    const [filterGroupe, setFilterGroupe] = useState('')
    const [sortBy,       setSortBy]       = useState<'nom' | 'date'>('nom')
    const [page,         setPage]         = useState(1)

    // Recherche ciblée pour infirmier
    const [nurseQuery,    setNurseQuery]    = useState('')
    const [nurseSearched, setNurseSearched] = useState(false)

    // Chargement liste complète (non-infirmiers)
    useEffect(() => {
        if (isNurse) { setLoading(false); return }
        getPatients()
            .then(setPatients)
            .catch(() => navigate('/login'))
            .finally(() => setLoading(false))
    }, [isNurse])

    // Recherche avec debounce pour infirmier
    useEffect(() => {
        if (!isNurse) return
        const q = nurseQuery.trim()
        if (q.length < 2) { setPatients([]); setNurseSearched(false); return }
        setLoading(true)
        const timeout = setTimeout(() => {
            getPatients(q)
                .then(res => { setPatients(res); setNurseSearched(true) })
                .catch(() => setPatients([]))
                .finally(() => setLoading(false))
        }, 350)
        return () => clearTimeout(timeout)
    }, [isNurse, nurseQuery])

    const total           = patients.length
    const actif           = patients.filter(p => p.actif).length
    const inactif         = total - actif
    const hommes          = patients.filter(p => p.sexe === 'M').length
    const femmes          = patients.filter(p => p.sexe === 'F').length
    const avecAllergies   = patients.filter(p => p.allergies?.trim()).length
    const avecAntecedents = patients.filter(p => (p.antecedents ?? '').trim()).length
    const nouveauCeMois   = patients.filter(p => {
        const d = new Date(p.date_creation), now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    const groupes     = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    const groupCounts = groupes.map(g => ({ g, count: patients.filter(p => p.groupe_sanguin === g).length })).filter(x => x.count > 0)
    const maxGroup    = Math.max(...groupCounts.map(x => x.count), 1)

    const patientsFiltres = useMemo(() => {
        let result = [...patients]
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(p =>
                p.nom.toLowerCase().includes(q) ||
                p.prenom.toLowerCase().includes(q) ||
                (p.telephone?.includes(q)) ||
                (p.groupe_sanguin?.toLowerCase().includes(q))
            )
        }
        if (filterSexe !== 'tous')      result = result.filter(p => p.sexe === filterSexe)
        if (filterStatut === 'actif')   result = result.filter(p => p.actif)
        if (filterStatut === 'inactif') result = result.filter(p => !p.actif)
        if (filterGroupe)               result = result.filter(p => p.groupe_sanguin === filterGroupe)
        result.sort((a, b) => sortBy === 'nom'
            ? a.nom.localeCompare(b.nom)
            : new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
        )
        return result
    }, [patients, search, filterSexe, filterStatut, filterGroupe, sortBy])

    const hasActiveFilters = search || filterSexe !== 'tous' || filterStatut !== 'tous' || filterGroupe
    const resetFilters = () => { setSearch(''); setFilterSexe('tous'); setFilterStatut('tous'); setFilterGroupe(''); setPage(1) }

    useEffect(() => { setPage(1) }, [search, filterSexe, filterStatut, filterGroupe, sortBy])

    const totalPages    = Math.max(1, Math.ceil(patientsFiltres.length / PAGE_SIZE))
    const pageCourante  = Math.min(page, totalPages)
    const patientsPage  = patientsFiltres.slice((pageCourante - 1) * PAGE_SIZE, pageCourante * PAGE_SIZE)

    return (
        <div className="ht-page">
            <Sidebar />
            <main className="ht-page-content max-w-7xl space-y-8">

                {/* ── Titre ── */}
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--ht-text)]">Patients</h1>
                    <p className="text-[var(--ht-text-muted)] text-sm mt-1">
                        {isNurse
                            ? 'Recherchez un patient de votre service pour accéder à son dossier'
                            : "Gérez les dossiers des patients de l'établissement"}
                    </p>
                </div>

                {/* ══════════════ VUE INFIRMIER ══════════════ */}
                {isNurse && (
                    <div className="space-y-6">
                        {/* Bandeau service */}
                        <div className="ht-card p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                                 style={{ backgroundColor: 'var(--ht-primary-light)' }}><Building2 size={18} style={{ color: 'var(--ht-primary)' }} /></div>
                            <div>
                                <p className="text-xs text-[var(--ht-text-muted)] mb-0.5">Votre service</p>
                                <p className="text-sm font-semibold text-[var(--ht-text)]">
                                    {user?.service_nom ?? <span className="text-[var(--ht-text-muted)] italic">Non assigné(e) à un service</span>}
                                </p>
                                <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">
                                    La recherche porte uniquement sur les patients de ce service.
                                </p>
                            </div>
                        </div>

                        {/* Champ de recherche */}
                        <div className="ht-card p-6">
                            <h2 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-1">Rechercher un patient</h2>
                            <p className="text-xs text-[var(--ht-text-muted)] mb-4">
                                Tapez un nom, prénom ou numéro de dossier (au moins 2 caractères).
                            </p>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ht-text-muted)' }} />
                                <input
                                    type="text" autoFocus
                                    value={nurseQuery}
                                    onChange={e => setNurseQuery(e.target.value)}
                                    placeholder="Ex : Diallo, Fatou, P123456..."
                                    className="ht-input w-full pl-9 pr-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>

                        {/* Résultats */}
                        <div className="ht-card">
                            {nurseQuery.trim().length < 2 ? (
                                <div className="px-6 py-16 text-center">
                                    <Search size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-[var(--ht-text-muted)] text-sm">Entrez au moins 2 caractères pour lancer la recherche</p>
                                </div>
                            ) : loading ? (
                                <SkeletonSimpleList rows={3} />
                            ) : patients.length === 0 && nurseSearched ? (
                                <div className="px-6 py-16 text-center">
                                    <UserX size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-[var(--ht-text-muted)] text-sm">Aucun patient trouvé pour « {nurseQuery} »</p>
                                </div>
                            ) : (
                                <div>
                                    {patients.map(p => (
                                        <div key={p.id}
                                             onClick={() => navigate(`/patients/${p.id}`)}
                                             className="ht-table-row group" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                                            <div className="ht-avatar ht-avatar-md">
                                                {p.prenom[0]}{p.nom[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[var(--ht-text)] truncate group-hover:text-[var(--ht-primary)] transition-colors">
                                                    {p.prenom} {p.nom}
                                                </p>
                                                <p className="text-xs text-[var(--ht-text-muted)]">
                                                    {(p as any).numero_dossier} · {p.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}
                                                </p>
                                            </div>
                                            {p.groupe_sanguin && (
                                                <span className="badge badge-tint font-semibold flex items-center gap-1">
                                                    <Droplet size={11} /> {p.groupe_sanguin}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════ VUE MÉDECIN / ADMIN / SECRÉTAIRE ══════════════ */}
                {!isNurse && (
                    <>
                        {/* Actions */}
                        {hasRole('admin', 'medecin', 'secretaire') && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/patients/newPatient')}
                                    className="btn btn-primary"
                                >
                                    + Nouveau patient
                                </button>
                                {hasActiveFilters && (
                                    <button onClick={resetFilters}
                                            className="text-xs text-[var(--ht-danger)] hover:text-[var(--ht-danger)] px-3 py-2 rounded-lg hover:bg-[var(--ht-danger-bg)] transition-colors">
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>
                        )}

                        {/* KPIs */}
                        {loading ? <SkeletonKpiGrid /> : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard label="Total patients"    value={total}           icon={Users} accent
                                         sub={total > 0 ? `${actif} actif${actif > 1 ? 's' : ''}` : 'Aucun patient'} />
                                <KpiCard label="Avec allergies"    value={avecAllergies}   icon={AlertTriangle}
                                         sub={total > 0 ? `${Math.round(avecAllergies / total * 100)}% des patients` : '—'} />
                                <KpiCard label="Avec antécédents"  value={avecAntecedents} icon={ClipboardList}
                                         sub={total > 0 ? `${Math.round(avecAntecedents / total * 100)}% des patients` : '—'} />
                                <KpiCard label="Ajoutés ce mois"   value={nouveauCeMois}   icon={UserPlus}
                                         sub={nouveauCeMois > 0 ? 'depuis le 1er du mois' : 'Aucun ce mois'} />
                            </div>
                        )}

                        {/* Graphiques */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SkeletonChartCard /><SkeletonChartCard /><SkeletonChartCard />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="ht-card p-6">
                                    <h3 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-4">Statut des patients</h3>
                                    <DonutChart actif={actif} inactif={inactif} />
                                </div>
                                <div className="ht-card p-6">
                                    <h3 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-4">Répartition par sexe</h3>
                                    <div className="space-y-4 pt-2">
                                        <MiniBar label="Masculin" value={hommes} max={total} color="var(--ht-primary)" />
                                        <MiniBar label="Féminin"  value={femmes} max={total} color="var(--ht-primary-tint)" />
                                        <div className="pt-2 border-t border-[var(--ht-border)] flex justify-between text-xs text-[var(--ht-text-muted)]">
                                            <span>Total : {total} patient{total > 1 ? 's' : ''}</span>
                                            {total > 0 && <span>{Math.round(hommes / total * 100)}% H · {Math.round(femmes / total * 100)}% F</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="ht-card p-6">
                                    <h3 className="text-sm font-semibold text-[var(--ht-text-secondary)] mb-4">Groupes sanguins</h3>
                                    {groupCounts.length === 0
                                        ? <div className="text-center text-[var(--ht-text-muted)] text-sm py-8">Aucune donnée</div>
                                        : <div className="space-y-3">
                                            {groupCounts.map(({ g, count }) => (
                                                <MiniBar key={g} label={g} value={count} max={maxGroup} color="var(--ht-primary-tint)" />
                                            ))}
                                        </div>}
                                </div>
                            </div>
                        )}

                        {/* Tableau */}
                        <div className="ht-card">
                            <div className="px-6 py-4 border-b border-[var(--ht-border)] space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold text-[var(--ht-text)]">Liste des patients</h2>
                                        <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">
                                            {hasActiveFilters
                                                ? `${patientsFiltres.length} résultat${patientsFiltres.length > 1 ? 's' : ''} sur ${total}`
                                                : `${total} patient${total > 1 ? 's' : ''} au total`}
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
                                                className="ht-input text-xs px-2 py-1.5 text-[var(--ht-text-secondary)]">
                                            <option value="nom">Trier : A → Z</option>
                                            <option value="date">Trier : plus récents</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <div className="relative flex-1 min-w-48">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ht-text-muted)' }} />
                                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                               placeholder="Rechercher un patient..."
                                               className="ht-input w-full pl-8 pr-3 py-1.5 text-sm"/>
                                    </div>
                                    <div className="flex rounded-lg border border-[var(--ht-border-input)] overflow-hidden text-xs">
                                        {(['tous', 'M', 'F'] as const).map(s => (
                                            <button key={s} onClick={() => setFilterSexe(s)} className="px-3 py-1.5 transition-colors"
                                                    style={filterSexe === s ? { backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' } : { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-muted)' }}>
                                                {s === 'tous' ? 'Tous' : s === 'M' ? '♂ Hommes' : '♀ Femmes'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex rounded-lg border border-[var(--ht-border-input)] overflow-hidden text-xs">
                                        {(['tous', 'actif', 'inactif'] as const).map(s => (
                                            <button key={s} onClick={() => setFilterStatut(s)} className="px-3 py-1.5 transition-colors capitalize"
                                                    style={filterStatut === s ? { backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' } : { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-muted)' }}>
                                                {s === 'tous' ? 'Tous' : s === 'actif' ? '● Actifs' : '○ Inactifs'}
                                            </button>
                                        ))}
                                    </div>
                                    <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
                                            className="ht-input text-xs px-2 py-1.5 text-[var(--ht-text-secondary)]">
                                        <option value="">Groupe sanguin</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {!loading && patientsFiltres.length > 0 && (
                                <div className="ht-table-header grid-cols-12">
                                    <div className="col-span-4">Patient</div>
                                    <div className="col-span-1 text-center">Âge</div>
                                    <div className="col-span-2 text-center">Groupe</div>
                                    <div className="col-span-2">Téléphone</div>
                                    <div className="col-span-2">Allergies</div>
                                    <div className="col-span-1 text-center">Statut</div>
                                </div>
                            )}

                            {loading ? (
                                <SkeletonTable rows={6} />
                            ) : patients.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <Users size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-[var(--ht-text-muted)] text-sm">Aucun patient pour le moment</p>
                                </div>
                            ) : patientsFiltres.length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <SearchX size={30} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-[var(--ht-text-muted)] text-sm">Aucun patient ne correspond aux filtres</p>
                                    <button onClick={resetFilters} className="mt-3 text-sm text-[var(--ht-danger)] hover:text-[var(--ht-danger)]">
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {patientsPage.map(patient => {
                                        const allergies = patient.allergies
                                            ? patient.allergies.split(',').map(s => s.trim()).filter(Boolean)
                                            : []
                                        return (
                                            <div key={patient.id}
                                                 onClick={() => navigate(`/patients/${patient.id}`)}
                                                 className="ht-table-row grid-cols-12 group">
                                                <div className="col-span-4 flex items-center gap-3">
                                                    <div className="ht-avatar ht-avatar-md">
                                                        {patient.prenom[0]}{patient.nom[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-[var(--ht-text)] truncate group-hover:text-[var(--ht-primary)] transition-colors">
                                                            {patient.prenom} {patient.nom}
                                                        </p>
                                                        <p className="text-xs text-[var(--ht-text-muted)]">
                                                            {patient.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="col-span-1 text-center">
                                                    <span className="text-sm font-medium text-[var(--ht-text-secondary)]">{patient.age ?? '—'}</span>
                                                    <span className="text-xs text-[var(--ht-text-muted)]"> ans</span>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    {patient.groupe_sanguin
                                                        ? <span className="badge badge-tint font-semibold flex items-center gap-1">
                                                            <Droplet size={11} /> {patient.groupe_sanguin}
                                                          </span>
                                                        : <span className="text-xs text-[var(--ht-text-muted)]">—</span>}
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-xs text-[var(--ht-text-muted)]">
                                                        {patient.telephone || <span className="text-[var(--ht-text-muted)]">—</span>}
                                                    </span>
                                                </div>
                                                <div className="col-span-2">
                                                    {allergies.length === 0
                                                        ? <span className="text-xs text-[var(--ht-text-muted)]">Aucune</span>
                                                        : <span className="badge badge-danger flex items-center gap-1">
                                                            <AlertTriangle size={11} /> {allergies.length} allergie{allergies.length > 1 ? 's' : ''}
                                                          </span>}
                                                </div>
                                                <div className="col-span-1 flex justify-center">
                                                    <span className={`badge ${patient.actif ? 'badge-primary' : 'badge-muted'}`}>
                                                        {patient.actif ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {patientsFiltres.length > 0 && (
                                <div className="px-6 py-3 border-t border-[var(--ht-border)]">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-[var(--ht-text-muted)]">
                                            {patientsFiltres.length} patient{patientsFiltres.length > 1 ? 's' : ''} au total
                                        </p>
                                        <p className="text-xs text-[var(--ht-text-muted)]">Cliquer sur une ligne pour voir le dossier</p>
                                    </div>
                                    <Pagination
                                        page={pageCourante}
                                        totalPages={totalPages}
                                        totalItems={patientsFiltres.length}
                                        pageSize={PAGE_SIZE}
                                        onPageChange={setPage}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}