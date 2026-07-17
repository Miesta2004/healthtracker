import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { updatePatient, deletePatient } from '../api/patients'
import { createAntecedent, updateAntecedent, deleteAntecedent } from '../api/antecedents'
import { dateNaissanceDepuisAge } from '../utils/dateNaissance'
import type { Patient, Consultation, Antecedent, TypeAntecedent, StatutAntecedent, Alerte, StatutAlerte } from '../types'
import SignesVitauxCharts from '../components/SignesCharts'
import Consultations from '../components/Consultations'
import { updateAlerteStatut } from '../api/alertes'
import { createDemande } from '../api/analyses'
import type { DemandeAnalyse, TypeAnalyse, UrgenceAnalyse } from '../types'
import { createAssignation, deleteAssignation } from '../api/disponibilites'
import type { RendezVous, PassageUrgence, Hospitalisation, AssignationPatient, Shift } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonDetailPage, SkeletonListRows } from '../components/Skeleton'
import Sidebar from '../components/Sidebar.tsx'
import GraviteBadge from '../components/GraviteBadge'
import {computeGravite} from '../utils/gravite'
import { usePatientDossier, usePatientAssignations, type PatientDossierSectionErrors } from '../hooks/usePatientDossier'
import {
    Activity, Trash2, Edit3, X, Plus, ArrowLeft, ChevronRight,
    User, Stethoscope, AlertTriangle, Bell, Calendar, Check,
    Droplet, Thermometer, Heart, FileText, RefreshCw, type LucideIcon
} from 'lucide-react'

// ─── Config analyses ────────────────────────────────────────────────────────
const TYPES_ANALYSE: { value: TypeAnalyse; label: string }[] = [
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

// ─── Config statuts → classes badge-* (définies dans index.css) ─────────────
const STATUT_ANALYSE_CONFIG: Record<string, { label: string; badge: string }> = {
    en_attente: { label: 'En attente', badge: 'badge-warning' },
    en_cours:   { label: 'En cours',   badge: 'badge-tint' },
    terminee:   { label: 'Terminée',   badge: 'badge-success' },
    annulee:    { label: 'Annulée',    badge: 'badge-muted' },
}

const STATUT_RDV_CONFIG: Record<string, { label: string; badge: string }> = {
    planifie: { label: 'Planifié', badge: 'badge-warning' },
    confirme: { label: 'Confirmé', badge: 'badge-tint' },
    termine:  { label: 'Terminé',  badge: 'badge-success' },
    annule:   { label: 'Annulé',   badge: 'badge-muted' },
}

const STATUT_URGENCE_CONFIG: Record<string, { label: string; badge: string }> = {
    en_attente:      { label: 'En attente',      badge: 'badge-warning' },
    en_consultation: { label: 'En consultation', badge: 'badge-tint' },
    sorti:           { label: 'Sorti',           badge: 'badge-muted' },
}

// Corrigé : les clés correspondent désormais au type StatutHospitalisation réel
// ('terminee' / 'transferee'), pas aux anciennes clés 'sortie' / 'transfert'
// qui ne matchaient jamais et retombaient silencieusement sur le badge gris générique.
const STATUT_HOSPIT_CONFIG: Record<string, { label: string; badge: string }> = {
    en_cours:   { label: 'En cours',         badge: 'badge-tint' },
    terminee:   { label: 'Sortie effectuée', badge: 'badge-success' },
    transferee: { label: 'Transféré',        badge: 'badge-warning' },
}

const SHIFT_LABELS: Record<Shift, string> = {
    matin:      'Matin (7h–15h)',
    apres_midi: 'Après-midi (15h–23h)',
    nuit:       'Nuit (23h–7h)',
}

// ─── Sections du dossier → libellés FR pour la bannière d'erreurs partielles ─
const SECTION_LABELS: Record<keyof PatientDossierSectionErrors, string> = {
    signes: 'signes vitaux',
    antecedents: 'antécédents',
    consultations: 'consultations',
    demandes: 'analyses de laboratoire',
    rdvs: 'rendez-vous',
    urgences: 'passages aux urgences',
    hospitalisations: 'hospitalisations',
    alertes: 'alertes',
}

function StatutMini({ statut, config }: { statut: string; config: Record<string, { label: string; badge: string }> }) {
    const cfg = config[statut] ?? { label: statut, badge: 'badge-muted' }
    return (
        <span className={`badge ${cfg.badge} flex-shrink-0 uppercase tracking-wide text-[10px] font-semibold`}>
            {cfg.label}
        </span>
    )
}

// ─── Types d'antécédents ───────────────────────────────────────────────────────
const TYPE_ANTECEDENT_LABELS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'Maladie chronique',
    chirurgie:         'Chirurgie',
    allergie:          'Allergie',
    familial:          'Antécédent familial',
    autre:             'Autre',
}

// Couleurs douces en thème clair, cohérentes avec la palette ht-*
const TYPE_ANTECEDENT_COLORS: Record<TypeAntecedent, string> = {
    maladie_chronique: 'border-[var(--ht-primary)] bg-[var(--ht-primary-tint-bg)] text-[var(--ht-primary)]',
    chirurgie:         'border-orange-100 bg-orange-50 text-orange-700',
    allergie:          'border-[var(--ht-danger)] bg-[var(--ht-danger-bg)] text-[var(--ht-danger)]',
    familial:          'border-purple-100 bg-purple-50 text-purple-700',
    autre:             'border-[var(--ht-border-input)] bg-[var(--ht-bg)] text-[var(--ht-text-secondary)]',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dateStr: string) {
    if (!dateStr) return 0
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

function formatDateHeure(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

// ─── Section info simple ──────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="ht-info-row flex-col items-start gap-0.5">
            <p className="ht-label mb-0">{label}</p>
            <p className={`text-sm font-semibold ${mono ? 'ht-mono' : ''}`} style={{ color: 'var(--ht-text)' }}>{value || '—'}</p>
        </div>
    )
}

