import { useState, useMemo } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import type { SignesVitaux } from '../types'
import {
    Activity,
    Heart,
    Thermometer,
    Scale,
    Droplet,
    X,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Maximize2,
    Info
} from 'lucide-react'

interface Props { data: SignesVitaux[] }

// ─── Config de chaque signe vital ────────────────────────────────────────────
const SIGNES_CONFIG = {
    tension: {
        key: 'tension',
        label: 'Tension artérielle',
        unit: 'mmHg',
        color: '#3B82F6',
        colorSec: '#93C5FD',
        icon: Heart,
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
        icon: Droplet,
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
        icon: Thermometer,
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
        icon: Scale,
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
        icon: Activity,
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
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: highlight ? 'var(--ht-primary)' : 'var(--ht-muted-bg)' }}>
            <p className="text-xs mb-1" style={{ color: highlight ? 'rgba(255, 255, 255, 0.7)' : 'var(--ht-text-muted)' }}>{label}</p>
            <p className="text-lg font-bold" style={{ color: highlight ? 'white' : 'var(--ht-text)' }}>{value}</p>
            <p className="text-xs" style={{ color: highlight ? 'rgba(255, 255, 255, 0.5)' : 'var(--ht-text-muted)' }}>{unit}</p>
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

    const vals30 = sorted
        .map(s => ({ date: s.date, val: getVal(s, signeKey) }))
        .filter(x => x.val !== null) as { date: string; val: number }[]

    const now = Date.now()
    const vals24h = sorted
        .filter(s => now - new Date(s.date).getTime() <= 24 * 3600 * 1000)
        .map(s => ({ date: s.date, val: getVal(s, signeKey) }))
        .filter(x => x.val !== null) as { date: string; val: number }[]

    const allVals = vals30.map(x => x.val)
    const max = allVals.length ? Math.max(...allVals) : null
    const min = allVals.length ? Math.min(...allVals) : null
    const avg = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length * 10) / 10 : null
    const last = vals30.length ? vals30[vals30.length - 1] : null
    const maxEntry = vals30.find(x => x.val === max)
    const minEntry = vals30.find(x => x.val === min)

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

    const chart30 = vals30.map(x => ({ date: fmt(x.date), val: x.val }))
    const chart24h = vals24h.map(x => ({ heure: fmtHour(x.date), val: x.val }))
    const Icon = cfg.icon

    const chartTension = signeKey === 'tension' ? sorted.map(s => ({
        date: fmt(s.date),
        sys: s.tension_systolique,
        dia: s.tension_diastolique,
    })) : []

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="h-full border-l overflow-y-auto"
                style={{ width: '420px', animation: 'slideIn 0.25s ease-out', backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
                     style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)', color: cfg.color }}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-base" style={{ color: 'var(--ht-text)' }}>{cfg.label}</h2>
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{cfg.unit} · 30 derniers jours</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ht-border)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)'}>
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Alerte si hors norme */}
                    {isAlert && (
                        <div className="rounded-xl p-3.5 flex gap-3 items-start border"
                             style={{ backgroundColor: 'var(--ht-danger-bg-light)', borderColor: 'var(--ht-danger)', color: 'var(--ht-danger)' }}>
                            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold">Valeur hors norme</p>
                                <p className="text-xs opacity-90 mt-0.5">
                                    Dernière mesure : <strong>{last?.val} {cfg.unit}</strong> — norme : {cfg.alertMin} – {cfg.alertMax} {cfg.unit}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dernière valeur + tendance */}
                    <div className="rounded-2xl p-5 flex items-center justify-between text-white"
                         style={{ backgroundColor: 'var(--ht-primary)' }}>
                        <div>
                            <p className="text-xs opacity-70 mb-1">Dernière mesure</p>
                            <p className="text-3xl font-bold">
                                {last ? last.val : '—'}
                                <span className="text-base font-normal opacity-70 ml-1">{cfg.unit}</span>
                            </p>
                            {last && <p className="text-xs opacity-60 mt-1.5">{fmtFull(last.date)}</p>}
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-xs opacity-70 mb-1">Tendance</p>
                            <div className="my-1">
                                {tendance === 'hausse' ? <TrendingUp size={24} /> : tendance === 'baisse' ? <TrendingDown size={24} /> : <Minus size={24} />}
                            </div>
                            <p className="text-xs opacity-70">
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
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {minEntry && (
                                <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                                    <p className="font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--ht-text-secondary)' }}><TrendingDown size={14} /> Plus bas</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--ht-text)' }}>{min} {cfg.unit}</p>
                                    <p className="mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{fmtFull(minEntry.date)}</p>
                                </div>
                            )}
                            {maxEntry && (
                                <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                                    <p className="font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--ht-text-secondary)' }}><TrendingUp size={14} /> Plus haut</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--ht-text)' }}>{max} {cfg.unit}</p>
                                    <p className="mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{fmtFull(maxEntry.date)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Graphe 30 jours */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>Évolution sur 30 jours</p>
                        <ResponsiveContainer width="100%" height={180}>
                            {signeKey === 'tension' ? (
                                <LineChart data={chartTension}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[50, 200]} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                             formatter={(v, n) => [`${v} mmHg`, n === 'sys' ? 'Systolique' : 'Diastolique']} />
                                    {cfg.normal && <>
                                        <ReferenceLine y={cfg.normal.max} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                        <ReferenceLine y={cfg.normal.min} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                                    </>}
                                    <Line type="monotone" dataKey="sys" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                                    <Line type="monotone" dataKey="dia" stroke="#93C5FD" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                                </LineChart>
                            ) : (
                                <AreaChart data={chart30}>
                                    <defs>
                                        <linearGradient id={`grad-${signeKey}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={cfg.color} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={cfg.domain} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                             formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
                                    {cfg.normal && <>
                                        <ReferenceLine y={cfg.normal.max} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                        <ReferenceLine y={cfg.normal.min} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                                    </>}
                                    <Area type="monotone" dataKey="val" stroke={cfg.color} strokeWidth={2}
                                          fill={`url(#grad-${signeKey})`} dot={{ r: 2 }} connectNulls />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* Graphe 24h */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-text-muted)' }}>Dernières 24 heures</p>
                        <p className="text-xs mb-3" style={{ color: 'var(--ht-text-muted)' }}>{chart24h.length} mesure{chart24h.length > 1 ? 's' : ''} enregistrée{chart24h.length > 1 ? 's' : ''}</p>
                        {chart24h.length === 0 ? (
                            <div className="rounded-xl p-6 text-center text-xs border border-dashed" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text-muted)' }}>
                                Aucune mesure dans les dernières 24h
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={150}>
                                <AreaChart data={chart24h}>
                                    <defs>
                                        <linearGradient id={`grad24-${signeKey}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={cfg.color} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                    <XAxis dataKey="heure" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={cfg.domain} />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                             formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
                                    <Area type="monotone" dataKey="val" stroke={cfg.color} strokeWidth={2}
                                          fill={`url(#grad24-${signeKey})`} dot={{ r: 3 }} connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Infos cliniques */}
                    <div className="rounded-xl p-4 text-xs border space-y-1"
                         style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text-secondary)' }}>
                        <p className="font-bold flex items-center gap-1.5" style={{ color: 'var(--ht-text)' }}><Info size={14} /> Information clinique</p>
                        <p>{cfg.description}</p>
                        {cfg.normal && (
                            <p className="pt-1 font-semibold" style={{ color: 'var(--ht-primary)' }}>
                                Valeurs normales : {cfg.normal.min} – {cfg.normal.max} {cfg.unit}
                            </p>
                        )}
                    </div>

                    {/* Historique des mesures */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>Historique complet</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {[...vals30].reverse().map((x, i) => {
                                const isHigh = cfg.alertMax && x.val > cfg.alertMax
                                const isLow = cfg.alertMin && x.val < cfg.alertMin
                                return (
                                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl border"
                                         style={{
                                             backgroundColor: isHigh || isLow ? 'var(--ht-danger-bg-light)' : 'var(--ht-card-bg)',
                                             borderColor: isHigh || isLow ? 'var(--ht-danger)' : 'var(--ht-border)'
                                         }}>
                                        <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{fmtFull(x.date)}</span>
                                        <span className="text-sm font-semibold flex items-center gap-1"
                                              style={{ color: isHigh || isLow ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                                            {x.val} {cfg.unit}
                                            {(isHigh || isLow) && <AlertTriangle size={12} />}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
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
    const Icon = cfg.icon

    const chartData = sorted.slice(-10).map(s => ({
        val: signeKey === 'tension' ? s.tension_systolique : getVal(s, signeKey)
    }))

    return (
        <div
            onClick={onClick}
            className="ht-card p-4 cursor-pointer transition-all hover:scale-[1.02] group border"
            style={{
                backgroundColor: 'var(--ht-card-bg)',
                borderColor: isAlert ? 'var(--ht-danger)' : 'var(--ht-border)'
            }}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--ht-muted-bg)', color: isAlert ? 'var(--ht-danger)' : cfg.color }}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--ht-text)' }}>{cfg.label}</p>
                        <p className="text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>{cfg.unit}</p>
                    </div>
                </div>
                {isAlert && (
                    <span className="badge badge-danger text-[10px]">
                        Alerte
                    </span>
                )}
            </div>

            <div className="h-[40px] mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <Line type="monotone" dataKey="val" stroke={isAlert ? '#ef4444' : cfg.color}
                              strokeWidth={1.5} dot={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xl font-bold" style={{ color: isAlert ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                        {last ?? '—'}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end">
                    {diff !== null && (
                        <p className="text-xs font-semibold flex items-center gap-0.5" style={{ color: diff > 0 ? 'var(--ht-danger)' : diff < 0 ? 'var(--ht-success)' : 'var(--ht-text-muted)' }}>
                            {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {Math.abs(diff)}
                        </p>
                    )}
                    <p className="text-[10px] transition-colors mt-1 flex items-center gap-0.5" style={{ color: 'var(--ht-text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--ht-primary)'}>
                        Détails <Maximize2 size={8} />
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── ChartCard cliquable ──────────────────────────────────────────────────────
function ChartCard({ title, unit, children, onClick }: {
    title: string; unit: string; children: React.ReactNode; onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className="ht-card p-5 cursor-pointer transition-all border"
            style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ht-primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ht-border)'}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md border font-semibold" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text-muted)' }}>
                        {unit}
                    </span>
                    {onClick && <Maximize2 size={12} style={{ color: 'var(--ht-text-muted)' }} />}
                </div>
            </div>
            {children}
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
        <div className="ht-card p-8 border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
            <p className="text-sm text-center font-semibold" style={{ color: 'var(--ht-text-muted)' }}>
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
            {activeSigne && (
                <DetailSidebar
                    signeKey={activeSigne}
                    data={data}
                    onClose={() => setActiveSigne(null)}
                />
            )}

            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-text)' }}>
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
                </div>

                {/* Graphe principal tension */}
                <ChartCard title="Tension artérielle" unit="mmHg" onClick={() => setActiveSigne('tension')}>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chart30}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ht-text-muted)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--ht-text-muted)' }} domain={[50, 200]} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                     formatter={(v, n) => [`${v} mmHg`, n === 'tension_systolique' ? 'Systolique' : 'Diastolique']} />
                            <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                            <ReferenceLine y={90} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                            <Line type="monotone" dataKey="tension_systolique" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                            <Line type="monotone" dataKey="tension_diastolique" stroke="#93C5FD" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Glycémie + Température */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ChartCard title="Glycémie" unit="mmol/L" onClick={() => setActiveSigne('glycemie')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradGlyc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[2, 12]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                         formatter={(v) => [`${v} mmol/L`, 'Glycémie']} />
                                <ReferenceLine y={7.8} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                <ReferenceLine y={3.9} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                                <Area type="monotone" dataKey="glycemie" stroke="#10B981" strokeWidth={2} fill="url(#gradGlyc)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Température" unit="°C" onClick={() => setActiveSigne('temperature')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[35, 42]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                         formatter={(v) => [`${v} °C`, 'Température']} />
                                <ReferenceLine y={38} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                <ReferenceLine y={36.1} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                                <Area type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={2} fill="url(#gradTemp)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Poids + FC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ChartCard title="Poids" unit="kg" onClick={() => setActiveSigne('poids')}>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={chart30}>
                                <defs>
                                    <linearGradient id="gradPoids" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
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
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" opacity={0.3} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ht-text-muted)' }} domain={[30, 150]} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                         formatter={(v) => [`${v} bpm`, 'FC']} />
                                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                <ReferenceLine y={60} stroke="#10b981" strokeDasharray="4 2" opacity={0.5} />
                                <Area type="monotone" dataKey="frequence_cardiaque" stroke="#EF4444" strokeWidth={2} fill="url(#gradFC)" dot={{ r: 2 }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </>
    )
}