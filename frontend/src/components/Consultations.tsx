import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Consultation, ConsultationStatut, TypeEvenement } from '../types'
import { deleteConsultation } from '../api/consultations'

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

const STATUT_CONFIG: Record<ConsultationStatut, { label: string; color: string; bg: string }> = {
    planifiee: { label: 'Planifiée', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
    en_cours:  { label: 'En cours',  color: '#1d4ed8', bg: '#dbeafe' },
    terminee:  { label: 'Terminée',  color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    annulee:   { label: 'Annulée',   color: 'var(--ht-muted)', bg: 'var(--ht-muted-bg)' },
}

const TYPE_CONFIG: Record<TypeEvenement, { label: string; icon: string; color: string; bg: string }> = {
    consultation: { label: 'Consultation', icon: '🩺', color: 'var(--ht-primary)', bg: 'var(--ht-primary-tint)' },
    examen:       { label: 'Examen',        icon: '🔬', color: '#6d28d9', bg: '#ede9fe' },
    operation:    { label: 'Opération',     icon: '🏥', color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
    autre:        { label: 'Autre',         icon: '📋', color: 'var(--ht-text)', bg: 'var(--ht-muted-bg)' },
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function StatutBadge({ statut }: { statut: ConsultationStatut }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
            {cfg.label}
        </span>
    )
}

// ─── Badge type d'événement ───────────────────────────────────────────────────
function TypeBadge({ type }: { type: TypeEvenement }) {
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre
    return (
        <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
            {cfg.icon} {cfg.label}
        </span>
    )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
                        currentPage,
                        totalPages,
                        onPageChange,
                    }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}) {
    if (totalPages <= 1) return null

    const pages: (number | 'ellipsis')[] = []
    const neighbors = 1

    for (let p = 1; p <= totalPages; p++) {
        if (
            p === 1 ||
            p === totalPages ||
            (p >= currentPage - neighbors && p <= currentPage + neighbors)
        ) {
            pages.push(p)
        } else if (pages[pages.length - 1] !== 'ellipsis') {
            pages.push('ellipsis')
        }
    }

    const btnBase = "min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"

    return (
        <div className="flex items-center justify-center gap-1.5 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${btnBase} border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                title="Précédent"
            >
                ←
            </button>

            {pages.map((p, i) =>
                p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-300">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={btnBase}
                        style={p === currentPage
                            ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                            : { color: 'var(--ht-text)' }
                        }
                        onMouseEnter={e => { if (p !== currentPage) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                        onMouseLeave={e => { if (p !== currentPage) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`${btnBase} border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                title="Suivant"
            >
                →
            </button>
        </div>
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
    const hasDetails = consult.symptomes || consult.examens_realises || consult.diagnostic || consult.ordonnance || consult.notes
    const typeCfg = TYPE_CONFIG[consult.type_evenement] ?? TYPE_CONFIG.autre

    return (
        <div className="ht-card overflow-hidden">
            <button
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                onClick={() => hasDetails && setExpanded(p => !p)}
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                     style={{ backgroundColor: typeCfg.color, color: 'white' }}>
                    {typeCfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{consult.motif}</p>
                        <TypeBadge type={consult.type_evenement} />
                        <StatutBadge statut={consult.statut} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(consult.date)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(consult) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs"
                        title="Modifier"
                    >✏️</button>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(consult.id) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                        title="Supprimer"
                    >🗑️</button>
                    {hasDetails && (
                        <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
                    )}
                </div>
            </button>

            {expanded && hasDetails && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-50">
                    {consult.symptomes && (
                        <div className="pt-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Symptômes observés</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{consult.symptomes}</p>
                        </div>
                    )}
                    {consult.examens_realises && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Examens réalisés</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{consult.examens_realises}</p>
                        </div>
                    )}
                    {consult.diagnostic && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnostic</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{consult.diagnostic}</p>
                        </div>
                    )}
                    {consult.ordonnance && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ordonnance</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line font-mono text-xs bg-gray-50 p-3 rounded-lg">{consult.ordonnance}</p>
                        </div>
                    )}
                    {consult.notes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm text-gray-500 whitespace-pre-line">{consult.notes}</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-300 pt-1">
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
        <div>
            {confirmDelete !== null && (
                <div className="ht-modal-overlay">
                    <div className="ht-modal ht-modal-sm">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">🗑️</div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cet événement ?</h3>
                        <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                    className="btn btn-ghost flex-1">
                                Annuler
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)} disabled={deleteLoading}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors">
                                {deleteLoading ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">Historique médical</h2>
                    {consultations.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{consultations.length} événement{consultations.length > 1 ? 's' : ''} (consultations, examens, opérations...)</p>
                    )}
                </div>
                <button
                    onClick={openCreate}
                    className="btn btn-primary flex items-center gap-1.5"
                >
                    <span>+</span> Nouveau
                </button>
            </div>

            {consultations.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-sm font-medium text-gray-500">Aucun événement médical enregistré</p>
                    <p className="text-xs text-gray-300 mt-1">Cliquez sur « Nouveau » pour ajouter une consultation, un examen ou une opération.</p>
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
                        currentPage={safePage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    )
}