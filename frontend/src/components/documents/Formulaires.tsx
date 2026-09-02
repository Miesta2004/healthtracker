import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import type {
    ChampsOrdonnance, ChampsCertificatMedical, ChampsDemandeExamen,
    ChampsCompteRendu, ChampsLettreOrientation, ChampsArretTravail, Medicament, LigneExamen,
} from '../../types'
import { rechercherMedicaments } from '../../api/documents'
import { LIGNE_MEDICAMENT_VIDE, LIGNE_EXAMEN_VIDE, EXAMENS_SUGGERES } from '../../constants/schemas'

interface FormProps<C> {
    champs: C
    onChange: (champs: C) => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="ht-label mb-1 block">{children}</label>
}

/**
 * Dropdown de suggestions générique, factorisé pour être partagé entre
 * RechercheMedicament et FormulaireDemandeExamen (les deux avaient un bloc
 * quasi identique dupliqué auparavant).
 */
function SuggestionsDropdown<T>({
                                    items,
                                    ouvert,
                                    getKey,
                                    onPick,
                                    renderItem,
                                    maxHeightClass = 'max-h-40',
                                }: {
    items: T[]
    ouvert: boolean
    getKey: (item: T) => string | number
    onPick: (item: T) => void
    renderItem: (item: T) => React.ReactNode
    maxHeightClass?: string
}) {
    if (!ouvert || items.length === 0) return null
    return (
        <div
            className={`absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg ${maxHeightClass} overflow-y-auto`}
            style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}
        >
            {items.map(item => (
                <button
                    key={getKey(item)}
                    type="button"
                    onMouseDown={() => onPick(item)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--ht-bg)] flex items-center justify-between"
                >
                    {renderItem(item)}
                </button>
            ))}
        </div>
    )
}

function RechercheMedicament({ valeur, onSelect }: { valeur: string; onSelect: (m: Medicament) => void }) {
    const [texte, setTexte] = useState(valeur)
    const [suggestions, setSuggestions] = useState<Medicament[]>([])
    const [ouvert, setOuvert] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { setTexte(valeur) }, [valeur])

    const handleChange = (v: string) => {
        setTexte(v)
        onSelect({ id: 0, nom: v, dci: '', forme: '', dosages_courants: '' })
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (v.trim().length < 2) { setSuggestions([]); return }
        timeoutRef.current = setTimeout(async () => {
            const resultats = await rechercherMedicaments(v)
            setSuggestions(resultats)
        }, 250)
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--ht-text-muted)' }} />
                <input
                    value={texte}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => setOuvert(true)}
                    onBlur={() => setTimeout(() => setOuvert(false), 150)}
                    placeholder="Rechercher un médicament…"
                    className="ht-input pl-6 text-sm py-1.5"
                />
            </div>
            <SuggestionsDropdown
                items={suggestions}
                ouvert={ouvert}
                getKey={m => m.id}
                onPick={m => { onSelect(m); setTexte(m.nom); setOuvert(false) }}
                renderItem={m => (
                    <span>
                        <span className="font-medium">{m.nom}</span>
                        {m.dosages_courants && <span className="text-xs ml-1.5" style={{ color: 'var(--ht-text-muted)' }}>{m.dosages_courants}</span>}
                    </span>
                )}
            />
        </div>
    )
}

export function FormulaireOrdonnance({ champs, onChange }: FormProps<ChampsOrdonnance>) {
    const majLigne = (i: number, patch: Partial<typeof LIGNE_MEDICAMENT_VIDE>) => {
        onChange({ ...champs, medicaments: champs.medicaments.map((m, idx) => idx === i ? { ...m, ...patch } : m) })
    }
    const supprimerLigne = (i: number) => onChange({ ...champs, medicaments: champs.medicaments.filter((_, idx) => idx !== i) })
    const ajouterLigne = () => onChange({ ...champs, medicaments: [...champs.medicaments, { ...LIGNE_MEDICAMENT_VIDE }] })

    return (
        <div className="space-y-4">
            {champs.medicaments.map((m, i) => (
                <div key={i} className="border rounded-xl p-3 space-y-2" style={{ borderColor: 'var(--ht-border)' }}>
                    <div className="flex items-start gap-2">
                        <div className="flex-1">
                            <RechercheMedicament valeur={m.nom} onSelect={med => majLigne(i, { nom: med.nom })} />
                        </div>
                        <button onClick={() => supprimerLigne(i)} className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ color: 'var(--ht-danger)' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={m.dosage} onChange={e => majLigne(i, { dosage: e.target.value })} placeholder="Dosage (ex : 20 mg)" className="ht-input text-sm py-1.5" />
                        <input value={m.posologie} onChange={e => majLigne(i, { posologie: e.target.value })} placeholder="Posologie (ex : 1 gélule)" className="ht-input text-sm py-1.5" />
                        <input value={m.frequence} onChange={e => majLigne(i, { frequence: e.target.value })} placeholder="Fréquence (ex : le matin)" className="ht-input text-sm py-1.5" />
                        <input value={m.duree} onChange={e => majLigne(i, { duree: e.target.value })} placeholder="Durée (ex : 14 jours)" className="ht-input text-sm py-1.5" />
                        <input value={m.quantite} onChange={e => majLigne(i, { quantite: e.target.value })} placeholder="Quantité (ex : 1 boîte)" className="ht-input text-sm py-1.5" />
                        <input value={m.conseils} onChange={e => majLigne(i, { conseils: e.target.value })} placeholder="Conseils (ex : à jeun)" className="ht-input text-sm py-1.5" />
                    </div>
                </div>
            ))}
            <button onClick={ajouterLigne} className="btn btn-secondary btn-sm gap-1.5">
                <Plus size={14} /> Ajouter un médicament
            </button>
            <div className="ht-field">
                <FieldLabel>Conseils généraux</FieldLabel>
                <textarea value={champs.conseils_generaux} onChange={e => onChange({ ...champs, conseils_generaux: e.target.value })} rows={2} className="ht-input ht-textarea" />
            </div>
        </div>
    )
}

