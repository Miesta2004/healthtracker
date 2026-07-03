import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getRendezVous, createRendezVous, updateRendezVous, deleteRendezVous } from '../api/rendezvous'
import type { Patient, RendezVous, StatutRendezVous } from '../types'
import Navbar from '../components/NavBar'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonSimpleList } from '../components/Skeleton'

// ─── Config statuts ───────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<StatutRendezVous, { label: string; color: string; bg: string }> = {
    planifie: { label: 'Planifié', color: '#b45309', bg: '#fef3c7' },
    confirme: { label: 'Confirmé', color: '#1d4ed8', bg: '#dbeafe' },
    termine:  { label: 'Terminé',  color: '#166534', bg: '#bbf7d0' },
    annule:   { label: 'Annulé',   color: '#6b7280', bg: '#f3f4f6' },
}

function StatutBadge({ statut }: { statut: StatutRendezVous }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.label}
        </span>
    )
}

function formatDateHeure(iso: string) {
    const d = new Date(iso)
    return {
        date: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// ─── Modal : nouveau / modifier rendez-vous ───────────────────────────────────
function RdvModal({ patients, rdv, onClose, onSaved }: {
    patients: Patient[]
    rdv: RendezVous | null
    onClose: () => void
    onSaved: (r: RendezVous) => void
}) {
    const isEdit = !!rdv
    const [search, setSearch] = useState('')
    const [patientId, setPatientId] = useState<number | null>(rdv?.patient ?? null)
    const [date, setDate] = useState(rdv ? rdv.date_heure.slice(0, 10) : new Date().toISOString().slice(0, 10))
    const [heure, setHeure] = useState(rdv ? rdv.date_heure.slice(11, 16) : '09:00')
    const [motif, setMotif] = useState(rdv?.motif ?? '')
    const [notes, setNotes] = useState(rdv?.notes ?? '')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const results = useMemo(() => {
        if (search.trim().length < 2) return []
        const q = search.toLowerCase()
        return patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q)).slice(0, 6)
    }, [search, patients])

    const selectedPatient = patients.find(p => p.id === patientId)

    const handleSubmit = async () => {
        if (!patientId || !motif.trim() || !date || !heure) return
        setSubmitting(true)
        setErreur('')
        try {
            const payload = {
                patient: patientId,
                date_heure: new Date(`${date}T${heure}`).toISOString(),
                motif: motif.trim(),
                notes,
            }
            const saved = isEdit ? await updateRendezVous(rdv!.id, payload) : await createRendezVous(payload)
            onSaved(saved)
        } catch {
            setErreur("Erreur lors de l'enregistrement.")
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900">
                    {isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                </h3>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Patient</label>
                    {selectedPatient ? (
                        <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                            <span>{selectedPatient.prenom} {selectedPatient.nom}</span>
                            {!isEdit && (
                                <button onClick={() => setPatientId(null)} className="text-xs text-gray-400 hover:text-gray-700">Changer</button>
                            )}
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Rechercher un patient par nom…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                            />
                            {results.length > 0 && (
                                <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
                                    {results.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setPatientId(p.id); setSearch('') }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                        >
                                            {p.prenom} {p.nom} <span className="text-gray-400 text-xs">· {p.date_naissance}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                               className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Heure</label>
                        <input type="time" value={heure} onChange={e => setHeure(e.target.value)}
                               className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Motif</label>
                    <input value={motif} onChange={e => setMotif(e.target.value)}
                           placeholder="Ex : Consultation de suivi"
                           className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optionnel)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
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
                        {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le rendez-vous'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Carte rendez-vous ────────────────────────────────────────────────────────
function RdvCard({ rdv, isAdmin, onEdit, onStatutChange, onDelete }: {
    rdv: RendezVous
    isAdmin: boolean
    onEdit: (r: RendezVous) => void
    onStatutChange: (r: RendezVous, statut: StatutRendezVous) => void
    onDelete: (r: RendezVous) => void
}) {
    const navigate = useNavigate()
    const { date, heure } = formatDateHeure(rdv.date_heure)

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4">
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                 style={{ backgroundColor: '#f0f7ff' }}>
                <span className="text-sm font-bold" style={{ color: '#003152' }}>{heure}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/patients/${rdv.patient}`)}
                            className="text-sm font-medium text-gray-900 hover:underline">
                        {rdv.patient_prenom} {rdv.patient_nom}
                    </button>
                    <StatutBadge statut={rdv.statut} />
                </div>
                <p className="text-sm text-gray-600 mt-1 truncate">{rdv.motif}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{date} · {heure}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                {rdv.statut === 'planifie' && (
                    <button onClick={() => onStatutChange(rdv, 'confirme')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                            style={{ backgroundColor: '#003152' }}>
                        Confirmer
                    </button>
                )}
                {(rdv.statut === 'planifie' || rdv.statut === 'confirme') && (
                    <button onClick={() => onStatutChange(rdv, 'termine')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{ color: '#166534', backgroundColor: '#dcfce7' }}>
                        Marquer terminé
                    </button>
                )}
                <div className="flex gap-2">
                    <button onClick={() => onEdit(rdv)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">
                        ✏️
                    </button>
                    {(rdv.statut === 'planifie' || rdv.statut === 'confirme') && (
                        <button onClick={() => onStatutChange(rdv, 'annule')}
                                className="px-2 py-1 text-xs text-red-400 hover:text-red-600">
                            Annuler
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => onDelete(rdv)}
                                className="px-2 py-1 text-xs text-gray-300 hover:text-red-500">
                            🗑️
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
type Filtre = 'aujourdhui' | 'venir' | 'passes' | 'tous'

export default function RendezVousPage() {
    const { hasRole } = useAuth()
    const isAdmin = hasRole('admin')

    const [rdvs, setRdvs] = useState<RendezVous[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [filtre, setFiltre] = useState<Filtre>('aujourdhui')
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState<RendezVous | null>(null)

    useEffect(() => {
        Promise.all([getRendezVous(), getPatients()])
            .then(([r, p]) => { setRdvs(r); setPatients(p) })
            .finally(() => setLoading(false))
    }, [])

    const now = new Date()

    const filtered = useMemo(() => {
        let list = [...rdvs]
        if (filtre === 'aujourdhui') {
            list = list.filter(r => isSameDay(new Date(r.date_heure), now))
        } else if (filtre === 'venir') {
            list = list.filter(r => new Date(r.date_heure) >= now && r.statut !== 'annule')
        } else if (filtre === 'passes') {
            list = list.filter(r => new Date(r.date_heure) < now)
        }
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(r => `${r.patient_prenom ?? ''} ${r.patient_nom ?? ''}`.toLowerCase().includes(q))
        }
        return list.sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime())
    }, [rdvs, filtre, search, now])

    const handleSaved = (r: RendezVous) => {
        setRdvs(prev => {
            const exists = prev.some(x => x.id === r.id)
            return exists ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]
        })
        setShowModal(false)
        setEditTarget(null)
    }

    const handleStatutChange = async (rdv: RendezVous, statut: StatutRendezVous) => {
        const updated = await updateRendezVous(rdv.id, { statut })
        setRdvs(prev => prev.map(x => x.id === rdv.id ? updated : x))
    }

    const handleDelete = async (rdv: RendezVous) => {
        if (!window.confirm(`Supprimer le rendez-vous de ${rdv.patient_prenom} ${rdv.patient_nom} ?`)) return
        await deleteRendezVous(rdv.id)
        setRdvs(prev => prev.filter(x => x.id !== rdv.id))
    }

    const tabs: { key: Filtre; label: string }[] = [
        { key: 'aujourdhui', label: "Aujourd'hui" },
        { key: 'venir', label: 'À venir' },
        { key: 'passes', label: 'Passés' },
        { key: 'tous', label: 'Tous' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {showModal && (
                <RdvModal
                    patients={patients}
                    rdv={editTarget}
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSaved={handleSaved}
                />
            )}

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Rendez-vous</h1>
                        <p className="text-gray-400 text-sm mt-1">Planification et suivi des rendez-vous patients</p>
                    </div>
                    <button
                        onClick={() => { setEditTarget(null); setShowModal(true) }}
                        className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: '#003152' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                    >
                        + Nouveau rendez-vous
                    </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg p-1">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setFiltre(t.key)}
                                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                style={filtre === t.key
                                    ? { backgroundColor: '#003152', color: 'white' }
                                    : { color: '#6b7280' }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher un patient…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none w-56"
                    />
                </div>

                {loading ? (
                    <SkeletonSimpleList rows={4} />
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 px-5 py-16 text-center text-sm text-gray-300">
                        Aucun rendez-vous {filtre === 'aujourdhui' ? "aujourd'hui" : filtre === 'venir' ? 'à venir' : filtre === 'passes' ? 'passé' : ''}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(r => (
                            <RdvCard
                                key={r.id}
                                rdv={r}
                                isAdmin={isAdmin}
                                onEdit={r => { setEditTarget(r); setShowModal(true) }}
                                onStatutChange={handleStatutChange}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}