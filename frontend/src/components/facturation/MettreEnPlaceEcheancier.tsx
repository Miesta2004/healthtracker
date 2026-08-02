import { useState } from 'react'
import { X, CalendarClock } from 'lucide-react'
import { mettreEnPlaceEcheancier } from '../../api/facturation'
import { PERIODICITE_ECHEANCE_LABELS, formatMontant, type EcheancierPaiement, type PeriodiciteEcheance } from '../../types'

interface Props {
    factureId: number
    montantPartPatient: number
    onClose: () => void
    onCree: (echeancier: EcheancierPaiement) => void
}

export default function MettreEnPlaceEcheancierModal({ factureId, montantPartPatient, onClose, onCree }: Props) {
    const [montant, setMontant] = useState(String(montantPartPatient))
    const [nombreEcheances, setNombreEcheances] = useState('3')
    const [periodicite, setPeriodicite] = useState<PeriodiciteEcheance>('mensuelle')
    const [datePremiere, setDatePremiere] = useState(new Date().toISOString().slice(0, 10))
    const [engagementSigne, setEngagementSigne] = useState(false)
    const [garantNom, setGarantNom] = useState('')
    const [garantTelephone, setGarantTelephone] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const montantValide = Number(montant) > 0 && Number(montant) <= montantPartPatient
    const valide = montantValide && Number(nombreEcheances) >= 2 && datePremiere !== ''

    const handleSubmit = async () => {
        if (!valide) return
        setSubmitting(true)
        setErreur('')
        try {
            const echeancier = await mettreEnPlaceEcheancier(factureId, {
                montant_total_echeancier: Number(montant),
                nombre_echeances: Number(nombreEcheances),
                periodicite,
                date_premiere_echeance: datePremiere,
                engagement_signe: engagementSigne,
                garant_nom: garantNom || undefined,
                garant_telephone: garantTelephone || undefined,
            })
            onCree(echeancier)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de la mise en place de l'échéancier.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <CalendarClock size={17} /> Paiement fractionné
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                </div>

                <div className="ht-alert ht-alert-warning text-xs">
                    Porte uniquement sur la part patient ({formatMontant(montantPartPatient)} restant à ventiler) —
                    jamais sur la part assurance, qui suit son propre circuit de facturation.
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Montant à fractionner (FCFA)
                    </label>
                    <input type="number" min={0} max={montantPartPatient} value={montant} onChange={e => setMontant(e.target.value)} className="ht-input" />
                    {!montantValide && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ht-danger)' }}>Ne peut pas dépasser la part patient.</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Nombre d'échéances
                        </label>
                        <input type="number" min={2} value={nombreEcheances} onChange={e => setNombreEcheances(e.target.value)} className="ht-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Périodicité
                        </label>
                        <select value={periodicite} onChange={e => setPeriodicite(e.target.value as PeriodiciteEcheance)} className="ht-input">
                            {Object.entries(PERIODICITE_ECHEANCE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                        Date de la première échéance
                    </label>
                    <input type="date" value={datePremiere} onChange={e => setDatePremiere(e.target.value)} className="ht-input" />
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ht-text)' }}>
                    <input type="checkbox" checked={engagementSigne} onChange={e => setEngagementSigne(e.target.checked)} />
                    Engagement de paiement déjà signé par le patient
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Garant (optionnel)
                        </label>
                        <input type="text" value={garantNom} onChange={e => setGarantNom(e.target.value)} placeholder="Nom du garant" className="ht-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Téléphone garant
                        </label>
                        <input type="text" value={garantTelephone} onChange={e => setGarantTelephone(e.target.value)} className="ht-input" />
                    </div>
                </div>

                {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                <div className="flex gap-2 justify-end pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                    <button onClick={handleSubmit} disabled={!valide || submitting} className="btn btn-primary">
                        {submitting ? 'Création…' : "Mettre en place l'échéancier"}
                    </button>
                </div>
            </div>
        </div>
    )
}