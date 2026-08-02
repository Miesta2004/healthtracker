import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { ajouterLigneFacture } from '../../api/facturation'
import { TYPE_ACTE_LABELS, type LigneFacture, type TypeActe } from '../../types'

interface Props {
    factureId: number
    onClose: () => void
    onAjoutee: (ligne: LigneFacture) => void
}

export default function AjouterLigneFacture({ factureId, onClose, onAjoutee }: Props) {
    const [typeActe, setTypeActe] = useState<TypeActe>('consultation')
    const [description, setDescription] = useState('')
    const [quantite, setQuantite] = useState('1')
    const [prixUnitaire, setPrixUnitaire] = useState('')
    const [tauxPropre, setTauxPropre] = useState('')
    const [dateActe, setDateActe] = useState(new Date().toISOString().slice(0, 16))
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const valide = description.trim() !== '' && Number(quantite) > 0 && Number(prixUnitaire) > 0

    const handleSubmit = async () => {
        if (!valide) return
        setSubmitting(true)
        setErreur('')
        try {
            const ligne = await ajouterLigneFacture(factureId, {
                type_acte: typeActe,
                description: description.trim(),
                quantite: Number(quantite),
                prix_unitaire: Number(prixUnitaire),
                taux_prise_en_charge_assurance: tauxPropre !== '' ? Number(tauxPropre) : undefined,
                date_acte: new Date(dateActe).toISOString(),
            })
            onAjoutee(ligne)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de l'ajout de la ligne.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <Plus size={17} /> Ajouter une ligne
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Type d'acte
                    </label>
                    <select value={typeActe} onChange={e => setTypeActe(e.target.value as TypeActe)} className="ht-input">
                        {Object.entries(TYPE_ACTE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Description
                    </label>
                    <input
                        type="text" value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="ex: Consultation cardiologie / Nuitée chambre 204"
                        className="ht-input"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Quantité
                        </label>
                        <input type="number" min={1} value={quantite} onChange={e => setQuantite(e.target.value)} className="ht-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Prix unitaire (FCFA)
                        </label>
                        <input type="number" min={0} value={prixUnitaire} onChange={e => setPrixUnitaire(e.target.value)} className="ht-input" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Taux assurance (%)
                        </label>
                        <input
                            type="number" min={0} max={100} value={tauxPropre} onChange={e => setTauxPropre(e.target.value)}
                            placeholder="Défaut de la facture"
                            className="ht-input"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Date de l'acte
                        </label>
                        <input type="datetime-local" value={dateActe} onChange={e => setDateActe(e.target.value)} className="ht-input" />
                    </div>
                </div>
                <p className="text-xs -mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                    Laisser le taux vide pour hériter du taux par défaut de la facture — mettre 0 signifie explicitement "non couvert".
                </p>

                {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                <div className="flex gap-2 justify-end pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                    <button onClick={handleSubmit} disabled={!valide || submitting} className="btn btn-primary">
                        {submitting ? 'Ajout…' : 'Ajouter la ligne'}
                    </button>
                </div>
            </div>
        </div>
    )
}