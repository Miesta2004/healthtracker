import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { Capacite } from '../constants/capacites'
import {
    getFacture, validerFacture, cloturerFacture, annulerFacture,
    supprimerLigneFacture, signerEcheancier, marquerEcheanceImpayee,
} from '../api/facturation'
import {
    formatMontant, STATUT_FACTURE_BADGE, STATUT_FACTURE_LABELS, TYPE_ACTE_LABELS,
    STATUT_VALIDATION_ASSURANCE_LABELS, STATUT_ECHEANCE_BADGE, STATUT_ECHEANCE_LABELS,
    MODE_PAIEMENT_LABELS, type Facture,
} from '../types'
import Sidebar from '../components/Sidebar.tsx'
import AjouterLigneFacture from '../components/facturation/AjouterLigneFacture.tsx'
import MettreEnPlaceEcheancierModal from '../components/facturation/MettreEnPlaceEcheancier.tsx'
import EncaisserPaiementModal from '../components/facturation/EncaisserPaiement.tsx'
import { SkeletonDetailPage } from '../components/Skeleton'
import {
    ArrowLeft, Plus, CheckCircle2, Lock, Ban, CalendarClock, Banknote,
    Trash2, FileSignature,
} from 'lucide-react'

const STATUTS_MODIFIABLE = ['brouillon', 'ouverte']

