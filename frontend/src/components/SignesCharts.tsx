import { useState, useMemo } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import type { SignesVitaux } from '../types'

interface Props { data: SignesVitaux[] }

// ─── Config de chaque signe vital ────────────────────────────────────────────
const SIGNES_CONFIG = {
    tension: {
        key: 'tension',
        label: 'Tension artérielle',
        unit: 'mmHg',
        color: '#3B82F6',
        colorSec: '#93C5FD',
        icon: '🫀',
        domain: [50, 200] as [number, number],
        normal: { min: 90, max: 140 },
        description: 'Pression exercée par le sang sur les parois des artères.',
        alertMin: 90,
        alertMax: 140,
    },
    glycemie: {
        key: 'glycemie',
        label: 'Glycémie',
        unit: 'mmol/L',
        color: '#10B981',
        icon: '🩸',
        domain: [2, 12] as [number, number],
        normal: { min: 3.9, max: 7.0 },
        description: 'Taux de glucose dans le sang. À jeun : 3,9 – 5,6 mmol/L.',
        alertMin: 3.9,
        alertMax: 7.8,
    },
    temperature: {
        key: 'temperature',
        label: 'Température',
        unit: '°C',
        color: '#F59E0B',
        icon: '🌡️',
        domain: [35, 42] as [number, number],
        normal: { min: 36.1, max: 37.5 },
        description: 'Température corporelle normale : 36,1 – 37,5 °C.',
        alertMin: 36.1,
        alertMax: 38.0,
    },
    poids: {
        key: 'poids',
        label: 'Poids',
        unit: 'kg',
        color: '#8B5CF6',
        icon: '⚖️',
        domain: [30, 150] as [number, number],
        normal: null,
        description: 'Évolution du poids corporel du patient.',
        alertMin: null,
        alertMax: null,
    },
    frequence_cardiaque: {
        key: 'frequence_cardiaque',
        label: 'Fréquence cardiaque',
        unit: 'bpm',
        color: '#EF4444',
        icon: '💓',
        domain: [30, 150] as [number, number],
        normal: { min: 60, max: 100 },
        description: 'Nombre de battements cardiaques par minute au repos.',
        alertMin: 50,
        alertMax: 100,
    },
}

type SigneKey = keyof typeof SIGNES_CONFIG

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function fmtFull(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtHour(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getVal(s: SignesVitaux, key: SigneKey): number | null {
    if (key === 'tension') return s.tension_systolique
    return s[key as keyof SignesVitaux] as number | null
}

// ─── Mini stat box ────────────────────────────────────────────────────────────
function StatBox({ label, value, unit, highlight = false }: {
    label: string; value: string; unit: string; highlight?: boolean
}) {
    return (
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: highlight ? 'var(--ht-primary)' : 'var(--ht-bg)' }}>
            <p className="text-xs mb-1" style={{ color: highlight ? 'var(--ht-primary-tint)' : 'var(--ht-text-muted)' }}>{label}</p>
            <p className="text-lg font-bold" style={{ color: highlight ? 'white' : 'var(--ht-text)' }}>{value}</p>
            <p className="text-xs" style={{ color: highlight ? 'var(--ht-primary-tint)' : 'var(--ht-muted)' }}>{unit}</p>
        </div>
    )
}

