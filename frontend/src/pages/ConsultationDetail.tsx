import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getPatient, getSignesVitaux, postSignesVitaux, updatePatient } from '../api/patients'
import { getAntecedents, createAntecedent, promouvoirAntecedent } from '../api/antecedents'
import { getConsultation, createConsultation, updateConsultation, deleteConsultation } from '../api/consultations'
import { getDemandesPatient, createDemande } from '../api/analyses'
import type {
    Patient, ConsultationStatut, TypeEvenement, Antecedent, TypeAntecedent,
    SignesVitaux, DemandeAnalyse, TypeAnalyse, UrgenceAnalyse,
} from '../types'
import { SkeletonDetailPage } from '../components/Skeleton'
import PlanifierOperationModal from '../components/PlanifierOperationModal'
import {
    Stethoscope, FlaskConical, Activity, FileText, Trash2, Pin, Check, CheckCircle,
    AlertTriangle, ChevronLeft, Play, Ban, Heart, Thermometer, Droplet, Scale,
    Plus, Clock, Building2, Circle, Printer, MoreVertical, Phone,
    Pill, ClipboardList, Award, FileWarning, StickyNote, Folder, Download,
    Bold, Italic, Underline, List, ListOrdered, ChevronDown,
    type LucideIcon,
} from 'lucide-react'

// ─── Types d'antécédents ──────────────────────────────────────────────────────
const TYPE_ANTECEDENT_LABELS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'Maladie chronique',
    chirurgie:         'Chirurgie',
    allergie:          'Allergie',
    familial:          'Antécédent familial',
    autre:             'Autre',
}

const TYPE_ANTECEDENT_COLORS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'border-[var(--ht-primary)] bg-[var(--ht-primary-tint-bg)] text-[var(--ht-primary)]',
    chirurgie:         'border-orange-100 bg-orange-50 text-orange-700',
    allergie:          'border-[var(--ht-danger)] bg-[var(--ht-danger-bg)] text-[var(--ht-danger)]',
    familial:          'border-purple-100 bg-purple-50 text-purple-700',
    autre:             'border-[var(--ht-border-input)] bg-[var(--ht-bg)] text-[var(--ht-text-secondary)]',
}

const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: LucideIcon }> = {
    consultation: { label: 'Consultation', icon: Stethoscope },
    examen:       { label: 'Examen',        icon: FlaskConical },
    operation:    { label: 'Opération',     icon: Activity },
    autre:        { label: 'Autre',         icon: FileText },
}

const STATUT_LABELS: Record<ConsultationStatut, string> = {
    planifiee: 'En attente',
    en_cours:  'En consultation',
    terminee:  'Terminée',
    annulee:   'Annulée',
}

const STATUT_COLORS: Record<ConsultationStatut, { bg: string; text: string }> = {
    planifiee: { bg: 'var(--ht-primary-tint-bg)',  text: 'var(--ht-primary)' },
    en_cours:  { bg: 'var(--ht-primary-tint-bg)',  text: 'var(--ht-primary)' },
    terminee:  { bg: 'var(--ht-success-bg)',       text: 'var(--ht-success)' },
    annulee:   { bg: 'var(--ht-danger-bg)',        text: 'var(--ht-danger)' },
}

const TYPE_ANALYSE_LABELS: Record<TypeAnalyse, string> = {
    nfs:             'NFS (numération formule sanguine)',
    glycemie:        'Glycémie',
    bilan_renal:     'Bilan rénal (créatinine, urée)',
    bilan_hepatique: 'Bilan hépatique (ASAT, ALAT)',
    bilan_lipidique: 'Bilan lipidique',
    ionogramme:      'Ionogramme sanguin',
    crp:             'CRP (protéine C-réactive)',
    groupe_sanguin:  'Groupe sanguin / RAI',
    hemostase:       'Hémostase (TP, TCA)',
    urine:           'Examen cytobactériologique des urines',
    parasite:        'Frottis / goutte épaisse (paludisme)',
    autre:           'Autre',
}

const STATUT_ANALYSE_COLORS: Record<string, { bg: string; text: string }> = {
    en_attente: { bg: 'var(--ht-muted-bg)',   text: 'var(--ht-text-secondary)' },
    en_cours:   { bg: 'var(--ht-amber-bg, var(--ht-muted-bg))', text: 'var(--ht-amber, var(--ht-text))' },
    terminee:   { bg: 'var(--ht-success-bg)', text: 'var(--ht-success)' },
    annulee:    { bg: 'var(--ht-danger-bg)',  text: 'var(--ht-danger)' },
}

// ─── Onglets, dans l'ordre du workflow (utilisé par le bouton "Suivant") ─────
type Onglet = 'consultation' | 'constantes' | 'examens' | 'prescription' | 'documents' | 'notes'

