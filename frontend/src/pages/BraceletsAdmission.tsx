import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchPatients, getBadgePatient, getBadgeAccompagnant, getAccompagnants } from '../api/patients'
import type { PatientSearchResult, BadgePatient, BadgeAccompagnant, Accompagnant } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import BadgePatientCard from '../components/BadgePatientCard.tsx'
import { Tag, Search, Printer, Badge as BadgeIcon, Users } from 'lucide-react'

type Cible = 'patient' | 'accompagnant'

export default function BraceletsAdmission() {
    const [searchParams] = useSearchParams()
    const [query, setQuery] = useState('')
    const [resultats, setResultats] = useState<PatientSearchResult[]>([])
    const [patientSelectionne, setPatientSelectionne] = useState<PatientSearchResult | null>(null)
    const [accompagnantsDuPatient, setAccompagnantsDuPatient] = useState<Accompagnant[]>([])

    const [cible, setCible] = useState<Cible>('patient')
    const [format, setFormat] = useState<'badge' | 'bracelet'>('badge')

    const [badgePatient, setBadgePatient] = useState<BadgePatient | null>(null)
    const [badgeAccompagnant, setBadgeAccompagnant] = useState<BadgeAccompagnant | null>(null)
    const [loadingBadge, setLoadingBadge] = useState(false)

    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) { setResultats([]); return }
        const timeout = setTimeout(() => {
            searchPatients(q).then(setResultats).catch(() => setResultats([]))
        }, 300)
        return () => clearTimeout(timeout)
    }, [query])

    const chargerBadgePatient = async (id: number) => {
        setCible('patient')
        setLoadingBadge(true)
        setBadgePatient(null)
        setBadgeAccompagnant(null)
        try {
            const [badge, accompagnants] = await Promise.all([
                getBadgePatient(id),
                getAccompagnants({ patient: id }).catch(() => []),
            ])
            setBadgePatient(badge)
            setAccompagnantsDuPatient(accompagnants)
        } finally {
            setLoadingBadge(false)
        }
    }

    const selectionner = async (p: PatientSearchResult) => {
        setPatientSelectionne(p)
        await chargerBadgePatient(p.id)
    }

    const chargerPassAccompagnant = async (accompagnantId: number) => {
        setCible('accompagnant')
        setLoadingBadge(true)
        setBadgePatient(null)
        setBadgeAccompagnant(null)
        try {
            setBadgeAccompagnant(await getBadgeAccompagnant(accompagnantId))
        } finally {
            setLoadingBadge(false)
        }
    }

    // Arrivée depuis « Nouvelle admission » avec ?patient=<id> : on charge
    // directement son badge, prêt à imprimer, sans repasser par la recherche.
    useEffect(() => {
        const idParam = searchParams.get('patient')
        if (idParam) {
            chargerBadgePatient(Number(idParam))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const imprimer = () => window.print()

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <div className="ht-no-print space-y-6">
                    <PageHeader
                        title="Bracelets & Pass"
                        subtitle="Impression et réimpression des badges patients et pass accompagnants"
                        icon={Tag}
                    />

                    <div className="ht-card ht-card-padded">
                        <div className="relative flex items-center">
                            <Search size={16} className="absolute left-3.5" style={{ color: 'var(--ht-text-muted)' }} />
                            <input
                                type="text" value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Rechercher un patient à équiper (nom, n° dossier…)"
                                className="ht-input pl-10 text-sm"
                            />
                        </div>

                        {resultats.length > 0 && (
                            <div className="mt-3 divide-y" style={{ borderColor: 'var(--ht-border)' }}>
                                {resultats.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => selectionner(p)}
                                        className={`flex items-center gap-3 py-2.5 px-2 cursor-pointer rounded-lg transition-colors ${patientSelectionne?.id === p.id ? '' : 'hover:bg-[var(--ht-muted-bg)]'}`}
                                        style={patientSelectionne?.id === p.id ? { backgroundColor: 'var(--ht-primary-tint-bg)' } : undefined}
                                    >
                                        <div className="ht-avatar ht-avatar-sm">{p.prenom[0]}{p.nom[0]}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{p.prenom} {p.nom}</p>
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>N° {p.numero_dossier}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {patientSelectionne && cible === 'accompagnant' && accompagnantsDuPatient.length === 0 && (
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun accompagnant enregistré pour ce patient — voir Contrôle Accompagnants pour en ajouter un.
                        </p>
                    )}

                    {patientSelectionne && cible === 'accompagnant' && accompagnantsDuPatient.length > 1 && (
                        <div className="ht-card ht-card-padded">
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ht-text)' }}>Choisir l'accompagnant</p>
                            <div className="flex flex-wrap gap-2">
                                {accompagnantsDuPatient.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => chargerPassAccompagnant(a.id)}
                                        className={`btn btn-sm ${badgeAccompagnant?.accompagnant_id === a.id ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                        {a.prenom} {a.nom}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(badgePatient || badgeAccompagnant) && (
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="ht-card flex p-1 gap-1">
                                <button
                                    onClick={() => patientSelectionne && chargerBadgePatient(patientSelectionne.id)}
                                    className={`btn btn-sm gap-1.5 ${cible === 'patient' ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    <BadgeIcon size={14} /> Patient
                                </button>
                                <button
                                    disabled={accompagnantsDuPatient.length === 0}
                                    onClick={() => accompagnantsDuPatient[0] && chargerPassAccompagnant(accompagnantsDuPatient[0].id)}
                                    className={`btn btn-sm gap-1.5 ${cible === 'accompagnant' ? 'btn-primary' : 'btn-ghost'}`}
                                    title={accompagnantsDuPatient.length === 0 ? 'Aucun accompagnant enregistré pour ce patient' : undefined}
                                >
                                    <Users size={14} /> Accompagnant
                                </button>
                            </div>

                            {cible === 'patient' && (
                                <div className="ht-card flex p-1 gap-1">
                                    <button
                                        onClick={() => setFormat('badge')}
                                        className={`btn btn-sm gap-1.5 ${format === 'badge' ? 'btn-primary' : 'btn-ghost'}`}
                                    >
                                        <BadgeIcon size={14} /> Badge
                                    </button>
                                    <button
                                        onClick={() => setFormat('bracelet')}
                                        className={`btn btn-sm gap-1.5 ${format === 'bracelet' ? 'btn-primary' : 'btn-ghost'}`}
                                    >
                                        <Tag size={14} /> Bracelet
                                    </button>
                                </div>
                            )}

                            <button onClick={imprimer} className="btn btn-secondary gap-1.5 ml-auto">
                                <Printer size={15} /> Imprimer / Exporter en PDF
                            </button>
                        </div>
                    )}
                </div>

                {loadingBadge && (
                    <p className="text-sm text-center py-8 ht-no-print" style={{ color: 'var(--ht-text-muted)' }}>
                        Génération en cours…
                    </p>
                )}

                {badgePatient && cible === 'patient' && (
                    <div className="flex justify-center py-6 ht-print-area">
                        <BadgePatientCard kind="patient" badge={badgePatient} format={format} />
                    </div>
                )}

                {badgeAccompagnant && cible === 'accompagnant' && (
                    <div className="flex justify-center py-6 ht-print-area">
                        <BadgePatientCard kind="accompagnant" badge={badgeAccompagnant} />
                    </div>
                )}

                {!badgePatient && !badgeAccompagnant && !loadingBadge && (
                    <div className="text-center py-16 ht-no-print">
                        <Tag size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Sélectionnez un patient ci-dessus pour générer son badge, son bracelet ou le pass de son accompagnant
                        </p>
                    </div>
                )}
            </main>

            {/* Impression : on ne garde que la zone du badge, tout le reste
                (sidebar, recherche, boutons) disparaît. */}
            <style>{`
                @media print {
                    .ht-no-print { display: none !important; }
                    aside { display: none !important; }
                    .ht-page-content { margin: 0 !important; padding: 0 !important; }
                    .ht-print-area { padding: 0 !important; }
                }
            `}</style>
        </div>
    )
}