export function FormulaireCertificatMedical({ champs, onChange }: FormProps<ChampsCertificatMedical>) {
    return (
        <div className="space-y-4">
            <div className="ht-field">
                <FieldLabel>Motif</FieldLabel>
                <input value={champs.motif} onChange={e => onChange({ ...champs, motif: e.target.value })} className="ht-input" />
            </div>
            <div className="ht-field">
                <FieldLabel>Constat</FieldLabel>
                <textarea value={champs.constat} onChange={e => onChange({ ...champs, constat: e.target.value })} rows={3} className="ht-input ht-textarea" />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="ht-field">
                    <FieldLabel>Repos (jours)</FieldLabel>
                    <input type="number" value={champs.duree_repos_jours ?? ''}
                           onChange={e => onChange({ ...champs, duree_repos_jours: e.target.value ? Number(e.target.value) : null })} className="ht-input" />
                </div>
                <div className="ht-field">
                    <FieldLabel>Début</FieldLabel>
                    <input type="date" value={champs.date_debut} onChange={e => onChange({ ...champs, date_debut: e.target.value })} className="ht-input" />
                </div>
                <div className="ht-field">
                    <FieldLabel>Fin</FieldLabel>
                    <input type="date" value={champs.date_fin} onChange={e => onChange({ ...champs, date_fin: e.target.value })} className="ht-input" />
                </div>
            </div>
            <div className="ht-field">
                <FieldLabel>Observations</FieldLabel>
                <textarea value={champs.observations} onChange={e => onChange({ ...champs, observations: e.target.value })} rows={2} className="ht-input ht-textarea" />
            </div>
        </div>
    )
}

