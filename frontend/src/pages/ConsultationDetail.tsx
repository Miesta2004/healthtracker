import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, ajouterAntecedent } from '../api/patients'
import { getConsultation, createConsultation, updateConsultation, deleteConsultation } from '../api/consultations'
import type { Patient, ConsultationStatut, TypeEvenement } from '../types'

// ─── Config types & statuts ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: string }> = {
    consultation: { label: 'Consultation', icon: '🩺' },
    examen:       { label: 'Examen',        icon: '🔬' },
    operation:    { label: 'Opération',     icon: '🏥' },
    autre:        { label: 'Autre',         icon: '📋' },
}

const STATUT_CONFIG: Record<ConsultationStatut, { label: string; color: string; bg: string }> = {
    planifiee: { label: 'Planifiée', color: '#b45309', bg: '#fef3c7' },
    en_cours:  { label: 'En cours',  color: '#1d4ed8', bg: '#dbeafe' },
    terminee:  { label: 'Terminée',  color: '#15803d', bg: '#dcfce7' },
    annulee:   { label: 'Annulée',   color: '#6b7280', bg: '#f3f4f6' },
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs text-gray-500 mb-1">{children}</label>
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px #003152',
    onBlur:  (e: React.FocusEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.boxShadow = 'none',
}

// ─── Sélecteur de type d'événement ───────────────────────────────────────────
function TypeSelector({ value, onChange }: { value: TypeEvenement; onChange: (t: TypeEvenement) => void }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(TYPE_CONFIG) as [TypeEvenement, { label: string; icon: string }][]).map(([key, cfg]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all"
                    style={value === key
                        ? { backgroundColor: '#003152', color: 'white', borderColor: '#003152' }
                        : { backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }
                    }
                >
                    <span className="text-xl">{cfg.icon}</span>
                    {cfg.label}
                </button>
            ))}
        </div>
    )
}

