import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { Puce } from './KpiCard.tsx'
import { MOCK_EVENEMENTS_INDESIRABLES, MOCK_EVOLUTION_QUALITE } from '../../types/Mockdata.ts'

const GRAVITE_BADGE: Record<string, string> = { mineure: 'badge-tint', moderee: 'badge-warning', majeure: 'badge-danger' }
const STATUT_BADGE: Record<string, string> = { ouvert: 'badge-danger', en_cours: 'badge-warning', cloture: 'badge-success' }
const STATUT_LABEL: Record<string, string> = { ouvert: 'Ouvert', en_cours: 'En cours', cloture: 'Clôturé' }

export default function OngletQualite() {
    return (
        <div className="space-y-6">
            <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--ht-warning-bg)' }}
            >
                <AlertTriangle size={15} style={{ color: 'var(--ht-warning)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'var(--ht-warning)' }}>
                    Cet onglet est entièrement simulé — aucun modèle de suivi qualité (infections, réadmissions,
                    événements indésirables) n'existe encore côté base de données. À construire avant de faire
                    confiance à ces chiffres pour de vraies décisions.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Taux d'infection", valeur: '1,2%', delta: '-0,1%' },
                    { label: 'Taux de réadmission (30j)', valeur: '6,1%', delta: '+0,3%' },
                    { label: "Taux d'annulation", valeur: '4,2%', delta: '+0,6%' },
                    { label: 'Événements indésirables', valeur: '12', delta: '+2' },
                    { label: 'Temps moy. prise en charge', valeur: '34 min', delta: '+4 min' },
                ].map(k => (
                    <div key={k.label} className="ht-card p-4">
                        <span className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ht-text-muted)' }}>
                            {k.label} <Puce estime />
                        </span>
                        <div className="text-xl font-bold mt-1.5" style={{ color: 'var(--ht-text)' }}>{k.valeur}</div>
                        <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{k.delta} vs période précédente</div>
                    </div>
                ))}
            </div>

            <div className="ht-card ht-card-padded-sm">
                <h3 className="text-sm font-semibold mb-4 flex items-center" style={{ color: 'var(--ht-text)' }}>
                    Évolution des indicateurs <Puce estime />
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={MOCK_EVOLUTION_QUALITE}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                        <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="infection" name="Infection postopératoire (%)" stroke="var(--ht-danger)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="reamission" name="Réadmission 30j (%)" stroke="#e8a33d" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="annulation" name="Annulation (%)" stroke="var(--ht-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="ht-card">
                <div className="px-5 pt-5 pb-3 flex items-center">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Événements indésirables récents</h3>
                    <Puce estime />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                        <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                            {['Date', 'Type', 'Service', 'Gravité', 'Statut'].map(h => (
                                <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: 'var(--ht-text-muted)' }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {MOCK_EVENEMENTS_INDESIRABLES.map((e, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.date}</td>
                                <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--ht-text)' }}>{e.type}</td>
                                <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.service}</td>
                                <td className="py-2.5 px-3"><span className={`badge ${GRAVITE_BADGE[e.gravite]}`}>{e.gravite}</span></td>
                                <td className="py-2.5 px-3"><span className={`badge ${STATUT_BADGE[e.statut]}`}>{STATUT_LABEL[e.statut]}</span></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}