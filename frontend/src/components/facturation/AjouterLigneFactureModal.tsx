import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { ajouterLigneFacture, getTarifsActes } from '../../api/facturation'
import { TYPE_ACTE_LABELS, formatMontant, type LigneFacture, type TypeActe, type TarifActe } from '../../types'

interface Props {
    factureId: number
    onClose: () => void
    onAjoutee: (ligne: LigneFacture) => void
}

export default function AjouterLigneFactureModal({ factureId, onClose, onAjoutee }: Props) {
    const [tarifs, setTarifs] = useState<TarifActe[]>([])
    const [modeManuel, setModeManuel] = useState(false)
    const [tarifChoisiId, setTarifChoisiId] = useState('')

    const [typeActe, setTypeActe] = useState<TypeActe>('consultation')
    const [description, setDescription] = useState('')
    const [quantite, setQuantite] = useState('1')
    const [prixUnitaire, setPrixUnitaire] = useState('')
    const [tauxPropre, setTauxPropre] = useState('')
    const [dateActe, setDateActe] = useState(new Date().toISOString().slice(0, 16))
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    useEffect(() => {
        getTarifsActes({ actif: true }).then(setTarifs).catch(() => setTarifs([]))
    }, [])

    const tarifChoisi = tarifs.find(t => String(t.id) === tarifChoisiId) || null

    const valide = modeManuel
        ? description.trim() !== '' && Number(quantite) > 0 && Number(prixUnitaire) > 0
        : tarifChoisi !== null && Number(quantite) > 0

    const handleSubmit = async () => {
        if (!valide) return
        setSubmitting(true)
        setErreur('')
        try {
            const ligne = await ajouterLigneFacture(factureId, modeManuel ? {
                type_acte: typeActe,
                description: description.trim(),
                quantite: Number(quantite),
                prix_unitaire: Number(prixUnitaire),
                taux_prise_en_charge_assurance: tauxPropre !== '' ? Number(tauxPropre) : undefined,
                date_acte: new Date(dateActe).toISOString(),
            } : {
                tarif_acte: tarifChoisi!.id,
                quantite: Number(quantite),
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

                <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                    <button
                        onClick={() => setModeManuel(false)}
                        className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                        style={!modeManuel
                            ? { backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' }
                            : { color: 'var(--ht-text-muted)' }}
                    >
                        Grille tarifaire
                    </button>
                    <button
                        onClick={() => setModeManuel(true)}
                        className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                        style={modeManuel
                            ? { backgroundColor: 'var(--ht-primary)', color: 'var(--ht-primary-contrast)' }
                            : { color: 'var(--ht-text-muted)' }}
                    >
                        Acte hors nomenclature
                    </button>
                </div>

                {!modeManuel ? (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Acte catalogué
                        </label>
                        <select value={tarifChoisiId} onChange={e => setTarifChoisiId(e.target.value)} className="ht-input">
                            <option value="">— Choisir un acte —</option>
                            {tarifs.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.code_acte} — {t.libelle} ({formatMontant(t.prix_unitaire)}{t.service_nom ? ` · ${t.service_nom}` : ''})
                                </option>
                            ))}
                        </select>
                        {tarifs.length === 0 && (
                            <p className="text-xs mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Aucun tarif dans la grille — utilise "Acte hors nomenclature" ou demande à un admin d'ajouter des tarifs.
                            </p>
                        )}
                        {tarifChoisi && (
                            <p className="text-xs mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Prix figé automatiquement à {formatMontant(tarifChoisi.prix_unitaire)} — non modifiable ici.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
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

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Prix unitaire (FCFA)
                            </label>
                            <input type="number" min={0} value={prixUnitaire} onChange={e => setPrixUnitaire(e.target.value)} className="ht-input" />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Quantité
                        </label>
                        <input type="number" min={1} value={quantite} onChange={e => setQuantite(e.target.value)} className="ht-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Date de l'acte
                        </label>
                        <input type="datetime-local" value={dateActe} onChange={e => setDateActe(e.target.value)} className="ht-input" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Taux assurance (%)
                    </label>
                    <input
                        type="number" min={0} max={100} value={tauxPropre} onChange={e => setTauxPropre(e.target.value)}
                        placeholder="Défaut de la facture"
                        className="ht-input"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                        Laisser vide pour hériter du taux par défaut de la facture — mettre 0 signifie explicitement "non couvert".
                    </p>
                </div>

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