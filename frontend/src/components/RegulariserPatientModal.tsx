import { useState } from 'react'
import { X, IdCard, AlertTriangle, Users } from 'lucide-react'
import { regulariserPatient } from '../api/patients'
import type { Patient } from '../types'

interface Props {
    patient: Patient
    onClose: () => void
    onRegularise: (patient: Patient) => void
}

/**
 * Régularise un dossier créé en mode "Urgence Vitale / Identité Provisoire" :
 * saisie de la vraie identité, sans jamais toucher à l'historique médical
 * déjà créé pendant la prise en charge d'urgence. Les accompagnants déjà
 * enregistrés (s'il y en a) sont affichés comme référence — c'est souvent
 * l'un d'eux qui peut confirmer qui est réellement le patient.
 */
export default function RegulariserPatientModal({ patient, onClose, onRegularise }: Props) {
    const [form, setForm] = useState({
        nom: patient.nom === 'Inconnu' ? '' : patient.nom,
        prenom: patient.prenom === 'Patient' ? '' : patient.prenom,
        date_naissance: patient.date_naissance ?? '',
        telephone: patient.telephone ?? '',
        adresse: patient.adresse ?? '',
        contact_urgence_nom: patient.contact_urgence_nom ?? '',
        contact_urgence_telephone: patient.contact_urgence_telephone ?? '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async () => {
        if (!form.nom.trim() || !form.prenom.trim()) {
            setErreur('Le nom et le prénom sont requis pour régulariser le dossier.')
            return
        }
        setSubmitting(true)
        setErreur('')
        try {
            const updated = await regulariserPatient(patient.id, { ...form, date_naissance_estimee: false })
            onRegularise(updated)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || 'Erreur lors de la régularisation du dossier.')
        } finally {
            setSubmitting(false)
        }
    }

    const accompagnants = patient.accompagnants ?? []

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <IdCard size={17} /> Régulariser le dossier
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                <div className="ht-alert ht-alert-warning flex items-start gap-2">
                    <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                    <span className="text-xs">
                        Dossier créé en admission d'urgence sous identité provisoire ("{patient.prenom} {patient.nom}",
                        n° {patient.numero_dossier}). L'historique médical déjà enregistré ne sera pas modifié.
                    </span>
                </div>

                {accompagnants.length > 0 && (
                    <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-muted-bg)' }}>
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-text)' }}>
                            <Users size={13} /> Accompagnant(s) enregistré(s) — pour référence
                        </p>
                        {accompagnants.map(a => (
                            <p key={a.id} className="text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                                {a.prenom} {a.nom}{a.lien_parente ? ` (${a.lien_parente})` : ''}{a.telephone ? ` · ${a.telephone}` : ''}
                            </p>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="ht-field">
                        <label className="ht-label">Prénom *</label>
                        <input type="text" name="prenom" value={form.prenom} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Nom *</label>
                        <input type="text" name="nom" value={form.nom} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Date de naissance</label>
                        <input type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Téléphone</label>
                        <input type="text" name="telephone" value={form.telephone} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field sm:col-span-2">
                        <label className="ht-label">Adresse</label>
                        <input type="text" name="adresse" value={form.adresse} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Contact d'urgence</label>
                        <input type="text" name="contact_urgence_nom" value={form.contact_urgence_nom} onChange={handleChange} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Téléphone du contact</label>
                        <input type="text" name="contact_urgence_telephone" value={form.contact_urgence_telephone} onChange={handleChange} className="ht-input" />
                    </div>
                </div>

                {erreur && <div className="ht-alert ht-alert-danger">{erreur}</div>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Annuler</button>
                    <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary flex-1 justify-center">
                        {submitting ? 'Enregistrement…' : 'Régulariser le dossier'}
                    </button>
                </div>
            </div>
        </div>
    )
}
