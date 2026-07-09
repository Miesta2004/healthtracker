import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Consultation, ConsultationStatut, TypeEvenement } from '../types'
import { deleteConsultation } from '../api/consultations'
import Pagination from './Pagination'
import {
    Stethoscope,
    FlaskConical,
    Activity,
    FileText,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    Plus,
    type LucideIcon
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
}

function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

// Couleurs alignées sur les variables déjà existantes (rôles / statuts) plutôt que des teintes improvisées
const STATUT_CONFIG: Record<ConsultationStatut, { label: string; color: string; bg: string }> = {
    planifiee: { label: 'Planifiée', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
    en_cours:  { label: 'En cours',  color: 'var(--role-medecin)', bg: 'rgba(14, 116, 144, 0.1)' },
    terminee:  { label: 'Terminée',  color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    annulee:   { label: 'Annulée',   color: 'var(--ht-text-muted)', bg: 'var(--ht-muted-bg)' },
}

const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: LucideIcon; color: string; bg: string }> = {
    consultation: { label: 'Consultation', icon: Stethoscope, color: 'var(--ht-primary)', bg: 'var(--ht-primary-tint-bg)' },
    examen:       { label: 'Examen',        icon: FlaskConical, color: 'var(--role-secretaire)', bg: 'rgba(147, 51, 234, 0.1)' },
    operation:    { label: 'Opération',     icon: Activity, color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
    autre:        { label: 'Autre',         icon: FileText, color: 'var(--ht-text)', bg: 'var(--ht-muted-bg)' },
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function StatutBadge({ statut }: { statut: ConsultationStatut }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
            {cfg.label}
        </span>
    )
}

// ─── Badge type d'événement ───────────────────────────────────────────────────
function TypeBadge({ type }: { type: TypeEvenement }) {
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre
    const Icon = cfg.icon
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
            <Icon size={12} /> {cfg.label}
        </span>
    )
}

// ─── Carte consultation (expand/collapse) ─────────────────────────────────────
function ConsultCard({
                         consult,
                         onEdit,
                         onDelete,
                     }: {
    consult: Consultation
    onEdit: (c: Consultation) => void
    onDelete: (id: number) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const hasDetails = !!(consult.symptomes || consult.examens_realises || consult.diagnostic || consult.ordonnance || consult.notes)
    const typeCfg = TYPE_CONFIG[consult.type_evenement] ?? TYPE_CONFIG.autre
    const Icon = typeCfg.icon

    return (
        <div className="ht-card overflow-hidden">
            <div
                className="w-full text-left px-5 py-4 flex items-start gap-3 transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--ht-card-bg)' }}
                onClick={() => hasDetails && setExpanded(p => !p)}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--ht-card-bg)' }}
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white"
                     style={{ backgroundColor: typeCfg.color }}>
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ht-text)' }}>{consult.motif}</p>
                        <TypeBadge type={consult.type_evenement} />
                        <StatutBadge statut={consult.statut} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>{formatDateTime(consult.date)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit(consult)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--ht-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ht-text)'; e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ht-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                        title="Modifier"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(consult.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--ht-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ht-danger)'; e.currentTarget.style.backgroundColor = 'var(--ht-danger-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ht-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                        title="Supprimer"
                    >
                        <Trash2 size={14} />
                    </button>
                    {hasDetails && (
                        <span className="ml-1" style={{ color: 'var(--ht-border)' }}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                    )}
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="px-5 pb-4 space-y-4 border-t" style={{ borderColor: 'var(--ht-border)' }}>
                    {consult.symptomes && (
                        <div className="pt-3">
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ht-text-muted)' }}>Symptômes observés</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text)' }}>{consult.symptomes}</p>
                        </div>
                    )}
                    {consult.examens_realises && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ht-text-muted)' }}>Examens réalisés</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text)' }}>{consult.examens_realises}</p>
                        </div>
                    )}
                    {consult.diagnostic && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ht-text-muted)' }}>Diagnostic</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text)' }}>{consult.diagnostic}</p>
                        </div>
                    )}
                    {consult.ordonnance && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ht-text-muted)' }}>Ordonnance</p>
                            <pre className="text-xs p-3 rounded-xl font-mono whitespace-pre-line border"
                                 style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text)' }}>
                                {consult.ordonnance}
                            </pre>
                        </div>
                    )}
                    {consult.notes && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ht-text-muted)' }}>Notes</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text-secondary)' }}>{consult.notes}</p>
                        </div>
                    )}
                    <p className="text-xs pt-1 border-t" style={{ color: 'var(--ht-text-muted)', borderColor: 'var(--ht-border)' }}>
                        Modifié le {formatDate(consult.date_modification)}
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── Composant principal ──────────────────────────────────────────────────────
const PAGE_SIZE = 10

export default function Consultations({
                                          patientId,
                                          consultations,
                                          onUpdate,
                                      }: {
    patientId: number
    consultations: Consultation[]
    onUpdate: (list: Consultation[]) => void
}) {
    const navigate = useNavigate()
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(consultations.length / PAGE_SIZE))
    const safePage = Math.min(currentPage, totalPages)
    const paginatedConsultations = consultations.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    )

    const openCreate = () => navigate(`/patients/${patientId}/consultations/new`)
    const openEdit = (c: Consultation) => navigate(`/patients/${patientId}/consultations/${c.id}`)

    const handleDelete = async (id: number) => {
        setDeleteLoading(true)
        try {
            await deleteConsultation(id)
            onUpdate(consultations.filter(c => c.id !== id))
        } finally {
            setDeleteLoading(false)
            setConfirmDelete(null)
        }
    }

    return (
        <div className="space-y-4">
            {confirmDelete !== null && (
                <div className="ht-modal-overlay">
                    <div className="ht-modal ht-modal-sm text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto border"
                             style={{ color: 'var(--ht-danger)', backgroundColor: 'var(--ht-danger-bg-light)', borderColor: 'var(--ht-danger)' }}>
                            <Trash2 size={20} />
                        </div>
                        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ht-text)' }}>Supprimer cet événement ?</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--ht-text-secondary)' }}>Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">
                                Annuler
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)} disabled={deleteLoading} className="btn btn-danger flex-1">
                                {deleteLoading ? 'Suppression…' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Historique médical</h2>
                    {consultations.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                            {consultations.length} événement{consultations.length > 1 ? 's' : ''} (consultations, examens, opérations…)
                        </p>
                    )}
                </div>
                <button onClick={openCreate} className="btn btn-primary gap-1.5">
                    <Plus size={16} /> Nouveau
                </button>
            </div>

            {consultations.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-card-bg)' }}>
                    <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                        <FileText size={20} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ht-text-secondary)' }}>Aucun événement médical enregistré</p>
                    <p className="text-xs mx-auto max-w-sm" style={{ color: 'var(--ht-text-muted)' }}>
                        Cliquez sur « Nouveau » pour ajouter une consultation, un examen ou une opération.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {paginatedConsultations.map(c => (
                            <ConsultCard
                                key={c.id}
                                consult={c}
                                onEdit={openEdit}
                                onDelete={(id) => setConfirmDelete(id)}
                            />
                        ))}
                    </div>
                    <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={consultations.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    )
}