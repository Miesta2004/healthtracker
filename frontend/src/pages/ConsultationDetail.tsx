import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patients'
import { getAntecedents, promouvoirAntecedent } from '../api/antecedents'
import { getConsultation, createConsultation, updateConsultation, deleteConsultation } from '../api/consultations'
import type { Patient, ConsultationStatut, TypeEvenement, Antecedent, TypeAntecedent } from '../types'
import { SkeletonDetailPage } from '../components/Skeleton'

// ─── Types d'antécédents (catégorisation à la promotion) ─────────────────────
const TYPE_ANTECEDENT_LABELS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'Maladie chronique',
    chirurgie:         'Chirurgie',
    allergie:          'Allergie',
    familial:          'Antécédent familial',
    autre:             'Autre',
}
const TYPE_ANTECEDENT_COLORS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'var(--role-medecin)',
    chirurgie:         'var(--role-laborantin)',
    allergie:          'var(--tri-1-bg)',
    familial:          'var(--role-secretaire)',
    autre:             'var(--ht-muted)',
}

// ─── Config types & statuts ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: string }> = {
    consultation: { label: 'Consultation', icon: '🩺' },
    examen:       { label: 'Examen',        icon: '🔬' },
    operation:    { label: 'Opération',     icon: '🏥' },
    autre:        { label: 'Autre',         icon: '📋' },
}

