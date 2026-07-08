import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getRendezVous, createRendezVous, updateRendezVous, deleteRendezVous } from '../api/rendezvous'
import type { Patient, RendezVous, StatutRendezVous } from '../types'
import Sidebar from '../components/layout/Sidebar.tsx'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonSimpleList } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import {
    Calendar,
    Clock,
    Search,
    Plus,
    X,
    Pencil,
    Trash2,
    Check,
    CheckCircle,
    Ban
} from 'lucide-react'

const PAGE_SIZE = 20

// ─── Config statuts : réutilise les classes badge-* déjà définies dans index.css ──
const STATUT_CONFIG: Record<StatutRendezVous, { label: string; badge: string }> = {
    planifie: { label: 'Planifié', badge: 'badge-warning' },
    confirme: { label: 'Confirmé', badge: 'badge-tint' },
    termine:  { label: 'Terminé',  badge: 'badge-success' },
    annule:   { label: 'Annulé',   badge: 'badge-muted' },
}

function StatutBadge({ statut }: { statut: StatutRendezVous }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span className={`badge ${cfg.badge}`}>
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
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                        {isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="ht-field">
                        <label className="ht-label">Patient</label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between px-3 py-2 border rounded-xl text-sm"
                                 style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}>
                                <span>{selectedPatient.prenom} {selectedPatient.nom}</span>
                                {!isEdit && (
                                    <button onClick={() => setPatientId(null)} className="text-xs transition-colors" style={{ color: 'var(--ht-text-muted)' }}>Changer</button>
                                )}
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
                                                className="w-full text-left px-3 py-2 text-sm border-b last:border-0 transition-colors"
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
                            <label className="ht-label">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="ht-input" />
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">Heure</label>
                            <input type="time" value={heure} onChange={e => setHeure(e.target.value)} className="ht-input" />
                        </div>
                    </div>

                    <div className="ht-field">
                        <label className="ht-label">Motif</label>
                        <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : Consultation de suivi" className="ht-input" />
                    </div>

                    <div className="ht-field">
                        <label className="ht-label">Notes (optionnel)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="ht-input ht-textarea" />
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
                            {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le rendez-vous'}
                        </button>
                    </div>
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
        <div className="ht-card ht-card-padded-sm flex items-start gap-4">
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                 style={{ backgroundColor: 'var(--ht-primary-tint)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{heure}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/patients/${rdv.patient}`)}
                            className="text-sm font-semibold hover:underline text-left"
                            style={{ color: 'var(--ht-text)' }}>
                        {rdv.patient_prenom} {rdv.patient_nom}
                    </button>
                    <StatutBadge statut={rdv.statut} />
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--ht-text-secondary)' }}>{rdv.motif}</p>
                <p className="text-xs mt-1 flex items-center gap-1 capitalize" style={{ color: 'var(--ht-text-muted)' }}>
                    <Calendar size={12} /> {date}
                </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0 items-end self-center">
                <div className="flex gap-1.5">
                    {rdv.statut === 'planifie' && (
                        <button onClick={() => onStatutChange(rdv, 'confirme')}
                                className="btn btn-primary btn-sm text-xs gap-1">
                            <Check size={12} /> Confirmer
                        </button>
                    )}
                    {(rdv.statut === 'planifie' || rdv.statut === 'confirme') && (
                        <button onClick={() => onStatutChange(rdv, 'termine')}
                                className="btn btn-success btn-sm text-xs gap-1">
                            <CheckCircle size={12} /> Terminer
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <button onClick={() => onEdit(rdv)}
                            title="Modifier"
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--ht-text-muted)' }}>
                        <Pencil size={14} />
                    </button>
                    {(rdv.statut === 'planifie' || rdv.statut === 'confirme') && (
                        <button onClick={() => onStatutChange(rdv, 'annule')}
                                title="Annuler"
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--ht-danger)' }}>
                            <Ban size={14} />
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => onDelete(rdv)}
                                title="Supprimer"
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--ht-text-muted)' }}>
                            <Trash2 size={14} />
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
    const [page, setPage] = useState(1)

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

    useEffect(() => { setPage(1) }, [filtre, search])

    const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const pageCourante  = Math.min(page, totalPages)
    const filteredPage = filtered.slice((pageCourante - 1) * PAGE_SIZE, pageCourante * PAGE_SIZE)

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
        <div className="ht-page">
            <Sidebar />

            {showModal && (
                <RdvModal
                    patients={patients}
                    rdv={editTarget}
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSaved={handleSaved}
                />
            )}

            <main className="ht-page-content max-w-4xl mx-auto space-y-6">

                {/* Section En-tête */}
                <div className="flex items-center justify-between flex-wrap gap-4 pb-4" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>Rendez-vous</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>Planification et suivi des rendez-vous patients</p>
                    </div>
                    <button
                        onClick={() => { setEditTarget(null); setShowModal(true) }}
                        className="btn btn-primary gap-1.5"
                    >
                        <Plus size={16} /> Nouveau rendez-vous
                    </button>
                </div>

                {/* Filtres et barre de recherche */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 border p-1 rounded-xl" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setFiltre(t.key)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={filtre === t.key
                                    ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                    : { color: 'var(--ht-text-secondary)' }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex items-center max-w-xs w-full sm:w-64">
                        <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Rechercher un patient…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="ht-input pl-9 text-sm w-full"
                        />
                    </div>
                </div>

                {/* Contenu principal / Liste */}
                {loading ? (
                    <SkeletonSimpleList rows={4} />
                ) : filtered.length === 0 ? (
                    <div className="ht-card text-center py-16 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                            <Clock size={20} />
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun rendez-vous {filtre === 'aujourdhui' ? "aujourd'hui" : filtre === 'venir' ? 'à venir' : filtre === 'passes' ? 'passé' : ''}.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {filteredPage.map(r => (
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
                        <Pagination
                            page={pageCourante}
                            totalPages={totalPages}
                            totalItems={filtered.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </main>
        </div>
    )
}