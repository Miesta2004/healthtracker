import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { VueEnsemble } from '../../types'

export default function OngletActiviteService({ vue }: { vue: VueEnsemble }) {
    const avecOccupation = vue.par_service.filter(s => s.taux_occupation !== null)

    return (
        <div className="space-y-6">
            <div className="ht-card">
                <div className="px-5 pt-5 pb-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Activité par service</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                        <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                            {['Service', 'Patients suivis', 'Employés', "Taux d'occupation", 'Durée moy. séjour'].map(h => (
                                <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: 'var(--ht-text-muted)' }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {vue.par_service.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--ht-text)' }}>{s.nom}</td>
                                <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{s.nb_patients}</td>
                                <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{s.nb_employes}</td>
                                <td className="py-2.5 px-3">
                                    {s.taux_occupation === null ? (
                                        <span className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>
                                                Capacité non renseignée
                                            </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full max-w-[100px]" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${Math.min(s.taux_occupation, 100)}%`, backgroundColor: 'var(--ht-primary)' }} />
                                            </div>
                                            <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{s.taux_occupation}%</span>
                                            <span className="text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>
                                                    ({s.lits_occupes}/{s.capacite_lits})
                                                </span>
                                        </div>
                                    )}
                                </td>
                                <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {s.duree_moyenne_sejour !== null ? `${s.duree_moyenne_sejour} j` : '—'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {avecOccupation.length === 0 ? (
                <div className="ht-card ht-card-padded-sm">
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                        Aucun service n'a de capacité en lits renseignée — les graphiques d'occupation apparaîtront
                        dès qu'au moins un service en aura une (Services → Modifier → Capacité en lits).
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="ht-card ht-card-padded-sm">
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Taux d'occupation par service</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={avecOccupation} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={110} />
                                <Tooltip />
                                <Bar dataKey="taux_occupation" fill="var(--ht-primary)" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="ht-card ht-card-padded-sm">
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Durée moyenne d'hospitalisation (jours)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={vue.par_service.filter(s => s.duree_moyenne_sejour !== null)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={110} />
                                <Tooltip />
                                <Bar dataKey="duree_moyenne_sejour" fill="#6fb4d7" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}