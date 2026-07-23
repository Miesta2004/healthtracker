import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { KpiCard } from './KpiCard.tsx'
import { getQualiteIndicateurs } from '../../api/services'
import type { QualiteIndicateurs } from '../../types'
import type { KpiData } from './types'
import { SkeletonKpiGrid, SkeletonChartCard } from '../Skeleton'

function formatPct(valeur: number | null): string {
    return valeur === null ? '—' : `${valeur.toString().replace('.', ',')}%`
}

function formatMin(valeur: number | null): string {
    return valeur === null ? '—' : `${valeur} min`
}

function formatDelta(delta: number | null, unite: string): string | undefined {
    if (delta === null) return undefined
    const signe = delta > 0 ? '+' : ''
    return `${signe}${delta.toString().replace('.', ',')}${unite} vs période précédente`
}

export default function OngletQualite() {
    const [data, setData] = useState<QualiteIndicateurs | null>(null)
    const [loading, setLoading] = useState(true)
    const [erreur, setErreur] = useState('')

    useEffect(() => {
        getQualiteIndicateurs(30)
            .then(setData)
            .catch(() => setErreur("Impossible de charger les indicateurs qualité."))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <SkeletonKpiGrid count={5} />
                <SkeletonChartCard />
            </div>
        )
    }

    if (erreur || !data) {
        return (
            <div className="ht-card ht-card-padded-sm">
                <p className="text-sm" style={{ color: 'var(--ht-danger)' }}>{erreur || 'Aucune donnée disponible.'}</p>
            </div>
        )
    }

    const { indicateurs, evolution, evenements_recents } = data

    // Pour ces 5 indicateurs, une BAISSE est la bonne nouvelle (moins de
    // complications, moins de réadmissions, moins d'annulations, prise en
    // charge plus rapide) — hausse=true (couleur "positive" de KpiCard) doit
    // donc représenter une amélioration, pas littéralement une hausse du chiffre.
    const amelioration = (delta: number | null) => delta !== null && delta <= 0

    const kpis: KpiData[] = [
        {
            label: 'Taux de complications post-op.',
            valeur: formatPct(indicateurs.taux_complications.valeur),
            delta: formatDelta(indicateurs.taux_complications.delta, ' pt'),
            hausse: amelioration(indicateurs.taux_complications.delta),
        },
        {
            label: 'Taux de réadmission (30j)',
            valeur: formatPct(indicateurs.taux_readmission.valeur),
            delta: formatDelta(indicateurs.taux_readmission.delta, ' pt'),
            hausse: amelioration(indicateurs.taux_readmission.delta),
        },
        {
            label: "Taux d'annulation",
            valeur: formatPct(indicateurs.taux_annulation.valeur),
            delta: formatDelta(indicateurs.taux_annulation.delta, ' pt'),
            hausse: amelioration(indicateurs.taux_annulation.delta),
        },
        {
            label: 'Temps opératoire moyen',
            valeur: formatMin(indicateurs.temps_operatoire_moyen.valeur),
            delta: formatDelta(indicateurs.temps_operatoire_moyen.delta, ' min'),
            hausse: amelioration(indicateurs.temps_operatoire_moyen.delta),
        },
        {
            label: 'Temps moy. prise en charge',
            valeur: formatMin(indicateurs.temps_prise_en_charge_moyen.valeur),
            delta: formatDelta(indicateurs.temps_prise_en_charge_moyen.delta, ' min'),
            hausse: amelioration(indicateurs.temps_prise_en_charge_moyen.delta),
        },
    ]

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {kpis.map(k => <KpiCard key={k.label} {...k} />)}
            </div>

            <p className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>
                Sur les {indicateurs.periode.jours} derniers jours ({indicateurs.periode.depuis} → {indicateurs.periode.jusqua}).
                Le temps de prise en charge aux urgences ne porte que sur les passages enregistrés depuis
                l'ajout de ce suivi — les passages plus anciens n'ont pas cette donnée.
            </p>

            <div className="ht-card ht-card-padded-sm">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                    Évolution des indicateurs
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ht-border)" vertical={false} />
                        <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="complications" name="Complications post-op. (%)" stroke="var(--ht-danger)" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" dataKey="readmission" name="Réadmission 30j (%)" stroke="#e8a33d" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" dataKey="annulation" name="Annulation (%)" stroke="var(--ht-primary)" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="ht-card">
                <div className="px-5 pt-5 pb-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Opérations avec complication récentes</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                        Seul incident réellement tracé aujourd'hui dans l'application — pas de registre
                        d'incidents généraux (chutes, erreurs de médication…) pour l'instant.
                    </p>
                </div>
                {evenements_recents.length === 0 ? (
                    <p className="text-sm px-5 pb-5" style={{ color: 'var(--ht-text-muted)' }}>
                        Aucune opération avec complication enregistrée.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                            <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                {['Date', 'Intervention', 'Service', 'Chirurgien', 'Description'].map(h => (
                                    <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: 'var(--ht-text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {evenements_recents.map((e, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.date}</td>
                                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--ht-text)' }}>{e.intervention}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.service}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.chirurgien}</td>
                                    <td className="py-2.5 px-3" style={{ color: 'var(--ht-text-secondary)' }}>{e.description || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}