import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Circle } from 'lucide-react'
import type { KpiData } from '../../types'

export function Puce({ estime }: { estime?: boolean }) {
    if (!estime) return null
    return (
        <span
            title="Donnée simulée — API pas encore branchée"
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide ml-1.5"
            style={{ color: 'var(--ht-text-muted)' }}
        >
            <Circle size={5} fill="currentColor" /> estimé
        </span>
    )
}

export function KpiCard({ label, valeur, delta, hausse, sparkline, estime }: KpiData) {
    return (
        <div className="ht-card p-5">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center" style={{ color: 'var(--ht-text-muted)' }}>
                    {label}
                    <Puce estime={estime} />
                </span>
            </div>
            <div className="flex items-end justify-between gap-3">
                <div>
                    <span className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>{valeur}</span>
                    {delta && (
                        <div
                            className="flex items-center gap-0.5 text-xs font-semibold mt-1"
                            style={{ color: hausse ? 'var(--ht-primary)' : 'var(--ht-danger)' }}
                        >
                            {hausse ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {delta}
                        </div>
                    )}
                </div>
                {sparkline && sparkline.length > 1 && (
                    <div className="w-16 h-8 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkline.map((v, i) => ({ i, v }))}>
                                <Line
                                    type="monotone" dataKey="v" dot={false} strokeWidth={2}
                                    stroke={hausse ? 'var(--ht-primary)' : 'var(--ht-danger)'}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    )
}