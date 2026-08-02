import { useState } from 'react'
import { X, FileText, Search } from 'lucide-react'
import { searchPatients } from '../../api/patients'
import { createFacture } from '../../api/facturation'
import type { PatientSearchResult, Facture } from '../../types'

interface Props {
    onClose: () => void
    onCreee: (facture: Facture) => void
}

export default function NouvelleFacture({ onClose, onCreee }: Props) {
    const [recherche, setRecherche] = useState('')
    const [resultats, setResultats] = useState<PatientSearchResult[]>([])
    const [recherche_en_cours, setRechercheEnCours] = useState(false)
    const [patient, setPatient] = useState<PatientSearchResult | null>(null)

    const [mutuelleNom, setMutuelleNom] = useState('')
    const [tauxDefaut, setTauxDefaut] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const handleRecherche = (q: string) => {
        setRecherche(q)
        if (q.trim().length < 2) { setResultats([]); return }
        setRechercheEnCours(true)
        searchPatients(q.trim())
            .then(setResultats)
            .catch(() => setResultats([]))
            .finally(() => setRechercheEnCours(false))
    }

    const handleSubmit = async () => {
        if (!patient) return
        setSubmitting(true)
        setErreur('')
        try {
            const facture = await createFacture({
                patient: patient.id,
                mutuelle_nom: mutuelleNom || undefined,
                part_assurance_pourcentage_defaut: tauxDefaut ? Number(tauxDefaut) : undefined,
            })
            onCreee(facture)
        } catch {
            setErreur("Erreur lors de la création de la facture.")
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <FileText size={17} /> Nouvelle facture
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                {!patient ? (
                    <div className="space-y-3">
                        <div className="relative flex items-center">
                            <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <input
                                type="text" autoFocus value={recherche}
                                onChange={e => handleRecherche(e.target.value)}
                                placeholder="Nom, prénom ou n° dossier du patient…"
                                className="ht-input pl-9"
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {recherche_en_cours && (
                                <p className="text-xs text-center py-4" style={{ color: 'var(--ht-text-muted)' }}>Recherche…</p>
                            )}
                            {!recherche_en_cours && recherche.trim().length >= 2 && resultats.length === 0 && (
                                <p className="text-xs text-center py-4" style={{ color: 'var(--ht-text-muted)' }}>Aucun patient trouvé</p>
                            )}
                            {resultats.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPatient(p)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--ht-muted-bg)] transition-colors text-left"
                                >
                                    <div className="ht-avatar ht-avatar-sm">{p.prenom[0]}{p.nom[0]}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ht-text)' }}>{p.prenom} {p.nom}</p>
                                        <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                            N° {p.numero_dossier} {p.service_nom ? `· ${p.service_nom}` : ''}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--ht-border)', backgroundColor: 'var(--ht-muted-bg)' }}>
                            <div className="ht-avatar ht-avatar-md">{patient.prenom[0]}{patient.nom[0]}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>{patient.prenom} {patient.nom}</p>
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>N° dossier {patient.numero_dossier}</p>
                            </div>
                            <button onClick={() => setPatient(null)} className="btn btn-secondary btn-sm text-xs">Changer</button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Mutuelle / Assurance (optionnel)
                            </label>
                            <input
                                type="text" value={mutuelleNom} onChange={e => setMutuelleNom(e.target.value)}
                                placeholder="ex: IPM Sénégal — laisser vide si patient non couvert"
                                className="ht-input"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Taux de prise en charge par défaut (%)
                            </label>
                            <input
                                type="number" min={0} max={100} value={tauxDefaut}
                                onChange={e => setTauxDefaut(e.target.value)}
                                placeholder="0 si non renseigné — modifiable ligne par ligne ensuite"
                                className="ht-input"
                            />
                        </div>

                        {erreur && (
                            <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>
                        )}

                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
                                {submitting ? 'Création…' : 'Créer la facture (brouillon)'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}