export function FormulaireDemandeExamen({ champs, onChange }: FormProps<ChampsDemandeExamen>) {
    const [recherche, setRecherche] = useState('')
    const suggestions = EXAMENS_SUGGERES.filter(e => e.nom.toLowerCase().includes(recherche.toLowerCase()) && !champs.examens.some(x => x.nom === e.nom))

    const ajouterExamen = (e: LigneExamen) => { onChange({ ...champs, examens: [...champs.examens, e] }); setRecherche('') }
    const ajouterExamenLibre = () => { if (recherche.trim()) ajouterExamen({ ...LIGNE_EXAMEN_VIDE, nom: recherche.trim() }) }
    const supprimerExamen = (i: number) => onChange({ ...champs, examens: champs.examens.filter((_, idx) => idx !== i) })

    return (
        <div className="space-y-4">
            <div className="ht-field">
                <FieldLabel>Urgence</FieldLabel>
                <select value={champs.urgence} onChange={e => onChange({ ...champs, urgence: e.target.value as 'normale' | 'urgente' })} className="ht-input">
                    <option value="normale">Normale</option>
                    <option value="urgente">Urgente</option>
                </select>
            </div>
            <div className="ht-field">
                <FieldLabel>Indication clinique</FieldLabel>
                <textarea value={champs.indication_clinique} onChange={e => onChange({ ...champs, indication_clinique: e.target.value })} rows={2} className="ht-input ht-textarea" />
            </div>
            <div className="ht-field">
                <FieldLabel>Examens</FieldLabel>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {champs.examens.map((e, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5"
                              style={{ borderColor: 'var(--ht-primary-tint-text)', backgroundColor: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' }}>
                            {e.nom}<button onClick={() => supprimerExamen(i)}>✕</button>
                        </span>
                    ))}
                </div>
                <div className="relative">
                    <input value={recherche} onChange={ev => setRecherche(ev.target.value)} onKeyDown={ev => ev.key === 'Enter' && ajouterExamenLibre()}
                           placeholder="Rechercher ou saisir un examen, puis Entrée…" className="ht-input text-sm py-1.5" />
                    <SuggestionsDropdown
                        items={suggestions}
                        ouvert={!!recherche && suggestions.length > 0}
                        getKey={s => s.nom}
                        onPick={ajouterExamen}
                        maxHeightClass="max-h-36"
                        renderItem={s => (
                            <>
                                {s.nom}<span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{s.categorie}</span>
                            </>
                        )}
                    />
                </div>
            </div>
            <div className="ht-field">
                <FieldLabel>Commentaires</FieldLabel>
                <textarea value={champs.commentaires} onChange={e => onChange({ ...champs, commentaires: e.target.value })} rows={2} className="ht-input ht-textarea" />
            </div>
        </div>
    )
}

export function FormulaireCompteRendu({ champs, onChange }: FormProps<ChampsCompteRendu>) {
    return (
        <div className="space-y-4">
            <div className="ht-field">
                <FieldLabel>Résumé</FieldLabel>
                <textarea value={champs.resume} onChange={e => onChange({ ...champs, resume: e.target.value })} rows={4} className="ht-input ht-textarea" />
            </div>
            <div className="ht-field">
                <FieldLabel>Évolution</FieldLabel>
                <textarea value={champs.evolution} onChange={e => onChange({ ...champs, evolution: e.target.value })} rows={3} className="ht-input ht-textarea" />
            </div>
            <div className="ht-field">
                <FieldLabel>Recommandations</FieldLabel>
                <textarea value={champs.recommandations} onChange={e => onChange({ ...champs, recommandations: e.target.value })} rows={3} className="ht-input ht-textarea" />
            </div>
        </div>
    )
}

export function FormulaireLettreOrientation({ champs, onChange }: FormProps<ChampsLettreOrientation>) {
    return (
        <div className="space-y-4">
            <div className="ht-field">
                <FieldLabel>Destinataire</FieldLabel>
                <input value={champs.destinataire} onChange={e => onChange({ ...champs, destinataire: e.target.value })} placeholder="Ex : Dr Diop, cardiologue" className="ht-input" />
            </div>
            <div className="ht-field">
                <FieldLabel>Motif de l'orientation</FieldLabel>
                <input value={champs.motif_orientation} onChange={e => onChange({ ...champs, motif_orientation: e.target.value })} className="ht-input" />
            </div>
            <div className="ht-field">
                <FieldLabel>Éléments cliniques</FieldLabel>
                <textarea value={champs.elements_cliniques} onChange={e => onChange({ ...champs, elements_cliniques: e.target.value })} rows={3} className="ht-input ht-textarea" />
            </div>
            <div className="ht-field">
                <FieldLabel>Conclusion</FieldLabel>
                <textarea value={champs.conclusion} onChange={e => onChange({ ...champs, conclusion: e.target.value })} rows={2} className="ht-input ht-textarea" />
            </div>
        </div>
    )
}

export function FormulaireArretTravail({ champs, onChange }: FormProps<ChampsArretTravail>) {
    const majDates = (patch: Partial<ChampsArretTravail>) => {
        const suivant = { ...champs, ...patch }
        if (suivant.date_debut && suivant.date_fin) {
            const jours = Math.round((new Date(suivant.date_fin).getTime() - new Date(suivant.date_debut).getTime()) / (1000 * 60 * 60 * 24)) + 1
            suivant.duree_jours = jours > 0 ? jours : null
        } else {
            suivant.duree_jours = null
        }
        onChange(suivant)
    }

    return (
        <div className="space-y-4">
            <div className="ht-field">
                <FieldLabel>Motif médical</FieldLabel>
                <textarea value={champs.motif_medical} onChange={e => onChange({ ...champs, motif_medical: e.target.value })} rows={3} className="ht-input ht-textarea" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="ht-field">
                    <FieldLabel>Début</FieldLabel>
                    <input type="date" value={champs.date_debut} onChange={e => majDates({ date_debut: e.target.value })} className="ht-input" />
                </div>
                <div className="ht-field">
                    <FieldLabel>Fin</FieldLabel>
                    <input type="date" value={champs.date_fin} onChange={e => majDates({ date_fin: e.target.value })} className="ht-input" />
                </div>
            </div>
            {champs.duree_jours && <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Soit {champs.duree_jours} jour(s) d'arrêt.</p>}
        </div>
    )
}
