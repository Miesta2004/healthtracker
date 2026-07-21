import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type {OperationStats} from "../../types";

export default function OngletChirurgien({ opStats, loading }: { opStats: OperationStats | null; loading: boolean }) {
    const [selectionId, setSelectionId] = useState<number | null>(null)

    useEffect(() => {
        if (opStats && opStats.par_chirurgien.length > 0 && selectionId === null) {
            setSelectionId(opStats.par_chirurgien[0].id)
        }
    }, [opStats, selectionId])

    if (loading) {
        return <div className="h-64 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }} />
    }

    if (!opStats || opStats.par_chirurgien.length === 0) {
        return (
            <div className="ht-card ht-card-padded-sm">
                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                    Aucune opération terminée pour l'instant — cet onglet se remplit automatiquement dès qu'un
                    chirurgien clôture une intervention.
                </p>
            </div>
        )
    }

    const chirurgien = opStats.par_chirurgien.find(c => c.id === selectionId) ?? opStats.par_chirurgien[0]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Praticien :</span>
                {opStats.par_chirurgien.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectionId(c.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={chirurgien.id === c.id
                            ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                            : { border: '1px solid var(--ht-border-input)', color: 'var(--ht-text-secondary)' }}
                    >
                        {c.nom}
                    </button>
                ))}
            </div>

            <div className="ht-card p-5 flex items-center gap-4">
                <div className="ht-avatar ht-avatar-lg" style={{ backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' }}>
                    {chirurgien.nom.split(' ').filter(Boolean).slice(-2).map(p => p[0]).join('')}
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>{chirurgien.nom}</p>
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{chirurgien.specialite || 'Spécialité non renseignée'}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Interventions', valeur: String(chirurgien.nb_interventions) },
                    { label: 'Durée moyenne', valeur: chirurgien.duree_moyenne_min ? `${chirurgien.duree_moyenne_min} min` : '—' },
                    { label: 'Taux de succès', valeur: chirurgien.taux_succes !== null ? `${chirurgien.taux_succes}%` : '—' },
                    { label: 'Patients opérés', valeur: String(chirurgien.patients_operes) },
                ].map(k => (
                    <div key={k.label} className="ht-card p-4">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--ht-text-muted)' }}>{k.label}</span>
                        <div className="text-xl font-bold mt-1.5" style={{ color: 'var(--ht-text)' }}>{k.valeur}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ht-card ht-card-padded-sm">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                        Répartition des interventions (tout l'hôpital)
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={opStats.repartition_par_type} dataKey="nb" nameKey="type_intervention" innerRadius={42} outerRadius={65} paddingAngle={2}>
                                {opStats.repartition_par_type.map((_, i) => (
                                    <Cell key={i} fill={['var(--ht-primary)', 'var(--ht-primary-tint)', '#e8a33d', '#6fb4d7', '#a78bd6', 'var(--ht-border-input)'][i % 6]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <p className="text-[11px] mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Par type d'intervention, tous chirurgiens confondus — pas encore filtrable par praticien.
                    </p>
                </div>

                <div className="ht-card ht-card-padded-sm">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                        Évolution des interventions (tout l'hôpital)
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={opStats.evolution_hebdo}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                            <XAxis dataKey="semaine" tick={{ fontSize: 10 }} tickFormatter={d => String(d).slice(5, 10)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="nb" name="Interventions" stroke="var(--ht-primary)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}