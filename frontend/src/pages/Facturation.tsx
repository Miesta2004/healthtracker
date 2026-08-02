import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFactures } from '../api/facturation'
import { formatMontant, STATUT_FACTURE_BADGE, STATUT_FACTURE_LABELS, type Facture, type StatutFacture } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import NouvelleFacture from '../components/facturation/NouvelleFacture.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { Receipt, Search, SearchX, FileText } from 'lucide-react'

const FILTRES: { value: StatutFacture | ''; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'brouillon', label: STATUT_FACTURE_LABELS.brouillon },
    { value: 'ouverte', label: STATUT_FACTURE_LABELS.ouverte },
    { value: 'en_attente', label: STATUT_FACTURE_LABELS.en_attente },
    { value: 'payee_partiellement', label: STATUT_FACTURE_LABELS.payee_partiellement },
    { value: 'payee', label: STATUT_FACTURE_LABELS.payee },
    { value: 'annulee', label: STATUT_FACTURE_LABELS.annulee },
]

export default function Facturation() {
    const navigate = useNavigate()
    const [factures, setFactures] = useState<Facture[]>([])
    const [loading, setLoading] = useState(true)
    const [recherche, setRecherche] = useState('')
    const [statut, setStatut] = useState<StatutFacture | ''>('')
    const [nouvelleOuvert, setNouvelleOuvert] = useState(false)

    const charger = () => {
        setLoading(true)
        getFactures({ numero_facture: recherche.trim() || undefined, statut: statut || undefined })
            .then(setFactures)
            .catch(() => setFactures([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [statut])

    useEffect(() => {
        const timeout = setTimeout(charger, 300)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recherche])

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Facturation"
                    subtitle="Génération et gestion des factures — consultations, hospitalisations, examens, actes"
                    icon={Receipt}
                    ctaLabel="Nouvelle facture"
                    onCtaClick={() => setNouvelleOuvert(true)}
                />

                <div className="ht-card">
                    <div className="p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                        <div className="relative flex items-center flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <input
                                type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
                                placeholder="Rechercher par n° de facture…"
                                className="ht-input pl-9"
                            />
                        </div>
                        <select value={statut} onChange={e => setStatut(e.target.value as StatutFacture | '')} className="ht-input sm:w-56">
                            {FILTRES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <span className="badge badge-tint sm:ml-auto self-start sm:self-center">{factures.length} facture(s)</span>
                    </div>

                    {!loading && factures.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-2">N° Facture</div>
                            <div className="col-span-3">Patient</div>
                            <div className="col-span-2 text-right">Total</div>
                            <div className="col-span-2 text-right">Restant dû</div>
                            <div className="col-span-2">Statut</div>
                            <div className="col-span-1 text-right">Émise le</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={6} />
                    ) : factures.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            {recherche || statut ? (
                                <>
                                    <SearchX size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune facture ne correspond</p>
                                </>
                            ) : (
                                <>
                                    <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune facture pour le moment</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            {factures.map(f => (
                                <div
                                    key={f.id} onClick={() => navigate(`/facturation/${f.id}`)}
                                    className="ht-table-row grid-cols-12 group cursor-pointer"
                                >
                                    <div className="col-span-2 text-sm font-mono font-medium" style={{ color: 'var(--ht-text)' }}>
                                        {f.numero_facture}
                                    </div>
                                    <div className="col-span-3 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-[var(--ht-primary)] transition-colors" style={{ color: 'var(--ht-text)' }}>
                                            {f.patient_prenom} {f.patient_nom}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{f.patient_dossier}</p>
                                    </div>
                                    <div className="col-span-2 text-right text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {formatMontant(f.montant_total)}
                                    </div>
                                    <div className="col-span-2 text-right text-sm font-medium" style={{ color: f.montant_restant > 0 ? 'var(--ht-warning)' : 'var(--ht-text-secondary)' }}>
                                        {formatMontant(f.montant_restant)}
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`badge ${STATUT_FACTURE_BADGE[f.statut]}`}>{STATUT_FACTURE_LABELS[f.statut]}</span>
                                    </div>
                                    <div className="col-span-1 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        {new Date(f.date_emission).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {nouvelleOuvert && (
                <NouvelleFacture
                    onClose={() => setNouvelleOuvert(false)}
                    onCreee={(facture) => navigate(`/facturation/${facture.id}`)}
                />
            )}
        </div>
    )
}