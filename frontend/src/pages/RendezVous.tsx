import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import { getEmployes } from '../api/comptes'
import {
    getRendezVous, createRendezVous, updateRendezVous, deleteRendezVous,
    getCreneauxDisponibles, getMedecinsDisponibles, getDatesDisponibles,
} from '../api/rendezvous'
import type { Patient, RendezVous, StatutRendezVous, Employe, CreneauDisponible, MedecinDisponible, DateDisponible } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonSimpleList } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import {
    Calendar,
    Clock,
    Search,
    X,
    Pencil,
    Trash2,
    Check,
    CheckCircle,
    Ban,
    Stethoscope,
    Info,
    CalendarSearch,
    UserSearch,
    CalendarOff,
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

type ModeRecherche = 'par_date' | 'par_medecin' | 'sans_medecin'

const MODES: { key: ModeRecherche; label: string; Icon: typeof CalendarSearch }[] = [
    { key: 'par_date', label: 'Par date', Icon: CalendarSearch },
    { key: 'par_medecin', label: 'Par médecin', Icon: UserSearch },
    { key: 'sans_medecin', label: 'Sans médecin', Icon: CalendarOff },
]

function formatDateCourte(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function MedecinChip({ medecin, onChanger }: { medecin?: Employe; onChanger: () => void }) {
    if (!medecin) return null
    return (
        <div className="flex items-center justify-between px-3 py-2 border rounded-xl text-sm"
             style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}>
            <span className="flex items-center gap-1.5">
                <Stethoscope size={14} /> Dr. {medecin.prenom} {medecin.nom}{medecin.specialite ? ` — ${medecin.specialite}` : ''}
            </span>
            <button onClick={onChanger} className="text-xs transition-colors" style={{ color: 'var(--ht-text-muted)' }}>Changer</button>
        </div>
    )
}

function DateChip({ date, onChanger }: { date: string; onChanger: () => void }) {
    return (
        <div className="flex items-center justify-between px-3 py-2 border rounded-xl text-sm"
             style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}>
            <span className="flex items-center gap-1.5 capitalize">
                <Calendar size={14} /> {formatDateCourte(date)}
            </span>
            <button onClick={onChanger} className="text-xs transition-colors" style={{ color: 'var(--ht-text-muted)' }}>Changer</button>
        </div>
    )
}