const ONGLET_ORDER: { key: Onglet; label: string; icon: LucideIcon }[] = [
    { key: 'consultation', label: 'Consultation', icon: Stethoscope },
    { key: 'constantes',   label: 'Constantes',   icon: Activity },
    { key: 'examens',      label: 'Examens',      icon: FlaskConical },
    { key: 'prescription', label: 'Prescription', icon: Pill },
    { key: 'documents',    label: 'Documents',    icon: FileText },
    { key: 'notes',        label: 'Notes',        icon: StickyNote },
]

interface Etape {
    key: string
    label: string
    fait: boolean
    aVenir?: boolean
}

interface ChampConstante {
    key: keyof Omit<SignesVitaux, 'id' | 'patient' | 'date'>
    label: string
    unite: string
    icon: LucideIcon
    step: number
}

const CHAMPS_CONSTANTES: ChampConstante[] = [
    { key: 'tension_systolique',  label: 'TA systolique',   unite: 'mmHg',   icon: Heart,       step: 1 },
    { key: 'tension_diastolique', label: 'TA diastolique',  unite: 'mmHg',   icon: Heart,       step: 1 },
    { key: 'frequence_cardiaque', label: 'Fréq. cardiaque', unite: 'bpm',    icon: Activity,    step: 1 },
    { key: 'temperature',         label: 'Température',     unite: '°C',     icon: Thermometer, step: 0.1 },
    { key: 'glycemie',            label: 'Glycémie',        unite: 'mmol/L', icon: Droplet,     step: 0.1 },
    { key: 'poids',               label: 'Poids',           unite: 'kg',     icon: Scale,       step: 0.1 },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="ht-label mb-1.5 block">{children}</label>
}

function CardTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-text)' }}>
            {children}
        </h2>
    )
}

