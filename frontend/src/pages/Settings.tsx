import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/NavBar'
import {
    updateMonProfil, changePassword, uploadMaPhoto, getMaPhotoUrl,
    getMesCreneaux, createCreneau, deleteCreneau,
    getMesExceptions, createException, deleteException,
} from '../api/disponibilites'
import type { CreneauDisponibilite, ExceptionDisponibilite, TypeCreneau, TypeException } from '../types'
import { getMe } from '../api/comptes'

// ─── Constantes ───────────────────────────────────────────────────────────────
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const TYPE_CRENEAU: Record<TypeCreneau, string> = {
    presentiel:      'Présentiel',
    garde:           'Garde',
    astreinte:       'Astreinte',
    teleconsultation: 'Téléconsultation',
}

const TYPE_EXCEPTION: Record<TypeException, string> = {
    conge:     'Congé',
    absence:   'Absence',
    garde:     'Garde exceptionnelle',
    formation: 'Formation',
    mission:   'Mission extérieure',
}

const TYPE_CRENEAU_COLORS: Record<TypeCreneau, { bg: string; color: string }> = {
    presentiel:       { bg: '#dbeafe', color: '#1d4ed8' },
    garde:            { bg: '#fee2e2', color: '#dc2626' },
    astreinte:        { bg: '#fef3c7', color: '#b45309' },
    teleconsultation: { bg: '#d1fae5', color: '#065f46' },
}

// ─── Onglets ──────────────────────────────────────────────────────────────────
type Onglet = 'profil' | 'securite' | 'signature' | 'disponibilites' | 'contrat' | 'notifications'

const ONGLETS: { id: Onglet; label: string; icon: string }[] = [
    { id: 'profil',          label: 'Profil',          icon: '👤' },
    { id: 'securite',        label: 'Sécurité',        icon: '🔒' },
    { id: 'signature',       label: 'Signature',       icon: '✍️' },
    { id: 'disponibilites',  label: 'Disponibilités',  icon: '📅' },
    { id: 'contrat',         label: 'Contrat & poste', icon: '📋' },
    { id: 'notifications',   label: 'Notifications',   icon: '🔔' },
]

// ─── Composant : feedback inline ─────────────────────────────────────────────
function Feedback({ type, message }: { type: 'success' | 'error'; message: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
             style={type === 'success'
                 ? { backgroundColor: '#f0fdf4', color: '#15803d' }
                 : { backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <span>{type === 'success' ? '✓' : '✕'}</span>
            {message}
        </div>
    )
}

// ─── Onglet Profil ────────────────────────────────────────────────────────────
function OngletProfil({ employe, photoUrl, onPhotoChange }: {
    employe: Record<string, unknown>
    photoUrl: string | null
    onPhotoChange: (url: string) => void
}) {
    const [telephone, setTelephone] = useState((employe.telephone as string) ?? '')
    const [adresse, setAdresse] = useState((employe.adresse as string) ?? '')
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            await updateMonProfil({ telephone, adresse })
            setFeedback({ type: 'success', msg: 'Profil mis à jour.' })
        } catch {
            setFeedback({ type: 'error', msg: 'Erreur lors de la sauvegarde.' })
        } finally {
            setSaving(false)
        }
    }

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            await uploadMaPhoto(file)
            const url = await getMaPhotoUrl()
            if (url) onPhotoChange(url)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Photo */}
            <div className="flex items-center gap-5">
                <div className="relative">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Photo de profil"
                             className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                             style={{ backgroundColor: '#003152' }}>
                            {(employe.prenom as string)?.[0]}{(employe.nom as string)?.[0]}
                        </div>
                    )}
                    {uploading && (
                        <div className="absolute inset-0 rounded-2xl bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <div>
                    <button onClick={() => fileRef.current?.click()}
                            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        Changer la photo
                    </button>
                    <p className="text-xs text-gray-400 mt-1">JPG ou PNG, max 2 Mo</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
            </div>

            {/* Infos en lecture seule */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                {[
                    ['Prénom', employe.prenom],
                    ['Nom', employe.nom],
                    ['Rôle', employe.role_label],
                    ['Spécialité', employe.specialite || '—'],
                    ['Matricule', employe.matricule],
                    ['Service', employe.service_nom || '—'],
                ].map(([label, val]) => (
                    <div key={label as string}>
                        <p className="text-xs text-gray-400">{label as string}</p>
                        <p className="text-sm font-medium text-gray-800">{val as string}</p>
                    </div>
                ))}
            </div>

            {/* Champs modifiables */}
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Téléphone
                    </label>
                    <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                           className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                           onFocus={e => e.target.style.boxShadow = '0 0 0 2px #e0eaf3'}
                           onBlur={e => e.target.style.boxShadow = 'none'} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Adresse
                    </label>
                    <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)}
                           className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                           onFocus={e => e.target.style.boxShadow = '0 0 0 2px #e0eaf3'}
                           onBlur={e => e.target.style.boxShadow = 'none'} />
                </div>
            </div>

            {feedback && <Feedback type={feedback.type} message={feedback.msg} />}

            <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: saving ? '#9ca3af' : '#003152' }}>
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
        </div>
    )
}