// ─── Sidebar détail ───────────────────────────────────────────────────────────
function DetailSidebar({ signeKey, data, onClose }: {
    signeKey: SigneKey
    data: SignesVitaux[]
    onClose: () => void
}) {
    const cfg = SIGNES_CONFIG[signeKey]
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Données 30 jours
    const vals30 = sorted
        .map(s => ({ date: s.date, val: getVal(s, signeKey) }))
        .filter(x => x.val !== null) as { date: string; val: number }[]

    // Données 24 dernières heures
    const now = Date.now()
    const vals24h = sorted
        .filter(s => now - new Date(s.date).getTime() <= 24 * 3600 * 1000)
        .map(s => ({ date: s.date, val: getVal(s, signeKey) }))
        .filter(x => x.val !== null) as { date: string; val: number }[]

    // Stats
    const allVals = vals30.map(x => x.val)
    const max = allVals.length ? Math.max(...allVals) : null
    const min = allVals.length ? Math.min(...allVals) : null
    const avg = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length * 10) / 10 : null
    const last = vals30.length ? vals30[vals30.length - 1] : null
    const maxEntry = vals30.find(x => x.val === max)
    const minEntry = vals30.find(x => x.val === min)

    // Tendance (compare première moitié vs deuxième moitié)
    let tendance: 'hausse' | 'baisse' | 'stable' = 'stable'
    if (vals30.length >= 4) {
        const mid = Math.floor(vals30.length / 2)
        const avgFirst = vals30.slice(0, mid).reduce((a, b) => a + b.val, 0) / mid
        const avgSecond = vals30.slice(mid).reduce((a, b) => a + b.val, 0) / (vals30.length - mid)
        const diff = avgSecond - avgFirst
        if (diff > 2) tendance = 'hausse'
        else if (diff < -2) tendance = 'baisse'
    }

    const isAlert = last && cfg.alertMax && (last.val > cfg.alertMax || (cfg.alertMin && last.val < cfg.alertMin))

    // Format données pour recharts
    const chart30 = vals30.map(x => ({ date: fmt(x.date), val: x.val }))
    const chart24h = vals24h.map(x => ({ heure: fmtHour(x.date), val: x.val }))

    // Tension diastolique si applicable
    const chartTension = signeKey === 'tension' ? sorted.map(s => ({
        date: fmt(s.date),
        sys: s.tension_systolique,
        dia: s.tension_diastolique,
    })) : []

    return (
        <div
            className="fixed inset-0 z-40 flex justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={onClose}
        >
            <div
                className="h-full bg-white shadow-2xl overflow-y-auto"
                style={{ width: '420px', animation: 'slideIn 0.3s ease' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.icon}</span>
                        <div>
                            <h2 className="font-bold text-gray-900 text-base">{cfg.label}</h2>
                            <p className="text-xs text-gray-400">{cfg.unit} · 30 derniers jours</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">

                    {/* Alerte si hors norme */}
                    {isAlert && (
                        <div className="rounded-xl p-3 flex gap-2 items-start"
                             style={{ backgroundColor: 'var(--ht-danger-bg-light)', border: '1px solid #fecaca' }}>
                            <span>⚠️</span>
                            <div>
                                <p className="text-xs font-semibold text-red-700">Valeur hors norme</p>
                                <p className="text-xs text-red-500 mt-0.5">
                                    Dernière mesure : <strong>{last?.val} {cfg.unit}</strong> —
                                    norme : {cfg.alertMin} – {cfg.alertMax} {cfg.unit}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dernière valeur + tendance */}
                    <div className="rounded-2xl p-4 flex items-center justify-between"
                         style={{ backgroundColor: 'var(--ht-primary)' }}>
                        <div>
                            <p className="text-xs text-blue-300 mb-1">Dernière mesure</p>
                            <p className="text-3xl font-bold text-white">
                                {last ? last.val : '—'}
                                <span className="text-base font-normal text-blue-300 ml-1">{cfg.unit}</span>
                            </p>
                            {last && <p className="text-xs text-blue-400 mt-1">{fmtFull(last.date)}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-blue-300 mb-1">Tendance</p>
                            <p className="text-2xl">
                                {tendance === 'hausse' ? '📈' : tendance === 'baisse' ? '📉' : '➡️'}
                            </p>
                            <p className="text-xs text-blue-300 mt-1">
                                {tendance === 'hausse' ? 'En hausse' : tendance === 'baisse' ? 'En baisse' : 'Stable'}
                            </p>
                        </div>
                    </div>

                    {/* Stats min / max / moy */}
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Minimum" value={min !== null ? String(min) : '—'} unit={cfg.unit} />
                        <StatBox label="Moyenne" value={avg !== null ? String(avg) : '—'} unit={cfg.unit} highlight />
                        <StatBox label="Maximum" value={max !== null ? String(max) : '—'} unit={cfg.unit} />
                    </div>

                    {/* Dates min/max */}
                    {(minEntry || maxEntry) && (
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                            {minEntry && (
                                <div className="rounded-lg p-3 bg-gray-50">
                                    <p className="font-medium text-gray-700 mb-0.5">📉 Plus bas</p>
                                    <p className="font-bold text-gray-900">{min} {cfg.unit}</p>
                                    <p className="text-gray-400 mt-0.5">{fmtFull(minEntry.date)}</p>
                                </div>
                            )}
                            {maxEntry && (
                                <div className="rounded-lg p-3 bg-gray-50">
                                    <p className="font-medium text-gray-700 mb-0.5">📈 Plus haut</p>
                                    <p className="font-bold text-gray-900">{max} {cfg.unit}</p>
                                    <p className="text-gray-400 mt-0.5">{fmtFull(maxEntry.date)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Graphe 30 jours */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-3">Évolution sur 30 jours</p>
                        <ResponsiveContainer width="100%" height={180}>
                            {signeKey === 'tension' ? (
                                <LineChart data={chartTension}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[50, 200]} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                             formatter={(v, n) => [`${v} mmHg`, n === 'sys' ? 'Systolique' : 'Diastolique']} />
                                    {cfg.normal && <>
                                        <ReferenceLine y={cfg.normal.max} stroke="#fca5a5" strokeDasharray="4 2" />
                                        <ReferenceLine y={cfg.normal.min} stroke="#86efac" strokeDasharray="4 2" />
                                    </>}
                                    <Line type="monotone" dataKey="sys" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                                    <Line type="monotone" dataKey="dia" stroke="#93C5FD" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                                </LineChart>
                            ) : (
                                <AreaChart data={chart30}>
                                    <defs>
                                        <linearGradient id={`grad-${signeKey}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={cfg.color} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={cfg.domain} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                             formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
                                    {cfg.normal && <>
                                        <ReferenceLine y={cfg.normal.max} stroke="#fca5a5" strokeDasharray="4 2" />
                                        <ReferenceLine y={cfg.normal.min} stroke="#86efac" strokeDasharray="4 2" />
                                    </>}
                                    <Area type="monotone" dataKey="val" stroke={cfg.color} strokeWidth={2}
                                          fill={`url(#grad-${signeKey})`} dot={{ r: 2 }} connectNulls />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                        {cfg.normal && (
                            <div className="flex gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-300 inline-block" /> Limite haute</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-300 inline-block" /> Limite basse</span>
                            </div>
                        )}
                    </div>

                    {/* Graphe 24h */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Dernières 24 heures</p>
                        <p className="text-xs text-gray-400 mb-3">{chart24h.length} mesure{chart24h.length > 1 ? 's' : ''} enregistrée{chart24h.length > 1 ? 's' : ''}</p>
                        {chart24h.length === 0 ? (
                            <div className="rounded-xl bg-gray-50 p-6 text-center text-xs text-gray-300">
                                Aucune mesure dans les dernières 24h
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={150}>
                                <AreaChart data={chart24h}>
                                    <defs>
                                        <linearGradient id={`grad24-${signeKey}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={cfg.color} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="heure" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={cfg.domain} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                             formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
                                    <Area type="monotone" dataKey="val" stroke={cfg.color} strokeWidth={2}
                                          fill={`url(#grad24-${signeKey})`} dot={{ r: 3 }} connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Infos cliniques */}
                    <div className="rounded-xl p-4 text-xs text-gray-600 leading-relaxed"
                         style={{ backgroundColor: 'var(--ht-primary-light)', border: '1px solid var(--ht-primary-tint)' }}>
                        <p className="font-semibold text-gray-700 mb-1">ℹ️ Information clinique</p>
                        <p>{cfg.description}</p>
                        {cfg.normal && (
                            <p className="mt-1 font-medium" style={{ color: 'var(--ht-primary)' }}>
                                Valeurs normales : {cfg.normal.min} – {cfg.normal.max} {cfg.unit}
                            </p>
                        )}
                    </div>

                    {/* Historique des mesures */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-3">Historique complet</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {[...vals30].reverse().map((x, i) => {
                                const isHigh = cfg.alertMax && x.val > cfg.alertMax
                                const isLow = cfg.alertMin && x.val < cfg.alertMin
                                return (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg"
                                         style={{ backgroundColor: isHigh || isLow ? 'var(--ht-danger-bg-light)' : 'var(--ht-bg)' }}>
                                        <span className="text-xs text-gray-500">{fmtFull(x.date)}</span>
                                        <span className="text-sm font-semibold"
                                              style={{ color: isHigh || isLow ? '#dc2626' : 'var(--ht-primary)' }}>
                                            {x.val} {cfg.unit}
                                            {(isHigh || isLow) && <span className="ml-1 text-xs">⚠</span>}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Animation CSS */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </div>
    )
}

// ─── Card cliquable résumé ────────────────────────────────────────────────────
function SummaryCard({ signeKey, data, onClick }: {
    signeKey: SigneKey
    data: SignesVitaux[]
    onClick: () => void
}) {
    const cfg = SIGNES_CONFIG[signeKey]
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const vals = sorted.map(s => getVal(s, signeKey)).filter(v => v !== null) as number[]
    const last = vals.length ? vals[vals.length - 1] : null
    const prev = vals.length > 1 ? vals[vals.length - 2] : null
    const diff = last !== null && prev !== null ? Math.round((last - prev) * 10) / 10 : null
    const isAlert = last !== null && cfg.alertMax && (last > cfg.alertMax || (cfg.alertMin && last < cfg.alertMin))

    const chartData = sorted.slice(-10).map(s => ({
        val: signeKey === 'tension' ? s.tension_systolique : getVal(s, signeKey)
    }))

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group"
            style={{ borderColor: isAlert ? '#fecaca' : 'var(--ht-muted-bg)' }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.icon}</span>
                    <div>
                        <p className="text-xs font-semibold text-gray-700">{cfg.label}</p>
                        <p className="text-xs text-gray-400">{cfg.unit}</p>
                    </div>
                </div>
                {isAlert && <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">⚠ Alerte</span>}
            </div>

            {/* Mini sparkline */}
            <div className="mb-3">
                <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={chartData}>
                        <Line type="monotone" dataKey="val" stroke={isAlert ? '#ef4444' : cfg.color}
                              strokeWidth={1.5} dot={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-bold" style={{ color: isAlert ? '#dc2626' : 'var(--ht-text)' }}>
                        {last ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">{cfg.unit}</p>
                </div>
                <div className="text-right">
                    {diff !== null && (
                        <p className="text-xs font-medium" style={{ color: diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : 'var(--ht-muted)' }}>
                            {diff > 0 ? '▲' : diff < 0 ? '▼' : '─'} {Math.abs(diff)}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors mt-1">
                        Voir détails →
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SignesVitauxCharts({ data }: Props) {
    const [activeSigne, setActiveSigne] = useState<SigneKey | null>(null)

    const formatted = useMemo(() =>
            [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [data]
    )

    if (data.length === 0) return (
        <div className="ht-card p-6">
            <p className="text-sm text-gray-400 text-center py-8">
                Aucune mesure enregistrée pour ce patient
            </p>
        </div>
    )

    const chart30 = formatted.map(s => ({
        date: fmt(s.date),
        tension_systolique: s.tension_systolique,
        tension_diastolique: s.tension_diastolique,
        temperature: s.temperature ? Number(s.temperature) : null,
        poids: s.poids ? Number(s.poids) : null,
        glycemie: s.glycemie ? Number(s.glycemie) : null,
        frequence_cardiaque: s.frequence_cardiaque,
    }))

    return (
        <>
            {/* Sidebar */}
            {activeSigne && (
                <DetailSidebar
                    signeKey={activeSigne}
                    data={data}
                    onClose={() => setActiveSigne(null)}
                />
            )}

            <div className="space-y-5">

                {/* ── Cards résumé cliquables ── */}
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Dernières mesures
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(Object.keys(SIGNES_CONFIG) as SigneKey[]).map(key => (
                        <SummaryCard
                            key={key}
                            signeKey={key}
                            data={formatted}
                            onClick={() => setActiveSigne(key)}
                        />
                    ))}
                </div>

                {/* ── Graphe principal tension ── */}
                <ChartCard title="Tension artérielle" unit="mmHg" onClick={() => setActiveSigne('tension')}>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chart30}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ht-text-muted)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--ht-text-muted)' }} domain={[50, 200]} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                     formatter={(v, n) => [`${v} mmHg`, n === 'tension_systolique' ? 'Systolique' : 'Diastolique']} />
                            <ReferenceLine y={140} stroke="#fca5a5" strokeDasharray="4 2" />
                            <ReferenceLine y={90} stroke="#86efac" strokeDasharray="4 2" />
                            <Line type="monotone" dataKey="tension_systolique" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                            <Line type="monotone" dataKey="tension_diastolique" stroke="#93C5FD" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* ── Glycémie + Température ── */}
                <div className="grid grid-cols-2 gap-4">
                    <ChartCard title="Glycémie" unit="mmol/L" onClick={() => setActiveSigne('glycemie')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradGlyc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[2, 12]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                         formatter={(v) => [`${v} mmol/L`, 'Glycémie']} />
                                <ReferenceLine y={7.8} stroke="#fca5a5" strokeDasharray="4 2" />
                                <ReferenceLine y={3.9} stroke="#86efac" strokeDasharray="4 2" />
                                <Area type="monotone" dataKey="glycemie" stroke="#10B981" strokeWidth={2} fill="url(#gradGlyc)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Température" unit="°C" onClick={() => setActiveSigne('temperature')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[35, 42]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                         formatter={(v) => [`${v} °C`, 'Température']} />
                                <ReferenceLine y={38} stroke="#fca5a5" strokeDasharray="4 2" />
                                <ReferenceLine y={36.1} stroke="#86efac" strokeDasharray="4 2" />
                                <Area type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={2} fill="url(#gradTemp)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* ── Poids + FC ── */}
                <div className="grid grid-cols-2 gap-4">
                    <ChartCard title="Poids" unit="kg" onClick={() => setActiveSigne('poids')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradPoids" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                         formatter={(v) => [`${v} kg`, 'Poids']} />
                                <Area type="monotone" dataKey="poids" stroke="#8B5CF6" strokeWidth={2} fill="url(#gradPoids)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Fréquence cardiaque" unit="bpm" onClick={() => setActiveSigne('frequence_cardiaque')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradFC" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[30, 150]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                         formatter={(v) => [`${v} bpm`, 'FC']} />
                                <ReferenceLine y={100} stroke="#fca5a5" strokeDasharray="4 2" />
                                <ReferenceLine y={60} stroke="#86efac" strokeDasharray="4 2" />
                                <Area type="monotone" dataKey="frequence_cardiaque" stroke="#EF4444" strokeWidth={2} fill="url(#gradFC)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </>
    )
}

// ─── ChartCard cliquable ──────────────────────────────────────────────────────
function ChartCard({ title, unit, children, onClick }: {
    title: string; unit: string; children: React.ReactNode; onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className="ht-card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{unit}</span>
                    {onClick && <span className="text-xs text-gray-300 hover:text-blue-400">↗</span>}
                </div>
            </div>
            {children}
        </div>
    )
}