import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createHospitalisation } from '../api/hospitalisations.ts'
import { getServices } from '../api/services'
import { getEmployes } from '../api/comptes'
import type { Service, Employe } from '../types'

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider mb-2">
            {children}
        </label>
    )
}

const inputClass =
    "ht-input"

export default function AddHospitalisation() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = Number(id)

    const [services, setServices] = useState<Service[]>([])
    const [medecins, setMedecins] = useState<Employe[]>([])

    const [serviceId, setServiceId] = useState<string>('')
    const [medecinId, setMedecinId] = useState<string>('')
    const [chambre, setChambre] = useState('')
    const [lit, setLit] = useState('')
    const [dateAdmission, setDateAdmission] = useState<string>(
        new Date().toISOString().slice(0, 16)
    )
    const [dateSortiePrevue, setDateSortiePrevue] = useState('')
    const [motif, setMotif] = useState('')
    const [diagnosticEntree, setDiagnosticEntree] = useState('')
    const [notes, setNotes] = useState('')

    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')
    const [succes, setSucces] = useState(false)

    useEffect(() => {
        getServices().then(setServices).catch(() => {})
        getEmployes()
            .then(list => setMedecins(list.filter(e => e.role === 'medecin')))
            .catch(() => {})
    }, [])

    const formulaireValide = dateAdmission !== '' && motif.trim() !== ''

    const handleSubmit = async () => {
        if (!formulaireValide) return
        setSubmitting(true)
        setErreur('')
        try {
            await createHospitalisation({
                patient: patientId,
                service: serviceId ? Number(serviceId) : null,
                medecin_responsable: medecinId ? Number(medecinId) : null,
                chambre,
                lit,
                motif_admission: motif,
                diagnostic_entree: diagnosticEntree,
                diagnostic_sortie: '',
                notes,
                date_admission: dateAdmission,
                date_sortie_prevue: dateSortiePrevue || null,
                date_sortie: null,
                statut: 'en_cours',
            })
            setSucces(true)
            setTimeout(() => navigate(`/patients/${patientId}`), 1200)
        } catch {
            setErreur("Erreur lors de l'enregistrement. Vérifiez votre connexion.")
            setSubmitting(false)
        }
    }

    if (succes) {
        return (
            <div className="ht-page flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[var(--ht-success-bg)] flex items-center justify-center text-3xl mx-auto">
                        ✓
                    </div>
                    <p className="text-sm font-medium text-[var(--ht-text)]">Hospitalisation enregistrée</p>
                    <p className="text-xs text-[var(--ht-text-muted)]">Redirection en cours…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="ht-page">
            <nav className="bg-[var(--ht-card-bg)] border-b border-[var(--ht-border)] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={() => navigate(`/patients/${patientId}`)}
                    className="text-sm text-[var(--ht-text-muted)] hover:text-[var(--ht-text-secondary)] transition-colors"
                >
                    ← Retour au dossier
                </button>
                <span className="text-[var(--ht-text-muted)]">|</span>
                <span className="text-sm font-medium text-[var(--ht-text)]">Nouvelle hospitalisation</span>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

                <div className="ht-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <FieldLabel>Date et heure d'admission</FieldLabel>
                        <input
                            type="datetime-local"
                            value={dateAdmission}
                            onChange={e => setDateAdmission(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <FieldLabel>Sortie prévue (optionnel)</FieldLabel>
                        <input
                            type="date"
                            value={dateSortiePrevue}
                            onChange={e => setDateSortiePrevue(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <FieldLabel>Service</FieldLabel>
                        <select
                            value={serviceId}
                            onChange={e => setServiceId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">— Sélectionner —</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <FieldLabel>Médecin responsable</FieldLabel>
                        <select
                            value={medecinId}
                            onChange={e => setMedecinId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">— Sélectionner —</option>
                            {medecins.map(m => (
                                <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <FieldLabel>Chambre</FieldLabel>
                        <input
                            type="text"
                            placeholder="ex : 204"
                            value={chambre}
                            onChange={e => setChambre(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <FieldLabel>Lit</FieldLabel>
                        <input
                            type="text"
                            placeholder="ex : B"
                            value={lit}
                            onChange={e => setLit(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="ht-card p-5 space-y-4">
                    <div>
                        <FieldLabel>Motif d'admission</FieldLabel>
                        <textarea
                            value={motif}
                            onChange={e => setMotif(e.target.value)}
                            rows={2}
                            className={inputClass}
                            placeholder="Raison de l'hospitalisation"
                        />
                    </div>
                    <div>
                        <FieldLabel>Diagnostic d'entrée (optionnel)</FieldLabel>
                        <textarea
                            value={diagnosticEntree}
                            onChange={e => setDiagnosticEntree(e.target.value)}
                            rows={2}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <FieldLabel>Notes (optionnel)</FieldLabel>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className={inputClass}
                        />
                    </div>
                </div>

                {erreur && (
                    <div className="rounded-xl border border-[var(--ht-danger)] bg-[var(--ht-danger-bg)] px-4 py-3">
                        <p className="text-sm text-[var(--ht-danger)]">{erreur}</p>
                    </div>
                )}

                <div className="flex gap-3 pb-8">
                    <button
                        onClick={() => navigate(`/patients/${patientId}`)}
                        className="btn btn-ghost flex-1"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formulaireValide || submitting}
                        className="btn btn-primary flex-1"
                    >
                        {submitting ? 'Enregistrement…' : "Enregistrer l'hospitalisation"}
                    </button>
                </div>
            </div>
        </div>
    )
}