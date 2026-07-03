import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getServices } from '../api/services'
import {
    getFileAttente,
    createUrgence,
    priseEnCharge,
    enregistrerSortieUrgence,
    admettreUrgence,
} from '../api/urgences'
import type { Patient, Service, PassageUrgence, NiveauTri, ModeArrivee } from '../types'
import Navbar from '../components/NavBar'
import { SkeletonSimpleList } from '../components/Skeleton'

// ─── Config triage ────────────────────────────────────────────────────────────
const TRI_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: '1 — Vital',        color: '#fff', bg: '#dc2626' },
    2: { label: '2 — Très urgent',  color: '#fff', bg: '#ea580c' },
    3: { label: '3 — Urgent',       color: '#7c2d12', bg: '#fde68a' },
    4: { label: '4 — Peu urgent',   color: '#166534', bg: '#bbf7d0' },
    5: { label: '5 — Non urgent',   color: '#374151', bg: '#f3f4f6' },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    en_attente:      { label: 'En attente',      color: '#b45309', bg: '#fef3c7' },
    en_consultation: { label: 'En consultation', color: '#1d4ed8', bg: '#dbeafe' },
    sorti:           { label: 'Sorti',           color: '#6b7280', bg: '#f3f4f6' },
}

const MODE_LABELS: Record<ModeArrivee, string> = {
    pied: 'À pied', ambulance: 'Ambulance', police: 'Police/Pompiers',
    transfert: 'Transfert', autre: 'Autre',
}

function TriBadge({ niveau }: { niveau: NiveauTri | null }) {
    const cfg = niveau ? TRI_CONFIG[niveau] : { label: 'Non trié', color: '#374151', bg: '#f3f4f6' }
    return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.label}
        </span>
    )
}

function StatutBadge({ statut }: { statut: string }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}>
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

