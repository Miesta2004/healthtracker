import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, updatePatient, deletePatient, getSignesVitaux } from '../api/patients'
import type { Patient, SignesVitaux, Consultation } from '../types'
import SignesVitauxCharts from '../components/SignesCharts'
import ConsultationsSection from '../components/Consultations'
import { getConsultations } from '../api/consultations'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dateStr: string) {
    const today = new Date()
    const birth = new Date(dateStr)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    })
}

// ─── Badge tag affiché (allergie ou antécédent) ───────────────────────────────
function MedTag({ label, color = '#003152' }: { label: string; color?: string }) {
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: color + '15', color }}
        >
            {label}
        </span>
    )
}

// ─── Section info simple ──────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    )
}

// ─── Modal de confirmation suppression ───────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel, loading }: {
    name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">🗑️</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer le dossier ?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Le dossier de <strong>{name}</strong> sera supprimé définitivement. Cette action est irréversible.
                </p>
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

// ─── Modal d'édition ─────────────────────────────────────────────────────────
function EditModal({ patient, onSave, onCancel }: {
    patient: Patient
    onSave: (updated: Partial<Patient>) => void
    onCancel: () => void
}) {
    const [form, setForm] = useState({
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone || '',
        adresse: patient.adresse || '',
        groupe_sanguin: patient.groupe_sanguin || '',
        actif: patient.actif,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Modifier le dossier</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {(['prenom', 'nom'] as const).map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-500 mb-1 capitalize">{field === 'prenom' ? 'Prénom' : 'Nom'}</label>
                                <input name={field} value={form[field]} onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                                       onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                       onBlur={e => e.target.style.boxShadow = 'none'}
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
                        <input name="telephone" value={form.telephone} onChange={handleChange}
                               className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                               onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                               onBlur={e => e.target.style.boxShadow = 'none'}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Adresse</label>
                        <input name="adresse" value={form.adresse} onChange={handleChange}
                               className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                               onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                               onBlur={e => e.target.style.boxShadow = 'none'}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Groupe sanguin</label>
                        <select name="groupe_sanguin" value={form.groupe_sanguin} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                        >
                            <option value="">Inconnu</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <button type="button"
                                onClick={() => setForm(prev => ({ ...prev, actif: !prev.actif }))}
                                className="relative w-10 h-5 rounded-full transition-colors"
                                style={{ backgroundColor: form.actif ? '#003152' : '#d1d5db' }}
                        >
                            <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                  style={{ left: form.actif ? '22px' : '2px' }} />
                        </button>
                        <span className="text-sm text-gray-700">Patient {form.actif ? 'actif' : 'inactif'}</span>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button onClick={() => onSave(form)}
                            className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium"
                            style={{ backgroundColor: '#003152' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PatientDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [loading, setLoading] = useState(true)
    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [signes, setSignes] = useState<SignesVitaux[]>([])
    const [consultations, setConsultations] = useState<Consultation[]>([])

    useEffect(() => {
        if (!id) return
        getPatient(Number(id))
            .then(setPatient)
            .catch(() => navigate('/dashboard'))
            .finally(() => setLoading(false))
        getSignesVitaux(Number(id)).then(setSignes).catch(() => {})
        getConsultations(Number(id)).then(setConsultations).catch(() => {})
    }, [id])

    const handleSave = async (updated: Partial<Patient>) => {
        if (!patient) return
        setSaveError('')
        try {
            const res = await updatePatient(patient.id, updated)
            setPatient(res)
            setShowEdit(false)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch {
            setSaveError('Erreur lors de la mise à jour')
        }
    }

    const handleDelete = async () => {
        if (!patient) return
        setDeleteLoading(true)
        try {
            await deletePatient(patient.id)
            navigate('/dashboard')
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
                <p className="text-sm text-gray-400">Chargement du dossier...</p>
            </div>
        </div>
    )

    if (!patient) return null

    const age = calcAge(patient.date_naissance)
    const allergiesList = patient.allergies
        ? patient.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : []
    const antecedentsList = patient.antecedents
        ? patient.antecedents.split(',').map(s => s.trim()).filter(Boolean)
        : []

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Modals */}
            {showEdit && (
                <EditModal patient={patient} onSave={handleSave} onCancel={() => setShowEdit(false)} />
            )}
            {showDelete && (
                <DeleteModal
                    name={`${patient.prenom} ${patient.nom}`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDelete(false)}
                    loading={deleteLoading}
                />
            )}

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate('/dashboard')}
                        className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                    ← Retour
                </button>
                <span className="text-gray-200">|</span>
                <span className="text-sm font-medium text-gray-900">{patient.prenom} {patient.nom}</span>
                <div className="ml-auto flex items-center gap-2">
                    {saveSuccess && (
                        <span className="text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-full">
                            ✓ Dossier mis à jour
                        </span>
                    )}
                    {saveError && (
                        <span className="text-xs text-red-600 font-medium px-3 py-1.5 bg-red-50 rounded-full">
                            {saveError}
                        </span>
                    )}
                    <button onClick={() => setShowEdit(true)}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        ✏️ Modifier
                    </button>
                    <button onClick={() => setShowDelete(true)}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                        🗑️
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

                {/* ── Header patient ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-start gap-5">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: '#003152' }}
                        >
                            {patient.prenom[0]}{patient.nom[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {patient.prenom} {patient.nom}
                                    </h1>
                                    <p className="text-gray-400 text-sm mt-0.5">
                                        {age} ans · {patient.sexe === 'M' ? 'Masculin' : 'Féminin'} · Né(e) le {formatDate(patient.date_naissance)}
                                    </p>
                                </div>
                                <span
                                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium"
                                    style={patient.actif
                                        ? { backgroundColor: '#003152', color: 'white' }
                                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                                    }
                                >
                                    {patient.actif ? '● Actif' : '○ Inactif'}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                                {patient.groupe_sanguin && (
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                                          style={{ backgroundColor: '#ADDFF1', color: '#003152' }}>
                                        🩸 Groupe {patient.groupe_sanguin}
                                    </span>
                                )}
                                {patient.telephone && (
                                    <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                        📞 {patient.telephone}
                                    </span>
                                )}
                                {patient.adresse && (
                                    <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                        📍 {patient.adresse}
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                                    Dossier #{patient.id} · créé le {formatDate(patient.date_creation)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Grille infos médicales ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Allergies connues</h2>
                            {allergiesList.length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#e53e3e' }}>
                                    ⚠ {allergiesList.length}
                                </span>
                            )}
                        </div>
                        {allergiesList.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-gray-300 py-2"><span>✓</span><span>Aucune allergie renseignée</span></div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {allergiesList.map(a => <MedTag key={a} label={a} color="#dc2626" />)}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Antécédents médicaux</h2>
                            {antecedentsList.length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#003152' }}>
                                    {antecedentsList.length}
                                </span>
                            )}
                        </div>
                        {antecedentsList.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-gray-300 py-2"><span>✓</span><span>Aucun antécédent renseigné</span></div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {antecedentsList.map(a => <MedTag key={a} label={a} color="#003152" />)}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Alerte allergies ── */}
                {allergiesList.length > 0 && (
                    <div className="rounded-xl border border-red-100 p-4 flex gap-3" style={{ backgroundColor: '#fff5f5' }}>
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div>
                            <p className="text-sm font-semibold text-red-700">Attention aux allergies</p>
                            <p className="text-xs text-red-500 mt-0.5">
                                Ce patient présente {allergiesList.length} allergie{allergiesList.length > 1 ? 's' : ''} connue{allergiesList.length > 1 ? 's' : ''} :
                                {' '}<strong>{allergiesList.join(', ')}</strong>
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Infos personnelles ── */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Informations personnelles</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <InfoRow label="Prénom" value={patient.prenom} />
                        <InfoRow label="Nom" value={patient.nom} />
                        <InfoRow label="Date de naissance" value={formatDate(patient.date_naissance)} />
                        <InfoRow label="Âge" value={`${age} ans`} />
                        <InfoRow label="Sexe" value={patient.sexe === 'M' ? 'Masculin' : 'Féminin'} />
                        <InfoRow label="Groupe sanguin" value={patient.groupe_sanguin || 'Non renseigné'} />
                        {patient.telephone && <InfoRow label="Téléphone" value={patient.telephone} />}
                        {patient.adresse && <InfoRow label="Adresse" value={patient.adresse} />}
                        <InfoRow label="ID dossier" value={`#${patient.id}`} mono />
                        <InfoRow label="Créé le" value={formatDate(patient.date_creation)} />
                    </div>
                </div>

                {/* ── Consultations & Signes vitaux (2 colonnes) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">

                    {/* Colonne gauche : Consultations */}
                    <div>
                        <ConsultationsSection
                            patientId={patient.id}
                            consultations={consultations}
                            onUpdate={setConsultations}
                        />
                    </div>

                    {/* Colonne droite : Signes vitaux */}
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 mb-4">
                            Suivi des signes vitaux
                        </h2>
                        <SignesVitauxCharts data={signes} />
                    </div>

                </div>

            </div>
        </div>
    )
}
