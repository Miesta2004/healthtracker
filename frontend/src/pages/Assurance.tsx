import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBordereauxAssurance, genererBordereau } from '../api/facturation'
import { formatMontant, STATUT_BORDEREAU_BADGE, STATUT_BORDEREAU_LABELS, type BordereauAssurance, type StatutBordereauAssurance } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { ShieldCheck, Plus, X, FileStack } from 'lucide-react'

export default function Assurance() {
    const navigate = useNavigate()
    const [bordereaux, setBordereaux] = useState<BordereauAssurance[]>([])
    const [loading, setLoading] = useState(true)
    const [statut, setStatut] = useState<StatutBordereauAssurance | ''>('')

    const [formulaireOuvert, setFormulaireOuvert] = useState(false)
    const [mutuelleNom, setMutuelleNom] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const charger = () => {
        setLoading(true)
        getBordereauxAssurance(statut ? { statut } : undefined)
            .then(setBordereaux)
            .catch(() => setBordereaux([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [statut])

    const handleGenerer = async () => {
        if (!mutuelleNom.trim()) return
        setSubmitting(true)
        setErreur('')
        try {
            const bordereau = await genererBordereau(mutuelleNom.trim())
            navigate(`/assurance/${bordereau.id}`)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Aucune ligne éligible pour cette mutuelle.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Assurance"
                    subtitle="Bordereaux de soumission aux assureurs/mutuelles — regroupe les lignes non couvertes en attente de réponse"
                    icon={ShieldCheck}
                    ctaLabel="Générer un bordereau"
                    onCtaClick={() => setFormulaireOuvert(true)}
                />

                <div className="ht-card">
                    <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                        <select value={statut} onChange={e => setStatut(e.target.value as StatutBordereauAssurance | '')} className="ht-input sm:w-56">
                            <option value="">Tous les statuts</option>
                            {Object.entries(STATUT_BORDEREAU_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <span className="badge badge-tint ml-auto">{bordereaux.length} bordereau(x)</span>
                    </div>

                    {!loading && bordereaux.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-2">N° Bordereau</div>
                            <div className="col-span-3">Mutuelle</div>
                            <div className="col-span-2 text-center">Lignes</div>
                            <div className="col-span-2 text-right">Montant demandé</div>
                            <div className="col-span-2">Statut</div>
                            <div className="col-span-1 text-right">Créé le</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={5} />
                    ) : bordereaux.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <FileStack size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun bordereau pour le moment</p>
                        </div>
                    ) : (
                        <div>
                            {bordereaux.map(b => (
                                <div key={b.id} onClick={() => navigate(`/assurance/${b.id}`)} className="ht-table-row grid-cols-12 items-center cursor-pointer group">
                                    <div className="col-span-2 text-sm font-mono font-medium" style={{ color: 'var(--ht-text)' }}>{b.numero_bordereau}</div>
                                    <div className="col-span-3 text-sm group-hover:text-[var(--ht-primary-tint-text)] transition-colors" style={{ color: 'var(--ht-text)' }}>{b.mutuelle_nom}</div>
                                    <div className="col-span-2 text-center text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{b.nombre_lignes}</div>
                                    <div className="col-span-2 text-right text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{formatMontant(b.montant_total_demande)}</div>
                                    <div className="col-span-2">
                                        <span className={`badge ${STATUT_BORDEREAU_BADGE[b.statut]}`}>{STATUT_BORDEREAU_LABELS[b.statut]}</span>
                                    </div>
                                    <div className="col-span-1 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        {new Date(b.date_creation).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {formulaireOuvert && (
                <div className="ht-modal-overlay" onClick={() => setFormulaireOuvert(false)}>
                    <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                <Plus size={17} /> Générer un bordereau
                            </h3>
                            <button onClick={() => setFormulaireOuvert(false)} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                            Regroupe automatiquement toutes les lignes non soumises pour cette mutuelle, sur des factures déjà finalisées.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Nom de la mutuelle / assurance
                            </label>
                            <input
                                type="text" autoFocus value={mutuelleNom} onChange={e => setMutuelleNom(e.target.value)}
                                placeholder="ex: IPM Sénégal"
                                className="ht-input"
                            />
                        </div>

                        {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setFormulaireOuvert(false)} className="btn btn-secondary">Annuler</button>
                            <button onClick={handleGenerer} disabled={!mutuelleNom.trim() || submitting} className="btn btn-primary">
                                {submitting ? 'Génération…' : 'Générer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}