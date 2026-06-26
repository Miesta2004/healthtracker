import { useState } from 'react'
import type { Consultation, ConsultationStatut } from '../types'
import {
    createConsultation,
    updateConsultation,
    deleteConsultation,
} from '../api/consultations'

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
    planifiee: { label: 'Planifiée', color: '#b45309', bg: '#fef3c7' },
    en_cours:  { label: 'En cours',  color: '#1d4ed8', bg: '#dbeafe' },
    terminee:  { label: 'Terminée',  color: '#15803d', bg: '#dcfce7' },
    annulee:   { label: 'Annulée',   color: '#6b7280', bg: '#f3f4f6' },
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

    // Construit la liste des pages à afficher, avec "…" pour les trous
    const pages: (number | 'ellipsis')[] = []
    const neighbors = 1 // pages voisines affichées autour de la page courante

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
                            ? { backgroundColor: '#003152', color: 'white' }
                            : { color: '#374151' }
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

// ─── Modal formulaire (création / édition) ────────────────────────────────────
function ConsultModal({
                          patientId,
                          initial,
                          onSave,
                          onCancel,
                      }: {
    patientId: number
    initial?: Consultation
    onSave: (c: Consultation) => void
    onCancel: () => void
}) {
    const now = new Date()
    now.setSeconds(0, 0)
    const defaultDate = now.toISOString().slice(0, 16) // format datetime-local

    const [form, setForm] = useState({
        date:        initial ? initial.date.slice(0, 16) : defaultDate,
        motif:       initial?.motif        ?? '',
        diagnostic:  initial?.diagnostic   ?? '',
        ordonnance:  initial?.ordonnance   ?? '',
        notes:       initial?.notes        ?? '',
        statut:      initial?.statut       ?? 'planifiee' as ConsultationStatut,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState('')

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async () => {
        if (!form.motif.trim()) { setError('Le motif est obligatoire.'); return }
        setLoading(true)
        setError('')
        try {
            let saved: Consultation
            if (initial) {
                saved = await updateConsultation(initial.id, { ...form, date: form.date + ':00' })
            } else {
                saved = await createConsultation({ ...form, date: form.date + ':00', patient: patientId })
            }
            onSave(saved)
        } catch {
            setError('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
    const focusStyle = {
        onFocus: (e: React.FocusEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px #003152',
        onBlur:  (e: React.FocusEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.boxShadow = 'none',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {initial ? 'Modifier la consultation' : 'Nouvelle consultation'}
                </h3>

                <div className="space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date et heure</label>
                        <input type="datetime-local" name="date" value={form.date} onChange={handleChange}
                               className={inputCls} {...focusStyle} />
                    </div>

                    {/* Motif */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Motif <span className="text-red-400">*</span></label>
                        <input type="text" name="motif" value={form.motif} onChange={handleChange}
                               placeholder="Ex : Douleurs abdominales, contrôle tension..."
                               className={inputCls} {...focusStyle} />
                    </div>

                    {/* Statut */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Statut</label>
                        <select name="statut" value={form.statut} onChange={handleChange}
                                className={inputCls} {...focusStyle}>
                            {(Object.entries(STATUT_CONFIG) as [ConsultationStatut, { label: string }][]).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Diagnostic */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Diagnostic</label>
                        <textarea name="diagnostic" value={form.diagnostic} onChange={handleChange} rows={2}
                                  placeholder="Diagnostic posé..."
                                  className={inputCls + " resize-none"} {...focusStyle} />
                    </div>

                    {/* Ordonnance */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Ordonnance</label>
                        <textarea name="ordonnance" value={form.ordonnance} onChange={handleChange} rows={2}
                                  placeholder="Médicaments, posologie..."
                                  className={inputCls + " resize-none"} {...focusStyle} />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                                  placeholder="Observations complémentaires..."
                                  className={inputCls + " resize-none"} {...focusStyle} />
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                            className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#003152' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}>
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>
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
    const hasDetails = consult.diagnostic || consult.ordonnance || consult.notes

    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header cliquable */}
            <button
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                onClick={() => hasDetails && setExpanded(p => !p)}
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                     style={{ backgroundColor: '#003152', color: 'white' }}>
                    📋
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{consult.motif}</p>
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

            {/* Détails dépliables */}
            {expanded && hasDetails && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-50">
                    {consult.diagnostic && (
                        <div className="pt-3">
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
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing]     = useState<Consultation | undefined>(undefined)
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(consultations.length / PAGE_SIZE))
    const safePage = Math.min(currentPage, totalPages)
    const paginatedConsultations = consultations.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    )

    const openCreate = () => { setEditing(undefined); setShowModal(true) }
    const openEdit   = (c: Consultation) => { setEditing(c); setShowModal(true) }

    const handleSaved = (saved: Consultation) => {
        if (editing) {
            onUpdate(consultations.map(c => c.id === saved.id ? saved : c))
        } else {
            onUpdate([saved, ...consultations])
            setCurrentPage(1)
        }
        setShowModal(false)
    }

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
            {/* Modal création/édition */}
            {showModal && (
                <ConsultModal
                    patientId={patientId}
                    initial={editing}
                    onSave={handleSaved}
                    onCancel={() => setShowModal(false)}
                />
            )}

            {/* Modal confirmation suppression */}
            {confirmDelete !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">🗑️</div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cette consultation ?</h3>
                        <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
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

            {/* Header section */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">Historique des consultations</h2>
                    {consultations.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{consultations.length} consultation{consultations.length > 1 ? 's' : ''}</p>
                    )}
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#003152' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                >
                    <span>+</span> Nouvelle
                </button>
            </div>

            {/* Liste */}
            {consultations.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-sm font-medium text-gray-500">Aucune consultation enregistrée</p>
                    <p className="text-xs text-gray-300 mt-1">Cliquez sur « Nouvelle » pour ajouter la première consultation.</p>
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