// ─── Modal : nouveau / modifier rendez-vous ───────────────────────────────────
function RdvModal({ patients, medecins, rdv, onClose, onSaved }: {
    patients: Patient[]
    medecins: Employe[]
    rdv: RendezVous | null
    onClose: () => void
    onSaved: (r: RendezVous) => void
}) {
    const isEdit = !!rdv
    const [search, setSearch] = useState('')
    const [patientId, setPatientId] = useState<number | null>(rdv?.patient ?? null)

    const [mode, setMode] = useState<ModeRecherche>(
        isEdit ? (rdv?.medecin ? 'par_medecin' : 'sans_medecin') : 'par_date'
    )
    const [medecinId, setMedecinId] = useState<number | null>(rdv?.medecin ?? null)
    const [date, setDate] = useState(rdv ? rdv.date_heure.slice(0, 10) : '')
    const [heure, setHeure] = useState(rdv ? rdv.date_heure.slice(11, 16) : '09:00')
    const [motif, setMotif] = useState(rdv?.motif ?? '')
    const [notes, setNotes] = useState(rdv?.notes ?? '')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const [creneaux, setCreneaux] = useState<CreneauDisponible[]>([])
    const [loadingCreneaux, setLoadingCreneaux] = useState(false)
    const [motifIndisponibilite, setMotifIndisponibilite] = useState('')

    const [medecinsDispo, setMedecinsDispo] = useState<MedecinDisponible[]>([])
    const [loadingMedecins, setLoadingMedecins] = useState(false)
    const [datesDispo, setDatesDispo] = useState<DateDisponible[]>([])
    const [loadingDates, setLoadingDates] = useState(false)

    const results = useMemo(() => {
        if (search.trim().length < 2) return []
        const q = search.toLowerCase()
        return patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q)).slice(0, 6)
    }, [search, patients])

    const selectedPatient = patients.find(p => p.id === patientId)
    const selectedMedecin = medecins.find(m => m.id === medecinId)

    const switchMode = (m: ModeRecherche) => {
        if (m === mode) return
        setMode(m)
        setMedecinId(null)
        setDate('')
        setHeure('09:00')
        setMedecinsDispo([])
        setDatesDispo([])
    }

    // Mode "Par date" : liste des médecins disponibles ce jour-là
    useEffect(() => {
        if (mode !== 'par_date' || !date || medecinId) return
        let cancelled = false
        setLoadingMedecins(true)
        getMedecinsDisponibles(date)
            .then(res => {
                if (cancelled) return
                // getMedecinsDisponibles interroge tout l'hôpital, sans notion
                // de service — on ne garde que ceux déjà présents dans `medecins`
                // (prop reçue du parent, elle-même filtrée par service).
                const idsAutorises = new Set(medecins.map(m => m.id))
                setMedecinsDispo(res.medecins.filter(m => idsAutorises.has(m.id)))
            })
            .catch(() => { if (!cancelled) setMedecinsDispo([]) })
            .finally(() => { if (!cancelled) setLoadingMedecins(false) })
        return () => { cancelled = true }
    }, [mode, date, medecinId, medecins])

    // Mode "Par médecin" : prochaines dates disponibles pour ce médecin
    useEffect(() => {
        if (mode !== 'par_medecin' || !medecinId || date) return
        let cancelled = false
        setLoadingDates(true)
        getDatesDisponibles(medecinId)
            .then(res => { if (!cancelled) setDatesDispo(res.dates) })
            .catch(() => { if (!cancelled) setDatesDispo([]) })
            .finally(() => { if (!cancelled) setLoadingDates(false) })
        return () => { cancelled = true }
    }, [mode, medecinId, date])

    // Une fois médecin + date choisis (quel que soit le chemin), on charge les créneaux horaires
    useEffect(() => {
        if (!medecinId || !date) {
            setCreneaux([])
            setMotifIndisponibilite('')
            return
        }
        let cancelled = false
        setLoadingCreneaux(true)
        getCreneauxDisponibles(medecinId, date, isEdit && rdv ? { excludeId: rdv.id } : undefined)
            .then(res => {
                if (cancelled) return
                setCreneaux(res.creneaux)
                setMotifIndisponibilite(res.indisponible ? res.motif : '')
            })
            .catch(() => {
                if (!cancelled) { setCreneaux([]); setMotifIndisponibilite('') }
            })
            .finally(() => { if (!cancelled) setLoadingCreneaux(false) })
        return () => { cancelled = true }
    }, [medecinId, date, isEdit, rdv])

    // Le créneau actuellement sélectionné, s'il figure dans la liste chargée
    const heureEstDisponible = mode === 'sans_medecin' || creneaux.some(c => c.heure_debut === heure && c.disponible)

    const peutSoumettre = !!patientId && !!motif.trim() && !!date && !!heure
        && (mode === 'sans_medecin' || (!!medecinId && heureEstDisponible))

    const handleSubmit = async () => {
        if (!peutSoumettre) return
        setSubmitting(true)
        setErreur('')
        try {
            const payload = {
                patient: patientId,
                medecin: mode === 'sans_medecin' ? null : medecinId,
                date_heure: new Date(`${date}T${heure}`).toISOString(),
                motif: motif.trim(),
                notes,
            }
            const saved = isEdit ? await updateRendezVous(rdv!.id, payload) : await createRendezVous(payload)
            onSaved(saved)
        } catch (e: unknown) {
            const message = (e as { response?: { data?: { detail?: string; non_field_errors?: string[] } } })
                ?.response?.data
            setErreur(message?.detail || message?.non_field_errors?.[0] || "Erreur lors de l'enregistrement.")
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

                    <div className="ht-field">
                        <label className="ht-label">Comment souhaitez-vous fixer le rendez-vous ?</label>
                        <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                            {MODES.map(m => (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => switchMode(m.key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={mode === m.key
                                        ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                        : { color: 'var(--ht-text-secondary)' }}
                                >
                                    <m.Icon size={13} /> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Mode "Par date" : choisir la date, puis un médecin disponible ── */}
                    {mode === 'par_date' && (
                        <>
                            <div className="ht-field">
                                <label className="ht-label">Date souhaitée</label>
                                <input type="date" value={date}
                                       onChange={e => { setDate(e.target.value); setMedecinId(null) }}
                                       className="ht-input" />
                            </div>
                            {date && (
                                medecinId ? (
                                    <MedecinChip medecin={selectedMedecin} onChanger={() => setMedecinId(null)} />
                                ) : (
                                    <div className="ht-field">
                                        <label className="ht-label">Médecins disponibles ce jour-là</label>
                                        {loadingMedecins ? (
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                                        ) : medecinsDispo.length === 0 ? (
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun médecin n'a de créneau ce jour-là.</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                                {medecinsDispo.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        disabled={!m.disponible}
                                                        onClick={() => setMedecinId(m.id)}
                                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors"
                                                        style={m.disponible
                                                            ? { border: '1px solid var(--ht-border)', color: 'var(--ht-text)' }
                                                            : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)', cursor: 'not-allowed' }}
                                                    >
                                                        <span>Dr. {m.prenom} {m.nom}{m.specialite ? ` — ${m.specialite}` : ''}</span>
                                                        <span className="text-xs flex-shrink-0 ml-2">
                                                            {m.disponible ? `${m.nb_creneaux_libres} créneau${m.nb_creneaux_libres > 1 ? 'x' : ''} libre${m.nb_creneaux_libres > 1 ? 's' : ''}` : m.motif}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* ── Mode "Par médecin" : choisir le médecin, puis une date disponible ── */}
                    {mode === 'par_medecin' && (
                        <>
                            <div className="ht-field">
                                <label className="ht-label">Médecin</label>
                                <select
                                    value={medecinId ?? ''}
                                    onChange={e => { setMedecinId(e.target.value ? Number(e.target.value) : null); setDate('') }}
                                    className="ht-input"
                                >
                                    <option value="">Choisir un médecin…</option>
                                    {medecins.map(m => (
                                        <option key={m.id} value={m.id}>
                                            Dr. {m.prenom} {m.nom}{m.specialite ? ` — ${m.specialite}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {medecinId && (
                                date ? (
                                    <DateChip date={date} onChanger={() => setDate('')} />
                                ) : (
                                    <div className="ht-field">
                                        <label className="ht-label">Prochaines dates disponibles</label>
                                        {loadingDates ? (
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                                        ) : datesDispo.length === 0 ? (
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucune date disponible dans les 30 prochains jours.</p>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
                                                {datesDispo.map(d => (
                                                    <button
                                                        key={d.date}
                                                        type="button"
                                                        onClick={() => setDate(d.date)}
                                                        className="flex flex-col items-center px-2 py-2 rounded-lg text-center transition-colors"
                                                        style={{ backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' }}
                                                    >
                                                        <span className="text-xs font-semibold capitalize">{formatDateCourte(d.date)}</span>
                                                        <span className="text-[10px] opacity-80">{d.nb_creneaux_libres} libre{d.nb_creneaux_libres > 1 ? 's' : ''}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* ── Mode "Sans médecin" : date/heure libres, sans lien à un planning ── */}
                    {mode === 'sans_medecin' && (
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
                    )}

                    {/* ── Grille des créneaux horaires, une fois médecin + date choisis ── */}
                    {mode !== 'sans_medecin' && medecinId && date && (
                        <div className="ht-field">
                            <label className="ht-label flex items-center gap-1.5">
                                <Clock size={13} /> Heure du rendez-vous
                            </label>
                            {loadingCreneaux ? (
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement des disponibilités…</p>
                            ) : motifIndisponibilite ? (
                                <div className="ht-alert flex items-center gap-2 text-xs" style={{ backgroundColor: 'var(--ht-warning-bg)', color: 'var(--ht-warning)' }}>
                                    <Info size={14} /> {motifIndisponibilite}
                                </div>
                            ) : creneaux.length === 0 ? (
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun créneau pour ce jour.</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                                    {creneaux.map(c => {
                                        const selectionne = heure === c.heure_debut
                                        return (
                                            <button
                                                key={c.heure_debut}
                                                type="button"
                                                disabled={!c.disponible}
                                                onClick={() => setHeure(c.heure_debut)}
                                                className="text-xs font-semibold py-1.5 rounded-lg transition-colors"
                                                style={
                                                    !c.disponible
                                                        ? { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)', textDecoration: 'line-through', cursor: 'not-allowed' }
                                                        : selectionne
                                                            ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                                            : { backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' }
                                                }
                                            >
                                                {c.heure_debut}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

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
                            disabled={!peutSoumettre || submitting}
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
                 style={{ backgroundColor: 'var(--ht-primary-tint-bg)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--ht-primary-tint-text)' }}>{heure}</span>
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
                <p className="text-xs mt-1 flex items-center gap-1 capitalize flex-wrap" style={{ color: 'var(--ht-text-muted)' }}>
                    <Calendar size={12} /> {date}
                    {rdv.medecin && (
                        <span className="flex items-center gap-1 normal-case">
                            <Stethoscope size={12} /> Dr. {rdv.medecin_prenom} {rdv.medecin_nom}
                        </span>
                    )}
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
    const { hasRole, user } = useAuth()
    const isAdmin = hasRole('admin')

    const [rdvs, setRdvs] = useState<RendezVous[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [medecins, setMedecins] = useState<Employe[]>([])
    const [loading, setLoading] = useState(true)
    const [filtre, setFiltre] = useState<Filtre>('aujourdhui')
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState<RendezVous | null>(null)
    const [page, setPage] = useState(1)

    useEffect(() => {
        Promise.all([getRendezVous(), getPatients(), getEmployes()])
            .then(([r, p, e]) => {
                setRdvs(r); setPatients(p)
                const medecinsRole = e.filter(m => m.role === 'medecin')
                // Une secrétaire (ou tout employé non-admin) ne doit voir que les médecins de son propre service.
                // Si l'employé n'a pas de service renseigné, on ne filtre pas (mieux vaut tout montrer que rien).
                const medecinsVisibles = (isAdmin || !user?.service)
                    ? medecinsRole
                    : medecinsRole.filter(m => m.service === user.service)
                setMedecins(medecinsVisibles)
            })
            .finally(() => setLoading(false))
    }, [isAdmin, user?.service])

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
                    medecins={medecins}
                    rdv={editTarget}
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSaved={handleSaved}
                />
            )}

            <main className="ht-page-content max-w-4xl mx-auto space-y-6">

                {/* Section En-tête */}
                <PageHeader
                    title="Rendez-vous"
                    subtitle="Planification et suivi des rendez-vous patients"
                    icon={Calendar}
                    ctaLabel="Nouveau rendez-vous"
                    onCtaClick={() => { setEditTarget(null); setShowModal(true) }}
                />

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