// ─── Onglet Sécurité ──────────────────────────────────────────────────────────
function OngletSecurite() {
    const [ancien, setAncien] = useState('')
    const [nouveau, setNouveau] = useState('')
    const [confirm, setConfirm] = useState('')
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [showAncien, setShowAncien] = useState(false)
    const [showNouveau, setShowNouveau] = useState(false)

    const force = nouveau.length === 0 ? 0
        : nouveau.length < 8 ? 1
            : /[A-Z]/.test(nouveau) && /[0-9]/.test(nouveau) ? 3
                : 2

    const forceLabel = ['', 'Faible', 'Moyen', 'Fort']
    const forceColor = ['', '#dc2626', '#f59e0b', '#16a34a']

    const handleSubmit = async () => {
        if (nouveau !== confirm) {
            setFeedback({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' })
            return
        }
        if (force < 2) {
            setFeedback({ type: 'error', msg: 'Mot de passe trop faible (min 8 caractères).' })
            return
        }
        setSaving(true)
        setFeedback(null)
        try {
            await changePassword({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau })
            setFeedback({ type: 'success', msg: 'Mot de passe mis à jour.' })
            setAncien(''); setNouveau(''); setConfirm('')
        } catch {
            setFeedback({ type: 'error', msg: 'Ancien mot de passe incorrect.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-5 max-w-md">
            {[
                { label: 'Ancien mot de passe', val: ancien, set: setAncien, show: showAncien, toggle: () => setShowAncien(p => !p) },
                { label: 'Nouveau mot de passe', val: nouveau, set: setNouveau, show: showNouveau, toggle: () => setShowNouveau(p => !p) },
                { label: 'Confirmer le nouveau', val: confirm, set: setConfirm, show: showNouveau, toggle: () => setShowNouveau(p => !p) },
            ].map(({ label, val, set, show, toggle }) => (
                <div key={label}>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                    <div className="relative">
                        <input type={show ? 'text' : 'password'} value={val}
                               onChange={e => set(e.target.value)}
                               className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none"
                               onFocus={e => e.target.style.boxShadow = '0 0 0 2px #e0eaf3'}
                               onBlur={e => e.target.style.boxShadow = 'none'} />
                        <button type="button" onClick={toggle}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {show ? 'Masquer' : 'Voir'}
                        </button>
                    </div>
                </div>
            ))}

            {/* Indicateur de force */}
            {nouveau.length > 0 && (
                <div className="space-y-1">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                             style={{ width: `${(force / 3) * 100}%`, backgroundColor: forceColor[force] }} />
                    </div>
                    <p className="text-xs" style={{ color: forceColor[force] }}>
                        Force : {forceLabel[force]}
                        {force < 3 && ' — ajoutez majuscules et chiffres'}
                    </p>
                </div>
            )}

            {feedback && <Feedback type={feedback.type} message={feedback.msg} />}

            <button onClick={handleSubmit} disabled={saving || !ancien || !nouveau || !confirm}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: saving || !ancien || !nouveau || !confirm ? '#9ca3af' : '#003152' }}>
                {saving ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
        </div>
    )
}

// ─── Onglet Signature ─────────────────────────────────────────────────────────
function OngletSignature({ employe }: { employe: Record<string, unknown> }) {
    const [signature, setSignature] = useState((employe.signature_medicale as string) ?? '')
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const placeholder = `Dr ${employe.prenom} ${employe.nom}${employe.specialite ? ` — ${employe.specialite}` : ''}${employe.service_nom ? ` — ${employe.service_nom}` : ''}`

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            await updateMonProfil({ signature_medicale: signature })
            setFeedback({ type: 'success', msg: 'Signature enregistrée.' })
        } catch {
            setFeedback({ type: 'error', msg: 'Erreur lors de la sauvegarde.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-5 max-w-lg">
            <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-xs font-semibold text-blue-800 mb-1">À quoi ça sert ?</p>
                <p className="text-xs text-blue-600">
                    Ce texte apparaîtra automatiquement en bas de chaque ordonnance et compte rendu médical que vous générez.
                </p>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Texte de signature
                </label>
                <textarea
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none font-mono"
                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #e0eaf3'}
                    onBlur={e => e.target.style.boxShadow = 'none'}
                />
                <p className="text-xs text-gray-400 mt-1">
                    Ex : Dr Aminata Diop — Cardiologue — N° ordre 12345 — Tél : +221 77 000 00 00
                </p>
            </div>

            {/* Aperçu */}
            {signature && (
                <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Aperçu ordonnance</p>
                    <div className="border-t border-gray-200 pt-3">
                        <p className="text-sm text-gray-600 whitespace-pre-line">{signature}</p>
                    </div>
                </div>
            )}

            {feedback && <Feedback type={feedback.type} message={feedback.msg} />}

            <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: saving ? '#9ca3af' : '#003152' }}>
                {saving ? 'Sauvegarde…' : 'Enregistrer la signature'}
            </button>
        </div>
    )
}

// ─── Onglet Disponibilités ────────────────────────────────────────────────────
function OngletDisponibilites() {
    const [creneaux, setCreneaux] = useState<CreneauDisponibilite[]>([])
    const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>([])
    const [loading, setLoading] = useState(true)

    // Form nouveau créneau
    const [newJour, setNewJour] = useState<string>('0')
    const [newDebut, setNewDebut] = useState('08:00')
    const [newFin, setNewFin] = useState('16:00')
    const [newType, setNewType] = useState<TypeCreneau>('presentiel')
    const [addingCreneau, setAddingCreneau] = useState(false)
    const [showFormCreneau, setShowFormCreneau] = useState(false)

    // Form nouvelle exception
    const [newExType, setNewExType] = useState<TypeException>('conge')
    const [newExDebut, setNewExDebut] = useState('')
    const [newExFin, setNewExFin] = useState('')
    const [newExMotif, setNewExMotif] = useState('')
    const [addingEx, setAddingEx] = useState(false)
    const [showFormEx, setShowFormEx] = useState(false)

    useEffect(() => {
        Promise.all([getMesCreneaux(), getMesExceptions()])
            .then(([c, e]) => { setCreneaux(c); setExceptions(e) })
            .finally(() => setLoading(false))
    }, [])

    const handleAddCreneau = async () => {
        setAddingCreneau(true)
        try {
            const created = await createCreneau({
                jour: Number(newJour) as CreneauDisponibilite['jour'],
                heure_debut: newDebut + ':00',
                heure_fin: newFin + ':00',
                type: newType,
                actif: true,
            })
            setCreneaux(prev => [...prev, created])
            setShowFormCreneau(false)
        } finally {
            setAddingCreneau(false)
        }
    }

    const handleDeleteCreneau = async (id: number) => {
        await deleteCreneau(id)
        setCreneaux(prev => prev.filter(c => c.id !== id))
    }

    const handleAddException = async () => {
        if (!newExDebut || !newExFin) return
        setAddingEx(true)
        try {
            const created = await createException({
                type: newExType,
                date_debut: newExDebut,
                date_fin: newExFin,
                motif: newExMotif,
            })
            setExceptions(prev => [...prev, created])
            setShowFormEx(false)
            setNewExMotif('')
        } finally {
            setAddingEx(false)
        }
    }

    const handleDeleteException = async (id: number) => {
        await deleteException(id)
        setExceptions(prev => prev.filter(e => e.id !== id))
    }

    // Vue grille semaine
    const creneauxParJour = JOURS.map((_, idx) =>
        creneaux.filter(c => c.jour === idx && c.actif)
    )

    if (loading) return <div className="text-sm text-gray-400">Chargement…</div>

    return (
        <div className="space-y-8">

            {/* ── Grille semaine ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Planning hebdomadaire récurrent</h3>
                    <button onClick={() => setShowFormCreneau(p => !p)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                            style={{ backgroundColor: '#003152' }}>
                        + Ajouter un créneau
                    </button>
                </div>

                {/* Formulaire nouveau créneau */}
                {showFormCreneau && (
                    <div className="mb-4 p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Jour</label>
                                <select value={newJour} onChange={e => setNewJour(e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                                    {JOURS.map((j, i) => <option key={i} value={i}>{j}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Début</label>
                                <input type="time" value={newDebut} onChange={e => setNewDebut(e.target.value)}
                                       className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Fin</label>
                                <input type="time" value={newFin} onChange={e => setNewFin(e.target.value)}
                                       className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Type</label>
                                <select value={newType} onChange={e => setNewType(e.target.value as TypeCreneau)}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                                    {Object.entries(TYPE_CRENEAU).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowFormCreneau(false)}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
                                Annuler
                            </button>
                            <button onClick={handleAddCreneau} disabled={addingCreneau}
                                    className="px-3 py-1.5 text-xs rounded-lg text-white"
                                    style={{ backgroundColor: '#003152' }}>
                                {addingCreneau ? 'Ajout…' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Grille 7 jours */}
                <div className="grid grid-cols-7 gap-2">
                    {JOURS.map((jour, idx) => (
                        <div key={jour}>
                            <p className="text-xs font-medium text-gray-400 text-center mb-2">
                                {jour.slice(0, 3)}
                            </p>
                            <div className="min-h-16 space-y-1.5">
                                {creneauxParJour[idx].length === 0 ? (
                                    <div className="h-10 rounded-lg bg-gray-50 border border-dashed border-gray-200" />
                                ) : (
                                    creneauxParJour[idx].map(c => {
                                        const cfg = TYPE_CRENEAU_COLORS[c.type]
                                        return (
                                            <div key={c.id}
                                                 className="rounded-lg px-1.5 py-1 text-center relative group"
                                                 style={{ backgroundColor: cfg.bg }}>
                                                <p className="text-xs font-semibold" style={{ color: cfg.color }}>
                                                    {c.heure_debut.slice(0, 5)}
                                                </p>
                                                <p className="text-xs" style={{ color: cfg.color }}>
                                                    {c.heure_fin.slice(0, 5)}
                                                </p>
                                                <button
                                                    onClick={() => handleDeleteCreneau(c.id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-100 text-red-500 text-xs items-center justify-center hidden group-hover:flex"
                                                >✕</button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Légende */}
                <div className="flex flex-wrap gap-3 mt-3">
                    {Object.entries(TYPE_CRENEAU_COLORS).map(([type, cfg]) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}` }} />
                            <span className="text-xs text-gray-500">{TYPE_CRENEAU[type as TypeCreneau]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Exceptions ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Congés & absences</h3>
                    <button onClick={() => setShowFormEx(p => !p)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                        + Déclarer une absence
                    </button>
                </div>

                {showFormEx && (
                    <div className="mb-4 p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Type</label>
                                <select value={newExType} onChange={e => setNewExType(e.target.value as TypeException)}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                                    {Object.entries(TYPE_EXCEPTION).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Du</label>
                                <input type="date" value={newExDebut} onChange={e => setNewExDebut(e.target.value)}
                                       className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Au</label>
                                <input type="date" value={newExFin} onChange={e => setNewExFin(e.target.value)}
                                       className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Motif (optionnel)</label>
                            <input type="text" value={newExMotif} onChange={e => setNewExMotif(e.target.value)}
                                   className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                                   placeholder="Ex : Congé annuel" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowFormEx(false)}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
                                Annuler
                            </button>
                            <button onClick={handleAddException} disabled={addingEx || !newExDebut || !newExFin}
                                    className="px-3 py-1.5 text-xs rounded-lg text-white"
                                    style={{ backgroundColor: addingEx || !newExDebut || !newExFin ? '#9ca3af' : '#003152' }}>
                                {addingEx ? 'Envoi…' : 'Soumettre'}
                            </button>
                        </div>
                    </div>
                )}

                {exceptions.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucune absence déclarée.</p>
                ) : (
                    <div className="space-y-2">
                        {exceptions.map(ex => (
                            <div key={ex.id}
                                 className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-xl bg-white">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800">{ex.type_label}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            ex.valide
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-yellow-50 text-yellow-700'
                                        }`}>
                                            {ex.valide ? '✓ Validé' : '⏳ En attente'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(ex.date_debut).toLocaleDateString('fr-FR')} →{' '}
                                        {new Date(ex.date_fin).toLocaleDateString('fr-FR')}
                                        {ex.motif && ` · ${ex.motif}`}
                                    </p>
                                </div>
                                {!ex.valide && (
                                    <button onClick={() => handleDeleteException(ex.id)}
                                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                                        Annuler
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Onglet Contrat ───────────────────────────────────────────────────────────
function OngletContrat({ employe }: { employe: Record<string, unknown> }) {
    const formatDate = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    const typeContratLabel: Record<string, string> = {
        cdi: 'CDI', cdd: 'CDD', stage: 'Stage',
        vacation: 'Vacation', benevolat: 'Bénévolat',
    }

    // @ts-ignore
    return (
        <div className="space-y-6">
            <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-700">
                    🔒 Ces informations sont gérées par l'administration. Contactez votre responsable pour toute modification.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    ['Type de contrat', typeContratLabel[employe.type_contrat as string] ?? '—'],
                    ['Date de début', formatDate(employe.date_debut_contrat as string)],
                    ['Date de fin', formatDate(employe.date_fin_contrat as string)],
                    ['Matricule', employe.matricule as string],
                    ['Service', employe.service_nom as string ?? '—'],
                    ['Spécialité', employe.specialite as string || '—'],
                ].map(([label, val]) => (
                    <div key={label as string}>
                        <p className="text-xs text-gray-400">{label as string}</p>
                        <p className="text-sm font-semibold text-gray-900">{val as string}</p>
                    </div>
                ))}
                {employe.description_poste && (
                    <div className="p-4 bg-white border border-gray-100 rounded-xl">
                        <p className="text-xs text-gray-400 mb-2">Description du poste</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{employe.description_poste as string}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Onglet Notifications ─────────────────────────────────────────────────────
function OngletNotifications({ employe }: { employe: Record<string, unknown> }) {
    const prefs = (employe.preferences as Record<string, boolean>) ?? {}

    const [notifs, setNotifs] = useState({
        alertes_tension:      prefs.alertes_tension      ?? true,
        alertes_glycemie:     prefs.alertes_glycemie     ?? true,
        alertes_temperature:  prefs.alertes_temperature  ?? true,
        resultats_analyses:   prefs.resultats_analyses   ?? true,
        nouveaux_patients:    prefs.nouveaux_patients    ?? false,
        rdv_rappel:           prefs.rdv_rappel           ?? true,
    })
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const NOTIF_LABELS: Record<keyof typeof notifs, { label: string; desc: string }> = {
        alertes_tension:     { label: 'Alertes tension artérielle', desc: 'Notifié quand un patient dépasse les seuils critiques' },
        alertes_glycemie:    { label: 'Alertes glycémie', desc: 'Hyper/hypoglycémie sévère' },
        alertes_temperature: { label: 'Alertes température', desc: 'Fièvre élevée ou hypothermie' },
        resultats_analyses:  { label: 'Résultats d\'analyses', desc: 'Quand le laboratoire valide une demande' },
        nouveaux_patients:   { label: 'Nouveaux patients', desc: 'Admission d\'un patient dans votre service' },
        rdv_rappel:          { label: 'Rappels rendez-vous', desc: '1h avant chaque rendez-vous planifié' },
    }

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            await updateMonProfil({ preferences: notifs })
            setFeedback({ type: 'success', msg: 'Préférences enregistrées.' })
        } catch {
            setFeedback({ type: 'error', msg: 'Erreur lors de la sauvegarde.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-5 max-w-lg">
            {Object.entries(notifs).map(([key, val]) => {
                const cfg = NOTIF_LABELS[key as keyof typeof notifs]
                return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                            <p className="text-sm font-medium text-gray-800">{cfg.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{cfg.desc}</p>
                        </div>
                        <button
                            onClick={() => setNotifs(prev => ({ ...prev, [key]: !val }))}
                            className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                            style={{ backgroundColor: val ? '#003152' : '#d1d5db' }}
                        >
                            <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                  style={{ left: val ? '22px' : '2px' }} />
                        </button>
                    </div>
                )
            })}

            {feedback && <Feedback type={feedback.type} message={feedback.msg} />}

            <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: saving ? '#9ca3af' : '#003152' }}>
                {saving ? 'Sauvegarde…' : 'Enregistrer les préférences'}
            </button>
        </div>
    )
}

// ─── Page principale Settings ─────────────────────────────────────────────────
export default function Settings() {
    const navigate = useNavigate()
    const [onglet, setOnglet] = useState<Onglet>('profil')
    const [employe, setEmploye] = useState<Record<string, unknown> | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMe()
            .then(data => setEmploye(data as unknown as Record<string, unknown>))
            .finally(() => setLoading(false))
        getMaPhotoUrl().then(setPhotoUrl).catch(() => {})
    }, [])

    if (loading || !employe) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                         style={{ borderColor: '#003152', borderTopColor: 'transparent' }} />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-700">
                ← Retour
            </button>
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {employe.prenom as string} {employe.nom as string} · {employe.role_label as string}
                    </p>
                </div>

                <div className="flex gap-6">
                    {/* Sidebar onglets */}
                    <aside className="w-48 flex-shrink-0">
                        <nav className="space-y-1">
                            {ONGLETS.map(o => (
                                <button
                                    key={o.id}
                                    onClick={() => setOnglet(o.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                                    style={onglet === o.id
                                        ? { backgroundColor: '#003152', color: 'white', fontWeight: 600 }
                                        : { color: '#6b7280' }
                                    }
                                >
                                    <span>{o.icon}</span>
                                    {o.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Contenu */}
                    <main className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 min-h-96">
                        {onglet === 'profil'         && <OngletProfil employe={employe} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />}
                        {onglet === 'securite'       && <OngletSecurite />}
                        {onglet === 'signature'      && <OngletSignature employe={employe} />}
                        {onglet === 'disponibilites' && <OngletDisponibilites />}
                        {onglet === 'contrat'        && <OngletContrat employe={employe} />}
                        {onglet === 'notifications'  && <OngletNotifications employe={employe} />}
                    </main>
                </div>
            </div>
        </div>
    )
}