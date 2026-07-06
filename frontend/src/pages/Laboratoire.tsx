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
import Sidebar from '../components/layout/Sidebar.tsx'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonSimpleList } from '../components/Skeleton'

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
    en_cours: { label: 'En cours', color: '#1d4ed8', bg: '#dbeafe' },
    terminee: { label: 'Terminée', color: '#166534', bg: 'var(--ht-success-bg)' },
    annulee: { label: 'Annulée', color: 'var(--ht-muted)', bg: 'var(--ht-muted-bg)' },
}

function StatutBadge({ statut }: { statut: StatutAnalyse }) {
    const cfg = STATUT_CONFIG[statut]
    return (
        <span className="badge" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
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
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900">Nouvelle demande d'analyse</h3>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Patient</label>
                    {selectedPatient ? (
                        <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                            <span>{selectedPatient.prenom} {selectedPatient.nom}</span>
                            <button onClick={() => setPatientId(null)} className="text-xs text-gray-400 hover:text-gray-700">Changer</button>
                        </div>
                    ) : (
                        <>
                            <input type="text" placeholder="Rechercher un patient par nom…" value={search}
                                   onChange={e => setSearch(e.target.value)}
                                   className="ht-input w-full px-3 py-2.5 text-sm" />
                            {results.length > 0 && (
                                <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
                                    {results.map(p => (
                                        <button key={p.id} onClick={() => { setPatientId(p.id); setSearch('') }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                            {p.prenom} {p.nom} <span className="text-gray-400 text-xs">· {p.date_naissance}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Type d'analyse</label>
                    <select value={typeAnalyse} onChange={e => setTypeAnalyse(e.target.value as TypeAnalyse)}
                            className="ht-input w-full px-3 py-2.5 text-sm">
                        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Urgence</label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                        <button type="button" onClick={() => setUrgence('normale')} className="flex-1 py-2 transition-colors"
                                style={urgence === 'normale' ? { backgroundColor: 'var(--ht-primary)', color: 'white' } : { backgroundColor: 'white', color: 'var(--ht-muted)' }}>
                            Normale
                        </button>
                        <button type="button" onClick={() => setUrgence('urgente')} className="flex-1 py-2 transition-colors"
                                style={urgence === 'urgente' ? { backgroundColor: 'var(--ht-danger)', color: 'white' } : { backgroundColor: 'white', color: 'var(--ht-muted)' }}>
                            🚨 Urgente
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes pour le laboratoire (optionnel)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Contexte clinique, suspicion diagnostique..." />
                </div>

                {erreur && <p className="text-sm text-red-500">{erreur}</p>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={!patientId || submitting}
                            className="btn btn-primary flex-1">
                        {submitting ? 'Envoi…' : 'Envoyer la demande'}
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
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        {demande.type_label} — {demande.patient_prenom || demande.patient_nom} {demande.patient_nom_famille || ''}
                    </h3>
                    {demande.notes_medecin && (
                        <p className="text-xs text-gray-400 mt-1">Note du médecin : {demande.notes_medecin}</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Résultats *</label>
                    <textarea value={resultats} onChange={e => setResultats(e.target.value)} rows={5}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Ex : Hémoglobine 13.2 g/dL, Globules blancs 7200/mm³..." />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Valeurs normales de référence (optionnel)</label>
                    <textarea value={valeursNormales} onChange={e => setValeursNormales(e.target.value)} rows={2}
                              className="ht-input w-full px-3 py-2.5 text-sm"
                              placeholder="Ex : Hémoglobine : 12–16 g/dL" />
                </div>

                {erreur && <p className="text-sm text-red-500">{erreur}</p>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-ghost flex-1">
                        Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={!resultats.trim() || submitting}
                            className="btn btn-primary flex-1">
                        {submitting ? 'Envoi…' : 'Valider les résultats'}
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
        <div className="px-5 py-3.5 flex items-center gap-3">
            {demande.urgence === 'urgente' && demande.statut !== 'terminee' && demande.statut !== 'annulee' && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Urgente" />
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{demande.type_label}</p>
                <p className="text-xs text-gray-400 truncate">
                    {nomPatient} {demande.patient_dossier ? `· ${demande.patient_dossier}` : ''}
                    {demande.demandeur_nom && !isLab ? '' : demande.demandeur_nom ? ` · ${demande.demandeur_nom}` : ''}
                    {' · '}{tempsEcoule(demande.date_demande)}
                </p>
            </div>
            <StatutBadge statut={demande.statut} />
            <div className="flex gap-2">
                {isLab && demande.statut === 'en_attente' && (
                    <button onClick={() => onPrendreEnCharge(demande)}
                            className="btn btn-primary btn-sm">
                        Prendre en charge
                    </button>
                )}
                {isLab && demande.statut === 'en_cours' && (
                    <button onClick={() => onSaisirResultats(demande)}
                            className="btn btn-primary btn-sm">
                        Saisir résultats
                    </button>
                )}
                {demande.statut === 'terminee' && (
                    <button onClick={() => onVoirResultats(demande)}
                            className="btn btn-ghost btn-sm">
                        Voir résultats
                    </button>
                )}
                {canManage && (demande.statut === 'en_attente' || demande.statut === 'en_cours') && (
                    <button onClick={() => onAnnuler(demande)}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50">
                        Annuler
                    </button>
                )}
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
    const [erreurAction, setErreurAction] = useState('')

    useEffect(() => {
        getDemandes().then(setDemandes).catch(() => setDemandes([]))
        if (canRequest) getPatients().then(setPatients).catch(() => setPatients([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const demandesFiltrees = (demandes ?? []).filter(d => filtreStatut === 'tous' || d.statut === filtreStatut)
        .sort((a, b) => {
            // Urgentes non traitées en premier, puis les plus récentes
            const aUrg = a.urgence === 'urgente' && (a.statut === 'en_attente' || a.statut === 'en_cours') ? 0 : 1
            const bUrg = b.urgence === 'urgente' && (b.statut === 'en_attente' || b.statut === 'en_cours') ? 0 : 1
            if (aUrg !== bUrg) return aUrg - bUrg
            return new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime()
        })

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
            setErreurAction("Impossible de prendre en charge cette demande (déjà traitée par quelqu'un d'autre ?).")
        }
    }

    const handleAnnuler = async (d: DemandeAnalyse) => {
        if (!window.confirm(`Annuler la demande "${d.type_label}" ?`)) return
        setErreurAction('')
        try {
            const updated = await annulerDemande(d.id)
            setDemandes(prev => prev ? prev.map(x => x.id === d.id ? updated : x) : prev)
        } catch {
            setErreurAction("Impossible d'annuler cette demande.")
        }
    }

    return (
        <div className="ht-page flex flex-col">
            <Sidebar />

            <div className="max-w-4xl mx-auto px-6 py-8 w-full space-y-6">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">🧪 Laboratoire</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {isLab ? "Demandes d'analyses à traiter pour votre service" : "Suivi des demandes d'analyses de votre service"}
                        </p>
                    </div>
                    {canRequest && (
                        <button onClick={() => setShowNouvelle(true)}
                                className="btn btn-primary">
                            + Nouvelle demande
                        </button>
                    )}
                </div>

                {erreurAction && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {erreurAction}
                    </div>
                )}

                {/* Filtres statut */}
                <div className="flex flex-wrap gap-2">
                    {(['tous', 'en_attente', 'en_cours', 'terminee', 'annulee'] as const).map(s => (
                        <button key={s} onClick={() => setFiltreStatut(s)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                                style={filtreStatut === s
                                    ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                                    : { backgroundColor: 'white', color: 'var(--ht-muted)', borderColor: 'var(--ht-border-input)' }}>
                            {s === 'tous' ? `Toutes (${demandes?.length ?? 0})` : `${STATUT_CONFIG[s].label} (${compteurs[s] ?? 0})`}
                        </button>
                    ))}
                </div>

                <div className="ht-card">
                    {demandes === null ? (
                        <SkeletonSimpleList rows={4} />
                    ) : demandesFiltrees.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-4xl mb-3">🧪</p>
                            <p className="text-gray-400 text-sm">
                                {filtreStatut === 'tous' ? "Aucune demande d'analyse pour le moment" : 'Aucune demande dans cette catégorie'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {demandesFiltrees.map(d => (
                                <DemandeRow key={d.id} demande={d} isLab={isLab} canManage={canManage}
                                            onPrendreEnCharge={handlePrendreEnCharge}
                                            onAnnuler={handleAnnuler}
                                            onSaisirResultats={setResultatsCible}
                                            onVoirResultats={setResultatsCible} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showNouvelle && (
                <NouvelleDemandeModal
                    patients={patients}
                    onClose={() => setShowNouvelle(false)}
                    onCreated={d => { setDemandes(prev => prev ? [d, ...prev] : [d]); setShowNouvelle(false) }}
                />
            )}

            {resultatsCible && resultatsCible.statut === 'terminee' && (
                <div className="ht-modal-overlay"
                     onClick={() => setResultatsCible(null)}>
                    <div className="ht-modal ht-modal-md space-y-4 max-h-[90vh] overflow-y-auto"
                         onClick={e => e.stopPropagation()}>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">{resultatsCible.type_label}</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {resultatsCible.patient_prenom || resultatsCible.patient_nom} {resultatsCible.patient_nom_famille || ''}
                                {' · '}résultats du {new Date(resultatsCible.date_resultat!).toLocaleString('fr-FR')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Résultats</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{resultatsCible.resultats}</p>
                        </div>
                        {resultatsCible.valeurs_normales && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Valeurs normales de référence</p>
                                <p className="text-sm text-gray-500 whitespace-pre-wrap">{resultatsCible.valeurs_normales}</p>
                            </div>
                        )}
                        <button onClick={() => setResultatsCible(null)}
                                className="btn btn-ghost w-full">
                            Fermer
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