import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getServices } from '../api/services'
import { getAntecedents } from '../api/antecedents'
import {
    getFileAttente,
    getUrgencesPatient,
    createUrgence,
    priseEnCharge,
    enregistrerSortieUrgence,
    admettreUrgence,
} from '../api/urgences'
import type { Patient, Service, PassageUrgence, Antecedent, NiveauTri, ModeArrivee, RoleEmploye } from '../types'
import Sidebar from '../components/layout/Sidebar.tsx'
import { SkeletonSimpleList } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import {
    AlertTriangle,
    Clock,
    User,
    Folder,
    ArrowRight,
    Plus,
    X,
    CheckCircle2,
    LogOut,
    FileText
} from 'lucide-react'

// ─── Config triage : réutilise les classes badge-tri-* déjà définies dans index.css ──
const TRI_LABELS: Record<number, string> = {
    1: '1 — Vital',
    2: '2 — Très urgent',
    3: '3 — Urgent',
    4: '4 — Peu urgent',
    5: '5 — Non urgent',
}

const STATUT_CONFIG: Record<string, { label: string; badge: string }> = {
    en_attente:      { label: 'En attente',      badge: 'badge-warning' },
    en_consultation: { label: 'En consultation', badge: 'badge-tint' },
    sorti:           { label: 'Sorti',           badge: 'badge-muted' },
}

const MODE_LABELS: Record<ModeArrivee, string> = {
    pied: 'À pied', ambulance: 'Ambulance', police: 'Police/Pompiers',
    transfert: 'Transfert', autre: 'Autre',
}

function TriBadge({ niveau }: { niveau: NiveauTri | null }) {
    if (!niveau) {
        return <span className="badge badge-muted">Non trié</span>
    }
    return (
        <span className={`badge badge-tri-${niveau}`}>
            {TRI_LABELS[niveau]}
        </span>
    )
}

function StatutBadge({ statut }: { statut: string }) {
    const cfg = STATUT_CONFIG[statut] ?? { label: statut, badge: 'badge-muted' }
    return (
        <span className={`badge ${cfg.badge}`}>
            {cfg.label}
        </span>
    )
}

