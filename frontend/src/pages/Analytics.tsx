import { useEffect, useState } from 'react'
import { getVueEnsemble, getServiceActivite } from '../api/services'
import { getOperationStats } from '../api/chirurgie'
import type { VueEnsemble, OperationStats } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageBanner from '../components/PageBanner.tsx'
import { SkeletonKpiGrid, SkeletonChartCard } from '../components/Skeleton'
import {
    BarChart3,
    Users,
    Building2,
    Download,
    LayoutDashboard,
    Activity,
    ShieldCheck,
    Stethoscope,
} from 'lucide-react'
import OngletVueEnsemble from '../components/analytics/OngletVueEnsemble'
import OngletActiviteService from '../components/analytics/OngletActiviteService'
import OngletQualite from '../components/analytics/OngletQualite'
import OngletChirurgien from '../components/analytics/OngletChirurgien'
import ModaleExport, { type FormatExport, type TypeRapport } from '../components/analytics/ModaleExport'
import type { OngletAnalytics } from '../components/analytics/types'

const ONGLETS: { id: OngletAnalytics; label: string; icon: any }[] = [
    { id: 'apercu',      label: "Vue d'ensemble",       icon: LayoutDashboard },
    { id: 'services',    label: 'Activité par service', icon: Activity },
    { id: 'qualite',     label: 'Qualité & sécurité',   icon: ShieldCheck },
    { id: 'chirurgiens', label: 'Performance chirurgiens', icon: Stethoscope },
]

export default function Analytics() {
    const [onglet, setOnglet] = useState<OngletAnalytics>('apercu')
    const [vue, setVue] = useState<VueEnsemble | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showExport, setShowExport] = useState(false)

    const [activiteHebdo, setActiviteHebdo] = useState<{ jour: string; nb: number }[]>([])
    const [loadingActivite, setLoadingActivite] = useState(true)

    const [opStats, setOpStats] = useState<OperationStats | null>(null)
    const [loadingOpStats, setLoadingOpStats] = useState(true)

    useEffect(() => {
        getOperationStats()
            .then(setOpStats)
            .catch(() => setOpStats(null))
            .finally(() => setLoadingOpStats(false))
    }, [])

    useEffect(() => {
        getVueEnsemble()
            .then(setVue)
            .catch(() => setError("Impossible de charger les statistiques."))
            .finally(() => setLoading(false))
    }, [])

    // Volume réel de nouveaux patients, agrégé sur tous les services visibles
    // (somme de vrais appels getServiceActivite — pas une donnée inventée).
    useEffect(() => {
        if (!vue) return
        setLoadingActivite(true)
        Promise.all(vue.par_service.map(s => getServiceActivite(s.id, 7).catch(() => [])))
            .then(resultats => {
                const parJour: Record<string, number> = {}
                resultats.flat().forEach((point: any) => {
                    parJour[point.jour] = (parJour[point.jour] ?? 0) + point.nb
                })
                const fusion = Object.entries(parJour)
                    .map(([jour, nb]) => ({ jour, nb }))
                    .sort((a, b) => a.jour.localeCompare(b.jour))
                setActiviteHebdo(fusion)
            })
            .finally(() => setLoadingActivite(false))
    }, [vue])

    const exporterCsvServices = () => {
        if (!vue) return
        const lignes = [
            ['Service', 'Patients', 'Employés'],
            ...vue.par_service.map(s => [s.nom, String(s.nb_patients), String(s.nb_employes)]),
        ]
        const csv = lignes.map(l => l.join(';')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleExport = (opts: { type: TypeRapport; format: FormatExport; graphiques: boolean; details: boolean }) => {
        if (opts.format === 'csv') {
            exporterCsvServices()
        } else {
            alert("L'export PDF/Excel n'est pas encore câblé côté backend — seul le CSV fonctionne pour l'instant.")
        }
        setShowExport(false)
    }

    return (
        <div className="ht-page">
            <Sidebar />
            <main className="ht-page-content space-y-8">
                <PageBanner
                    icon={BarChart3}
                    title="Analytics"
                    subtitle="Vue d'ensemble de l'activité de l'établissement"
                    decorIcons={[Users, Building2]}
                    actions={
                        <>
                            <button onClick={() => setShowExport(true)} className="btn btn-secondary btn-sm flex-shrink-0">
                                <Download size={13} /> Exporter
                            </button>
                        </>
                    }
                />
                <div className="flex items-center gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    {ONGLETS.map(o => (
                        <button
                            key={o.id}
                            onClick={() => setOnglet(o.id)}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors"
                            style={{
                                color: onglet === o.id ? 'var(--ht-text)' : 'var(--ht-text-muted)',
                                borderBottom: onglet === o.id ? '2px solid var(--ht-primary)' : '2px solid transparent',
                            }}
                        >
                            <o.icon size={13} /> {o.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="ht-card ht-card-padded-sm">
                        <p className="text-sm" style={{ color: 'var(--ht-danger)' }}>{error}</p>
                    </div>
                )}

                {loading ? (
                    <>
                        <SkeletonKpiGrid count={4} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SkeletonChartCard />
                            <SkeletonChartCard />
                        </div>
                    </>
                ) : vue && (
                    <>
                        {onglet === 'apercu' && (
                            <OngletVueEnsemble
                                vue={vue} activiteHebdo={activiteHebdo} loadingActivite={loadingActivite}
                                opStats={opStats} loadingOpStats={loadingOpStats}
                            />
                        )}
                        {onglet === 'services' && <OngletActiviteService vue={vue} />}
                        {onglet === 'qualite' && <OngletQualite />}
                        {onglet === 'chirurgiens' && <OngletChirurgien opStats={opStats} loading={loadingOpStats} />}
                    </>
                )}
            </main>

            {showExport && (
                <ModaleExport onClose={() => setShowExport(false)} onExporter={handleExport} />
            )}
        </div>
    )
}