import { useState } from 'react'
import { X, Banknote } from 'lucide-react'
import { creerPaiement } from '../../api/facturation'
import {
    MODE_PAIEMENT_LABELS, OPERATEUR_MOBILE_MONEY_LABELS, formatMontant,
    type Paiement, type ModePaiement, type OperateurMobileMoney, type Echeance,
} from '../../types'

interface Props {
    factureId: number
    montantRestant: number
    echeances?: Echeance[]
    onClose: () => void
    onEncaisse: (paiement: Paiement) => void
}

export default function EncaisserPaiementModal({ factureId, montantRestant, echeances, onClose, onEncaisse }: Props) {
    const [montant, setMontant] = useState(String(montantRestant))
    const [mode, setMode] = useState<ModePaiement>('especes')
    const [operateur, setOperateur] = useState<OperateurMobileMoney>('wave')
    const [reference, setReference] = useState('')
    const [echeanceId, setEcheanceId] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const echeancesAVenir = (echeances ?? []).filter(e => e.statut !== 'payee')
    const valide = Number(montant) > 0 && (mode !== 'mobile_money' || !!operateur)

    const handleSubmit = async () => {
        if (!valide) return
        setSubmitting(true)
        setErreur('')
        try {
            const paiement = await creerPaiement({
                facture: factureId,
                montant: Number(montant),
                mode_paiement: mode,
                operateur_mobile_money: mode === 'mobile_money' ? operateur : undefined,
                reference_transaction: reference || undefined,
                echeance: echeanceId ? Number(echeanceId) : undefined,
            })
            onEncaisse(paiement)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de l'encaissement.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <Banknote size={17} /> Encaisser un paiement
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                </div>

                <div className="p-3 rounded-xl border text-sm" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text)' }}>
                    Reste dû : <strong>{formatMontant(montantRestant)}</strong>
                </div>

                {echeancesAVenir.length > 0 && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Régler une échéance précise (optionnel)
                        </label>
                        <select value={echeanceId} onChange={e => setEcheanceId(e.target.value)} className="ht-input">
                            <option value="">— Paiement libre —</option>
                            {echeancesAVenir.map(e => (
                                <option key={e.id} value={e.id}>
                                    Échéance {e.numero_echeance} — {formatMontant(e.montant_prevu)} ({new Date(e.date_echeance).toLocaleDateString('fr-FR')})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Montant encaissé (FCFA)
                    </label>
                    <input type="number" min={0} value={montant} onChange={e => setMontant(e.target.value)} className="ht-input" />
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Mode de paiement
                    </label>
                    <select value={mode} onChange={e => setMode(e.target.value as ModePaiement)} className="ht-input">
                        {Object.entries(MODE_PAIEMENT_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                {mode === 'mobile_money' && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Opérateur
                        </label>
                        <select value={operateur} onChange={e => setOperateur(e.target.value as OperateurMobileMoney)} className="ht-input">
                            {Object.entries(OPERATEUR_MOBILE_MONEY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {(mode === 'mobile_money' || mode === 'virement' || mode === 'carte_bancaire') && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Référence de transaction
                        </label>
                        <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="ht-input" placeholder="N° de transaction / reçu" />
                    </div>
                )}

                {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                <div className="flex gap-2 justify-end pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                    <button onClick={handleSubmit} disabled={!valide || submitting} className="btn btn-success">
                        {submitting ? 'Encaissement…' : 'Encaisser'}
                    </button>
                </div>
            </div>
        </div>
    )
}