// ─── Modal confirmation suppression ──────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, loading }: {
    onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">🗑️</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cet événement ?</h3>
                <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Annuler
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors">
                        {loading ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal de confirmation : ajouter aux antécédents ─────────────────────────
function AjoutAntecedentModal({ texte, onConfirm, onCancel, loading }: {
    texte: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: '#ADDFF1' }}>📌</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Ajouter aux antécédents ?</h3>
                <p className="text-sm text-gray-500 mb-2">
                    Voulez-vous ajouter ceci au dossier médical permanent du patient :
                </p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2 mb-6">
                    {texte}
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Non, merci
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                            className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#003152' }}>
                        {loading ? 'Ajout...' : 'Oui, ajouter'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ConsultationDetail() {
    const { id, consultId } = useParams<{ id: string; consultId?: string }>()
    const navigate = useNavigate()
    const patientId = Number(id)
    const isNew = !consultId || consultId === 'new'

    const [patient, setPatient] = useState<Patient | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [showDelete, setShowDelete] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Proposition d'ajout aux antécédents après enregistrement
    const [antecedentPropose, setAntecedentPropose] = useState<string | null>(null)
    const [antecedentLoading, setAntecedentLoading] = useState(false)
    const [antecedentAjoute, setAntecedentAjoute] = useState(false)

    const now = new Date()
    now.setSeconds(0, 0)
    const defaultDate = now.toISOString().slice(0, 16)

    const [form, setForm] = useState({
        type_evenement: 'consultation' as TypeEvenement,
        date: defaultDate,
        motif: '',
        symptomes: '',
        examens_realises: '',
        diagnostic: '',
        ordonnance: '',
        notes: '',
        statut: 'planifiee' as ConsultationStatut,
    })

    useEffect(() => {
        if (!patientId) return
        getPatient(patientId).then(setPatient).catch(() => navigate('/dashboard'))

        if (!isNew && consultId) {
            getConsultation(Number(consultId))
                .then(c => {
                    setForm({
                        type_evenement: c.type_evenement,
                        date: c.date.slice(0, 16),
                        motif: c.motif,
                        symptomes: c.symptomes,
                        examens_realises: c.examens_realises,
                        diagnostic: c.diagnostic,
                        ordonnance: c.ordonnance,
                        notes: c.notes,
                        statut: c.statut,
                    })
                })
                .catch(() => setError("Impossible de charger cet événement."))
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [patientId, consultId])

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const antecedentsActuels = (patient?.antecedents || '')
        .split(',').map(s => s.trim()).filter(Boolean)

    // Texte candidat à proposer comme antécédent : diagnostic en priorité,
    // sinon le motif si c'est une opération (ex: "Appendicectomie")
    const candidatAntecedent = form.diagnostic.trim() || (
        form.type_evenement === 'operation' ? form.motif.trim() : ''
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.motif.trim()) { setError('Le motif est obligatoire.'); return }
        setSaving(true)
        setError('')
        try {
            const payload = { ...form, date: form.date + ':00', patient: patientId }
            if (isNew) {
                await createConsultation(payload)
            } else {
                await updateConsultation(Number(consultId), payload)
            }

            // Propose l'ajout aux antécédents seulement si on a un candidat
            // pertinent qui n'existe pas déjà dans le dossier du patient.
            const aProposer = candidatAntecedent && !antecedentsActuels.includes(candidatAntecedent)
            if (aProposer) {
                setAntecedentPropose(candidatAntecedent)
            } else {
                navigate(`/patients/${patientId}`)
            }
        } catch {
            setError("Erreur lors de l'enregistrement.")
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmAntecedent = async () => {
        if (!antecedentPropose) return
        setAntecedentLoading(true)
        try {
            await ajouterAntecedent(patientId, antecedentPropose)
            setAntecedentAjoute(true)
            setTimeout(() => navigate(`/patients/${patientId}`), 600)
        } catch {
            setError("Erreur lors de l'ajout aux antécédents.")
            setAntecedentPropose(null)
        } finally {
            setAntecedentLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!consultId) return
        setDeleteLoading(true)
        try {
            await deleteConsultation(Number(consultId))
            navigate(`/patients/${patientId}`)
        } catch {
            setDeleteLoading(false)
            setShowDelete(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                     style={{ borderColor: '#003152', borderTopColor: 'transparent' }} />
                <p className="text-sm text-gray-400">Chargement...</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">

            {showDelete && (
                <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleteLoading} />
            )}

            {antecedentPropose && !antecedentAjoute && (
                <AjoutAntecedentModal
                    texte={antecedentPropose}
                    loading={antecedentLoading}
                    onConfirm={handleConfirmAntecedent}
                    onCancel={() => navigate(`/patients/${patientId}`)}
                />
            )}

            {antecedentAjoute && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl mb-3 mx-auto">✓</div>
                        <p className="text-sm font-medium text-gray-900">Antécédent ajouté au dossier</p>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate(`/patients/${patientId}`)}
                        className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                    ← Retour au dossier
                </button>
                <span className="text-gray-200">|</span>
                <span className="text-sm font-medium text-gray-900">
                    {patient ? `${patient.prenom} ${patient.nom}` : '...'}
                </span>
                {!isNew && (
                    <button onClick={() => setShowDelete(true)}
                            className="ml-auto px-4 py-2 text-sm font-medium rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                        🗑️ Supprimer
                    </button>
                )}
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNew ? 'Nouvel événement médical' : 'Modifier l\'événement'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Consultation, examen, opération ou autre événement du dossier patient
                    </p>
                </div>

                {/* Antécédents existants — contexte */}
                {patient && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Antécédents médicaux connus
                        </h2>
                        {antecedentsActuels.length === 0 ? (
                            <p className="text-sm text-gray-300">Aucun antécédent renseigné</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {antecedentsActuels.map(a => (
                                    <span key={a} className="px-2.5 py-1 rounded-full text-xs font-medium"
                                          style={{ backgroundColor: '#00315215', color: '#003152' }}>
                                        {a}
                                    </span>
                                ))}
                            </div>
                        )}
                        {patient.allergies && (
                            <p className="text-xs text-red-500 mt-3">⚠ Allergies : {patient.allergies}</p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Type d'événement */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Type d'événement
                        </h2>
                        <TypeSelector value={form.type_evenement} onChange={t => setForm(prev => ({ ...prev, type_evenement: t }))} />
                    </div>

                    {/* Informations générales */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Date et heure</FieldLabel>
                                <input type="datetime-local" name="date" value={form.date} onChange={handleChange}
                                       className={inputCls} {...focusHandlers} />
                            </div>
                            <div>
                                <FieldLabel>Statut</FieldLabel>
                                <select name="statut" value={form.statut} onChange={handleChange}
                                        className={inputCls} {...focusHandlers}>
                                    {(Object.entries(STATUT_CONFIG) as [ConsultationStatut, { label: string }][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Motif <span className="text-red-400">*</span></FieldLabel>
                            <input type="text" name="motif" value={form.motif} onChange={handleChange}
                                   placeholder="Ex : Douleurs abdominales, Échographie de contrôle, Appendicectomie..."
                                   className={inputCls} {...focusHandlers} />
                        </div>
                    </div>

                    {/* Observations cliniques */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Observations cliniques
                        </h2>
                        <div>
                            <FieldLabel>Symptômes observés</FieldLabel>
                            <textarea name="symptomes" value={form.symptomes} onChange={handleChange} rows={3}
                                      placeholder="Fièvre, douleur, fatigue..."
                                      className={inputCls + " resize-none"} {...focusHandlers} />
                        </div>
                        <div>
                            <FieldLabel>Examens réalisés</FieldLabel>
                            <textarea name="examens_realises" value={form.examens_realises} onChange={handleChange} rows={3}
                                      placeholder="Bilan sanguin, radiographie, échographie..."
                                      className={inputCls + " resize-none"} {...focusHandlers} />
                        </div>
                        <div>
                            <FieldLabel>Diagnostic</FieldLabel>
                            <textarea name="diagnostic" value={form.diagnostic} onChange={handleChange} rows={2}
                                      placeholder="Diagnostic posé..."
                                      className={inputCls + " resize-none"} {...focusHandlers} />
                            <p className="text-xs text-gray-300 mt-1">
                                Si rempli, on vous proposera de l'ajouter aux antécédents du patient.
                            </p>
                        </div>
                    </div>

                    {/* Suivi */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Suivi
                        </h2>
                        <div>
                            <FieldLabel>Ordonnance</FieldLabel>
                            <textarea name="ordonnance" value={form.ordonnance} onChange={handleChange} rows={2}
                                      placeholder="Médicaments, posologie..."
                                      className={inputCls + " resize-none"} {...focusHandlers} />
                        </div>
                        <div>
                            <FieldLabel>Notes</FieldLabel>
                            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                                      placeholder="Observations complémentaires..."
                                      className={inputCls + " resize-none"} {...focusHandlers} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => navigate(`/patients/${patientId}`)}
                                className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                                className="px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                style={{ backgroundColor: '#003152' }}
                                onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = '#004070') }}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                        >
                            {saving ? 'Enregistrement...' : '✓ Enregistrer'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}
