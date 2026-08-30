import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getBordereauAssurance, getLignesBordereau, soumettreBordereau, enregistrerReponseAssurance,
} from '../api/facturation'
import {
    formatMontant, STATUT_BORDEREAU_BADGE, STATUT_BORDEREAU_LABELS,
    STATUT_VALIDATION_ASSURANCE_LABELS, type BordereauAssurance, type LigneFacture,
} from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonDetailPage } from '../components/Skeleton'
import { ArrowLeft, Send, CheckCircle2, XCircle, PercentCircle } from 'lucide-react'

const BADGE_LIGNE: Record<string, string> = {
    non_soumis: 'badge-muted', soumis: 'badge-tint', valide: 'badge-success',
    rejete_partiel: 'badge-warning', rejete: 'badge-danger',
}

export default function BordereauDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const bordereauId = Number(id)

    const [bordereau, setBordereau] = useState<BordereauAssurance | null>(null)
    const [lignes, setLignes] = useState<LigneFacture[]>([])
    const [loading, setLoading] = useState(true)
    const [erreur, setErreur] = useState('')
    const [ligneEnReponse, setLigneEnReponse] = useState<LigneFacture | null>(null)

    const charger = () => {
        setLoading(true)
        Promise.all([getBordereauAssurance(bordereauId), getLignesBordereau(bordereauId)])
            .then(([b, l]) => { setBordereau(b); setLignes(l) })
            .catch(() => setErreur('Impossible de charger ce bordereau.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { if (bordereauId) charger() }, [bordereauId])

    const handleSoumettre = async () => {
        if (!bordereau) return
        setErreur('')
        try {
            const updated = await soumettreBordereau(bordereau.id)
            setBordereau(updated)
            charger()
        } catch {
            setErreur('Impossible de soumettre ce bordereau.')
        }
    }

    if (loading) return <div className="ht-page"><Sidebar /><main className="ht-page-content"><SkeletonDetailPage /></main></div>
    if (!bordereau) return <div className="ht-page"><Sidebar /><main className="ht-page-content"><div className="ht-alert ht-alert-danger">{erreur}</div></main></div>

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm !p-2"><ArrowLeft size={18} /></button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold font-mono" style={{ color: 'var(--ht-text)' }}>{bordereau.numero_bordereau}</h1>
                            <span className={`badge ${STATUT_BORDEREAU_BADGE[bordereau.statut]}`}>{STATUT_BORDEREAU_LABELS[bordereau.statut]}</span>
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>{bordereau.mutuelle_nom}</p>
                    </div>
                    {bordereau.statut === 'brouillon' && (
                        <button onClick={handleSoumettre} className="btn btn-primary btn-sm gap-1.5">
                            <Send size={14} /> Soumettre
                        </button>
                    )}
                </div>

                {erreur && <div className="ht-alert ht-alert-danger text-sm">{erreur}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="ht-card p-4 rounded-2xl">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Lignes</p>
                        <p className="text-lg font-bold mt-1" style={{ color: 'var(--ht-text)' }}>{bordereau.nombre_lignes}</p>
                    </div>
                    <div className="ht-card p-4 rounded-2xl">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Montant demandé</p>
                        <p className="text-lg font-bold mt-1" style={{ color: 'var(--ht-text)' }}>{formatMontant(bordereau.montant_total_demande)}</p>
                    </div>
                    {bordereau.date_soumission && (
                        <div className="ht-card p-4 rounded-2xl">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Soumis le</p>
                            <p className="text-lg font-bold mt-1" style={{ color: 'var(--ht-text)' }}>
                                {new Date(bordereau.date_soumission).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    )}
                </div>

                <div className="ht-card rounded-2xl">
                    <div className="p-4 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Lignes rattachées</h2>
                    </div>
                    <div>
                        {lignes.map(ligne => (
                            <div key={ligne.id} className="ht-table-row grid-cols-12 items-center">
                                <div className="col-span-4">
                                    <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{ligne.description}</p>
                                </div>
                                <div className="col-span-2 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                    Demandé {formatMontant(ligne.montant_assurance_demande ?? ligne.montant_part_assurance_ligne)}
                                </div>
                                <div className="col-span-2 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                    Validé {formatMontant(ligne.montant_part_assurance_ligne)}
                                </div>
                                <div className="col-span-2">
                                    <span className={`badge ${BADGE_LIGNE[ligne.statut_assurance]}`}>{STATUT_VALIDATION_ASSURANCE_LABELS[ligne.statut_assurance]}</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    {ligne.statut_assurance === 'soumis' && (
                                        <button onClick={() => setLigneEnReponse(ligne)} className="btn btn-secondary btn-sm text-xs">
                                            Enregistrer réponse
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {ligneEnReponse && (
                <ReponseAssuranceModal
                    ligne={ligneEnReponse}
                    onClose={() => setLigneEnReponse(null)}
                    onEnregistree={() => { setLigneEnReponse(null); charger() }}
                />
            )}
        </div>
    )
}

function ReponseAssuranceModal({ ligne, onClose, onEnregistree }: {
    ligne: LigneFacture; onClose: () => void; onEnregistree: () => void
}) {
    const [statut, setStatut] = useState<'valide' | 'rejete' | 'rejete_partiel'>('valide')
    const [montantValide, setMontantValide] = useState(String(ligne.montant_part_assurance_ligne))
    const [motifRejet, setMotifRejet] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const handleSubmit = async () => {
        setSubmitting(true)
        setErreur('')
        try {
            await enregistrerReponseAssurance(ligne.id, {
                statut,
                montant_valide: statut === 'rejete_partiel' ? Number(montantValide) : undefined,
                motif_rejet: motifRejet || undefined,
            })
            onEnregistree()
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de l'enregistrement.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>Réponse de l'assureur</h3>
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                    {ligne.description} — demandé {formatMontant(ligne.montant_assurance_demande ?? ligne.montant_part_assurance_ligne)}
                </p>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setStatut('valide')}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold"
                        style={{ borderColor: statut === 'valide' ? 'var(--ht-success)' : 'var(--ht-border)', color: statut === 'valide' ? 'var(--ht-success)' : 'var(--ht-text-muted)' }}
                    >
                        <CheckCircle2 size={18} /> Validé
                    </button>
                    <button
                        onClick={() => setStatut('rejete_partiel')}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold"
                        style={{ borderColor: statut === 'rejete_partiel' ? 'var(--ht-warning)' : 'var(--ht-border)', color: statut === 'rejete_partiel' ? 'var(--ht-warning)' : 'var(--ht-text-muted)' }}
                    >
                        <PercentCircle size={18} /> Partiel
                    </button>
                    <button
                        onClick={() => setStatut('rejete')}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold"
                        style={{ borderColor: statut === 'rejete' ? 'var(--ht-danger)' : 'var(--ht-border)', color: statut === 'rejete' ? 'var(--ht-danger)' : 'var(--ht-text-muted)' }}
                    >
                        <XCircle size={18} /> Rejeté
                    </button>
                </div>

                {statut === 'rejete_partiel' && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Montant validé par l'assureur (FCFA)
                        </label>
                        <input type="number" min={0} max={ligne.montant_part_assurance_ligne} value={montantValide} onChange={e => setMontantValide(e.target.value)} className="ht-input" />
                        <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>L'écart bascule automatiquement sur la part patient.</p>
                    </div>
                )}

                {statut !== 'valide' && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Motif (optionnel)
                        </label>
                        <input type="text" value={motifRejet} onChange={e => setMotifRejet(e.target.value)} placeholder="ex: Plafond annuel atteint" className="ht-input" />
                    </div>
                )}

                {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                <div className="flex gap-2 justify-end pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                    <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
                        {submitting ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    )
}