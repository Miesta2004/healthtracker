import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patients'
import { getAntecedents, promouvoirAntecedent } from '../api/antecedents'
import { getConsultation, createConsultation, updateConsultation, deleteConsultation } from '../api/consultations'
import type { Patient, ConsultationStatut, TypeEvenement, Antecedent, TypeAntecedent } from '../types'
import { SkeletonDetailPage } from '../components/Skeleton'
import {
    Stethoscope,
    FlaskConical,
    Activity,
    FileText,
    Trash2,
    Pin,
    Check,
    CheckCircle,
    AlertTriangle,
    ChevronLeft,
    type LucideIcon,
} from 'lucide-react'

// ─── Types d'antécédents (catégorisation à la promotion) ─────────────────────
const TYPE_ANTECEDENT_LABELS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'Maladie chronique',
    chirurgie:         'Chirurgie',
    allergie:          'Allergie',
    familial:          'Antécédent familial',
    autre:             'Autre',
}

// Couleurs pastel cohérentes avec le reste de l'app (mêmes tons que PatientDetail)
const TYPE_ANTECEDENT_COLORS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'border-[var(--ht-primary)] bg-[var(--ht-primary-tint-bg)] text-[var(--ht-primary)]',
    chirurgie:         'border-orange-100 bg-orange-50 text-orange-700',
    allergie:          'border-[var(--ht-danger)] bg-[var(--ht-danger-bg)] text-[var(--ht-danger)]',
    familial:          'border-purple-100 bg-purple-50 text-purple-700',
    autre:             'border-[var(--ht-border-input)] bg-[var(--ht-bg)] text-[var(--ht-text-secondary)]',
}

// ─── Config types & statuts ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: LucideIcon }> = {
    consultation: { label: 'Consultation', icon: Stethoscope },
    examen:       { label: 'Examen',        icon: FlaskConical },
    operation:    { label: 'Opération',     icon: Activity },
    autre:        { label: 'Autre',         icon: FileText },
}

const STATUT_LABELS: Record<ConsultationStatut, string> = {
    planifiee: 'Planifiée',
    en_cours:  'En cours',
    terminee:  'Terminée',
    annulee:   'Annulée',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="ht-label mb-1">{children}</label>
}

// ─── Sélecteur de type d'événement ───────────────────────────────────────────
function TypeSelector({ value, onChange }: { value: TypeEvenement; onChange: (t: TypeEvenement) => void }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(TYPE_CONFIG) as [TypeEvenement, { label: string; icon: LucideIcon }][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                const isSelected = value === key
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className="flex flex-col items-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all"
                        style={isSelected
                            ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                            : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)', borderColor: 'var(--ht-border)' }
                        }
                    >
                        <Icon size={18} />
                        {cfg.label}
                    </button>
                )
            })}
        </div>
    )
}

