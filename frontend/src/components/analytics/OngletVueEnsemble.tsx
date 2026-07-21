import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from './KpiCard.tsx'
import type { VueEnsemble, OperationStats } from '../../types'
import type { KpiData } from './types'

const COULEURS = ['var(--ht-primary)', 'var(--ht-primary-tint)', '#e8a33d', '#6fb4d7', '#a78bd6', 'var(--ht-border-input)']

export default function OngletVueEnsemble({
                                              vue, activiteHebdo, loadingActivite, opStats, loadingOpStats,
                                          }: {
    vue: VueEnsemble
    activiteHebdo: { jour: string; nb: number }[]
    loadingActivite: boolean
    opStats: OperationStats | null
    loadingOpStats: boolean
}) {
    // Occupation/durée agrégées à partir des vrais chiffres par service (déjà
    // enrichis d'occupation réelle par le backend).
    const servicesAvecCapacite = vue.par_service.filter(s => s.taux_occupation !== null)
    const occupationMoyenne = servicesAvecCapacite.length
        ? Math.round(servicesAvecCapacite.reduce((acc, s) => acc + (s.taux_occupation ?? 0), 0) / servicesAvecCapacite.length)
        : null
    const servicesAvecDuree = vue.par_service.filter(s => s.duree_moyenne_sejour !== null)
    const dureeMoyenneGlobale = servicesAvecDuree.length
        ? (servicesAvecDuree.reduce((acc, s) => acc + (s.duree_moyenne_sejour ?? 0), 0) / servicesAvecDuree.length).toFixed(1)
        : null

    const kpis: KpiData[] = [
        { label: 'Patients suivis', valeur: String(vue.patients.actifs), delta: `+${vue.patients.nouveaux_mois} ce mois`, hausse: true },
        { label: 'Employés actifs', valeur: String(vue.employes.total) },
        { label: 'Interventions', valeur: opStats ? String(opStats.nb_interventions) : '—' },
        {
            label: "Taux d'occupation",
            valeur: occupationMoyenne !== null ? `${occupationMoyenne}%` : '—',
            estime: occupationMoyenne === null,
        },
        {
            label: 'Durée moy. hospit.',
            valeur: dureeMoyenneGlobale !== null ? `${dureeMoyenneGlobale} j` : '—',
            estime: dureeMoyenneGlobale === null,
        },
    ]

    const repartitionInterventions = (opStats?.repartition_par_type ?? []).map((r, i) => ({
        nom: r.type_intervention, valeur: r.nb, couleur: COULEURS[i % COULEURS.length],
    }))

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {kpis.map(k => <KpiCard key={k.label} {...k} />)}
            </div>
            {occupationMoyenne === null && (
                <p className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>
                    Taux d'occupation et durée d'hospitalisation : aucun service n'a encore de capacité en lits
                    renseignée (champ ajouté, à remplir dans Services → Modifier).
                </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="ht-card ht-card-padded-sm">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                        Nouveaux patients (7 derniers jours)
                    </h3>
                    {loadingActivite ? (
                        <div className="h-[200px] animate-pulse rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }} />
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={activiteHebdo}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                                <XAxis dataKey="jour" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="nb" name="Nouveaux patients" fill="var(--ht-primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="ht-card ht-card-padded-sm">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Répartition des interventions</h3>
                    {loadingOpStats ? (
                        <div className="h-[160px] animate-pulse rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }} />
                    ) : repartitionInterventions.length === 0 ? (
                        <p className="text-xs py-8 text-center" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucune intervention terminée pour l'instant.
                        </p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={repartitionInterventions} dataKey="valeur" nameKey="nom" innerRadius={42} outerRadius={65} paddingAngle={2}>
                                        {repartitionInterventions.map(d => <Cell key={d.nom} fill={d.couleur} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1 mt-2">
                                {repartitionInterventions.map(d => (
                                    <div key={d.nom} className="flex items-center justify-between text-[11px]">
                                        <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--ht-text-secondary)' }}>
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.couleur }} /> {d.nom}
                                        </span>
                                        <span className="font-semibold flex-shrink-0" style={{ color: 'var(--ht-text)' }}>{d.valeur}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="ht-card ht-card-padded-sm">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Évolution des interventions (8 sem.)</h3>
                    {loadingOpStats ? (
                        <div className="h-[160px] animate-pulse rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }} />
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={opStats?.evolution_hebdo ?? []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                                <XAxis dataKey="semaine" tick={{ fontSize: 10 }} tickFormatter={d => String(d).slice(5, 10)} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="nb" name="Interventions" stroke="var(--ht-primary)" fill="var(--ht-primary-tint-bg)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="ht-card">
                <div className="px-5 pt-5 pb-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Dernières interventions</h3>
                </div>
                {loadingOpStats ? (
                    <div className="h-24 animate-pulse mx-5 mb-5 rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }} />
                ) : !opStats || opStats.dernieres_interventions.length === 0 ? (
                    <p className="ht-empty">Aucune intervention terminée pour l'instant.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                            <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                {['Date', 'Patient', 'Type', 'Chirurgien', 'Durée', 'Issue'].map(h => (
                                    <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: 'var(--ht-text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {opStats.dernieres_interventions.map((it, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{it.date ?? '—'}</td>
                                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--ht-text)' }}>{it.patient}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{it.type}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{it.chirurgien}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{it.duree ?? '—'}</td>
                                    <td className="py-2.5 px-3">
                                            <span className={`badge ${it.issue === 'succes' ? 'badge-success' : 'badge-danger'}`}>
                                                {it.issue === 'succes' ? 'Succès' : 'Complication'}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="ht-card ht-card-padded-sm" style={{ opacity: 0.75 }}>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Indicateurs de qualité</h3>
                    <span className="badge badge-muted text-[10px]">Phase 2</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                    Voir l'onglet « Qualité & sécurité » — aucun modèle de suivi n'existe encore pour ces chiffres.
                </p>
            </div>
        </div>
    )
}