import { useEffect, useState } from 'react'
import { X, MapPinned, Building2 } from 'lucide-react'
import { getServices } from '../api/services'
import { transfererPatient } from '../api/patients'
import type { Service, Patient } from '../types'

interface Props {
    patient: Patient
    onClose: () => void
    onTransfere: (patient: Patient) => void
}

export default function TransfererPatientModal({ patient, onClose, onTransfere }: Props) {
    const [services, setServices] = useState<Service[]>([])
    const [loadingServices, setLoadingServices] = useState(true)
    const [serviceId, setServiceId] = useState<number | null>(null)
    const [confirmationImmediate, setConfirmationImmediate] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    useEffect(() => {
        getServices()
            .then(list => setServices(list.filter(s => s.actif)))
            .catch(() => setServices([]))
            .finally(() => setLoadingServices(false))
    }, [])

    const handleSubmit = async () => {
        if (!serviceId) return
        setSubmitting(true)
        setErreur('')
        try {
            const updated = await transfererPatient(patient.id, serviceId, confirmationImmediate)
            onTransfere(updated)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors du transfert du patient.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <MapPinned size={17} /> Transférer vers un service
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-muted-bg)' }}>
                    <div className="ht-avatar ht-avatar-md">
                        {patient.prenom[0]}{patient.nom[0]}
                    </div>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                            {patient.prenom} {patient.nom}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                            N° dossier {patient.numero_dossier ?? '—'}
                            {patient.service_nom ? ` · Actuellement : ${patient.service_nom}` : ''}
                        </p>
                    </div>
                </div>

                <div className="ht-field">
                    <label className="ht-label flex items-center gap-1.5">
                        <Building2 size={13} /> Service de destination
                    </label>
                    {loadingServices ? (
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement des services…</p>
                    ) : (
                        <select
                            value={serviceId ?? ''}
                            onChange={e => setServiceId(e.target.value ? Number(e.target.value) : null)}
                            className="ht-input"
                        >
                            <option value="">Choisir un service…</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.nom}</option>
                            ))}
                        </select>
                    )}
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--ht-border)' }}>
                    <input
                        type="checkbox"
                        checked={confirmationImmediate}
                        onChange={e => setConfirmationImmediate(e.target.checked)}
                        className="mt-0.5"
                    />
                    <span className="text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                        <span className="font-medium" style={{ color: 'var(--ht-text)' }}>Confirmation immédiate</span> — la
                        coordination avec le service destinataire a déjà été faite (ex. par téléphone) : le patient passe
                        directement à « Admis dans le service » sans repasser par leur file d'attente. Sinon, le service
                        devra confirmer l'arrivée de son côté.
                    </span>
                </label>

                {erreur && <div className="ht-alert ht-alert-danger">{erreur}</div>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Annuler</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!serviceId || submitting}
                        className="btn btn-primary flex-1 justify-center"
                    >
                        {submitting ? 'Transfert…' : <span className="flex items-center gap-1.5 justify-center"><MapPinned size={14} /> Transférer</span>}
                    </button>
                </div>
            </div>
        </div>
    )
}
