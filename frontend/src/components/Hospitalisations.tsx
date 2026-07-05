import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hospitalisation, StatutHospitalisation } from '../types'
import { deleteHospitalisation, enregistrerSortie } from '../api/hospitalisations.ts'

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

const STATUT_CONFIG: Record<StatutHospitalisation, { label: string; color: string; bg: string }> = {
    en_cours:   { label: 'En cours',   color: '#1d4ed8', bg: '#dbeafe' },
    terminee:   { label: 'Terminée',   color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    transferee: { label: 'Transférée', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
}

function StatutBadge({ statut }: { statut: StatutHospitalisation }) {
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

function HospitalisationCard({
                                 hosp,
                                 onDelete,
                                 onSortie,
                             }: {
    hosp: Hospitalisation
    onDelete: (id: number) => void
    onSortie: (h: Hospitalisation) => void
}) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="ht-card overflow-hidden">
            <button
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(p => !p)}
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                     style={{ backgroundColor: 'var(--ht-primary)', color: 'white' }}>
                    🏥
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{hosp.motif_admission}</p>
                        <StatutBadge statut={hosp.statut} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(hosp.date_admission)}
                        {hosp.service_nom && ` · ${hosp.service_nom}`}
                        {hosp.chambre && ` · Ch. ${hosp.chambre}${hosp.lit ? ` / Lit ${hosp.lit}` : ''}`}
                        {typeof hosp.duree_jours === 'number' && ` · ${hosp.duree_jours} j`}
                    </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {hosp.statut === 'en_cours' && (
                        <button
                            onClick={e => { e.stopPropagation(); onSortie(hosp) }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                            style={{ color: 'var(--ht-success)', backgroundColor: 'var(--ht-success-bg)' }}
                        >
                            Sortie
                        </button>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(hosp.id) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                        title="Supprimer"
                    >🗑️</button>
                    <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-50">
                    <div className="pt-3 grid grid-cols-2 gap-3 text-xs text-gray-500">
                        {hosp.medecin_nom && <p>Médecin : <span className="text-gray-700 font-medium">{hosp.medecin_nom}</span></p>}
                        {hosp.date_sortie_prevue && <p>Sortie prévue : {formatDate(hosp.date_sortie_prevue)}</p>}
                        {hosp.date_sortie && <p>Sortie réelle : {formatDateTime(hosp.date_sortie)}</p>}
                    </div>
                    {hosp.diagnostic_entree && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnostic d'entrée</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{hosp.diagnostic_entree}</p>
                        </div>
                    )}
                    {hosp.diagnostic_sortie && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnostic de sortie</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{hosp.diagnostic_sortie}</p>
                        </div>
                    )}
                    {hosp.notes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm text-gray-500 whitespace-pre-line">{hosp.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function DeleteModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cette hospitalisation ?</h3>
                <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60">
                        {loading ? 'Suppression…' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function SortieModal({ hosp, onConfirm, onCancel }: {
    hosp: Hospitalisation
    onConfirm: (data: { diagnostic_sortie: string; notes: string }) => void
    onCancel: () => void
}) {
    const [diagnosticSortie, setDiagnosticSortie] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-md space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Enregistrer la sortie de {hosp.patient_nom}</h3>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnostic de sortie</label>
                    <textarea value={diagnosticSortie} onChange={e => setDiagnosticSortie(e.target.value)} rows={2}
                              className="ht-input w-full px-3 py-2.5 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                              className="ht-input w-full px-3 py-2.5 text-sm" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button
                        onClick={() => { setLoading(true); onConfirm({ diagnostic_sortie: diagnosticSortie, notes }) }}
                        disabled={loading}
                        className="btn btn-primary flex-1"
                    >
                        {loading ? 'Enregistrement…' : 'Confirmer la sortie'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Hospitalisations({
                                             patientId,
                                             hospitalisations,
                                             onUpdate,
                                         }: {
    patientId: number
    hospitalisations: Hospitalisation[]
    onUpdate: (list: Hospitalisation[]) => void
}) {
    const navigate = useNavigate()
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [sortieTarget, setSortieTarget] = useState<Hospitalisation | null>(null)

    const handleDelete = async (id: number) => {
        setDeleteLoading(true)
        try {
            await deleteHospitalisation(id)
            onUpdate(hospitalisations.filter(h => h.id !== id))
        } finally {
            setDeleteLoading(false)
            setConfirmDelete(null)
        }
    }

    const handleSortie = async (data: { diagnostic_sortie: string; notes: string }) => {
        if (!sortieTarget) return
        const updated = await enregistrerSortie(sortieTarget.id, data)
        onUpdate(hospitalisations.map(h => (h.id === updated.id ? updated : h)))
        setSortieTarget(null)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Hospitalisations</h2>
                <button
                    onClick={() => navigate(`/patients/${patientId}/hospitalisations/new`)}
                    className="btn btn-primary btn-sm"
                >
                    + Nouvelle hospitalisation
                </button>
            </div>

            {hospitalisations.length === 0 ? (
                <div className="ht-card p-6 text-center text-sm text-gray-400">
                    Aucune hospitalisation enregistrée.
                </div>
            ) : (
                <div className="space-y-3">
                    {hospitalisations.map(h => (
                        <HospitalisationCard
                            key={h.id}
                            hosp={h}
                            onDelete={setConfirmDelete}
                            onSortie={setSortieTarget}
                        />
                    ))}
                </div>
            )}

            {confirmDelete !== null && (
                <DeleteModal
                    loading={deleteLoading}
                    onCancel={() => setConfirmDelete(null)}
                    onConfirm={() => handleDelete(confirmDelete)}
                />
            )}

            {sortieTarget && (
                <SortieModal
                    hosp={sortieTarget}
                    onCancel={() => setSortieTarget(null)}
                    onConfirm={handleSortie}
                />
            )}
        </div>
    )
}