function tempsEcoule(dateArrivee: string) {
    const mins = Math.floor((Date.now() - new Date(dateArrivee).getTime()) / 60000)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h${m.toString().padStart(2, '0')}`
}

function formatDateHeure(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Modal : nouveau passage ──────────────────────────────────────────────────
function NouveauPassageModal({ patients, onClose, onCreated }: {
    patients: Patient[]
    onClose: () => void
    onCreated: (p: PassageUrgence) => void
}) {
    const [search, setSearch] = useState('')
    const [patientId, setPatientId] = useState<number | null>(null)
    const [niveauTri, setNiveauTri] = useState<string>('')
    const [modeArrivee, setModeArrivee] = useState<ModeArrivee>('pied')
    const [motif, setMotif] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const results = useMemo(() => {
        if (search.trim().length < 2) return []
        const q = search.toLowerCase()
        return patients.filter(p =>
            `${p.prenom} ${p.nom}`.toLowerCase().includes(q)
        ).slice(0, 6)
    }, [search, patients])

    const selectedPatient = patients.find(p => p.id === patientId)

    const handleSubmit = async () => {
        if (!patientId || !motif.trim()) return
        setSubmitting(true)
        setErreur('')
        try {
            const created = await createUrgence({
                patient: patientId,
                date_arrivee: new Date().toISOString(),
                mode_arrivee: modeArrivee,
                niveau_tri: niveauTri ? Number(niveauTri) : null,
                motif,
                statut: 'en_attente',
            })
            onCreated(created)
        } catch {
            setErreur("Erreur lors de l'enregistrement.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-4" style={{ color: 'var(--ht-text)' }}>Nouvel arrivant aux urgences</h3>

                <div className="space-y-4">
                    <div className="ht-field">
                        <label className="ht-label">Patient</label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between px-3 py-2 border rounded-xl text-sm"
                                 style={{ borderColor: 'var(--ht-border)' }}>
                                <span style={{ color: 'var(--ht-text)' }}>{selectedPatient.prenom} {selectedPatient.nom}</span>
                                <button onClick={() => setPatientId(null)} className="text-xs transition-colors" style={{ color: 'var(--ht-text-muted)' }}>Changer</button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Rechercher un patient par nom…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="ht-input"
                                />
                                {results.length > 0 && (
                                    <div className="mt-1 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--ht-border)' }}>
                                        {results.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setPatientId(p.id); setSearch('') }}
                                                className="w-full text-left px-3 py-2 text-sm border-b transition-colors"
                                                style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                            >
                                                {p.prenom} {p.nom} <span style={{ color: 'var(--ht-text-muted)' }} className="text-xs">· {p.date_naissance}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="ht-field">
                            <label className="ht-label">Niveau de tri</label>
                            <select value={niveauTri} onChange={e => setNiveauTri(e.target.value)} className="ht-input">
                                <option value="">— À déterminer —</option>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>{TRI_LABELS[n]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">Mode d'arrivée</label>
                            <select value={modeArrivee} onChange={e => setModeArrivee(e.target.value as ModeArrivee)} className="ht-input">
                                {Object.entries(MODE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="ht-field">
                        <label className="ht-label">Motif de venue</label>
                        <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2} className="ht-input ht-textarea" />
                    </div>

                    {erreur && (
                        <div className="ht-alert ht-alert-danger">
                            {erreur}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="btn btn-secondary flex-1">
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!patientId || !motif.trim() || submitting}
                            className="btn btn-primary flex-1"
                        >
                            {submitting ? 'Enregistrement…' : "Enregistrer l'arrivée"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Modal : sortie ───────────────────────────────────────────────────────────
function SortieModal({ passage, onClose, onUpdated, onAdmettre }: {
    passage: PassageUrgence
    onClose: () => void
    onUpdated: (p: PassageUrgence) => void
    onAdmettre: () => void
}) {
    const [decision, setDecision] = useState('domicile')
    const [diagnostic, setDiagnostic] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (decision === 'hospitalisation') {
            onAdmettre()
            return
        }
        setSubmitting(true)
        try {
            const updated = await enregistrerSortieUrgence(passage.id, { decision, diagnostic, notes })
            onUpdated(updated)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-4" style={{ color: 'var(--ht-text)' }}>Sortie de {passage.patient_nom}</h3>

                <div className="space-y-4">
                    <div className="ht-field">
                        <label className="ht-label">Décision</label>
                        <select value={decision} onChange={e => setDecision(e.target.value)} className="ht-input">
                            <option value="domicile">Retour à domicile</option>
                            <option value="hospitalisation">Hospitalisation</option>
                            <option value="transfert">Transfert vers un autre établissement</option>
                            <option value="parti_sans_attendre">Parti sans attendre</option>
                            <option value="deces">Décès</option>
                        </select>
                    </div>
                    {decision !== 'hospitalisation' && (
                        <>
                            <div className="ht-field">
                                <label className="ht-label">Diagnostic</label>
                                <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)} rows={2} className="ht-input ht-textarea" />
                            </div>
                            <div className="ht-field">
                                <label className="ht-label">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="ht-input ht-textarea" />
                            </div>
                        </>
                    )}
                    {decision === 'hospitalisation' && (
                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                            Vous serez redirigé vers le formulaire d'admission pour préciser le service, la chambre et le lit.
                        </p>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="btn btn-secondary flex-1">
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn btn-primary flex-1"
                        >
                            {decision === 'hospitalisation' ? 'Continuer' : (submitting ? 'Enregistrement…' : 'Confirmer la sortie')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Modal : admission (hospitalisation) ─────────────────────────────────────
function AdmettreModal({ passage, services, onClose, onUpdated }: {
    passage: PassageUrgence
    services: Service[]
    onClose: () => void
    onUpdated: (p: PassageUrgence) => void
}) {
    const [serviceId, setServiceId] = useState<string>(passage.service ? String(passage.service) : '')
    const [chambre, setChambre] = useState('')
    const [lit, setLit] = useState('')
    const [diagnosticEntree, setDiagnosticEntree] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const updated = await admettreUrgence(passage.id, {
                service: serviceId ? Number(serviceId) : undefined,
                chambre,
                lit,
                diagnostic_entree: diagnosticEntree,
                motif_admission: passage.motif,
            })
            onUpdated(updated)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-4" style={{ color: 'var(--ht-text)' }}>Admettre {passage.patient_nom}</h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="ht-field">
                            <label className="ht-label">Service</label>
                            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="ht-input">
                                <option value="">— Sélectionner —</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                            </select>
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">Chambre</label>
                            <input type="text" value={chambre} onChange={e => setChambre(e.target.value)} className="ht-input" placeholder="ex : 204" />
                        </div>
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Lit</label>
                        <input type="text" value={lit} onChange={e => setLit(e.target.value)} className="ht-input" placeholder="ex : B" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Diagnostic d'entrée</label>
                        <textarea value={diagnosticEntree} onChange={e => setDiagnosticEntree(e.target.value)} rows={2} className="ht-input ht-textarea" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="btn btn-secondary flex-1">
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn btn-primary flex-1"
                        >
                            {submitting ? 'Admission…' : "Confirmer l'admission"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Modal : détail patient + passage ────────────────────────────────────────
function DetailUrgenceModal({ passage, patient, onClose }: {
    passage: PassageUrgence
    patient: Patient | undefined
    onClose: () => void
}) {
    const navigate = useNavigate()
    const [antecedents, setAntecedents] = useState<Antecedent[] | null>(null)
    const [historique, setHistorique] = useState<PassageUrgence[] | null>(null)

    useEffect(() => {
        getAntecedents(passage.patient).then(setAntecedents).catch(() => setAntecedents([]))
        getUrgencesPatient(passage.patient).then(setHistorique).catch(() => setHistorique([]))
    }, [passage.patient])

    const allergiesList = patient?.allergies
        ? patient.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : []

    const passagesAnterieurs = (historique ?? []).filter(h => h.id !== passage.id)

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* En-tête */}
                <div className="pb-4 border-b flex items-start justify-between gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                    <div>
                        <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                            {passage.patient_prenom} {passage.patient_nom}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                            {typeof passage.patient_age === 'number' && `${passage.patient_age} ans`}
                            {patient?.sexe && ` · ${patient.sexe === 'M' ? 'Masculin' : 'Féminin'}`}
                            {(patient as any)?.groupe_sanguin && ` · Groupe ${(patient as any).groupe_sanguin}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 space-y-5">
                    {/* Lien dossier */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl border"
                         style={{ backgroundColor: 'var(--ht-primary-tint-bg)', borderColor: 'var(--ht-primary)' }}>
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}>
                            <Folder size={14} /> Dossier {passage.patient_dossier ? `#${passage.patient_dossier}` : 'existant'}
                        </span>
                        <button
                            onClick={() => navigate(`/patients/${passage.patient}`)}
                            className="text-xs font-semibold flex items-center gap-0.5 hover:underline"
                            style={{ color: 'var(--ht-primary)' }}
                        >
                            Dossier complet <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Allergies */}
                    {allergiesList.length > 0 && (
                        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--ht-danger)', backgroundColor: 'var(--ht-danger-bg-light)' }}>
                            <p className="text-xs font-bold flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--ht-danger)' }}>
                                <AlertTriangle size={14} /> Allergies connues
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {allergiesList.map(a => (
                                    <span key={a} className="badge badge-danger">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Antécédents */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Antécédents médicaux</p>
                        {antecedents === null ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                        ) : antecedents.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun antécédent renseigné</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {antecedents.map(a => (
                                    <span key={a.id} className="badge badge-muted">
                                        {a.libelle}{a.statut === 'resolu' && ' (résolu)'}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Passage actuel */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Passage en cours</p>
                        <div className="rounded-xl p-3 space-y-2.5 border" style={{ backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border)' }}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <TriBadge niveau={passage.niveau_tri} />
                                <StatutBadge statut={passage.statut} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{passage.motif}</p>
                            <div className="text-xs space-y-1" style={{ color: 'var(--ht-text-secondary)' }}>
                                <p className="flex items-center gap-1"><Clock size={12} /> Mode: {MODE_LABELS[passage.mode_arrivee]} · Arrivé {formatDateHeure(passage.date_arrivee)} (il y a {tempsEcoule(passage.date_arrivee)})</p>
                                {passage.infirmier_nom && <p><span style={{ color: 'var(--ht-text-muted)' }}>Accueil :</span> {passage.infirmier_nom}</p>}
                                {passage.medecin_nom && <p><span style={{ color: 'var(--ht-text-muted)' }}>Examinateur :</span> Dr {passage.medecin_nom}</p>}
                                {passage.diagnostic && (
                                    <p className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}><span style={{ color: 'var(--ht-text-muted)' }}>Diagnostic :</span> {passage.diagnostic}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Historique urgences */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                            Historique aux urgences {historique !== null && `(${passagesAnterieurs.length})`}
                        </p>
                        {historique === null ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                        ) : passagesAnterieurs.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun passage antérieur</p>
                        ) : (
                            <div className="space-y-1.5">
                                {passagesAnterieurs.slice(0, 4).map(h => (
                                    <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                                        <span className="truncate max-w-[70%]" style={{ color: 'var(--ht-text-secondary)' }}>{h.motif}</span>
                                        <span style={{ color: 'var(--ht-text-muted)' }}>{formatDateHeure(h.date_arrivee)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function PassageCard({ passage, onPriseEnCharge, onSortie, onOpenDetail, hasRole }: {
    passage: PassageUrgence
    onPriseEnCharge: (p: PassageUrgence) => void
    onSortie: (p: PassageUrgence) => void
    onOpenDetail: (p: PassageUrgence) => void
    hasRole: (...roles: RoleEmploye[]) => boolean
}) {
    return (
        <div className="ht-card ht-card-padded-sm flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
                <TriBadge niveau={passage.niveau_tri} />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenDetail(passage)}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold hover:underline" style={{ color: 'var(--ht-text)' }}>
                        {passage.patient_nom}
                    </span>
                    {typeof passage.patient_age === 'number' && (
                        <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{passage.patient_age} ans</span>
                    )}
                    <StatutBadge statut={passage.statut} />
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--ht-text-secondary)' }}>{passage.motif}</p>
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--ht-text-muted)' }}>
                    <Clock size={12} /> {MODE_LABELS[passage.mode_arrivee]} · Arrivé il y a {tempsEcoule(passage.date_arrivee)}
                    {passage.medecin_nom && ` · Dr ${passage.medecin_nom}`}
                </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                {passage.statut === 'en_attente' && hasRole('admin', 'medecin', 'infirmier') && (
                    <button onClick={() => onPriseEnCharge(passage)} className="btn btn-primary btn-sm text-xs gap-1">
                        <User size={12} /> Prendre en charge
                    </button>
                )}
                {passage.statut === 'en_consultation' && hasRole('admin', 'medecin') && (
                    <button onClick={() => onSortie(passage)} className="btn btn-success btn-sm text-xs gap-1">
                        <LogOut size={12} /> Sortie
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Urgences() {
    const { hasRole } = useAuth()
    const [passages, setPassages] = useState<PassageUrgence[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [showNouveau, setShowNouveau] = useState(false)
    const [sortieTarget, setSortieTarget] = useState<PassageUrgence | null>(null)
    const [admettreTarget, setAdmettreTarget] = useState<PassageUrgence | null>(null)
    const [detailTarget, setDetailTarget] = useState<PassageUrgence | null>(null)

    const charger = () => {
        getFileAttente().then(setPassages).catch(() => {}).finally(() => setLoading(false))
    }

    useEffect(() => {
        charger()
        getPatients().then(setPatients).catch(() => {})
        getServices().then(setServices).catch(() => {})
        const interval = setInterval(charger, 30000) // rafraîchit les temps d'attente toutes les 30s
        return () => clearInterval(interval)
    }, [])

    const handlePriseEnCharge = async (p: PassageUrgence) => {
        const updated = await priseEnCharge(p.id)
        setPassages(prev => prev.map(x => x.id === updated.id ? updated : x))
    }

    const handleSortieUpdated = (updated: PassageUrgence) => {
        setPassages(prev => prev.filter(x => x.id !== updated.id))
        setSortieTarget(null)
    }

    const handleAdmettreUpdated = (updated: PassageUrgence) => {
        setPassages(prev => prev.filter(x => x.id !== updated.id))
        setAdmettreTarget(null)
        setSortieTarget(null)
    }

    const enAttente = passages.filter(p => p.statut === 'en_attente')
    const enConsultation = passages.filter(p => p.statut === 'en_consultation')

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-7xl space-y-6">

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>Urgences</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>File d'attente et gestion des admissions en temps réel</p>
                    </div>
                    {hasRole('admin', 'medecin', 'infirmier') && (
                        <button onClick={() => setShowNouveau(true)} className="btn btn-primary gap-1.5 self-start sm:self-auto">
                            <Plus size={16} /> Nouvel arrivant
                        </button>
                    )}
                </div>

                {/* Compteurs / Mini-stats grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="ht-card ht-card-padded-sm flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--ht-warning)' }}>{enAttente.length}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>En attente</p>
                    </div>
                    <div className="ht-card ht-card-padded-sm flex flex-col items-center justify-center text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--ht-primary)' }}>{enConsultation.length}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>En consultation</p>
                    </div>
                </div>

                {/* File de traitement */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                        <FileText size={14} /> File d'attente (triée par gravité)
                    </h2>

                    {loading ? (
                        <SkeletonSimpleList rows={4} />
                    ) : passages.length === 0 ? (
                        <div className="ht-card text-center py-12 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                                <CheckCircle2 size={20} />
                            </div>
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun patient actuellement aux urgences.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {passages.map(p => (
                                <PassageCard
                                    key={p.id}
                                    passage={p}
                                    onPriseEnCharge={handlePriseEnCharge}
                                    onSortie={setSortieTarget}
                                    onOpenDetail={setDetailTarget}
                                    hasRole={hasRole}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {showNouveau && (
                <NouveauPassageModal
                    patients={patients}
                    onClose={() => setShowNouveau(false)}
                    onCreated={p => { setPassages(prev => [...prev, p]); setShowNouveau(false) }}
                />
            )}

            {sortieTarget && !admettreTarget && (
                <SortieModal
                    passage={sortieTarget}
                    onClose={() => setSortieTarget(null)}
                    onUpdated={handleSortieUpdated}
                    onAdmettre={() => setAdmettreTarget(sortieTarget)}
                />
            )}

            {admettreTarget && (
                <AdmettreModal
                    passage={admettreTarget}
                    services={services}
                    onClose={() => setAdmettreTarget(null)}
                    onUpdated={handleAdmettreUpdated}
                />
            )}

            {detailTarget && (
                <DetailUrgenceModal
                    passage={detailTarget}
                    patient={patients.find(p => p.id === detailTarget.patient)}
                    onClose={() => setDetailTarget(null)}
                />
            )}
        </div>
    )
}