// ─── Sélecteur compact de type d'événement (pills) ───────────────────────────
function TypeSelector({ value, onChange }: { value: TypeEvenement; onChange: (t: TypeEvenement) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {(Object.entries(TYPE_CONFIG) as [TypeEvenement, { label: string; icon: LucideIcon }][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                const isSelected = value === key
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
                        style={isSelected
                            ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                            : { backgroundColor: 'var(--ht-card-bg)', color: 'var(--ht-text-secondary)', borderColor: 'var(--ht-border)' }
                        }
                    >
                        <Icon size={12} />
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
                    <button onClick={onCancel} className="btn btn-secondary flex-1">Annuler</button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1">
                        {loading ? 'Suppression…' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal de confirmation : ajouter aux antécédents (fin de consultation) ───
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
                <select value={type} onChange={e => onTypeChange(e.target.value as TypeAntecedent)} className="ht-input w-full mb-6">
                    {(Object.entries(TYPE_ANTECEDENT_LABELS) as [TypeAntecedent, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                    ))}
                </select>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-secondary flex-1">Non, merci</button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-primary flex-1">
                        {loading ? 'Ajout…' : 'Oui, ajouter'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Barre de progression : pastilles + connecteurs ──────────────────────────
function BarreProgression({ etapes, ongletActif }: { etapes: Etape[]; ongletActif: Onglet }) {
    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="flex items-center overflow-x-auto">
                {etapes.map((etape, i) => {
                    const estActif = etape.key === ongletActif
                    const couleur = etape.aVenir
                        ? 'var(--ht-text-muted)'
                        : etape.fait
                            ? 'var(--ht-success)'
                            : estActif
                                ? 'var(--ht-primary)'
                                : 'var(--ht-text-muted)'
                    return (
                        <div key={etape.key} className="flex items-center flex-shrink-0">
                            <div className="flex flex-col items-center gap-1.5 px-1">
                                {etape.fait && !etape.aVenir ? (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: couleur }}>
                                        <Check size={14} color="white" strokeWidth={3} />
                                    </div>
                                ) : estActif ? (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: couleur }}>
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                ) : (
                                    <Circle size={22} style={{ color: 'var(--ht-border-input)' }} strokeWidth={2} />
                                )}
                                <span
                                    className="text-[11px] font-semibold whitespace-nowrap"
                                    style={{ color: estActif || etape.fait ? 'var(--ht-text)' : 'var(--ht-text-muted)', opacity: etape.aVenir ? 0.55 : 1 }}
                                >
                                    {etape.label}
                                </span>
                            </div>
                            {i < etapes.length - 1 && (
                                <div className="w-8 sm:w-14 h-0.5 mb-4 flex-shrink-0" style={{ backgroundColor: etape.fait ? 'var(--ht-success)' : 'var(--ht-border)' }} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ConsultationDetail() {
    const { id, consultId } = useParams<{ id: string; consultId?: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const patientId = Number(id)
    const isNew = !consultId || consultId === 'new'

    const navState = (location.state ?? {}) as { motif?: string; rdvOrigine?: number }

    const [patient, setPatient] = useState<Patient | null>(null)
    const [antecedents, setAntecedents] = useState<Antecedent[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [onglet, setOnglet] = useState<Onglet>('consultation')
    const [showMenu, setShowMenu] = useState(false)

    const [showDelete, setShowDelete] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [antecedentPropose, setAntecedentPropose] = useState<string | null>(null)
    const [typeAntecedentChoisi, setTypeAntecedentChoisi] = useState<TypeAntecedent>('maladie_chronique')
    const [antecedentLoading, setAntecedentLoading] = useState(false)
    const [antecedentAjoute, setAntecedentAjoute] = useState(false)

    // Ajout rapide d'antécédent / allergie depuis l'onglet Consultation
    const [showAddAntecedent, setShowAddAntecedent] = useState(false)
    const [nouvelAntecedentTexte, setNouvelAntecedentTexte] = useState('')
    const [antecedentQuickSaving, setAntecedentQuickSaving] = useState(false)

    const [showAddAllergie, setShowAddAllergie] = useState(false)
    const [nouvelleAllergieTexte, setNouvelleAllergieTexte] = useState('')
    const [allergieSaving, setAllergieSaving] = useState(false)

    const [mesures, setMesures] = useState<SignesVitaux[]>([])
    const [mesuresLoading, setMesuresLoading] = useState(false)
    const [nouvelleMesure, setNouvelleMesure] = useState<Record<string, string>>({})
    const [mesureSaving, setMesureSaving] = useState(false)

    const [demandes, setDemandes] = useState<DemandeAnalyse[]>([])
    const [demandesLoading, setDemandesLoading] = useState(false)
    const [nouvelleDemande, setNouvelleDemande] = useState<{ type_analyse: TypeAnalyse; urgence: UrgenceAnalyse; notes_medecin: string }>({
        type_analyse: 'nfs', urgence: 'normale', notes_medecin: '',
    })
    const [demandeSaving, setDemandeSaving] = useState(false)

    const now = new Date()
    now.setSeconds(0, 0)
    const defaultDate = now.toISOString().slice(0, 16)

    const [form, setForm] = useState({
        type_evenement: 'consultation' as TypeEvenement,
        date: defaultDate,
        motif: navState.motif ?? '',
        symptomes: '',
        examens_realises: '', // ré-utilisé en UI comme "Plan d'action" — aucun nouveau champ backend
        diagnostic: '',
        ordonnance: '',
        notes: '',
        statut: 'planifiee' as ConsultationStatut,
    })

    useEffect(() => {
        if (!patientId) return
        getPatient(patientId).then(setPatient).catch(() => navigate('/dashboard'))
        getAntecedents(patientId).then(setAntecedents).catch(() => {})

        setMesuresLoading(true)
        getSignesVitaux(patientId).then(setMesures).catch(() => {}).finally(() => setMesuresLoading(false))

        setDemandesLoading(true)
        getDemandesPatient(patientId).then(setDemandes).catch(() => {}).finally(() => setDemandesLoading(false))

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
    const allergiesListe = useMemo(
        () => (patient?.allergies ?? '').split(',').map(s => s.trim()).filter(Boolean),
        [patient?.allergies]
    )
    const derniereMesureAvecPoids = useMemo(() => mesures.find(m => m.poids != null), [mesures])

    const candidatAntecedent = form.diagnostic.trim() || (
        form.type_evenement === 'operation' ? form.motif.trim() : ''
    )

    const [savedConsultId, setSavedConsultId] = useState<number | null>(
        !isNew && consultId ? Number(consultId) : null
    )
    const [showPlanifOp, setShowPlanifOp] = useState(false)

    const persist = async (statutOverride?: ConsultationStatut) => {
        const statutFinal = statutOverride ?? form.statut
        if (!form.motif.trim()) { setError('Le motif est obligatoire.'); return null }
        setSaving(true)
        setError('')
        try {
            const payload = {
                ...form,
                statut: statutFinal,
                date: form.date + ':00',
                patient: patientId,
                ...(isNew && navState.rdvOrigine ? { rdv_origine: navState.rdvOrigine } : {}),
            }
            let savedId: number
            if (isNew || !savedConsultId) {
                const created = await createConsultation(payload)
                savedId = created.id
            } else {
                const updated = await updateConsultation(savedConsultId, payload)
                savedId = updated.id
            }
            setSavedConsultId(savedId)
            setForm(prev => ({ ...prev, statut: statutFinal }))

            const aProposer = statutFinal === 'terminee'
                && candidatAntecedent
                && !antecedentsActuels.includes(candidatAntecedent)
            if (aProposer) {
                setTypeAntecedentChoisi(form.type_evenement === 'operation' ? 'chirurgie' : 'maladie_chronique')
                setAntecedentPropose(candidatAntecedent)
            } else if (statutFinal === 'terminee' || statutFinal === 'annulee') {
                navigate(`/patients/${patientId}`)
            }
            return savedId
        } catch {
            setError("Erreur lors de l'enregistrement.")
            return null
        } finally {
            setSaving(false)
        }
    }

    // Footer : "Suivant" enregistre l'onglet courant puis avance dans le
    // workflow ; sur le dernier onglet, termine directement la consultation.
    const ongletIndex = ONGLET_ORDER.findIndex(o => o.key === onglet)
    const estDernierOnglet = ongletIndex === ONGLET_ORDER.length - 1

    const handleSuivant = async () => {
        const savedId = await persist()
        if (savedId === null) return
        if (estDernierOnglet) {
            await persist('terminee')
        } else {
            setOnglet(ONGLET_ORDER[ongletIndex + 1].key)
        }
    }

    const handleEnregistrerBrouillon = async () => { await persist() }
    const handleTerminerPlusTard = async () => {
        const savedId = await persist()
        if (savedId !== null) navigate(`/patients/${patientId}`)
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

    const handleSaveMesure = async () => {
        setMesureSaving(true)
        try {
            const payload = Object.fromEntries(
                CHAMPS_CONSTANTES.map(c => [c.key, nouvelleMesure[c.key] ? Number(nouvelleMesure[c.key]) : null])
            )
            const created = await postSignesVitaux(patientId, { ...payload, date: new Date().toISOString() } as never)
            setMesures(prev => [created, ...prev])
            setNouvelleMesure({})
        } catch {
            setError("Erreur lors de l'enregistrement des constantes.")
        } finally {
            setMesureSaving(false)
        }
    }

    const handleCreateDemande = async () => {
        setDemandeSaving(true)
        try {
            const created = await createDemande({
                patient: patientId,
                consultation: savedConsultId ?? undefined,
                type_analyse: nouvelleDemande.type_analyse,
                urgence: nouvelleDemande.urgence,
                notes_medecin: nouvelleDemande.notes_medecin,
            })
            setDemandes(prev => [created, ...prev])
            setNouvelleDemande({ type_analyse: 'nfs', urgence: 'normale', notes_medecin: '' })
        } catch {
            setError("Erreur lors de la création de la demande d'analyse.")
        } finally {
            setDemandeSaving(false)
        }
    }

    const handleQuickAddAntecedent = async () => {
        if (!nouvelAntecedentTexte.trim()) return
        setAntecedentQuickSaving(true)
        try {
            const created = await createAntecedent({
                patient: patientId,
                libelle: nouvelAntecedentTexte.trim(),
                type_antecedent: 'autre',
                statut: 'actif',
                date_diagnostic: new Date().toISOString().slice(0, 10),
            })
            setAntecedents(prev => [created, ...prev])
            setNouvelAntecedentTexte('')
            setShowAddAntecedent(false)
        } catch {
            setError("Erreur lors de l'ajout de l'antécédent.")
        } finally {
            setAntecedentQuickSaving(false)
        }
    }

    const handleQuickAddAllergie = async () => {
        if (!nouvelleAllergieTexte.trim() || !patient) return
        setAllergieSaving(true)
        try {
            const nouvelleListe = [...allergiesListe, nouvelleAllergieTexte.trim()]
            const updated = await updatePatient(patientId, { allergies: nouvelleListe.join(', ') })
            setPatient(updated)
            setNouvelleAllergieTexte('')
            setShowAddAllergie(false)
        } catch {
            setError("Erreur lors de l'ajout de l'allergie.")
        } finally {
            setAllergieSaving(false)
        }
    }

    const mesuresDuJour = mesures.some(m => new Date(m.date).toDateString() === new Date().toDateString())
    const etapes: Etape[] = [
        { key: 'accueil',      label: 'Accueil',      fait: true },
        { key: 'constantes',   label: 'Constantes',   fait: mesuresDuJour },
        { key: 'consultation', label: 'Consultation', fait: form.statut === 'terminee' || form.statut === 'annulee' },
        { key: 'examens',      label: 'Examens',      fait: demandes.length > 0 },
        { key: 'prescription', label: 'Prescription', fait: form.ordonnance.trim() !== '' },
        { key: 'documents',    label: 'Documents',    fait: false, aVenir: true },
        { key: 'validation',   label: 'Validation',   fait: form.statut === 'terminee' },
    ]

    if (loading) return <SkeletonDetailPage />

    const statutCouleur = STATUT_COLORS[form.statut]

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--ht-bg)' }} onClick={() => showMenu && setShowMenu(false)}>
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

            {showPlanifOp && savedConsultId && (
                <PlanifierOperationModal
                    patientId={patientId}
                    consultationId={savedConsultId}
                    onClose={() => setShowPlanifOp(false)}
                    onCreated={() => navigate(`/patients/${patientId}`)}
                />
            )}

            {/* ===== BARRE UTILITAIRE ===== */}
            <div className="border-b" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="px-6 py-3 flex items-center gap-3">
                    <button onClick={() => navigate(`/patients/${patientId}`)}
                            className="text-sm flex items-center gap-1 transition-colors" style={{ color: 'var(--ht-text-muted)' }}>
                        <ChevronLeft size={16} />
                        {form.statut === 'en_cours' ? 'Consultation en cours' : 'Retour au dossier'}
                    </button>
                    <div className="ml-auto flex items-center gap-1 relative">
                        <button onClick={() => window.print()} title="Imprimer"
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--ht-bg)]">
                            <Printer size={16} style={{ color: 'var(--ht-text-muted)' }} />
                        </button>
                        {!isNew && (
                            <>
                                <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }} title="Plus d'options"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--ht-bg)]">
                                    <MoreVertical size={16} style={{ color: 'var(--ht-text-muted)' }} />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border shadow-lg py-1"
                                         style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}
                                         onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => { setShowMenu(false); setShowDelete(true) }}
                                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--ht-bg)]"
                                            style={{ color: 'var(--ht-danger)' }}
                                        >
                                            <Trash2 size={14} /> Supprimer cet événement
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ===== EN-TÊTE PATIENT ===== */}
                {patient && (
                    <div className="px-6 pb-4 flex flex-wrap items-center gap-4">
                        {patient.photo_path ? (
                            <img src={patient.photo_path} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg"
                                 style={{ backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary)' }}>
                                {patient.prenom[0]}{patient.nom[0]}
                            </div>
                        )}
                        <div className="flex-1 min-w-[220px]">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold" style={{ color: 'var(--ht-text)' }}>
                                    {patient.prenom} {patient.nom}
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                      style={{ backgroundColor: statutCouleur.bg, color: statutCouleur.text }}>
                                    {STATUT_LABELS[form.statut]}
                                </span>
                            </div>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                {patient.age ? `${patient.age} ans` : ''} · {patient.sexe === 'F' ? 'Femme' : 'Homme'}
                                {patient.numero_dossier ? ` · Dossier ${patient.numero_dossier}` : ''}
                            </p>
                            {patient.telephone && (
                                <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                    <Phone size={13} /> {patient.telephone}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-5 text-sm flex-shrink-0" style={{ color: 'var(--ht-text-secondary)' }}>
                            <span className="flex items-start gap-2">
                                <Clock size={16} className="mt-0.5" style={{ color: 'var(--ht-text-muted)' }} />
                                <span className="leading-tight">
                                    {new Date(form.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    <br />
                                    <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>
                                        {new Date(form.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </span>
                            </span>
                            {patient.service_nom && (
                                <span className="flex items-start gap-2">
                                    <Building2 size={16} className="mt-0.5" style={{ color: 'var(--ht-text-muted)' }} />
                                    <span className="leading-tight font-semibold" style={{ color: 'var(--ht-text)' }}>
                                        {patient.service_nom}
                                    </span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {form.statut === 'planifiee' && (
                                <button type="button" disabled={saving} onClick={() => persist('en_cours')} className="btn btn-primary gap-1.5">
                                    <Play size={14} /> Commencer la consultation
                                </button>
                            )}
                            {(form.statut === 'planifiee' || form.statut === 'en_cours') && (
                                <button type="button" disabled={saving} onClick={() => persist('annulee')} className="btn btn-secondary gap-1.5">
                                    <Ban size={14} /> Annuler
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-6">
                {error && <div className="ht-alert ht-alert-danger mb-4">{error}</div>}

                {/* ===== BARRE DE PROGRESSION ===== */}
                <div className="mb-6">
                    <BarreProgression etapes={etapes} ongletActif={onglet} />
                </div>

                {/* ===== ONGLETS ===== */}
                <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--ht-border)' }}>
                    {ONGLET_ORDER.map(t => {
                        const Icon = t.icon
                        const actif = onglet === t.key
                        return (
                            <button
                                key={t.key}
                                onClick={() => setOnglet(t.key)}
                                className="px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 -mb-px transition-colors flex-shrink-0"
                                style={{
                                    color: actif ? 'var(--ht-primary)' : 'var(--ht-text-muted)',
                                    borderColor: actif ? 'var(--ht-primary)' : 'transparent',
                                }}
                            >
                                <Icon size={15} /> {t.label}
                            </button>
                        )
                    })}
                </div>

                {/* ===== CORPS : contenu (gauche) + colonne latérale (droite) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        {onglet === 'consultation' && (
                            <>
                                <TypeSelector value={form.type_evenement} onChange={t => setForm(prev => ({ ...prev, type_evenement: t }))} />
                                {form.type_evenement === 'operation' && (
                                    savedConsultId ? (
                                        <button type="button" onClick={() => setShowPlanifOp(true)} className="btn btn-primary btn-sm">
                                            <Stethoscope size={13} /> Planifier l'opération
                                        </button>
                                    ) : (
                                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                            Enregistre d'abord la consultation pour pouvoir planifier l'opération.
                                        </p>
                                    )
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="ht-card ht-card-padded-sm">
                                        <CardTitle>Motif de la consultation</CardTitle>
                                        <textarea name="motif" value={form.motif} onChange={handleChange} rows={4}
                                                  placeholder="Ex : Douleurs abdominales depuis 3 jours…" className="ht-input ht-textarea" />
                                    </div>

                                    <div className="ht-card ht-card-padded-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <CardTitle>Antécédents médicaux connus</CardTitle>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {antecedents.length === 0 && !showAddAntecedent && (
                                                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun antécédent renseigné</p>
                                            )}
                                            {antecedents.map(a => (
                                                <span key={a.id} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${TYPE_ANTECEDENT_COLORS[a.type_antecedent]}`}
                                                      style={{ opacity: a.statut === 'resolu' ? 0.5 : 1 }}
                                                      title={a.statut === 'resolu' ? 'Résolu' : 'Actif'}>
                                                    {a.libelle}
                                                </span>
                                            ))}
                                            {showAddAntecedent ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        autoFocus
                                                        value={nouvelAntecedentTexte}
                                                        onChange={e => setNouvelAntecedentTexte(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleQuickAddAntecedent()}
                                                        placeholder="Nouvel antécédent…"
                                                        className="ht-input text-xs py-1.5 px-2 w-40"
                                                    />
                                                    <button onClick={handleQuickAddAntecedent} disabled={antecedentQuickSaving}
                                                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                                            style={{ backgroundColor: 'var(--ht-primary)', color: 'white' }}>
                                                        <Check size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowAddAntecedent(true)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0 transition-colors hover:bg-[var(--ht-bg)]"
                                                        style={{ borderColor: 'var(--ht-border-input)', color: 'var(--ht-text-muted)' }}>
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ht-card ht-card-padded-sm">
                                        <CardTitle>Allergies</CardTitle>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {allergiesListe.length === 0 && !showAddAllergie && (
                                                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune allergie connue</p>
                                            )}
                                            {allergiesListe.map((al, i) => (
                                                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1"
                                                      style={{ borderColor: 'var(--ht-danger)', backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                                                    <AlertTriangle size={11} /> {al}
                                                </span>
                                            ))}
                                            {showAddAllergie ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        autoFocus
                                                        value={nouvelleAllergieTexte}
                                                        onChange={e => setNouvelleAllergieTexte(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleQuickAddAllergie()}
                                                        placeholder="Nouvelle allergie…"
                                                        className="ht-input text-xs py-1.5 px-2 w-36"
                                                    />
                                                    <button onClick={handleQuickAddAllergie} disabled={allergieSaving}
                                                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                                            style={{ backgroundColor: 'var(--ht-primary)', color: 'white' }}>
                                                        <Check size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowAddAllergie(true)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0 transition-colors hover:bg-[var(--ht-bg)]"
                                                        style={{ borderColor: 'var(--ht-border-input)', color: 'var(--ht-text-muted)' }}>
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ht-card ht-card-padded-sm">
                                        <CardTitle>Traitements en cours</CardTitle>
                                        <p className="text-sm italic" style={{ color: 'var(--ht-text-muted)' }}>
                                            Non disponible pour le moment — arrivera avec l'onglet Prescription historisé.
                                        </p>
                                    </div>
                                </div>

                                <div className="ht-card ht-card-padded-sm">
                                    <CardTitle>Observations cliniques</CardTitle>
                                    <textarea name="symptomes" value={form.symptomes} onChange={handleChange} rows={4}
                                              placeholder="Patiente consciente et orientée. Douleurs à la palpation…"
                                              className="ht-input ht-textarea" />
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor: 'var(--ht-border)' }}>
                                        {[Bold, Italic, Underline, List, ListOrdered].map((Icon, i) => (
                                            <button key={i} type="button" tabIndex={-1}
                                                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-[var(--ht-bg)]"
                                                    style={{ color: 'var(--ht-text-muted)' }}>
                                                <Icon size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="ht-card ht-card-padded-sm">
                                        <CardTitle>Diagnostic (provisoire)</CardTitle>
                                        <textarea name="diagnostic" value={form.diagnostic} onChange={handleChange} rows={3}
                                                  placeholder="Suspicion d'appendicite…" className="ht-input ht-textarea" />
                                        <p className="text-xs mt-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                            Rempli + statut "Terminée" → proposé aux antécédents du patient.
                                        </p>
                                    </div>
                                    <div className="ht-card ht-card-padded-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <CardTitle>Plan d'action</CardTitle>
                                            <ChevronDown size={14} style={{ color: 'var(--ht-text-muted)' }} />
                                        </div>
                                        <textarea name="examens_realises" value={form.examens_realises} onChange={handleChange} rows={3}
                                                  placeholder="Échographie abdominale + NFS + CRP. Réévaluation après résultats…"
                                                  className="ht-input ht-textarea" />
                                    </div>
                                </div>

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
                            </>
                        )}

                        {onglet === 'constantes' && (
                            <>
                                <div className="ht-card ht-card-padded-sm">
                                    <CardTitle>Nouvelle mesure</CardTitle>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {CHAMPS_CONSTANTES.map(champ => {
                                            const Icon = champ.icon
                                            return (
                                                <div key={champ.key} className="ht-field">
                                                    <FieldLabel>
                                                        <span className="flex items-center gap-1"><Icon size={12} /> {champ.label}</span>
                                                    </FieldLabel>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step={champ.step}
                                                            value={nouvelleMesure[champ.key] ?? ''}
                                                            onChange={e => setNouvelleMesure(prev => ({ ...prev, [champ.key]: e.target.value }))}
                                                            className="ht-input pr-14"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                                            {champ.unite}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <button type="button" disabled={mesureSaving} onClick={handleSaveMesure} className="btn btn-primary btn-sm gap-1.5 mt-4">
                                        <Plus size={14} /> {mesureSaving ? 'Enregistrement…' : 'Enregistrer les constantes'}
                                    </button>
                                </div>

                                <div className="ht-card ht-card-padded-sm">
                                    <CardTitle>Historique récent</CardTitle>
                                    {mesuresLoading ? (
                                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                                    ) : mesures.length === 0 ? (
                                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune mesure enregistrée pour ce patient.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {mesures.slice(0, 8).map(m => (
                                                <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm py-2 border-b last:border-0"
                                                     style={{ borderColor: 'var(--ht-border)' }}>
                                                    <span className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--ht-text-muted)' }}>
                                                        {new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                    </span>
                                                    {m.tension_systolique && m.tension_diastolique && (
                                                        <span style={{ color: 'var(--ht-text)' }}>TA {m.tension_systolique}/{m.tension_diastolique} mmHg</span>
                                                    )}
                                                    {m.frequence_cardiaque && <span style={{ color: 'var(--ht-text)' }}>{m.frequence_cardiaque} bpm</span>}
                                                    {m.temperature && <span style={{ color: 'var(--ht-text)' }}>{m.temperature}°C</span>}
                                                    {m.glycemie && <span style={{ color: 'var(--ht-text)' }}>{m.glycemie} mmol/L</span>}
                                                    {m.poids && <span style={{ color: 'var(--ht-text)' }}>{m.poids} kg</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {onglet === 'examens' && (
                            <>
                                <div className="ht-card ht-card-padded-sm">
                                    <CardTitle>Nouvelle demande d'analyse</CardTitle>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="ht-field">
                                            <FieldLabel>Type d'analyse</FieldLabel>
                                            <select value={nouvelleDemande.type_analyse}
                                                    onChange={e => setNouvelleDemande(prev => ({ ...prev, type_analyse: e.target.value as TypeAnalyse }))}
                                                    className="ht-input">
                                                {(Object.entries(TYPE_ANALYSE_LABELS) as [TypeAnalyse, string][]).map(([k, label]) => (
                                                    <option key={k} value={k}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="ht-field">
                                            <FieldLabel>Urgence</FieldLabel>
                                            <select value={nouvelleDemande.urgence}
                                                    onChange={e => setNouvelleDemande(prev => ({ ...prev, urgence: e.target.value as UrgenceAnalyse }))}
                                                    className="ht-input">
                                                <option value="normale">Normale</option>
                                                <option value="urgente">Urgente</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ht-field mt-4">
                                        <FieldLabel>Notes pour le laborantin</FieldLabel>
                                        <textarea value={nouvelleDemande.notes_medecin}
                                                  onChange={e => setNouvelleDemande(prev => ({ ...prev, notes_medecin: e.target.value }))}
                                                  rows={2} placeholder="Contexte clinique, éléments à vérifier…" className="ht-input ht-textarea" />
                                    </div>
                                    <button type="button" disabled={demandeSaving} onClick={handleCreateDemande} className="btn btn-primary btn-sm gap-1.5 mt-4">
                                        <Plus size={14} /> {demandeSaving ? 'Création…' : 'Créer la demande'}
                                    </button>
                                </div>

                                <div className="ht-card ht-card-padded-sm">
                                    <CardTitle>Demandes de ce patient</CardTitle>
                                    {demandesLoading ? (
                                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                                    ) : demandes.length === 0 ? (
                                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucune demande d'analyse pour ce patient.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {demandes.map(d => {
                                                const c = STATUT_ANALYSE_COLORS[d.statut] ?? STATUT_ANALYSE_COLORS.en_attente
                                                return (
                                                    <div key={d.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b last:border-0"
                                                         style={{ borderColor: 'var(--ht-border)' }}>
                                                        <div>
                                                            <p className="font-medium" style={{ color: 'var(--ht-text)' }}>
                                                                {d.type_label ?? TYPE_ANALYSE_LABELS[d.type_analyse]}
                                                            </p>
                                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                                                {new Date(d.date_demande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                                                              style={{ backgroundColor: c.bg, color: c.text }}>
                                                            {d.statut_label ?? d.statut}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {onglet === 'prescription' && (
                            <div className="ht-card ht-card-padded-sm">
                                <CardTitle>Ordonnance</CardTitle>
                                <textarea name="ordonnance" value={form.ordonnance} onChange={handleChange} rows={10}
                                          placeholder="Médicaments, posologie, durée du traitement…" className="ht-input ht-textarea" />
                            </div>
                        )}

                        {onglet === 'documents' && (
                            <div className="ht-card ht-card-padded-sm text-center py-16">
                                <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>Génération de documents à venir</p>
                                <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--ht-text-muted)' }}>
                                    Ordonnances, certificats et comptes rendus générés automatiquement à partir de cette consultation — prochaine phase du projet.
                                </p>
                            </div>
                        )}

                        {onglet === 'notes' && (
                            <div className="ht-card ht-card-padded-sm">
                                <CardTitle>Notes</CardTitle>
                                <textarea name="notes" value={form.notes} onChange={handleChange} rows={10}
                                          placeholder="Observations complémentaires, remarques internes…" className="ht-input ht-textarea" />
                            </div>
                        )}
                    </div>

                    {/* ===== COLONNE LATÉRALE ===== */}
                    {patient && (
                        <div className="space-y-6">
                            <div className="ht-card ht-card-padded-sm">
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                    <ClipboardList size={15} style={{ color: 'var(--ht-primary)' }} /> Résumé du patient
                                </h3>
                                <div className="space-y-2.5 text-sm">
                                    {[
                                        ['Groupe sanguin', patient.groupe_sanguin || '—'],
                                        ['Poids', derniereMesureAvecPoids?.poids ? `${derniereMesureAvecPoids.poids} kg` : '—'],
                                        ['Nom contact', patient.contact_urgence_nom || '—'],
                                        ['Téléphone contact', patient.contact_urgence_telephone || '—'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span style={{ color: 'var(--ht-text-muted)' }}>{label}</span>
                                            <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ht-card ht-card-padded-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                        <Folder size={15} style={{ color: 'var(--ht-primary)' }} /> Documents récents
                                    </h3>
                                </div>
                                <div className="text-center py-6">
                                    <Download size={20} className="mx-auto mb-2" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        Aucun document généré pour l'instant.
                                    </p>
                                </div>
                            </div>

                            <div className="ht-card ht-card-padded-sm">
                                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-text)' }}>Raccourcis</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setOnglet('prescription')}
                                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors"
                                            style={{ borderColor: 'var(--ht-success)', backgroundColor: 'var(--ht-success-bg)', color: 'var(--ht-success)' }}>
                                        <Pill size={13} /> Ordonnance
                                    </button>
                                    <button onClick={() => setOnglet('examens')}
                                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors"
                                            style={{ borderColor: 'var(--ht-primary)', backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary)' }}>
                                        <FlaskConical size={13} /> Demande d'examen
                                    </button>
                                    <button onClick={() => setOnglet('documents')}
                                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors"
                                            style={{ borderColor: '#a78bfa', backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                                        <Award size={13} /> Certificat médical
                                    </button>
                                    <button onClick={() => setOnglet('documents')}
                                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors"
                                            style={{ borderColor: 'var(--ht-danger)', backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                                        <FileWarning size={13} /> Arrêt de travail
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== FOOTER STICKY ===== */}
            <div className="sticky bottom-0 border-t px-6 py-3 flex items-center justify-between gap-3"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <button type="button" onClick={handleEnregistrerBrouillon} disabled={saving} className="btn btn-secondary gap-1.5">
                    <FileText size={14} /> Enregistrer le brouillon
                </button>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={handleTerminerPlusTard} disabled={saving} className="btn btn-secondary">
                        Terminer plus tard
                    </button>
                    <button type="button" onClick={handleSuivant} disabled={saving} className="btn btn-primary gap-1.5">
                        {saving ? 'Enregistrement…' : estDernierOnglet ? 'Terminer la consultation' : 'Suivant'}
                        {!estDernierOnglet && <span aria-hidden>→</span>}
                    </button>
                </div>
            </div>
        </div>
    )
}