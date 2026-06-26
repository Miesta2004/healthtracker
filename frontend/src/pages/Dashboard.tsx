import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import type { Patient } from '../types'

// ─── Petit composant graphique barre ──────────────────────────────────────────
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
                <span>{label}</span>
                <span className="font-medium text-gray-700">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    )
}

// ─── Composant donut SVG simple ────────────────────────────────────────────────
function DonutChart({ actif, inactif }: { actif: number; inactif: number }) {
    const total = actif + inactif
    if (total === 0) return (
        <div className="flex items-center justify-center h-28 text-gray-300 text-sm">Aucune donnée</div>
    )
    const pct = actif / total
    const r = 40
    const circ = 2 * Math.PI * r
    const dash = pct * circ
    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke="#003152" strokeWidth="14"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={circ / 4}
                    strokeLinecap="round"
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

// ─── Composant stat card ───────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
    return (
        <div
            className="rounded-xl border p-5 flex flex-col gap-1"
            style={accent
                ? { backgroundColor: '#003152', borderColor: '#003152' }
                : { backgroundColor: 'white', borderColor: '#f3f4f6' }
            }
        >
            <p className={`text-xs font-medium ${accent ? 'text-blue-200' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-3xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className={`text-xs ${accent ? 'text-blue-300' : 'text-gray-400'}`}>{sub}</p>}
        </div>
    )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPatients()
            .then(setPatients)
            .catch(() => navigate('/login'))
            .finally(() => setLoading(false))
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
    }

    // Stats calculées
    const total = patients.length
    const actif = patients.filter(p => p.actif).length
    const inactif = total - actif
    const hommes = patients.filter(p => p.sexe === 'M').length
    const femmes = patients.filter(p => p.sexe === 'F').length

    // Groupes sanguins
    const groupes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    const groupCounts = groupes.map(g => ({
        g,
        count: patients.filter(p => p.groupe_sanguin === g).length,
    })).filter(x => x.count > 0)
    const maxGroup = Math.max(...groupCounts.map(x => x.count), 1)

    // 5 derniers patients
    const recent = [...patients].slice(-5).reverse()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── Navbar ── */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: '#003152' }}
                    >
                        🏥
                    </div>
                    <span className="font-semibold text-gray-900">HealthTracker</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/patients/newPatient')}
                        className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: '#003152' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                    >
                        + Nouveau patient
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-8 w-full space-y-8">

                {/* ── Titre ── */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                    <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre activité médicale</p>
                </div>

                {/* ── Stats rapides ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total patients" value={total} sub="inscrits" accent />
                    <StatCard label="Patients actifs" value={actif} sub={total > 0 ? `${Math.round(actif/total*100)}% du total` : '—'} />
                    <StatCard label="Patients inactifs" value={inactif} />
                    <StatCard label="Consultations" value="—" sub="bientôt disponible" />
                </div>

                {/* ── Graphiques ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Donut actifs/inactifs */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Statut des patients</h3>
                        {loading
                            ? <div className="text-center text-gray-300 text-sm py-8">Chargement...</div>
                            : <DonutChart actif={actif} inactif={inactif} />
                        }
                    </div>

                    {/* Barres répartition par sexe */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition par sexe</h3>
                        {loading
                            ? <div className="text-center text-gray-300 text-sm py-8">Chargement...</div>
                            : (
                                <div className="space-y-4 pt-2">
                                    <MiniBar label="Masculin" value={hommes} max={total} color="#003152" />
                                    <MiniBar label="Féminin" value={femmes} max={total} color="#ADDFF1" />
                                    <div className="pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                                        <span>Total : {total} patient{total > 1 ? 's' : ''}</span>
                                        {total > 0 && <span>{Math.round(hommes/total*100)}% H · {Math.round(femmes/total*100)}% F</span>}
                                    </div>
                                </div>
                            )
                        }
                    </div>

                    {/* Groupes sanguins */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Groupes sanguins</h3>
                        {loading
                            ? <div className="text-center text-gray-300 text-sm py-8">Chargement...</div>
                            : groupCounts.length === 0
                                ? <div className="text-center text-gray-300 text-sm py-8">Aucune donnée</div>
                                : (
                                    <div className="space-y-3">
                                        {groupCounts.map(({ g, count }) => (
                                            <MiniBar key={g} label={g} value={count} max={maxGroup} color="#ADDFF1" />
                                        ))}
                                    </div>
                                )
                        }
                    </div>
                </div>

                {/* ── Liste patients ── */}
                <div className="bg-white rounded-xl border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Liste des patients</h2>
                        <span className="text-sm text-gray-400">{total} au total</span>
                    </div>

                    {loading ? (
                        <div className="px-6 py-12 text-center text-gray-300 text-sm">Chargement...</div>
                    ) : patients.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-4xl mb-3">👤</p>
                            <p className="text-gray-400 text-sm">Aucun patient pour le moment</p>
                            <button
                                onClick={() => navigate('/patients/new')}
                                className="mt-4 text-sm font-medium px-4 py-2 rounded-lg text-white"
                                style={{ backgroundColor: '#003152' }}
                            >
                                Ajouter un patient
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {patients.map(patient => (
                                <div
                                    key={patient.id}
                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                                            style={{ backgroundColor: '#003152' }}
                                        >
                                            {patient.prenom[0]}{patient.nom[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {patient.prenom} {patient.nom}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {patient.groupe_sanguin && `Groupe ${patient.groupe_sanguin} · `}
                                                {patient.sexe === 'M' ? 'Masculin' : 'Féminin'}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                            patient.actif
                                                ? 'text-white'
                                                : 'bg-gray-100 text-gray-400'
                                        }`}
                                        style={patient.actif ? { backgroundColor: '#003152' } : {}}
                                    >
                                        {patient.actif ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Patients récents ── */}
                {recent.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Derniers patients ajoutés</h3>
                        <div className="flex flex-wrap gap-3">
                            {recent.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => navigate(`/patients/${p.id}`)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 text-sm text-gray-700 transition-colors"
                                >
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                        style={{ backgroundColor: '#ADDFF1', color: '#003152' }}
                                    >
                                        {p.prenom[0]}{p.nom[0]}
                                    </div>
                                    {p.prenom} {p.nom}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
