import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hospitalisation, StatutHospitalisation } from '../types'
import { deleteHospitalisation, enregistrerSortie } from '../api/hospitalisations.ts'
import {
    Stethoscope,
    Trash2,
    ChevronDown,
    ChevronUp,
    LogOut,
    Calendar,
    User,
    ClipboardList,
    AlertCircle,
    Plus
} from 'lucide-react'

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

// Couleur "En cours" alignée sur var(--role-medecin) déjà existante, plutôt qu'un bleu improvisé
const STATUT_CONFIG: Record<StatutHospitalisation, { label: string; color: string; bg: string }> = {
    en_cours:   { label: 'En cours',   color: 'var(--role-medecin)', bg: 'rgba(14, 116, 144, 0.1)' },
    terminee:   { label: 'Terminée',   color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
    transferee: { label: 'Transférée', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
}

function StatutBadge({ statut }: { statut: StatutHospitalisation }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
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
        <div className="ht-card overflow-hidden border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
            <button
                className="w-full text-left px-5 py-4 flex items-start gap-4 transition-colors"
                style={{ color: 'var(--ht-text)' }}
                onClick={() => setExpanded(p => !p)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ht-muted-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--ht-primary)', color: 'white' }}>
                    <Stethoscope size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-text)' }}>{hosp.motif_admission}</p>
                        <StatutBadge statut={hosp.statut} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--ht-text-muted)' }}>
                        {formatDateTime(hosp.date_admission)}
                        {hosp.service_nom && ` · ${hosp.service_nom}`}
                        {hosp.chambre && ` · Ch. ${hosp.chambre}${hosp.lit ? ` / Lit ${hosp.lit}` : ''}`}
                        {typeof hosp.duree_jours === 'number' && ` · ${hosp.duree_jours} j`}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {hosp.statut === 'en_cours' && (
                        <button
                            onClick={e => { e.stopPropagation(); onSortie(hosp) }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all hover:opacity-90"
                            style={{ color: 'var(--ht-success)', backgroundColor: 'var(--ht-success-bg)' }}
                        >
                            <LogOut size={12} />
                            Sortie
                        </button>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(hosp.id) }}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--ht-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ht-danger)'; e.currentTarget.style.backgroundColor = 'var(--ht-danger-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ht-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                        title="Supprimer"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="p-1" style={{ color: 'var(--ht-text-muted)' }}>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--ht-border)' }}>
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                        {hosp.medecin_nom && (
                            <p className="flex items-center gap-1.5">
                                <User size={14} style={{ color: 'var(--ht-text-muted)' }} />
                                Médecin : <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{hosp.medecin_nom}</span>
                            </p>
                        )}
                        {hosp.date_sortie_prevue && (
                            <p className="flex items-center gap-1.5">
                                <Calendar size={14} style={{ color: 'var(--ht-text-muted)' }} />
                                Sortie prévue : <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{formatDate(hosp.date_sortie_prevue)}</span>
                            </p>
                        )}
                        {hosp.date_sortie && (
                            <p className="flex items-center gap-1.5">
                                <Calendar size={14} style={{ color: 'var(--ht-text-muted)' }} />
                                Sortie réelle : <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{formatDateTime(hosp.date_sortie)}</span>
                            </p>
                        )}
                    </div>

                    {hosp.diagnostic_entree && (
                        <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-text-muted)' }}>Diagnostic d'entrée</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text)' }}>{hosp.diagnostic_entree}</p>
                        </div>
                    )}

                    {hosp.diagnostic_sortie && (
                        <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ht-success-bg)', borderColor: 'var(--ht-success)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-success)' }}>Diagnostic de sortie</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text)' }}>{hosp.diagnostic_sortie}</p>
                        </div>
                    )}

                    {hosp.notes && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-text-muted)' }}>Notes complémentaires</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ht-text-secondary)' }}>{hosp.notes}</p>
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
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--ht-danger)' }}>
                    <AlertCircle size={20} />
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>Supprimer l'hospitalisation ?</h3>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--ht-text-secondary)' }}>Cette action est définitive et irréversible.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1">
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
                <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: 'var(--ht-border)' }}>
                    <ClipboardList size={20} style={{ color: 'var(--ht-primary)' }} />
                    <h3 className="text-base font-bold" style={{ color: 'var(--ht-text)' }}>Enregistrer la sortie</h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Patient : <span className="font-semibold" style={{ color: 'var(--ht-text)' }}>{hosp.patient_nom}</span></p>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Diagnostic de sortie</label>
                    <textarea value={diagnosticSortie} onChange={e => setDiagnosticSortie(e.target.value)} rows={3}
                              className="ht-input ht-textarea" placeholder="Spécifier l'état de santé général ou les conclusions cliniques..." />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Notes de sortie / Consignes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                              className="ht-input ht-textarea" placeholder="Traitements post-hospitalisation, rendez-vous de suivi..." />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button
                        onClick={() => { setLoading(true); onConfirm({ diagnostic_sortie: diagnosticSortie, notes }) }}
                        disabled={loading}
                        className="btn btn-primary flex-1 font-semibold"
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>Hospitalisations</h2>
                <button
                    onClick={() => navigate(`/patients/${patientId}/hospitalisations/new`)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                    <Plus size={14} />
                    Nouvelle hospitalisation
                </button>
            </div>

            {hospitalisations.length === 0 ? (
                <div className="ht-card p-8 text-center text-sm border border-dashed flex flex-col items-center justify-center gap-2"
                     style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', color: 'var(--ht-text-muted)' }}>
                    Aucune hospitalisation enregistrée pour le moment.
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