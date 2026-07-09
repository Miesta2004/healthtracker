import { useEffect, useMemo, useState } from 'react'
import { getPatients } from '../api/patients'
import {
    getDemandes,
    createDemande,
    prendreEnCharge,
    annulerDemande,
    soumettreResultats,
} from '../api/analyses'
import type { Patient, DemandeAnalyse, StatutAnalyse, UrgenceAnalyse, TypeAnalyse } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonSimpleList } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import {
    FlaskConical,
    Plus,
    AlertTriangle,
    AlertCircle,
    Search,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    X,
    FileText,
    ClipboardCheck,
    HelpCircle
} from 'lucide-react'

const PAGE_SIZE = 20

// ─── Config ────────────────────────────────────────────────────────────────
const TYPES: { value: TypeAnalyse; label: string }[] = [
    { value: 'nfs', label: 'NFS (numération formule sanguine)' },
    { value: 'glycemie', label: 'Glycémie' },
    { value: 'bilan_renal', label: 'Bilan rénal (créatinine, urée)' },
    { value: 'bilan_hepatique', label: 'Bilan hépatique (ASAT, ALAT)' },
    { value: 'bilan_lipidique', label: 'Bilan lipidique' },
    { value: 'ionogramme', label: 'Ionogramme sanguin' },
    { value: 'crp', label: 'CRP (protéine C-réactive)' },
    { value: 'groupe_sanguin', label: 'Groupe sanguin / RAI' },
    { value: 'hemostase', label: 'Hémostase (TP, TCA)' },
    { value: 'urine', label: 'Examen cytobactériologique des urines' },
    { value: 'parasite', label: 'Frottis / goutte épaisse (paludisme)' },
    { value: 'autre', label: 'Autre' },
]

const STATUT_CONFIG: Record<StatutAnalyse, { label: string; color: string; bg: string }> = {
    en_attente: { label: 'En attente', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
    en_cours: { label: 'En cours', color: 'var(--role-medecin)', bg: 'rgba(14, 116, 144, 0.1)' },
    terminee: { label: 'Terminée', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    annulee: { label: 'Annulée', color: 'var(--ht-text-muted)', bg: 'var(--ht-muted-bg)' },
}

function StatutBadge({ statut }: { statut: StatutAnalyse }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span className="badge font-semibold" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.label}
        </span>
    )
}

function tempsEcoule(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    return `${h}h${(mins % 60).toString().padStart(2, '0')}`
}