export default function FactureDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { hasCapacite } = useAuth()
    const factureId = Number(id)

    const [facture, setFacture] = useState<Facture | null>(null)
    const [loading, setLoading] = useState(true)
    const [erreur, setErreur] = useState('')

    const [ajouterLigneOuvert, setAjouterLigneOuvert] = useState(false)
    const [echeancierOuvert, setEcheancierOuvert] = useState(false)
    const [encaisserOuvert, setEncaisserOuvert] = useState(false)

    const peutGerer = hasCapacite(Capacite.FACTURATION_GERER)
    const peutEncaisser = hasCapacite(Capacite.PAIEMENTS_ENCAISSER)

    const charger = () => {
        setLoading(true)
        getFacture(factureId).then(setFacture).catch(() => setErreur('Impossible de charger cette facture.')).finally(() => setLoading(false))
    }

    useEffect(() => { if (factureId) charger() }, [factureId])

    const executerAction = async (action: () => Promise<Facture>) => {
        setErreur('')
        try {
            const updated = await action()
            setFacture(updated)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de l'opération.")
        }
    }

    if (loading) return <div className="ht-page"><Sidebar /><main className="ht-page-content"><SkeletonDetailPage /></main></div>
    if (!facture) return (
        <div className="ht-page"><Sidebar /><main className="ht-page-content">
            <div className="ht-alert ht-alert-danger">{erreur || 'Facture introuvable.'}</div>
        </main></div>
    )

    const modifiable = STATUTS_MODIFIABLE.includes(facture.statut)

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm !p-2">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold font-mono" style={{ color: 'var(--ht-text)' }}>{facture.numero_facture}</h1>
                            <span className={`badge ${STATUT_FACTURE_BADGE[facture.statut]}`}>{STATUT_FACTURE_LABELS[facture.statut]}</span>
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                            {facture.patient_prenom} {facture.patient_nom} · N° dossier {facture.patient_dossier}
                            {facture.service_nom ? ` · ${facture.service_nom}` : ''}
                        </p>
                    </div>
                </div>

                {erreur && <div className="ht-alert ht-alert-danger text-sm">{erreur}</div>}

                {/* ── Actions ── */}
                <div className="flex flex-wrap gap-2">
                    {peutGerer && modifiable && (
                        <button onClick={() => setAjouterLigneOuvert(true)} className="btn btn-secondary btn-sm gap-1.5">
                            <Plus size={14} /> Ajouter une ligne
                        </button>
                    )}
                    {peutGerer && facture.statut === 'brouillon' && (
                        <button onClick={() => executerAction(() => validerFacture(facture.id))} className="btn btn-primary btn-sm gap-1.5">
                            <CheckCircle2 size={14} /> Valider
                        </button>
                    )}
                    {peutGerer && facture.statut === 'ouverte' && (
                        <button onClick={() => executerAction(() => cloturerFacture(facture.id))} className="btn btn-primary btn-sm gap-1.5">
                            <Lock size={14} /> Clôturer (fin de séjour)
                        </button>
                    )}
                    {peutGerer && !facture.echeancier && facture.montant_part_patient > 0 && (
                        <button onClick={() => setEcheancierOuvert(true)} className="btn btn-secondary btn-sm gap-1.5">
                            <CalendarClock size={14} /> Paiement fractionné
                        </button>
                    )}
                    {peutEncaisser && facture.montant_restant > 0 && (
                        <button onClick={() => setEncaisserOuvert(true)} className="btn btn-success btn-sm gap-1.5">
                            <Banknote size={14} /> Encaisser
                        </button>
                    )}
                    {peutGerer && !['annulee', 'payee'].includes(facture.statut) && (
                        <button
                            onClick={() => { if (confirm('Annuler cette facture ?')) executerAction(() => annulerFacture(facture.id)) }}
                            className="btn btn-danger btn-sm gap-1.5 ml-auto"
                        >
                            <Ban size={14} /> Annuler
                        </button>
                    )}
                </div>

                {/* ── Montants ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', montant: facture.montant_total },
                        { label: 'Part assurance', montant: facture.montant_part_assurance },
                        { label: 'Part patient', montant: facture.montant_part_patient },
                        { label: 'Payé', montant: facture.montant_paye },
                        { label: 'Restant dû', montant: facture.montant_restant, accent: facture.montant_restant > 0 },
                    ].map(c => (
                        <div key={c.label} className="ht-card p-4 rounded-2xl">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>{c.label}</p>
                            <p className="text-lg font-bold mt-1" style={{ color: c.accent ? 'var(--ht-warning)' : 'var(--ht-text)' }}>
                                {formatMontant(c.montant)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Lignes ── */}
                <div className="ht-card rounded-2xl">
                    <div className="p-4 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Lignes d'actes ({facture.lignes.length})</h2>
                    </div>
                    {facture.lignes.length === 0 ? (
                        <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune ligne pour le moment</div>
                    ) : (
                        <div>
                            {facture.lignes.map(ligne => (
                                <div key={ligne.id} className="ht-table-row grid-cols-12 items-center">
                                    <div className="col-span-4">
                                        <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{ligne.description}</p>
                                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                            {TYPE_ACTE_LABELS[ligne.type_acte]} · {STATUT_VALIDATION_ASSURANCE_LABELS[ligne.statut_assurance]}
                                        </p>
                                    </div>
                                    <div className="col-span-1 text-center text-sm" style={{ color: 'var(--ht-text-secondary)' }}>×{ligne.quantite}</div>
                                    <div className="col-span-2 text-right text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{formatMontant(ligne.montant_ligne)}</div>
                                    <div className="col-span-2 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        Ass. {formatMontant(ligne.montant_part_assurance_ligne)}
                                    </div>
                                    <div className="col-span-2 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        Patient {formatMontant(ligne.montant_part_patient_ligne)}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        {peutGerer && modifiable && (
                                            <button
                                                onClick={() => {
                                                    if (!confirm('Supprimer cette ligne ?')) return
                                                    supprimerLigneFacture(ligne.id).then(charger).catch(() => setErreur('Suppression impossible.'))
                                                }}
                                                className="btn btn-ghost btn-sm !p-1.5 text-[var(--ht-danger)]"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Paiements ── */}
                <div className="ht-card rounded-2xl">
                    <div className="p-4 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Historique des paiements ({facture.paiements.length})</h2>
                    </div>
                    {facture.paiements.length === 0 ? (
                        <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun paiement enregistré</div>
                    ) : (
                        <div>
                            {facture.paiements.map(p => (
                                <div key={p.id} className="ht-table-row grid-cols-12 items-center">
                                    <div className="col-span-3 text-sm" style={{ color: 'var(--ht-text)' }}>{formatMontant(p.montant)}</div>
                                    <div className="col-span-3 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{MODE_PAIEMENT_LABELS[p.mode_paiement]}</div>
                                    <div className="col-span-3 text-xs" style={{ color: 'var(--ht-text-muted)' }}>{p.reference_transaction || '—'}</div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>{p.encaisse_par_nom || '—'}</div>
                                    <div className="col-span-1 text-right text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Échéancier ── */}
                {facture.echeancier && (
                    <div className="ht-card rounded-2xl">
                        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--ht-border)' }}>
                            <h2 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>
                                Échéancier — {facture.echeancier.nombre_echeances} échéances ({facture.echeancier.statut})
                            </h2>
                            {peutGerer && !facture.echeancier.engagement_signe && (
                                <button
                                    onClick={() => signerEcheancier(facture.echeancier!.id).then(charger)}
                                    className="btn btn-secondary btn-sm gap-1.5"
                                >
                                    <FileSignature size={14} /> Enregistrer la signature
                                </button>
                            )}
                        </div>
                        <div>
                            {facture.echeancier.echeances.map(e => (
                                <div key={e.id} className="ht-table-row grid-cols-12 items-center">
                                    <div className="col-span-2 text-sm" style={{ color: 'var(--ht-text)' }}>#{e.numero_echeance}</div>
                                    <div className="col-span-3 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {new Date(e.date_echeance).toLocaleDateString('fr-FR')}
                                    </div>
                                    <div className="col-span-3 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>{formatMontant(e.montant_prevu)}</div>
                                    <div className="col-span-2">
                                        <span className={`badge ${STATUT_ECHEANCE_BADGE[e.statut]}`}>{STATUT_ECHEANCE_LABELS[e.statut]}</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        {peutGerer && e.statut !== 'payee' && e.statut !== 'impayee' && (
                                            <button
                                                onClick={() => { if (confirm('Marquer cette échéance comme impayée (escalade) ?')) marquerEcheanceImpayee(e.id).then(charger) }}
                                                className="btn btn-ghost btn-sm text-xs text-[var(--ht-danger)]"
                                            >
                                                Marquer impayée
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {ajouterLigneOuvert && (
                <AjouterLigneFacture
                    factureId={facture.id}
                    onClose={() => setAjouterLigneOuvert(false)}
                    onAjoutee={() => { setAjouterLigneOuvert(false); charger() }}
                />
            )}
            {echeancierOuvert && (
                <MettreEnPlaceEcheancierModal
                    factureId={facture.id}
                    montantPartPatient={facture.montant_part_patient}
                    onClose={() => setEcheancierOuvert(false)}
                    onCree={() => { setEcheancierOuvert(false); charger() }}
                />
            )}
            {encaisserOuvert && (
                <EncaisserPaiementModal
                    factureId={facture.id}
                    montantRestant={facture.montant_restant}
                    echeances={facture.echeancier?.echeances}
                    onClose={() => setEncaisserOuvert(false)}
                    onEncaisse={() => { setEncaisserOuvert(false); charger() }}
                />
            )}
        </div>
    )
}