const STATUT_CONFIG: Record<ConsultationStatut, { label: string; color: string; bg: string }> = {
    planifiee: { label: 'Planifiée', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
    en_cours:  { label: 'En cours',  color: '#1d4ed8', bg: '#dbeafe' },
    terminee:  { label: 'Terminée',  color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    annulee:   { label: 'Annulée',   color: 'var(--ht-muted)', bg: 'var(--ht-muted-bg)' },
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs text-gray-500 mb-1">{children}</label>
}

const inputCls = "ht-input"

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
                        ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                        : { backgroundColor: 'white', color: 'var(--ht-text)', borderColor: 'var(--ht-border-input)' }
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
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-sm">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">🗑️</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cet événement ?</h3>
                <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                            className="btn btn-ghost flex-1">
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
function AjoutAntecedentModal({ texte, type, onTypeChange, onConfirm, onCancel, loading }: {
    texte: string; type: TypeAntecedent; onTypeChange: (t: TypeAntecedent) => void
    onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-sm">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: 'var(--ht-primary-tint)' }}>📌</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Ajouter aux antécédents ?</h3>
                <p className="text-sm text-gray-500 mb-2">
                    Voulez-vous ajouter ceci au dossier médical permanent du patient :
                </p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2 mb-4">
                    {texte}
                </p>
                <label className="block text-xs text-gray-500 mb-1.5">Catégorie</label>
                <select
                    value={type}
                    onChange={e => onTypeChange(e.target.value as TypeAntecedent)}
                    className="ht-input w-full px-3 py-2 text-sm mb-6"
                >
                    {(Object.entries(TYPE_ANTECEDENT_LABELS) as [TypeAntecedent, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                    ))}
                </select>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                            className="btn btn-ghost flex-1">
                        Non, merci
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                            className="btn btn-primary flex-1">
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
    const [antecedents, setAntecedents] = useState<Antecedent[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [showDelete, setShowDelete] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Proposition d'ajout aux antécédents après enregistrement
    const [antecedentPropose, setAntecedentPropose] = useState<string | null>(null)
    const [typeAntecedentChoisi, setTypeAntecedentChoisi] = useState<TypeAntecedent>('maladie_chronique')
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
        getAntecedents(patientId).then(setAntecedents).catch(() => {})

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

    const antecedentsActuels = antecedents.map(a => a.libelle)

    // Texte candidat à proposer comme antécédent : diagnostic en priorité,
    // sinon le motif si c'est une opération (ex: "Appendicectomie")
    const candidatAntecedent = form.diagnostic.trim() || (
        form.type_evenement === 'operation' ? form.motif.trim() : ''
    )

    // Id de la consultation créée/modifiée, nécessaire pour la promotion en antécédent
    const [savedConsultId, setSavedConsultId] = useState<number | null>(
        !isNew && consultId ? Number(consultId) : null
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.motif.trim()) { setError('Le motif est obligatoire.'); return }
        setSaving(true)
        setError('')
        try {
            const payload = { ...form, date: form.date + ':00', patient: patientId }
            let savedId: number
            if (isNew) {
                const created = await createConsultation(payload)
                savedId = created.id
            } else {
                const updated = await updateConsultation(Number(consultId), payload)
                savedId = updated.id
            }
            setSavedConsultId(savedId)

            // Propose l'ajout aux antécédents seulement si on a un candidat
            // pertinent qui n'existe pas déjà dans le dossier du patient,
            // et seulement quand la consultation est clôturée (terminée).
            const aProposer = form.statut === 'terminee'
                && candidatAntecedent
                && !antecedentsActuels.includes(candidatAntecedent)
            if (aProposer) {
                setTypeAntecedentChoisi(form.type_evenement === 'operation' ? 'chirurgie' : 'maladie_chronique')
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
        if (!antecedentPropose || !savedConsultId) return
        setAntecedentLoading(true)
        try {
            await promouvoirAntecedent(savedConsultId, {
                libelle: antecedentPropose,
                type_antecedent: typeAntecedentChoisi,
            })
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
        <div className="ht-page">
            <SkeletonDetailPage />
        </div>
    )

    return (
        <div className="ht-page">

            {showDelete && (
                <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleteLoading} />
            )}

            {antecedentPropose && !antecedentAjoute && (
                <AjoutAntecedentModal
                    texte={antecedentPropose}
                    type={typeAntecedentChoisi}
                    onTypeChange={setTypeAntecedentChoisi}
                    loading={antecedentLoading}
                    onConfirm={handleConfirmAntecedent}
                    onCancel={() => navigate(`/patients/${patientId}`)}
                />
            )}

            {antecedentAjoute && (
                <div className="ht-modal-overlay">
                    <div className="ht-modal ht-modal-sm text-center">
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
                    <div className="ht-card p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Antécédents médicaux connus
                        </h2>
                        {antecedents.length === 0 ? (
                            <p className="text-sm text-gray-300">Aucun antécédent renseigné</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {antecedents.map(a => (
                                    <span key={a.id} className="px-2.5 py-1 rounded-full text-xs font-medium"
                                          style={{
                                              backgroundColor: TYPE_ANTECEDENT_COLORS[a.type_antecedent] + '15',
                                              color: TYPE_ANTECEDENT_COLORS[a.type_antecedent],
                                              opacity: a.statut === 'resolu' ? 0.5 : 1,
                                          }}
                                          title={a.statut === 'resolu' ? 'Résolu' : 'Actif'}>
                                        {a.libelle}
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
                    <div className="ht-card p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Type d'événement
                        </h2>
                        <TypeSelector value={form.type_evenement} onChange={t => setForm(prev => ({ ...prev, type_evenement: t }))} />
                    </div>

                    {/* Informations générales */}
                    <div className="ht-card p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Date et heure</FieldLabel>
                                <input type="datetime-local" name="date" value={form.date} onChange={handleChange}
                                       className={inputCls} />
                            </div>
                            <div>
                                <FieldLabel>Statut</FieldLabel>
                                <select name="statut" value={form.statut} onChange={handleChange}
                                        className={inputCls}>
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
                                   className={inputCls} />
                        </div>
                    </div>

                    {/* Observations cliniques */}
                    <div className="ht-card p-5 space-y-4">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Observations cliniques
                        </h2>
                        <div>
                            <FieldLabel>Symptômes observés</FieldLabel>
                            <textarea name="symptomes" value={form.symptomes} onChange={handleChange} rows={3}
                                      placeholder="Fièvre, douleur, fatigue..."
                                      className={inputCls + " resize-none"} />
                        </div>
                        <div>
                            <FieldLabel>Examens réalisés</FieldLabel>
                            <textarea name="examens_realises" value={form.examens_realises} onChange={handleChange} rows={3}
                                      placeholder="Bilan sanguin, radiographie, échographie..."
                                      className={inputCls + " resize-none"} />
                        </div>
                        <div>
                            <FieldLabel>Diagnostic</FieldLabel>
                            <textarea name="diagnostic" value={form.diagnostic} onChange={handleChange} rows={2}
                                      placeholder="Diagnostic posé..."
                                      className={inputCls + " resize-none"} />
                            <p className="text-xs text-gray-300 mt-1">
                                Si rempli et que le statut est "Terminée", on vous proposera de l'ajouter aux antécédents du patient.
                            </p>
                        </div>
                    </div>

                    {/* Suivi */}
                    <div className="ht-card p-5 space-y-4">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Suivi
                        </h2>
                        <div>
                            <FieldLabel>Ordonnance</FieldLabel>
                            <textarea name="ordonnance" value={form.ordonnance} onChange={handleChange} rows={2}
                                      placeholder="Médicaments, posologie..."
                                      className={inputCls + " resize-none"} />
                        </div>
                        <div>
                            <FieldLabel>Notes</FieldLabel>
                            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                                      placeholder="Observations complémentaires..."
                                      className={inputCls + " resize-none"} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => navigate(`/patients/${patientId}`)}
                                className="btn btn-ghost">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                                className="btn btn-primary"
                        >
                            {saving ? 'Enregistrement...' : '✓ Enregistrer'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}