// ─── Modal : nouvelle demande (médecin / admin) ─────────────────────────────
function NouvelleDemandeModal({ patients, onClose, onCreated }: {
    patients: Patient[]; onClose: () => void; onCreated: (d: DemandeAnalyse) => void
}) {
    const [search, setSearch] = useState('')
    const [patientId, setPatientId] = useState<number | null>(null)
    const [typeAnalyse, setTypeAnalyse] = useState<TypeAnalyse>('nfs')
    const [urgence, setUrgence] = useState<UrgenceAnalyse>('normale')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const results = useMemo(() => {
        if (search.trim().length < 2) return []
        const q = search.toLowerCase()
        return patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q)).slice(0, 6)
    }, [search, patients])

    const selectedPatient = patients.find(p => p.id === patientId)

    const handleSubmit = async () => {
        if (!patientId) return
        setSubmitting(true)
        setErreur('')
        try {
            const created = await createDemande({
                patient: patientId,
                type_analyse: typeAnalyse,
                urgence,
                notes_medecin: notes,
            })
            onCreated(created)
        } catch {
            setErreur("Erreur lors de l'enregistrement de la demande.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto border"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>Nouvelle demande d'analyse</h3>
                    <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }} className="hover:opacity-80"><X size={18} /></button>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Patient</label>
                    {selectedPatient ? (
                        <div className="flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm"
                             style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-muted-bg)' }}>
                            <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{selectedPatient.prenom} {selectedPatient.nom}</span>
                            <button onClick={() => setPatientId(null)} className="text-xs font-semibold hover:underline" style={{ color: 'var(--ht-primary)' }}>Changer</button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <input type="text" placeholder="Rechercher un patient par nom…" value={search}
                                   onChange={e => setSearch(e.target.value)}
                                   className="ht-input w-full pl-9 pr-3 py-2.5 text-sm" />
                            {results.length > 0 && (
                                <div className="mt-1 border rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                                    {results.map(p => (
                                        <button key={p.id} onClick={() => { setPatientId(p.id); setSearch('') }}
                                                className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors border-b"
                                                style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <span>{p.prenom} {p.nom}</span>
                                            <span className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>Né(e) le {p.date_naissance}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Type d'analyse</label>
                    <select value={typeAnalyse} onChange={e => setTypeAnalyse(e.target.value as TypeAnalyse)}
                            className="ht-input w-full px-3 py-2.5 text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Urgence</label>
                    <div className="flex rounded-xl border overflow-hidden text-sm" style={{ borderColor: 'var(--ht-border)' }}>
                        <button type="button" onClick={() => setUrgence('normale')} className="flex-1 py-2.5 font-semibold transition-colors"
                                style={urgence === 'normale' ? { backgroundColor: 'var(--ht-primary)', color: 'white' } : { backgroundColor: 'transparent', color: 'var(--ht-text-muted)' }}>
                            Normale
                        </button>
                        <button type="button" onClick={() => setUrgence('urgente')} className="flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                style={urgence === 'urgente' ? { backgroundColor: 'var(--ht-danger)', color: 'white' } : { backgroundColor: 'transparent', color: 'var(--ht-danger)' }}>
                            <AlertTriangle size={14} /> Critique / Urgente
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Notes complémentaires pour le laboratoire</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Contexte clinique, hypothèse diagnostique ou paramètres spécifiques à surveiller..." />
                </div>

                {erreur && (
                    <div className="ht-alert ht-alert-danger flex items-center gap-2 text-xs">
                        <AlertCircle size={14} /> {erreur}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={!patientId || submitting}
                            className="btn btn-primary flex-1 font-semibold">
                        {submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal : saisie des résultats (laborantin) ──────────────────────────────
function ResultatsModal({ demande, onClose, onUpdated }: {
    demande: DemandeAnalyse; onClose: () => void; onUpdated: (d: DemandeAnalyse) => void
}) {
    const [resultats, setResultats] = useState(demande.resultats || '')
    const [valeursNormales, setValeursNormales] = useState(demande.valeurs_normales || '')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const handleSubmit = async () => {
        if (!resultats.trim()) return
        setSubmitting(true)
        setErreur('')
        try {
            const updated = await soumettreResultats(demande.id, { resultats, valeurs_normales: valeursNormales })
            onUpdated(updated)
        } catch {
            setErreur("Erreur lors de l'enregistrement des résultats.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto border"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="border-b pb-1" style={{ borderColor: 'var(--ht-border)' }}>
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>
                        {demande.type_label}
                    </h3>
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--ht-text-secondary)' }}>
                        <User size={12} /> Patient : <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{demande.patient_prenom || demande.patient_nom} {demande.patient_nom_famille || ''}</span>
                    </p>
                    {demande.notes_medecin && (
                        <div className="rounded-xl p-2.5 border text-xs mt-2.5" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text-secondary)' }}>
                            <span className="font-bold block mb-0.5" style={{ color: 'var(--ht-text)' }}>Note de prescription :</span>
                            {demande.notes_medecin}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Conclusions & Résultats *</label>
                    <textarea value={resultats} onChange={e => setResultats(e.target.value)} rows={6}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Saisissez les données brutes ou conclusions cliniques de l'analyse..." />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Valeurs normales de référence (optionnel)</label>
                    <textarea value={valeursNormales} onChange={e => setValeursNormales(e.target.value)} rows={2}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Ex : Hémoglobine : 12 – 16 g/dL" />
                </div>

                {erreur && (
                    <div className="ht-alert ht-alert-danger flex items-center gap-2 text-xs">
                        <AlertCircle size={14} /> {erreur}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={!resultats.trim() || submitting}
                            className="btn btn-primary flex-1 font-semibold">
                        {submitting ? 'Validation…' : 'Valider & Transmettre'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal d'annulation explicite (remplace window.confirm) ──────────────────
function AnnulationModal({ demande, onConfirm, onCancel }: {
    demande: DemandeAnalyse; onConfirm: () => void; onCancel: () => void
}) {
    return (
        <div className="ht-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="ht-modal ht-modal-sm border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--ht-danger)' }}>
                    <XCircle size={20} />
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>Annuler la demande ?</h3>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--ht-text-secondary)' }}>
                    Voulez-vous vraiment annuler l'analyse <strong>{demande.type_label}</strong> ? Cette action notifiera le service de soin.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-ghost flex-1">Conserver</button>
                    <button onClick={onConfirm} className="btn btn-danger flex-1 font-semibold">
                        Confirmer l'annulation
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Ligne d'une demande ──────────────────────────────────────────────────────
function DemandeRow({ demande, isLab, canManage, onPrendreEnCharge, onAnnuler, onSaisirResultats, onVoirResultats }: {
    demande: DemandeAnalyse
    isLab: boolean
    canManage: boolean
    onPrendreEnCharge: (d: DemandeAnalyse) => void
    onAnnuler: (d: DemandeAnalyse) => void
    onSaisirResultats: (d: DemandeAnalyse) => void
    onVoirResultats: (d: DemandeAnalyse) => void
}) {
    const nomPatient = demande.patient_prenom
        ? `${demande.patient_prenom} ${demande.patient_nom_famille}`
        : demande.patient_nom

    return (
        <div className="px-5 py-4 flex items-center gap-4 border-b last:border-0 transition-colors"
             style={{ borderColor: 'var(--ht-border)' }}
             onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)'}
             onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>

            {demande.urgence === 'urgente' && demande.statut !== 'terminee' && demande.statut !== 'annulee' ? (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: 'var(--ht-danger)' }} title="Urgente" />
            ) : (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-transparent" />
            )}

            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-text)' }}>{demande.type_label}</p>
                <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--ht-text-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--ht-text-secondary)' }}>{nomPatient}</span>
                    {demande.patient_dossier && <span>· ID: {demande.patient_dossier}</span>}
                    {demande.demandeur_nom && !isLab && <span>· Dr. {demande.demandeur_nom}</span>}
                    <span className="flex items-center gap-0.5"><Clock size={11} /> {tempsEcoule(demande.date_demande)}</span>
                </p>
            </div>

            <div className="flex items-center gap-3">
                <StatutBadge statut={demande.statut} />
                <div className="flex gap-2">
                    {isLab && demande.statut === 'en_attente' && (
                        <button onClick={() => onPrendreEnCharge(demande)}
                                className="btn btn-primary btn-sm font-semibold">
                            Prendre en charge
                        </button>
                    )}
                    {isLab && demande.statut === 'en_cours' && (
                        <button onClick={() => onSaisirResultats(demande)}
                                className="btn btn-primary btn-sm font-semibold flex items-center gap-1">
                            <ClipboardCheck size={12} /> Saisir résultats
                        </button>
                    )}
                    {demande.statut === 'terminee' && (
                        <button onClick={() => onVoirResultats(demande)}
                                className="btn btn-ghost btn-sm font-semibold flex items-center gap-1">
                            <FileText size={12} /> Consulter
                        </button>
                    )}
                    {canManage && (demande.statut === 'en_attente' || demande.statut === 'en_cours') && (
                        <button onClick={() => onAnnuler(demande)}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--ht-text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--ht-danger)'; e.currentTarget.style.backgroundColor = 'var(--ht-danger-bg)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ht-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}>
                            Annuler
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Laboratoire() {
    const { hasRole } = useAuth()
    const isLab = hasRole('laborantin')
    const canRequest = hasRole('admin', 'medecin')
    const canManage = hasRole('admin', 'medecin', 'laborantin')

    const [demandes, setDemandes] = useState<DemandeAnalyse[] | null>(null)
    const [patients, setPatients] = useState<Patient[]>([])
    const [filtreStatut, setFiltreStatut] = useState<'tous' | StatutAnalyse>('tous')
    const [showNouvelle, setShowNouvelle] = useState(false)
    const [resultatsCible, setResultatsCible] = useState<DemandeAnalyse | null>(null)
    const [annulationCible, setAnnulationCible] = useState<DemandeAnalyse | null>(null)
    const [erreurAction, setErreurAction] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        getDemandes().then(setDemandes).catch(() => setDemandes([]))
        if (canRequest) getPatients().then(setPatients).catch(() => setPatients([]))
    }, [canRequest])

    const demandesFiltrees = (demandes ?? []).filter(d => filtreStatut === 'tous' || d.statut === filtreStatut)
        .sort((a, b) => {
            const aUrg = a.urgence === 'urgente' && (a.statut === 'en_attente' || a.statut === 'en_cours') ? 0 : 1
            const bUrg = b.urgence === 'urgente' && (b.statut === 'en_attente' || b.statut === 'en_cours') ? 0 : 1
            if (aUrg !== bUrg) return aUrg - bUrg
            return new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime()
        })

    useEffect(() => { setPage(1) }, [filtreStatut])

    const totalPages        = Math.max(1, Math.ceil(demandesFiltrees.length / PAGE_SIZE))
    const pageCourante       = Math.min(page, totalPages)
    const demandesPage      = demandesFiltrees.slice((pageCourante - 1) * PAGE_SIZE, pageCourante * PAGE_SIZE)

    const compteurs = (demandes ?? []).reduce((acc, d) => {
        acc[d.statut] = (acc[d.statut] ?? 0) + 1
        return acc
    }, {} as Record<StatutAnalyse, number>)

    const handlePrendreEnCharge = async (d: DemandeAnalyse) => {
        setErreurAction('')
        try {
            const updated = await prendreEnCharge(d.id)
            setDemandes(prev => prev ? prev.map(x => x.id === d.id ? updated : x) : prev)
        } catch {
            setErreurAction("Impossible de prendre en charge cette demande (déjà en cours de traitement).")
        }
    }

    const handleConfirmAnnuler = async () => {
        if (!annulationCible) return
        setErreurAction('')
        try {
            const updated = await annulerDemande(annulationCible.id)
            setDemandes(prev => prev ? prev.map(x => x.id === annulationCible.id ? updated : x) : prev)
            setAnnulationCible(null)
        } catch {
            setErreurAction("Impossible d'annuler cette demande d'analyse.")
            setAnnulationCible(null)
        }
    }

    return (
        <div className="ht-page flex min-h-screen" style={{ backgroundColor: 'var(--ht-bg)' }}>
            <Sidebar />

            <div className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FlaskConical style={{ color: 'var(--ht-primary)' }} size={24} />
                            <h1 className="text-xl font-bold" style={{ color: 'var(--ht-text)' }}>Laboratoire d'analyses</h1>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                            {isLab ? "Demandes d'analyses cliniques assignées à votre service" : "Suivi en temps réel des analyses prescrites"}
                        </p>
                    </div>
                    {canRequest && (
                        <button onClick={() => setShowNouvelle(true)}
                                className="btn btn-primary btn-sm flex items-center gap-1.5 font-semibold">
                            <Plus size={16} /> Nouvelle demande
                        </button>
                    )}
                </div>

                {erreurAction && (
                    <div className="ht-alert ht-alert-danger flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {erreurAction}
                    </div>
                )}

                {/* Onglets Filtres de Statuts */}
                <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: 'var(--ht-border)' }}>
                    {(['tous', 'en_attente', 'en_cours', 'terminee', 'annulee'] as const).map(s => (
                        <button key={s} onClick={() => setFiltreStatut(s)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                                style={filtreStatut === s
                                    ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                                    : { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-text-muted)', borderColor: 'var(--ht-border)' }}>
                            {s === 'tous' ? `Toutes (${demandes?.length ?? 0})` : `${STATUT_CONFIG[s].label} (${compteurs[s] ?? 0})`}
                        </button>
                    ))}
                </div>

                {/* Table / Liste des demandes */}
                <div className="ht-card border overflow-hidden" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                    {demandes === null ? (
                        <SkeletonSimpleList rows={5} />
                    ) : demandesFiltrees.length === 0 ? (
                        <div className="px-6 py-16 text-center flex flex-col items-center justify-center gap-2" style={{ color: 'var(--ht-text-muted)' }}>
                            <HelpCircle size={40} className="opacity-40" />
                            <p className="text-sm font-semibold">
                                {filtreStatut === 'tous' ? "Aucune demande d'analyse enregistrée" : "Aucune demande trouvée pour ce filtre"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--ht-border)' }}>
                            {demandesPage.map(d => (
                                <DemandeRow key={d.id} demande={d} isLab={isLab} canManage={canManage}
                                            onPrendreEnCharge={handlePrendreEnCharge}
                                            onAnnuler={setAnnulationCible}
                                            onSaisirResultats={setResultatsCible}
                                            onVoirResultats={setResultatsCible} />
                            ))}
                        </div>
                    )}
                    <Pagination
                        page={pageCourante}
                        totalPages={totalPages}
                        totalItems={demandesFiltrees.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            {/* Modals conditionnels */}
            {showNouvelle && (
                <NouvelleDemandeModal
                    patients={patients}
                    onClose={() => setShowNouvelle(false)}
                    onCreated={d => { setDemandes(prev => prev ? [d, ...prev] : [d]); setShowNouvelle(false) }}
                />
            )}

            {annulationCible && (
                <AnnulationModal
                    demande={annulationCible}
                    onCancel={() => setAnnulationCible(null)}
                    onConfirm={handleConfirmAnnuler}
                />
            )}

            {resultatsCible && resultatsCible.statut === 'terminee' && (
                <div className="ht-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                     onClick={() => setResultatsCible(null)}>
                    <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto border"
                         style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}
                         onClick={e => e.stopPropagation()}>
                        <div className="border-b pb-2" style={{ borderColor: 'var(--ht-border)' }}>
                            <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--ht-success)' }}>
                                <CheckCircle2 size={18} />
                                <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>{resultatsCible.type_label}</h3>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                Patient : <span style={{ color: 'var(--ht-text)' }} className="font-semibold">{resultatsCible.patient_prenom || resultatsCible.patient_nom} {resultatsCible.patient_nom_famille || ''}</span>
                                {resultatsCible.date_resultat && ` · Archivé le ${new Date(resultatsCible.date_resultat).toLocaleString('fr-FR')}`}
                            </p>
                        </div>

                        <div className="rounded-xl p-3.5 border" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ht-text-muted)' }}>Résultats d'analyses</p>
                            <p className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'var(--ht-text)' }}>{resultatsCible.resultats}</p>
                        </div>

                        {resultatsCible.valeurs_normales && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-text-muted)' }}>Valeurs normales de référence</p>
                                <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--ht-text-secondary)' }}>{resultatsCible.valeurs_normales}</p>
                            </div>
                        )}
                        <button onClick={() => setResultatsCible(null)}
                                className="btn btn-ghost w-full font-semibold mt-2">
                            Fermer le rapport
                        </button>
                    </div>
                </div>
            )}

            {resultatsCible && resultatsCible.statut === 'en_cours' && (
                <ResultatsModal
                    demande={resultatsCible}
                    onClose={() => setResultatsCible(null)}
                    onUpdated={d => { setDemandes(prev => prev ? prev.map(x => x.id === d.id ? d : x) : prev); setResultatsCible(null) }}
                />
            )}
        </div>
    )
}