// ─── Bannière d'erreurs partielles (sections en échec, patient chargé) ──────
function SectionErrorsBanner({ errors, onRetry }: { errors: PatientDossierSectionErrors; onRetry: () => void }) {
    const failedKeys = (Object.keys(errors) as (keyof PatientDossierSectionErrors)[]).filter(k => errors[k])
    if (failedKeys.length === 0) return null

    const labels = failedKeys.map(k => SECTION_LABELS[k]).join(', ')

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
             style={{ backgroundColor: 'var(--ht-danger-bg-light)', border: '1px solid var(--ht-danger)' }}>
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}>
                <AlertTriangle size={15} className="flex-shrink-0" />
                Certaines sections n'ont pas pu être chargées : {labels}.
            </p>
            <button onClick={onRetry} className="btn btn-secondary btn-sm flex-shrink-0">
                <RefreshCw size={12} /> Réessayer
            </button>
        </div>
    )
}

// ─── Modal de confirmation suppression ───────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel, loading }: {
    name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                    <Trash2 size={24} />
                </div>
                <h3 className="ht-modal-title">Supprimer le dossier ?</h3>
                <p className="ht-modal-subtitle">
                    Le dossier de <strong>{name}</strong> sera supprimé définitivement. Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-secondary flex-1 justify-center">
                        Annuler
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1 justify-center">
                        {loading ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal d'ajout d'un antécédent manuel ────────────────────────────────────
function AddAntecedentModal({ onSave, onCancel, loading }: {
    onSave: (data: { libelle: string; type_antecedent: TypeAntecedent; observations: string; date_diagnostic: string }) => void
    onCancel: () => void
    loading: boolean
}) {
    const [libelle, setLibelle] = useState('')
    const [type, setType] = useState<TypeAntecedent>('maladie_chronique')
    const [observations, setObservations] = useState('')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-md space-y-4">
                <h3 className="ht-modal-title mb-2">Ajouter un antécédent</h3>
                <div className="space-y-4">
                    <div className="ht-field">
                        <label className="ht-label">Libellé *</label>
                        <input value={libelle} onChange={e => setLibelle(e.target.value)}
                               placeholder="Ex : Diabète type 2"
                               className="ht-input"
                        />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Catégorie</label>
                        <select value={type} onChange={e => setType(e.target.value as TypeAntecedent)}
                                className="ht-input"
                        >
                            {(Object.entries(TYPE_ANTECEDENT_LABELS) as [TypeAntecedent, string][]).map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Date de diagnostic</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                               className="ht-input"
                        />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Observations</label>
                        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2}
                                  placeholder="Détails complémentaires..."
                                  className="ht-input ht-textarea"
                        />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel} className="btn btn-secondary flex-1 justify-center">
                        Annuler
                    </button>
                    <button
                        onClick={() => onSave({ libelle: libelle.trim(), type_antecedent: type, observations, date_diagnostic: date })}
                        disabled={!libelle.trim() || loading}
                        className="btn btn-primary flex-1 justify-center"
                    >
                        {loading ? 'Ajout...' : 'Ajouter'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Panneau Antécédents (liste + actions) ───────────────────────────────────
function AntecedentsPanel({ antecedents, onAdd, onToggleStatut, onDelete, loading }: {
    antecedents: Antecedent[]
    onAdd: () => void
    onToggleStatut: (a: Antecedent) => void
    onDelete: (a: Antecedent) => void
    loading: boolean
}) {
    const actifs = antecedents.filter(a => a.statut === 'actif')

    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="ht-card-header !px-0 !pt-0 mb-4">
                <h2 className="flex-1">Antécédents médicaux</h2>
                <div className="flex items-center gap-2">
                    {!loading && actifs.length > 0 && (
                        <span className="badge badge-tint">
                            {actifs.length} actif{actifs.length > 1 ? 's' : ''}
                        </span>
                    )}
                    <button onClick={onAdd} className="btn btn-secondary btn-sm">
                        <Plus size={12} /> Ajouter
                    </button>
                </div>
            </div>
            {loading ? (
                <SkeletonListRows rows={2} />
            ) : antecedents.length === 0 ? (
                <div className="ht-empty">Aucun antécédent renseigné</div>
            ) : (
                <div className="space-y-2.5">
                    {antecedents.map(a => (
                        <div key={a.id} className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border ${TYPE_ANTECEDENT_COLORS[a.type_antecedent]}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold">{a.libelle}</span>
                                    <span className="text-[10px] uppercase tracking-wider opacity-70 font-medium">
                                        {TYPE_ANTECEDENT_LABELS[a.type_antecedent]}
                                    </span>
                                </div>
                                {a.observations && <p className="text-xs opacity-80 mt-1">{a.observations}</p>}
                                <p className="text-[11px] opacity-60 mt-0.5">
                                    Diagnostic : {new Date(a.date_diagnostic).toLocaleDateString('fr-FR')}
                                    {a.consultation_source && ' · Via consultation'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => onToggleStatut(a)}
                                        className={`badge ${a.statut === 'actif' ? 'badge-danger' : 'badge-muted'} cursor-pointer`}>
                                    {a.statut === 'actif' ? 'Actif' : 'Résolu'}
                                </button>
                                <button onClick={() => onDelete(a)} className="p-1 rounded-md hover:bg-black/5 transition-colors" style={{ color: 'var(--ht-text-muted)' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Panel historique des analyses ────────────────────────────────────────────
function AnalysesPanel({ demandes, canRequest, onRequest, onVoirResultats, loading }: {
    demandes: DemandeAnalyse[]
    canRequest: boolean
    onRequest: () => void
    onVoirResultats: (d: DemandeAnalyse) => void
    loading: boolean
}) {
    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="ht-card-header !px-0 !pt-0 mb-4">
                <h2 className="flex-1">Analyses de laboratoire</h2>
                <div className="flex items-center gap-2">
                    {!loading && demandes.length > 0 && (
                        <span className="badge badge-muted">{demandes.length}</span>
                    )}
                    {canRequest && (
                        <button onClick={onRequest} className="btn btn-secondary btn-sm">
                            <Plus size={12} /> Demander
                        </button>
                    )}
                </div>
            </div>
            {loading ? (
                <SkeletonListRows rows={2} />
            ) : demandes.length === 0 ? (
                <div className="ht-empty">Aucune demande d'analyse</div>
            ) : (
                <div className="space-y-2.5">
                    {demandes.map(d => {
                        const isTerminee = d.statut === 'terminee'
                        return (
                            <div key={d.id}
                                 onClick={() => isTerminee && onVoirResultats(d)}
                                 className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border ${isTerminee ? 'cursor-pointer hover:border-[var(--ht-border-input)] transition-colors' : ''}`}
                                 style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{d.type_label || d.type_analyse}</span>
                                        {d.urgence === 'urgente' && (
                                            <span className="badge badge-danger text-[9px] uppercase tracking-wide">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                        Le {new Date(d.date_demande).toLocaleDateString('fr-FR')} {d.demandeur_nom && `· Dr. ${d.demandeur_nom}`}
                                    </p>
                                </div>
                                <StatutMini statut={d.statut} config={STATUT_ANALYSE_CONFIG} />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Icônes par type d'alerte ─────────────────────────────────────────────────
const ALERTE_TYPE_ICON: Record<string, LucideIcon> = {
    tension: Activity, glycemie: Droplet, temperature: Thermometer,
    frequence: Heart, rdv: Calendar, resultat_analyse: FileText, autre: Bell,
}

// ─── Onglet Alertes ───────────────────────────────────────────────────────────
function AlertesTab({ alertes, onUpdateStatut, loading }: { alertes: Alerte[]; onUpdateStatut: (a: Alerte) => void; loading: boolean }) {
    if (loading) return <SkeletonListRows rows={2} />
    if (alertes.length === 0) return <div className="ht-empty">Aucune alerte pour ce patient.</div>
    const tries = [...alertes].sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
    return (
        <div className="space-y-2.5">
            {tries.map(a => {
                const Icon = ALERTE_TYPE_ICON[a.type] || Bell
                const color = a.statut === 'non_lue' ? 'var(--ht-coral)' : a.statut === 'lue' ? 'var(--ht-amber)' : 'var(--ht-teal)'
                return (
                    <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl border" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                            <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm" style={{ color: 'var(--ht-text)' }}>{a.message}</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                                {a.type_label || a.type} · {formatDateHeure(a.date_creation)}
                            </p>
                        </div>
                        <button
                            onClick={() => onUpdateStatut(a)}
                            disabled={a.statut === 'traitee'}
                            className="btn btn-ghost btn-sm flex-shrink-0"
                        >
                            {a.statut === 'non_lue' && 'Marquer lue'}
                            {a.statut === 'lue' && 'Marquer traitée'}
                            {a.statut === 'traitee' && <span className="flex items-center gap-1"><Check size={12} /> Traitée</span>}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Carte unifiée Alertes / Consultations / Rendez-vous ────────────────────
type SuiviTab = 'alertes' | 'consultations' | 'rdv'

function SuiviPatientTabs({
                              alertes, alertesLoading, onUpdateAlerteStatut, patientId,
                              consultations, consultationsLoading, onConsultationsUpdate,
                              rendezVous, rdvsLoading, onVoirAgenda,
                          }: {
    alertes: Alerte[]
    alertesLoading: boolean
    onUpdateAlerteStatut: (a: Alerte) => void
    patientId: number
    consultations: Consultation[]
    consultationsLoading: boolean
    onConsultationsUpdate: (c: Consultation[]) => void
    rendezVous: RendezVous[]
    rdvsLoading: boolean
    onVoirAgenda: () => void
}) {
    const [tab, setTab] = useState<SuiviTab>('alertes')
    const nonLues = alertes.filter(a => a.statut === 'non_lue').length
    const rdvTries = [...rendezVous].sort((a, b) => new Date(b.date_heure).getTime() - new Date(a.date_heure).getTime())
    const TabButton = ({ value, icon: Icon, label, count, danger }: { value: SuiviTab; icon: LucideIcon; label: string; count: number; danger?: boolean }) => (
        <button
            onClick={() => setTab(value)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors"
            style={{
                color: tab === value ? 'var(--ht-text)' : 'var(--ht-text-muted)',
                borderBottom: tab === value ? '2px solid var(--ht-primary)' : '2px solid transparent',
            }}
        >
            <Icon size={13} /> {label}
            {count > 0 && (
                <span className={`badge ${danger ? 'badge-danger' : 'badge-muted'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {count}
                </span>
            )}
        </button>
    )

    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="flex items-center gap-1 mb-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                <TabButton value="alertes" icon={Bell} label="Alertes" count={nonLues} danger />
                <TabButton value="consultations" icon={Stethoscope} label="Consultations" count={consultations.length} />
                <TabButton value="rdv" icon={Calendar} label="Rendez-vous" count={rendezVous.length} />
            </div>

            {tab === 'alertes' && <AlertesTab alertes={alertes} onUpdateStatut={onUpdateAlerteStatut} loading={alertesLoading} />}

            {tab === 'consultations' && (
                consultationsLoading
                    ? <SkeletonListRows rows={2} />
                    : <Consultations patientId={patientId} consultations={consultations} onUpdate={onConsultationsUpdate} />
            )}

            {tab === 'rdv' && (
                <>
                    {rdvsLoading ? (
                        <SkeletonListRows rows={2} />
                    ) : rdvTries.length === 0 ? (
                        <div className="ht-empty">Aucun rendez-vous enregistré</div>
                    ) : (
                        <div className="space-y-2.5">
                            {rdvTries.map(r => (
                                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{r.motif}</p>
                                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{formatDateHeure(r.date_heure)}</p>
                                    </div>
                                    <StatutMini statut={r.statut} config={STATUT_RDV_CONFIG} />
                                </div>
                            ))}
                        </div>
                    )}
                    {rdvTries.length > 0 && (
                        <div className="text-right mt-3">
                            <button onClick={onVoirAgenda} className="text-xs font-medium inline-flex items-center gap-0.5" style={{ color: 'var(--ht-primary)' }}>
                                Voir l'agenda complet <ChevronRight size={13} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ─── Panel historique des passages aux urgences ──────────────────────────────
function UrgencesPanel({ passages, loading }: { passages: PassageUrgence[]; loading: boolean }) {
    const tries = [...passages].sort((a, b) => new Date(b.date_arrivee).getTime() - new Date(a.date_arrivee).getTime())
    return (
        <div className="ht-card ht-card-padded-sm">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Passages aux urgences</h2>
            {loading ? (
                <SkeletonListRows rows={2} />
            ) : tries.length === 0 ? (
                <div className="ht-empty">Aucun passage aux urgences</div>
            ) : (
                <div className="space-y-2.5">
                    {tries.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{p.motif}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    {formatDateHeure(p.date_arrivee)} {p.medecin_nom && `· Dr. ${p.medecin_nom}`}
                                </p>
                            </div>
                            <StatutMini statut={p.statut} config={STATUT_URGENCE_CONFIG} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Panel assignation infirmier(ère) ↔ patient (chef de service) ───────────
function AssignationsPanel({ assignations, infirmiers, onAssign, onDelete, loading }: {
    assignations: AssignationPatient[]
    infirmiers: { id: number; prenom: string; nom: string }[]
    onAssign: (data: { infirmier: number; date: string; shift: Shift }) => void
    onDelete: (a: AssignationPatient) => void
    loading: boolean
}) {
    const [showForm, setShowForm] = useState(false)
    const [infirmierId, setInfirmierId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [shift, setShift] = useState<Shift>('matin')

    const tries = [...assignations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="ht-card ht-card-padded-sm">
            <div className="ht-card-header !px-0 !pt-0 mb-4">
                <h2 className="flex-1">Infirmiers assignés</h2>
                <button onClick={() => setShowForm(p => !p)} className="btn btn-secondary btn-sm">
                    <Plus size={12} /> Assigner
                </button>
            </div>

            {showForm && (
                <div className="mb-4 p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--ht-bg)', border: '1px solid var(--ht-border-input)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="ht-field">
                            <label className="ht-label">Infirmier(ère)</label>
                            <select value={infirmierId} onChange={e => setInfirmierId(e.target.value)} className="ht-input">
                                <option value="">Sélectionner</option>
                                {infirmiers.map(i => (
                                    <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
                                ))}
                            </select>
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="ht-input" />
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">Poste</label>
                            <select value={shift} onChange={e => setShift(e.target.value as Shift)} className="ht-input">
                                {(Object.entries(SHIFT_LABELS) as [Shift, string][]).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Annuler</button>
                        <button
                            onClick={() => { if (infirmierId) { onAssign({ infirmier: Number(infirmierId), date, shift }); setShowForm(false); setInfirmierId('') } }}
                            disabled={!infirmierId || loading}
                            className="btn btn-primary btn-sm"
                        >
                            {loading ? 'Assignation…' : 'Confirmer'}
                        </button>
                    </div>
                    {infirmiers.length === 0 && (
                        <p className="text-xs" style={{ color: 'var(--ht-danger)' }}>
                            Aucun(e) infirmier(ère) dans ton service.
                        </p>
                    )}
                </div>
            )}

            {tries.length === 0 ? (
                <div className="ht-empty">Aucune assignation enregistrée</div>
            ) : (
                <div className="space-y-2.5">
                    {tries.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{a.infirmier_prenom} {a.infirmier_nom}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    {formatDate(a.date)} · {a.shift_label}
                                </p>
                            </div>
                            <button onClick={() => onDelete(a)} className="p-1 rounded-md hover:bg-black/5 transition-colors" style={{ color: 'var(--ht-text-muted)' }}>
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Panel historique des hospitalisations ───────────────────────────────────
function HospitalisationsPanel({ hospitalisations, loading }: { hospitalisations: Hospitalisation[]; loading: boolean }) {
    const tries = [...hospitalisations].sort((a, b) => new Date(b.date_admission).getTime() - new Date(a.date_admission).getTime())
    return (
        <div className="ht-card ht-card-padded-sm">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>Hospitalisations</h2>
            {loading ? (
                <SkeletonListRows rows={2} />
            ) : tries.length === 0 ? (
                <div className="ht-empty">Aucune hospitalisation enregistrée</div>
            ) : (
                <div className="space-y-2.5">
                    {tries.map(h => (
                        <div key={h.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{h.motif_admission || 'Motif non précisé'}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                    {h.service_nom && `${h.service_nom} `}
                                    {h.chambre && `· Ch. ${h.chambre}`}{h.lit && ` · Lit ${h.lit}`}
                                </p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    Admis le {formatDate(h.date_admission)}
                                    {h.date_sortie && ` · Sorti le ${formatDate(h.date_sortie)}`}
                                </p>
                            </div>
                            <StatutMini statut={h.statut} config={STATUT_HOSPIT_CONFIG} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Modale : demander une analyse (patient déjà connu) ───────────────────────
function DemandeAnalyseModal({ onSave, onCancel, loading, error }: {
    onSave: (data: { type_analyse: TypeAnalyse; urgence: UrgenceAnalyse; notes_medecin: string }) => void
    onCancel: () => void
    loading: boolean
    error: string
}) {
    const [typeAnalyse, setTypeAnalyse] = useState<TypeAnalyse>('nfs')
    const [urgence, setUrgence] = useState<UrgenceAnalyse>('normale')
    const [notes, setNotes] = useState('')

    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-lg space-y-4">
                <h3 className="ht-modal-title">Demander une analyse</h3>

                <div className="ht-field">
                    <label className="ht-label">Type d'analyse</label>
                    <select value={typeAnalyse} onChange={e => setTypeAnalyse(e.target.value as TypeAnalyse)}
                            className="ht-input">
                        {TYPES_ANALYSE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Urgence</label>
                    <div className="flex rounded-xl border overflow-hidden text-sm p-1 gap-1" style={{ borderColor: 'var(--ht-border-input)', backgroundColor: 'var(--ht-bg)' }}>
                        <button type="button" onClick={() => setUrgence('normale')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${urgence === 'normale' ? 'badge-tint' : ''}`}
                                style={urgence === 'normale' ? { backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' } : { color: 'var(--ht-text-muted)' }}>
                            Normale
                        </button>
                        <button type="button" onClick={() => setUrgence('urgente')}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={urgence === 'urgente' ? { backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' } : { color: 'var(--ht-text-muted)' }}>
                            Urgent
                        </button>
                    </div>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Notes pour le laboratoire (optionnel)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                              className="ht-input ht-textarea"
                              placeholder="Contexte clinique, suspicion diagnostique..." />
                </div>

                {error && <p className="text-xs font-medium" style={{ color: 'var(--ht-danger)' }}>{error}</p>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel} disabled={loading} className="btn btn-secondary flex-1 justify-center">
                        Annuler
                    </button>
                    <button onClick={() => onSave({ type_analyse: typeAnalyse, urgence, notes_medecin: notes })} disabled={loading}
                            className="btn btn-primary flex-1 justify-center">
                        {loading ? 'Envoi…' : 'Envoyer la demande'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modale : voir les résultats d'une analyse terminée ────────────────────────
function ResultatsAnalyseModal({ demande, onClose }: { demande: DemandeAnalyse; onClose: () => void }) {
    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-lg space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <div>
                        <h3 className="ht-modal-title">{demande.type_label || demande.type_analyse}</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                            Résultat du {demande.date_resultat ? new Date(demande.date_resultat).toLocaleDateString('fr-FR') : '—'} {demande.laborantin_nom && `· ${demande.laborantin_nom}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={16} />
                    </button>
                </div>
                <div>
                    <label className="ht-label">Résultats</label>
                    <p className="text-sm whitespace-pre-wrap rounded-xl px-3 py-2.5 border" style={{ color: 'var(--ht-text)', backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border-input)' }}>
                        {demande.resultats || '—'}
                    </p>
                </div>
                {demande.valeurs_normales && (
                    <div>
                        <label className="ht-label">Valeurs de référence</label>
                        <p className="text-sm whitespace-pre-wrap rounded-xl px-3 py-2.5 ht-mono border" style={{ color: 'var(--ht-text-secondary)', backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border-input)' }}>
                            {demande.valeurs_normales}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── PAGE PRINCIPALE DETAIL PATIENT ───────────────────────────────────────────
export default function PatientDetail() {
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()
    const {hasRole, user} = useAuth()

    const canEdit = hasRole('admin', 'secretaire', 'medecin')
    const canDelete = hasRole('admin')
    const canRequestLab = hasRole('admin', 'medecin', 'infirmier')
    const canAssignInfirmier = hasRole('admin') || !!user?.est_major

    const patientId = id ? Number(id) : undefined

    // ── Fetching centralisé (voir hooks/usePatientDossier.ts) ──
    const {
        patient, setPatient,
        signes,
        antecedents, setAntecedents,
        consultations, setConsultations,
        demandes, setDemandes,
        rdvs,
        urgences,
        hospitalisations,
        alertes, setAlertes,
        patientLoading,
        error,
        sectionsLoading,
        sectionErrors,
        reload,
    } = usePatientDossier(patientId)

    const {
        assignations, setAssignations, infirmiersService,
    } = usePatientAssignations(patient, canAssignInfirmier)
    const [assignLoading, setAssignLoading] = useState(false)

    // Modales
    const [showDelete, setShowDelete] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [showAddAntecedent, setShowAddAntecedent] = useState(false)
    const [antecedentLoading, setAntecedentLoading] = useState(false)
    const [showLabModal, setShowLabModal] = useState(false)
    const [labLoading, setLabLoading] = useState(false)
    const [labError, setLabError] = useState('')
    const [selectedAnalyse, setSelectedAnalyse] = useState<DemandeAnalyse | null>(null)

    // Mode édition complète du profil (façon EmployeDetail)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Patient>>({})
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState('')
    const [services] = useState<{id: number; nom: string}[]>([])
    const [medecins] = useState<{id: number; nom: string; prenom: string}[]>([])

    // Corrigé : ces deux états étaient utilisés dans le JSX du mode édition
    // (bascule "date connue" / "âge approximatif") sans jamais être déclarés,
    // ce qui provoquait un crash (ReferenceError) dès l'ouverture du mode édition.
    const [modeDateNaissanceEdit, setModeDateNaissanceEdit] = useState<'date' | 'age'>('date')
    const [ageApproxEdit, setAgeApproxEdit] = useState('')

    const handleDelete = async () => {
        if (!id || !patient) return
        setDeleteLoading(true)
        try {
            await deletePatient(Number(id))
            navigate('/patients')
        } catch {
            alert("Erreur lors de la suppression.")
        } finally {
            setDeleteLoading(false)
            setShowDelete(false)
        }
    }

    const handleSaveProfile = async (e: FormEvent) => {
        e.preventDefault()
        if (!id || !patient) return
        setUpdateLoading(true)
        setUpdateError('')
        try {
            const updated = await updatePatient(Number(id), editForm)
            setPatient(updated)
            setIsEditing(false)
        } catch {
            setUpdateError("Erreur lors de la mise à jour du profil.")
        } finally {
            setUpdateLoading(false)
        }
    }

    const handleAddAntecedent = async (data: { libelle: string; type_antecedent: TypeAntecedent; observations: string; date_diagnostic: string }) => {
        if (!id) return
        setAntecedentLoading(true)
        try {
            const res = await createAntecedent({...data, patient: parseInt(id)})
            setAntecedents([res, ...antecedents])
            setShowAddAntecedent(false)
        } catch {
            alert("Erreur lors de l'ajout de l'antécédent.")
        } finally {
            setAntecedentLoading(false)
        }
    }

    const handleToggleAntecedentStatut = async (a: Antecedent) => {
        const nextStatut: StatutAntecedent = a.statut === 'actif' ? 'resolu' : 'actif'
        try {
            const updated = await updateAntecedent(a.id, {statut: nextStatut})
            setAntecedents(antecedents.map(item => item.id === a.id ? updated : item))
        } catch {
            alert("Erreur lors du changement de statut.")
        }
    }

    const handleDeleteAntecedent = async (a: Antecedent) => {
        if (!confirm("Supprimer cet antécédent ?")) return
        try {
            await deleteAntecedent(a.id)
            setAntecedents(antecedents.filter(item => item.id !== a.id))
        } catch {
            alert("Erreur lors de la suppression.")
        }
    }

    const handleUpdateAlerteStatut = async (a: Alerte) => {
        const nextStatut: StatutAlerte = a.statut === 'non_lue' ? 'lue' : 'traitee'
        try {
            const updated = await updateAlerteStatut(a.id, nextStatut as 'lue' | 'traitee')
            setAlertes(prev => prev.map(item => item.id === a.id ? updated : item))
        } catch {
            alert("Erreur lors de la mise à jour de l'alerte.")
        }
    }

    const handleCreateLabDemande = async (data: { type_analyse: TypeAnalyse; urgence: UrgenceAnalyse; notes_medecin: string }) => {
        if (!id) return
        setLabLoading(true)
        setLabError('')
        try {
            const res = await createDemande({...data, patient: parseInt(id)})
            setDemandes([res, ...demandes])
            setShowLabModal(false)
        } catch {
            setLabError("Échec de la création de la demande.")
        } finally {
            setLabLoading(false)
        }
    }

    const handleAssignInfirmier = async (data: { infirmier: number; date: string; shift: Shift }) => {
        if (!patient) return
        setAssignLoading(true)
        try {
            const created = await createAssignation({ ...data, patient: patient.id })
            setAssignations(prev => [created, ...prev])
        } catch {
            alert("Erreur lors de l'assignation (l'infirmier(ère) et le patient doivent être du même service).")
        } finally {
            setAssignLoading(false)
        }
    }

    const handleDeleteAssignation = async (a: AssignationPatient) => {
        if (!confirm("Retirer cette assignation ?")) return
        try {
            await deleteAssignation(a.id)
            setAssignations(prev => prev.filter(item => item.id !== a.id))
        } catch {
            alert("Erreur lors de la suppression.")
        }
    }

    if (patientLoading) return <SkeletonDetailPage/>
    if (error || !patient) {
        return (
            <div className="ht-page">
                <Sidebar/>
                <div className="ht-page-content flex flex-col items-center justify-center min-h-screen space-y-4">
                    <p className="text-sm font-medium"
                       style={{color: 'var(--ht-text-secondary)'}}>{error || "Patient introuvable."}</p>
                    <button onClick={() => navigate('/patients')} className="btn btn-secondary btn-sm">
                        <ArrowLeft size={14}/> Retour à la liste
                    </button>
                </div>
            </div>
        )
    }

    const gravite = computeGravite(alertes)
    const hospitalisationActive = hospitalisations.find(h => h.statut === 'en_cours') ?? null

    return (
        <div className="ht-page">
            <Sidebar/>

            <main className="ht-page-content max-w-7xl space-y-6">

                {/* ── Fil d'Ariane & Actions Générales ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
                     style={{borderBottom: '1px solid var(--ht-border)'}}>
                    <button onClick={() => navigate('/patients')}
                            className="flex items-center gap-1.5 text-xs font-medium transition-colors w-fit"
                            style={{color: 'var(--ht-text-secondary)'}}>
                        <ArrowLeft size={14}/> Revenir aux patients
                    </button>

                    {!isEditing && (
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <button onClick={() => {
                                    setEditForm(patient);
                                    setModeDateNaissanceEdit(patient.date_naissance_estimee ? 'age' : 'date');
                                    setAgeApproxEdit(patient.date_naissance_estimee ? String(calcAge(patient.date_naissance)) : '');
                                    setIsEditing(true);
                                }} className="btn btn-secondary btn-sm">
                                    <Edit3 size={12}/> Modifier l'identité
                                </button>
                            )}
                            {canDelete && (
                                <button onClick={() => setShowDelete(true)} className="btn btn-danger btn-sm">
                                    <Trash2 size={12}/> Supprimer le dossier
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isEditing ? (
                    /* ── MODE ÉDITION DU PROFIL ── */
                    <form onSubmit={handleSaveProfile} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Identité */}
                            <div className="ht-card ht-card-padded space-y-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                    <User size={16} style={{ color: 'var(--ht-text-muted)' }} /> Informations personnelles
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="ht-field">
                                        <label className="ht-label">Prénom *</label>
                                        <input required className="ht-input" value={editForm.prenom || ''} onChange={e => setEditForm({...editForm, prenom: e.target.value})} />
                                    </div>
                                    <div className="ht-field">
                                        <label className="ht-label">Nom *</label>
                                        <input required className="ht-input" value={editForm.nom || ''} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                                    </div>
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Date de naissance *</label>
                                    <div className="flex items-center gap-4 mb-2">
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--ht-text-secondary)' }}>
                                            <input type="radio" name="mode_date_naissance_edit" checked={modeDateNaissanceEdit === 'date'}
                                                   onChange={() => setModeDateNaissanceEdit('date')} />
                                            Date connue
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--ht-text-secondary)' }}>
                                            <input type="radio" name="mode_date_naissance_edit" checked={modeDateNaissanceEdit === 'age'}
                                                   onChange={() => setModeDateNaissanceEdit('age')} />
                                            Âge approximatif
                                        </label>
                                    </div>
                                    {modeDateNaissanceEdit === 'date' ? (
                                        <input type="date" required className="ht-input" value={editForm.date_naissance || ''}
                                               onChange={e => setEditForm({ ...editForm, date_naissance: e.target.value, date_naissance_estimee: false })} />
                                    ) : (
                                        <input type="number" min="0" max="130" required className="ht-input" placeholder="Ex : 34"
                                               value={ageApproxEdit}
                                               onChange={e => {
                                                   setAgeApproxEdit(e.target.value)
                                                   setEditForm({
                                                       ...editForm,
                                                       date_naissance: e.target.value ? dateNaissanceDepuisAge(Number(e.target.value)) : editForm.date_naissance,
                                                       date_naissance_estimee: true,
                                                   })
                                               }} />
                                    )}
                                    {patient.date_naissance_estimee && modeDateNaissanceEdit === 'age' && (
                                        <p className="text-xs mt-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                            Date estimée au 1er juillet de l'année déduite. Passez sur « Date connue » dès que la vraie date est confirmée.
                                        </p>
                                    )}
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Sexe *</label>
                                    <select className="ht-input" value={editForm.sexe || 'M'} onChange={e => setEditForm({...editForm, sexe: e.target.value as 'M' | 'F'})}>
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                    </select>
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Téléphone</label>
                                    <input className="ht-input" value={editForm.telephone || ''} onChange={e => setEditForm({...editForm, telephone: e.target.value})} placeholder="+221 7X XXX XX XX" />
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Adresse</label>
                                    <input className="ht-input" value={editForm.adresse || ''} onChange={e => setEditForm({...editForm, adresse: e.target.value})} />
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Photo (URL)</label>
                                    <input className="ht-input" value={editForm.photo_path || ''} onChange={e => setEditForm({...editForm, photo_path: e.target.value})} placeholder="https://…" />
                                </div>
                            </div>

                            {/* Médical & administratif */}
                            <div className="ht-card ht-card-padded space-y-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                    <Stethoscope size={16} style={{ color: 'var(--ht-text-muted)' }} /> Médical & administratif
                                </h3>
                                <div className="ht-field">
                                    <label className="ht-label">Groupe sanguin</label>
                                    <select className="ht-input" value={editForm.groupe_sanguin || ''} onChange={e => setEditForm({...editForm, groupe_sanguin: e.target.value})}>
                                        <option value="">Inconnu</option>
                                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Allergies (séparées par des virgules)</label>
                                    <input className="ht-input" value={editForm.allergies || ''} onChange={e => setEditForm({...editForm, allergies: e.target.value})} placeholder="Ex : Pénicilline, Arachide" />
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Service</label>
                                    <select className="ht-input" value={editForm.service ?? ''} onChange={e => setEditForm({...editForm, service: e.target.value ? Number(e.target.value) : null})}>
                                        <option value="">— Aucun service —</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                    </select>
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Médecin référent</label>
                                    <select className="ht-input" value={editForm.medecin_referent ?? ''} onChange={e => setEditForm({...editForm, medecin_referent: e.target.value ? Number(e.target.value) : null})}>
                                        <option value="">— Aucun —</option>
                                        {medecins.map(m => <option key={m.id} value={m.id}>Dr {m.prenom} {m.nom}</option>)}
                                    </select>
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">Statut du dossier</label>
                                    <select className="ht-input" value={editForm.actif ? '1' : '0'} onChange={e => setEditForm({...editForm, actif: e.target.value === '1'})}>
                                        <option value="1">Actif</option>
                                        <option value="0">Inactif</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Zone Erreur d'enregistrement */}
                        {updateError && (
                            <div className="rounded-xl border border-[var(--ht-danger)]/20 bg-[var(--ht-danger)]/10 px-4 py-3">
                                <p className="text-sm text-[var(--ht-danger)]">{updateError}</p>
                            </div>
                        )}

                        {/* Actions d'édition bas de page */}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary flex-1 py-3">
                                Annuler
                            </button>
                            <button type="submit" disabled={updateLoading} className="btn btn-primary flex-1 py-3 font-semibold">
                                {updateLoading ? 'Enregistrement…' : 'Sauvegarder les modifications'}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* ── MODE VUE COMPLÈTE DU DOSSIER (Flux vertical unique) ── */
                    <div className="space-y-6">

                        <SectionErrorsBanner errors={sectionErrors} onRetry={reload} />

                        {/* ── Header patient (Bannière supérieure pleine largeur) ── */}
                        <div className="ht-card ht-card-padded">
                            <div className="flex flex-col md:flex-row items-start gap-5">

                                {/* Photo ou Avatar XL */}
                                {patient.photo_path ? (
                                    <img
                                        src={patient.photo_path}
                                        alt={`${patient.prenom} ${patient.nom}`}
                                        className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-neutral-800"
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                    />
                                ) : (
                                    <div className="ht-avatar ht-avatar-xl flex-shrink-0" style={{ backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)', width: '5rem', height: '5rem', fontSize: '1.5rem' }}>
                                        {patient.prenom?.[0] || ''}{patient.nom?.[0] || ''}
                                    </div>
                                )}

                                {/* Corps des informations */}
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div>
                                            <h1 className="ht-serif text-2xl font-bold gap-3 flex items-center" style={{ color: 'var(--ht-text)' }}>
                                                {patient.prenom} {patient.nom}
                                            </h1>
                                            <p className="ht-mono text-sm mt-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                                {patient.date_naissance_estimee ? '≈ ' : ''}{calcAge(patient.date_naissance)} ans · {patient.sexe === 'M' ? 'Masculin' : 'Féminin'}
                                                {(hospitalisationActive?.service_nom || patient.service_nom) && ` · ${hospitalisationActive?.service_nom || patient.service_nom}`}
                                                {hospitalisationActive && (hospitalisationActive.chambre || hospitalisationActive.lit) &&
                                                    ` · Chambre ${hospitalisationActive.chambre}${hospitalisationActive.lit ? `-${hospitalisationActive.lit}` : ''}`}
                                            </p>
                                            <p className="ht-mono text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                                                Dossier {patient.numero_dossier || `P${String(patient.id).padStart(6, '0')}`}
                                            </p>
                                        </div>

                                        {/* Conteneur des Badges de Statut et de Gravité (Alignés côte à côte) */}
                                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <span
                        className="text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide w-fit"
                        style={patient.statut_vital === 'decede'
                            ? { backgroundColor: 'rgba(255,107,91,0.14)', color: 'var(--ht-coral)', border: '1px solid rgba(255,107,91,0.4)' }
                            : (patient as any).actif ?? true
                                ? { backgroundColor: 'rgba(111,215,196,0.14)', color: 'var(--ht-brand-tint)', border: '1px solid rgba(111,215,196,0.4)' }
                                : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#8fada3' }
                        }
                    >
                        {patient.statut_vital === 'decede'
                            ? '✝ Décédé'
                            : ((patient as any).actif ?? true) ? '● Actif' : '○ Inactif'}
                    </span>

                                            {/* Le badge de gravité est maintenant sorti et placé juste à côté */}
                                            <GraviteBadge gravite={gravite} />
                                        </div>
                                    </div>

                                    {/* Badges de métadonnées */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                      style={{ border: '1px solid var(--ht-border-input)', color: 'var(--ht-text-secondary)' }}>
                    <Droplet size={12} style={{ color: 'var(--ht-text-muted)' }} />
                    {(patient as any).groupe_sanguin ? `Groupe ${(patient as any).groupe_sanguin}` : 'Groupe sanguin inconnu'}
                </span>
                                        {patient.medecin_nom && (
                                            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                                                  style={{ border: '1px solid var(--ht-border-input)', color: 'var(--ht-text-secondary)' }}>
                        <Stethoscope size={12} style={{ color: 'var(--ht-text-muted)' }} />{patient.medecin_nom}
                    </span>
                                        )}
                                    </div>

                                    {/* Allergies — bandeau plein, pas juste un badge */}
                                    {patient.allergies?.trim() && (
                                        <div className="flex items-center gap-2.5 mt-3 px-4 py-2.5 rounded-xl"
                                             style={{ backgroundColor: 'var(--ht-danger-bg-light)', border: '1px solid var(--ht-danger)' }}>
                                            <AlertTriangle size={16} style={{ color: 'var(--ht-danger)' }} className="flex-shrink-0" />
                                            <p className="text-sm" style={{ color: 'var(--ht-danger)' }}>
                                                <span className="font-bold">Allergie —</span> {patient.allergies}
                                            </p>
                                        </div>
                                    )}

                                    {/* Antécédents actifs — résumé en une ligne */}
                                    {antecedents.filter(a => a.statut === 'actif').length > 0 && (
                                        <p className="text-sm mt-3" style={{ color: 'var(--ht-text-secondary)' }}>
                                            <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>Antécédents :</span>{' '}
                                            {antecedents.filter(a => a.statut === 'actif').map(a => a.libelle).join(', ')}
                                        </p>
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* ─── BLOC 1.5 : Informations personnelles étendues (Lecture) ─── */}
                        <div className="ht-card ht-card-padded">
                            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                                Informations personnelles détaillées
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <InfoRow label="Prénom" value={patient.prenom} />
                                <InfoRow label="Nom" value={patient.nom} />
                                <InfoRow label="Date de naissance" value={`${formatDate(patient.date_naissance)}${patient.date_naissance_estimee ? ' (estimée)' : ''}`} />
                                <InfoRow label="Âge" value={`${calcAge(patient.date_naissance)} ans`} />
                                <InfoRow label="Sexe" value={patient.sexe === 'M' ? 'Masculin' : 'Féminin'} />
                                <InfoRow label="Groupe sanguin" value={patient.groupe_sanguin || 'Non renseigné'} />
                                <InfoRow label="Allergies" value={patient.allergies?.trim() || 'Aucune connue'} />
                                {patient.telephone && <InfoRow label="Téléphone" value={patient.telephone} />}
                                {patient.adresse && <InfoRow label="Adresse" value={patient.adresse} />}
                                <InfoRow label="Service" value={patient.service_nom || 'Non assigné'} />
                                <InfoRow label="Médecin référent" value={patient.medecin_nom || 'Non assigné'} />
                                <InfoRow label="ID dossier" value={`#${patient.id}`} mono />
                                <InfoRow label="N° dossier" value={patient.numero_dossier || '—'} mono />
                                <InfoRow label="Créé le" value={formatDate(patient.date_creation)} />
                            </div>
                        </div>

                        {/* ─── BLOC 2 : Signes vitaux ─── */}
                        <div className="ht-card ht-card-padded-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2"
                                    style={{color: 'var(--ht-text)'}}>
                                    <Activity size={16} style={{color: 'var(--ht-text-muted)'}}/> Évolution des constantes vitales
                                </h3>
                                {hasRole('admin', 'medecin', 'infirmier') && (
                                    <button
                                        onClick={() => navigate(`/patients/${patient.id}/signes_vitaux/newSignes`)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        <Plus size={14} /> Nouvelle mesure
                                    </button>
                                )}
                            </div>
                            {sectionsLoading.signes ? (
                                <div className="ht-card ht-card-padded-sm">
                                    <SkeletonListRows rows={2} />
                                </div>
                            ) : (
                                <SignesVitauxCharts data={signes}/>
                            )}
                        </div>

                        {/* ─── BLOC 3 : Alertes / Consultations / Rendez-vous ─── */}
                        <SuiviPatientTabs
                            alertes={alertes}
                            alertesLoading={sectionsLoading.alertes}
                            onUpdateAlerteStatut={handleUpdateAlerteStatut}
                            patientId={patient.id}
                            consultations={consultations}
                            consultationsLoading={sectionsLoading.consultations}
                            onConsultationsUpdate={setConsultations}
                            rendezVous={rdvs}
                            rdvsLoading={sectionsLoading.rdvs}
                            onVoirAgenda={() => navigate('/rendez_vous')}
                        />

                        {/* ─── BLOC 4 : Antécédents & Analyses ─── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AntecedentsPanel
                                antecedents={antecedents}
                                onAdd={() => setShowAddAntecedent(true)}
                                onToggleStatut={handleToggleAntecedentStatut}
                                onDelete={handleDeleteAntecedent}
                                loading={sectionsLoading.antecedents}
                            />
                            <AnalysesPanel
                                demandes={demandes}
                                canRequest={canRequestLab}
                                onRequest={() => setShowLabModal(true)}
                                onVoirResultats={(d) => setSelectedAnalyse(d)}
                                loading={sectionsLoading.demandes}
                            />
                        </div>

                        {/* ─── BLOC 5 : Urgences & Hospitalisations ─── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <UrgencesPanel passages={urgences} loading={sectionsLoading.urgences}/>
                            <HospitalisationsPanel hospitalisations={hospitalisations} loading={sectionsLoading.hospitalisations}/>
                        </div>

                        {/* ─── BLOC 6 : Infirmiers assignés (chef de service) ─── */}
                        {canAssignInfirmier && (
                            <AssignationsPanel
                                assignations={assignations}
                                infirmiers={infirmiersService}
                                onAssign={handleAssignInfirmier}
                                onDelete={handleDeleteAssignation}
                                loading={assignLoading}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* Modales de contrôle contextuel */}
            {showDelete && <DeleteModal name={`${patient.prenom} ${patient.nom}`} onConfirm={handleDelete}
                                        onCancel={() => setShowDelete(false)} loading={deleteLoading}/>}
            {showAddAntecedent &&
                <AddAntecedentModal onSave={handleAddAntecedent} onCancel={() => setShowAddAntecedent(false)}
                                    loading={antecedentLoading}/>}
            {showLabModal &&
                <DemandeAnalyseModal onSave={handleCreateLabDemande} onCancel={() => setShowLabModal(false)}
                                     loading={labLoading} error={labError}/>}
            {selectedAnalyse &&
                <ResultatsAnalyseModal demande={selectedAnalyse} onClose={() => setSelectedAnalyse(null)}/>}
        </div>
    )
}