// ─── Modal : nouveau passage ──────────────────────────────────────────────────
function NouveauPassageModal({ onClose, onCreated }: {
    onClose: () => void
    onCreated: (p: PassageUrgence) => void
}) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<Patient[]>([])
    const [searching, setSearching] = useState(false)
    const [patientId, setPatientId] = useState<number | null>(null)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [niveauTri, setNiveauTri] = useState<string>('')
    const [modeArrivee, setModeArrivee] = useState<ModeArrivee>('pied')
    const [motif, setMotif] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    // Recherche en direct côté serveur : indispensable pour l'infirmier, qui
    // n'a jamais accès à la liste complète des patients (recherche obligatoire).
    useEffect(() => {
        const q = search.trim()
        if (q.length < 2) {
            setResults([])
            return
        }
        setSearching(true)
        const timeout = setTimeout(() => {
            getPatients(q).then(setResults).catch(() => setResults([])).finally(() => setSearching(false))
        }, 300)
        return () => clearTimeout(timeout)
    }, [search])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900">Nouvel arrivant aux urgences</h3>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Patient</label>
                    {selectedPatient ? (
                        <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                            <span>{selectedPatient.prenom} {selectedPatient.nom}</span>
                            <button onClick={() => { setPatientId(null); setSelectedPatient(null) }} className="text-xs text-gray-400 hover:text-gray-700">Changer</button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Rechercher un patient par nom, prénom ou n° de dossier…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                            />
                            {search.trim().length >= 2 && (
                                <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
                                    {searching ? (
                                        <div className="px-3 py-2.5 text-xs text-gray-300">Recherche…</div>
                                    ) : results.length === 0 ? (
                                        <div className="px-3 py-2.5 text-xs text-gray-300">Aucun patient trouvé</div>
                                    ) : (
                                        results.slice(0, 6).map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setPatientId(p.id); setSelectedPatient(p); setSearch('') }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                            >
                                                {p.prenom} {p.nom} <span className="text-gray-400 text-xs">· {p.date_naissance}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Niveau de tri</label>
                        <select value={niveauTri} onChange={e => setNiveauTri(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                            <option value="">— À déterminer —</option>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>{TRI_CONFIG[n].label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mode d'arrivée</label>
                        <select value={modeArrivee} onChange={e => setModeArrivee(e.target.value as ModeArrivee)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                            {Object.entries(MODE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Motif de venue</label>
                    <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>

                {erreur && <p className="text-sm text-red-500">{erreur}</p>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!patientId || !motif.trim() || submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: !patientId || !motif.trim() || submitting ? '#9ca3af' : '#003152' }}
                    >
                        {submitting ? 'Enregistrement…' : "Enregistrer l'arrivée"}
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Sortie de {passage.patient_nom}</h3>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Décision</label>
                    <select value={decision} onChange={e => setDecision(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                        <option value="domicile">Retour à domicile</option>
                        <option value="hospitalisation">Hospitalisation</option>
                        <option value="transfert">Transfert vers un autre établissement</option>
                        <option value="parti_sans_attendre">Parti sans attendre</option>
                        <option value="deces">Décès</option>
                    </select>
                </div>
                {decision !== 'hospitalisation' && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnostic</label>
                            <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)} rows={2}
                                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                        </div>
                    </>
                )}
                {decision === 'hospitalisation' && (
                    <p className="text-xs text-gray-400">Tu seras redirigé vers le formulaire d'admission pour préciser le service, la chambre et le lit.</p>
                )}
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: '#003152' }}
                    >
                        {decision === 'hospitalisation' ? 'Continuer' : (submitting ? 'Enregistrement…' : 'Confirmer la sortie')}
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Admettre {passage.patient_nom}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service</label>
                        <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                            <option value="">— Sélectionner —</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chambre</label>
                        <input type="text" value={chambre} onChange={e => setChambre(e.target.value)}
                               className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" placeholder="ex : 204" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lit</label>
                    <input type="text" value={lit} onChange={e => setLit(e.target.value)}
                           className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" placeholder="ex : B" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnostic d'entrée</label>
                    <textarea value={diagnosticEntree} onChange={e => setDiagnosticEntree(e.target.value)} rows={2}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: '#003152' }}
                    >
                        {submitting ? 'Admission…' : "Confirmer l'admission"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Carte passage ────────────────────────────────────────────────────────────
function PassageCard({ passage, onPriseEnCharge, onSortie }: {
    passage: PassageUrgence
    onPriseEnCharge: (p: PassageUrgence) => void
    onSortie: (p: PassageUrgence) => void
}) {
    const navigate = useNavigate()
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4">
            <TriBadge niveau={passage.niveau_tri} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/patients/${passage.patient}`)}
                            className="text-sm font-medium text-gray-900 hover:underline">
                        {passage.patient_nom}
                    </button>
                    {typeof passage.patient_age === 'number' && (
                        <span className="text-xs text-gray-400">{passage.patient_age} ans</span>
                    )}
                    <StatutBadge statut={passage.statut} />
                </div>
                <p className="text-sm text-gray-600 mt-1 truncate">{passage.motif}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {MODE_LABELS[passage.mode_arrivee]} · Arrivé il y a {tempsEcoule(passage.date_arrivee)}
                    {passage.medecin_nom && ` · Dr ${passage.medecin_nom}`}
                </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
                {passage.statut === 'en_attente' && (
                    <button onClick={() => onPriseEnCharge(passage)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                            style={{ backgroundColor: '#003152' }}>
                        Prendre en charge
                    </button>
                )}
                {passage.statut === 'en_consultation' && (
                    <button onClick={() => onSortie(passage)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{ color: '#15803d', backgroundColor: '#dcfce7' }}>
                        Enregistrer la sortie
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Urgences() {
    const [passages, setPassages] = useState<PassageUrgence[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [showNouveau, setShowNouveau] = useState(false)
    const [sortieTarget, setSortieTarget] = useState<PassageUrgence | null>(null)
    const [admettreTarget, setAdmettreTarget] = useState<PassageUrgence | null>(null)

    const charger = () => {
        getFileAttente().then(setPassages).catch(() => {}).finally(() => setLoading(false))
    }

    useEffect(() => {
        charger()
        getPatients().then(setPatients).catch(() => {})
        getServices().then(setServices).catch(() => {})
        const interval = setInterval(charger, 30000) // rafraîchit les temps d'attente
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
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Urgences</h1>
                        <p className="text-gray-400 text-sm mt-1">File d'attente de votre service</p>
                    </div>
                    <button
                        onClick={() => setShowNouveau(true)}
                        className="text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors flex-shrink-0"
                        style={{ backgroundColor: '#003152' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                    >
                        + Nouvel arrivant
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{enAttente.length}</p>
                        <p className="text-xs text-gray-400 mt-1">En attente</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{enConsultation.length}</p>
                        <p className="text-xs text-gray-400 mt-1">En consultation</p>
                    </div>
                </div>

                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        File d'attente (triée par gravité)
                    </h2>
                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-100">
                            <SkeletonSimpleList rows={4} />
                        </div>
                    ) : passages.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400">
                            Aucun patient actuellement aux urgences.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {passages.map(p => (
                                <PassageCard
                                    key={p.id}
                                    passage={p}
                                    onPriseEnCharge={handlePriseEnCharge}
                                    onSortie={setSortieTarget}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
        </div>
    )
}