// ─── Modal confirmation suppression ──────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, loading }: {
    onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-sm text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto border"
                     style={{ color: 'var(--ht-danger)', backgroundColor: 'var(--ht-danger-bg-light)', borderColor: 'var(--ht-danger)' }}>
                    <Trash2 size={20} />
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ht-text)' }}>Supprimer cet événement ?</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--ht-text-secondary)' }}>Cette action est irréversible.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-secondary flex-1">
                        Annuler
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1">
                        {loading ? 'Suppression…' : 'Supprimer'}
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
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 border"
                     style={{ backgroundColor: 'var(--ht-primary-tint-bg)', borderColor: 'var(--ht-primary-tint-text)' }}>
                    <Pin size={20} style={{ color: 'var(--ht-primary)' }} />
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ht-text)' }}>Ajouter aux antécédents ?</h3>
                <p className="text-sm mb-2" style={{ color: 'var(--ht-text-secondary)' }}>
                    Voulez-vous ajouter ceci au dossier médical permanent du patient :
                </p>
                <p className="text-sm font-semibold rounded-xl px-3 py-2 mb-4 border"
                   style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}>
                    {texte}
                </p>
                <label className="ht-label mb-1.5">Catégorie</label>
                <select
                    value={type}
                    onChange={e => onTypeChange(e.target.value as TypeAntecedent)}
                    className="ht-input w-full mb-6"
                >
                    {(Object.entries(TYPE_ANTECEDENT_LABELS) as [TypeAntecedent, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                    ))}
                </select>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-secondary flex-1">
                        Non, merci
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-primary flex-1">
                        {loading ? 'Ajout…' : 'Oui, ajouter'}
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

    const antecedentsActuels = useMemo(() => antecedents.map(a => a.libelle), [antecedents])

    const candidatAntecedent = form.diagnostic.trim() || (
        form.type_evenement === 'operation' ? form.motif.trim() : ''
    )

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
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto border"
                             style={{ color: 'var(--ht-success)', backgroundColor: 'var(--ht-success-bg)', borderColor: 'var(--ht-success)' }}>
                            <CheckCircle size={22} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Antécédent ajouté au dossier</p>
                    </div>
                </div>
            )}

            {/* Topbar / Entête de navigation */}
            <nav className="border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <button onClick={() => navigate(`/patients/${patientId}`)}
                        className="text-sm flex items-center gap-1 transition-colors hover:scale-105" style={{ color: 'var(--ht-text-muted)' }}>
                    <ChevronLeft size={16} /> Retour au dossier
                </button>
                <span style={{ color: 'var(--ht-border)' }}>|</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                    {patient ? `${patient.prenom} ${patient.nom}` : '…'}
                </span>
                {!isNew && (
                    <button onClick={() => setShowDelete(true)} className="btn btn-danger btn-sm gap-1.5 ml-auto">
                        <Trash2 size={14} /> Supprimer
                    </button>
                )}
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>
                        {isNew ? 'Nouvel événement médical' : "Modifier l'événement"}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        Consultation, examen, opération ou autre événement du dossier patient
                    </p>
                </div>

                {/* Contexte médical : Antécédents existants */}
                {patient && (
                    <div className="ht-card ht-card-padded-sm">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                            Antécédents médicaux connus
                        </h2>
                        {antecedents.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun antécédent renseigné</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {antecedents.map(a => (
                                    <span key={a.id} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_ANTECEDENT_COLORS[a.type_antecedent]}`}
                                          style={{ opacity: a.statut === 'resolu' ? 0.5 : 1 }}
                                          title={a.statut === 'resolu' ? 'Résolu' : 'Actif'}>
                                        {a.libelle}
                                    </span>
                                ))}
                            </div>
                        )}
                        {patient.allergies && (
                            <p className="text-xs font-semibold mt-3 flex items-center gap-1.5" style={{ color: 'var(--ht-danger)' }}>
                                <AlertTriangle size={14} /> Allergies : {patient.allergies}
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="ht-alert ht-alert-danger">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Type d'événement */}
                    <div className="ht-card ht-card-padded-sm">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                            Type d'événement
                        </h2>
                        <TypeSelector value={form.type_evenement} onChange={t => setForm(prev => ({ ...prev, type_evenement: t }))} />
                    </div>

                    {/* Informations générales */}
                    <div className="ht-card ht-card-padded-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="ht-field">
                                <FieldLabel>Date et heure</FieldLabel>
                                <input type="datetime-local" name="date" value={form.date} onChange={handleChange} className="ht-input" />
                            </div>
                            <div className="ht-field">
                                <FieldLabel>Statut</FieldLabel>
                                <select name="statut" value={form.statut} onChange={handleChange} className="ht-input">
                                    {(Object.entries(STATUT_LABELS) as [ConsultationStatut, string][]).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="ht-field">
                            <FieldLabel>Motif <span style={{ color: 'var(--ht-danger)' }}>*</span></FieldLabel>
                            <input type="text" name="motif" value={form.motif} onChange={handleChange}
                                   placeholder="Ex : Douleurs abdominales, Échographie de contrôle, Appendicectomie…"
                                   className="ht-input" />
                        </div>
                    </div>

                    {/* Observations cliniques */}
                    <div className="ht-card ht-card-padded-sm space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                            Observations cliniques
                        </h2>
                        <div className="ht-field">
                            <FieldLabel>Symptômes observés</FieldLabel>
                            <textarea name="symptomes" value={form.symptomes} onChange={handleChange} rows={3}
                                      placeholder="Fièvre, douleur, fatigue…" className="ht-input ht-textarea" />
                        </div>
                        <div className="ht-field">
                            <FieldLabel>Examens réalisés</FieldLabel>
                            <textarea name="examens_realises" value={form.examens_realises} onChange={handleChange} rows={3}
                                      placeholder="Bilan sanguin, radiographie, échographie…" className="ht-input ht-textarea" />
                        </div>
                        <div className="ht-field">
                            <FieldLabel>Diagnostic</FieldLabel>
                            <textarea name="diagnostic" value={form.diagnostic} onChange={handleChange} rows={2}
                                      placeholder="Diagnostic posé…" className="ht-input ht-textarea" />
                            <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                                Si rempli et que le statut est "Terminée", on vous proposera de l'ajouter aux antécédents du patient.
                            </p>
                        </div>
                    </div>

                    {/* Suivi */}
                    <div className="ht-card ht-card-padded-sm space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                            Suivi
                        </h2>
                        <div className="ht-field">
                            <FieldLabel>Ordonnance</FieldLabel>
                            <textarea name="ordonnance" value={form.ordonnance} onChange={handleChange} rows={2}
                                      placeholder="Médicaments, posologie…" className="ht-input ht-textarea" />
                        </div>
                        <div className="ht-field">
                            <FieldLabel>Notes</FieldLabel>
                            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                                      placeholder="Observations complémentaires…" className="ht-input ht-textarea" />
                        </div>
                    </div>

                    {/* Actions de validation */}
                    <div className="flex gap-3 justify-end items-center pt-2">
                        <button type="button" onClick={() => navigate(`/patients/${patientId}`)} className="btn btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving} className="btn btn-primary gap-1.5">
                            <Check size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}