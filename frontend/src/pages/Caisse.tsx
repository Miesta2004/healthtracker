import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFactures } from '../api/facturation'
import { formatMontant, STATUT_FACTURE_BADGE, STATUT_FACTURE_LABELS, type Facture } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { Wallet, Search, SearchX } from 'lucide-react'

export default function Caisse() {
    const navigate = useNavigate()
    const [recherche, setRecherche] = useState('')
    const [factures, setFactures] = useState<Facture[]>([])
    const [loading, setLoading] = useState(false)
    const [aRecherche, setARecherche] = useState(false)

    const charger = () => {
        if (recherche.trim().length < 2) { setFactures([]); setARecherche(false); return }
        setLoading(true)
        setARecherche(true)
        getFactures({ numero_facture: recherche.trim() })
            .then(setFactures)
            .catch(() => setFactures([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const timeout = setTimeout(charger, 300)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recherche])

    // Les factures en attente/partiellement payées remontent en premier —
    // c'est ce qu'un caissier vient chercher au guichet.
    const facturesTriees = [...factures].sort((a, b) => {
        const priorite = (f: Facture) => f.montant_restant > 0 ? 0 : 1
        return priorite(a) - priorite(b)
    })

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Caisse"
                    subtitle="Recherche d'une facture par numéro pour encaissement — tous services confondus"
                    icon={Wallet}
                />

                <div className="ht-card p-4">
                    <div className="relative flex items-center max-w-lg">
                        <Search size={16} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                        <input
                            type="text" autoFocus value={recherche} onChange={e => setRecherche(e.target.value)}
                            placeholder="N° de facture (ex: FAC-00012345)…"
                            className="ht-input pl-9 text-base"
                        />
                    </div>
                </div>

                {aRecherche && (
                    <div className="ht-card">
                        {!loading && facturesTriees.length > 0 && (
                            <div className="ht-table-header grid-cols-12">
                                <div className="col-span-3">N° Facture</div>
                                <div className="col-span-3">Patient</div>
                                <div className="col-span-2 text-right">Restant dû</div>
                                <div className="col-span-2">Statut</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>
                        )}

                        {loading ? (
                            <SkeletonTable rows={3} />
                        ) : facturesTriees.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <SearchX size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune facture ne correspond à ce numéro</p>
                            </div>
                        ) : (
                            <div>
                                {facturesTriees.map(f => (
                                    <div key={f.id} className="ht-table-row grid-cols-12 items-center">
                                        <div className="col-span-3 text-sm font-mono font-medium" style={{ color: 'var(--ht-text)' }}>{f.numero_facture}</div>
                                        <div className="col-span-3 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                            {f.patient_prenom} {f.patient_nom}
                                        </div>
                                        <div className="col-span-2 text-right text-sm font-medium" style={{ color: f.montant_restant > 0 ? 'var(--ht-warning)' : 'var(--ht-text-secondary)' }}>
                                            {formatMontant(f.montant_restant)}
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`badge ${STATUT_FACTURE_BADGE[f.statut]}`}>{STATUT_FACTURE_LABELS[f.statut]}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <button onClick={() => navigate(`/facturation/${f.id}`)} className="btn btn-primary btn-sm">
                                                Ouvrir
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}