import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient } from '../api/patients'
import { createAntecedent } from '../api/antecedents'
import type { TypeAntecedent } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import {
    Search,
    Check,
    Plus,
    X,
    ChevronRight,
    ChevronLeft,
    UserPlus
} from 'lucide-react'

// ─── Données médicales de référence ──────────────────────────────────────────
const ALLERGIES_COMMUNES = [
    'Pénicilline', 'Amoxicilline', 'Aspirine', 'Ibuprofène', 'Paracétamol',
    'Sulfamides', 'Codéine', 'Morphine', 'Latex', 'Arachides',
    'Fruits à coque', 'Gluten', 'Lactose', 'Œufs', 'Fruits de mer',
    'Pollen', 'Acariens', 'Poils d\'animaux', 'Moisissures', 'Nickel',
    'Iode (produits de contraste)',
]

const ANTECEDENTS_COMMUNS = [
    'Diabète type 1', 'Diabète type 2', 'Hypertension artérielle',
    'Insuffisance cardiaque', 'Coronaropathie', 'Arythmie cardiaque',
    'Asthme', 'BPCO', 'Insuffisance rénale chronique',
    'Cirrhose hépatique', 'Hépatite B', 'Hépatite C',
    'Epilepsie', 'AVC', 'Parkinson', 'Alzheimer',
    'Dépression', 'Anxiété', 'Schizophrénie', 'Trouble bipolaire',
    'Appendicectomie', 'Cholécystectomie', 'Césarienne',
    'Bypass gastrique', 'Amygdalectomie', 'Hernie inguinale opérée',
    'Cancer du sein', 'Cancer du côlon', 'Cancer de la prostate',
    'Cancer du poumon', 'Cancer du col de l\'utérus',
    'Drépanocytose', 'Paludisme chronique', 'Tuberculose',
    'VIH / SIDA', 'Hypothyroïdie', 'Hyperthyroïdie',
]

// Antécédents de la liste ci-dessus qui correspondent à une chirurgie plutôt qu'à une maladie chronique
const ANTECEDENTS_CHIRURGICAUX = new Set([
    'Appendicectomie', 'Cholécystectomie', 'Césarienne',
    'Bypass gastrique', 'Amygdalectomie', 'Hernie inguinale opérée',
])

function inferTypeAntecedent(libelle: string): TypeAntecedent {
    return ANTECEDENTS_CHIRURGICAUX.has(libelle) ? 'chirurgie' : 'maladie_chronique'
}

// ─── Composant tag sélectionnable ─────────────────────────────────────────────
function TagButton({
                       label, selected, onClick
                   }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-1"
            style={selected
                ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)', borderColor: 'var(--ht-border)' }
            }
        >
            {selected && <Check size={12} />}
            {label}
        </button>
    )
}

// ─── Composant champ texte libre "Autre" ─────────────────────────────────────
function AutreInput({
                        placeholder, onAdd
                    }: { placeholder: string; onAdd: (val: string) => void }) {
    const [val, setVal] = useState('')
    return (
        <div className="flex gap-2 mt-2">
            <input
                type="text"
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        if (val.trim()) { onAdd(val.trim()); setVal('') }
                    }
                }}
                placeholder={placeholder}
                className="ht-input flex-1"
            />
            <button
                type="button"
                onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}
                className="btn btn-primary btn-sm gap-1 text-xs"
            >
                <Plus size={12} /> Ajouter
            </button>
        </div>
    )
}

// ─── Composant Field simple ───────────────────────────────────────────────────
function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '' }: {
    label: string; name: string; value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    type?: string; required?: boolean; placeholder?: string
}) {
    return (
        <div className="ht-field">
            <label className="ht-label">{label}</label>
            <input
                type={type} name={name} value={value} onChange={onChange}
                required={required} placeholder={placeholder}
                className="ht-input"
            />
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AddPatient() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState<1 | 2>(1)

    const [form, setForm] = useState({
        nom: '', prenom: '', date_naissance: '', sexe: '',
        groupe_sanguin: '', telephone: '', adresse: '',
    })

    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
    const [customAllergies, setCustomAllergies] = useState<string[]>([])

    const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([])
    const [customAntecedents, setCustomAntecedents] = useState<string[]>([])

    const [searchAllergie, setSearchAllergie] = useState('')
    const [searchAntecedent, setSearchAntecedent] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const toggleAllergie = (val: string) => {
        setSelectedAllergies(prev =>
            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
        )
    }
    const toggleAntecedent = (val: string) => {
        setSelectedAntecedents(prev =>
            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
        )
    }
    const removeCustomAllergie = (val: string) => setCustomAllergies(prev => prev.filter(x => x !== val))
    const removeCustomAntecedent = (val: string) => setCustomAntecedents(prev => prev.filter(x => x !== val))

    const allAllergies = [...selectedAllergies, ...customAllergies]
    const allAntecedents = [...selectedAntecedents, ...customAntecedents]

    const filteredAllergies = useMemo(() =>
            ALLERGIES_COMMUNES.filter(a => a.toLowerCase().includes(searchAllergie.toLowerCase())),
        [searchAllergie]
    )
    const filteredAntecedents = useMemo(() =>
            ANTECEDENTS_COMMUNS.filter(a => a.toLowerCase().includes(searchAntecedent.toLowerCase())),
        [searchAntecedent]
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload = {
                ...form,
                allergies: allAllergies.join(', ') || '',
                antecedents: allAntecedents.join(', ') || '',
            }
            const response = await createPatient(payload)

            // Les antécédents saisis à la création doivent aussi exister comme
            // entrées structurées dans le dossier (celles affichées dans le panneau
            // « Antécédents »), pas seulement dans le champ texte du patient.
            const today = new Date().toISOString().slice(0, 10)
            await Promise.all(
                allAntecedents.map(libelle =>
                    createAntecedent({
                        patient: response.id,
                        type_antecedent: inferTypeAntecedent(libelle),
                        libelle,
                        statut: 'actif',
                        date_diagnostic: today,
                    }).catch(() => null)
                )
            )

            navigate(`/patients/${response.id}`)
        } catch {
            setError('Erreur lors de la création du patient. Vérifie les informations.')
        } finally {
            setLoading(false)
        }
    }

    const step1Valid = form.prenom && form.nom && form.date_naissance && form.sexe

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-2xl mx-auto space-y-6">

                {/* Section En-tête */}
                <div className="pb-4" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>Ajouter un patient</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        {step === 1 ? "Informations d'identité et de contact" : 'Allergies et antécédents médicaux'}
                    </p>
                </div>

                {error && (
                    <div className="ht-alert ht-alert-danger">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── ÉTAPE 1 : infos personnelles ── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="ht-card ht-card-padded">
                                <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                                    Identité
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} required placeholder="Fatou" />
                                    <Field label="Nom *" name="nom" value={form.nom} onChange={handleChange} required placeholder="Diallo" />
                                    <Field label="Date de naissance *" name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />

                                    <div className="ht-field">
                                        <label className="ht-label">Sexe *</label>
                                        <select name="sexe" value={form.sexe} onChange={handleChange} required className="ht-input">
                                            <option value="">Sélectionner</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </select>
                                    </div>

                                    <div className="ht-field">
                                        <label className="ht-label">Groupe sanguin</label>
                                        <select name="groupe_sanguin" value={form.groupe_sanguin} onChange={handleChange} className="ht-input">
                                            <option value="">Inconnu</option>
                                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} placeholder="+221 77 000 00 00" />
                                </div>
                                <div className="mt-4 ht-field">
                                    <label className="ht-label">Adresse</label>
                                    <input name="adresse" value={form.adresse}
                                           onChange={e => setForm({ ...form, adresse: e.target.value })}
                                           className="ht-input"
                                           placeholder="Quartier, Ville"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    disabled={!step1Valid}
                                    onClick={() => setStep(2)}
                                    className="btn btn-primary gap-1"
                                >
                                    Suivant <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 2 : dossier médical ── */}
                    {step === 2 && (
                        <div className="space-y-6">

                            {/* Allergies */}
                            <div className="ht-card ht-card-padded">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                                        Allergies connues
                                    </h2>
                                    {allAllergies.length > 0 && (
                                        <span className="badge badge-tint">
                                            {allAllergies.length} sélectionnée{allAllergies.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mb-4" style={{ color: 'var(--ht-text-secondary)' }}>Cliquez pour sélectionner. Utilisez "Autre" si absent de la liste.</p>

                                {/* Sélections actuelles */}
                                {allAllergies.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 rounded-xl mb-4 border" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                                        {selectedAllergies.map(a => (
                                            <span key={a} className="badge badge-tint gap-1">
                                                {a}
                                                <button type="button" onClick={() => toggleAllergie(a)} className="hover:scale-110 transition-transform ml-0.5">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        {customAllergies.map(a => (
                                            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
                                                  style={{ borderColor: 'var(--ht-primary)', color: 'var(--ht-primary)' }}>
                                                {a} <span className="text-[10px] font-normal opacity-60">(autre)</span>
                                                <button type="button" onClick={() => removeCustomAllergie(a)} className="hover:scale-110 transition-transform ml-0.5">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Recherche */}
                                <div className="relative flex items-center mb-3">
                                    <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <input type="text" value={searchAllergie} onChange={e => setSearchAllergie(e.target.value)}
                                           placeholder="Rechercher une allergie..."
                                           className="ht-input pl-9"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 border-b pb-3" style={{ borderColor: 'var(--ht-border)' }}>
                                    {filteredAllergies.map(a => (
                                        <TagButton key={a} label={a} selected={selectedAllergies.includes(a)} onClick={() => toggleAllergie(a)} />
                                    ))}
                                    {filteredAllergies.length === 0 && (
                                        <p className="text-xs py-2" style={{ color: 'var(--ht-text-muted)' }}>Aucun résultat — utilisez le champ libre ci-dessous</p>
                                    )}
                                </div>

                                {/* Champ libre */}
                                <div className="mt-3">
                                    <p className="text-xs mb-1 font-semibold" style={{ color: 'var(--ht-text-secondary)' }}>Autre allergie non listée</p>
                                    <AutreInput
                                        placeholder="Ex : Aspirine générique, Latex chirurgical…"
                                        onAdd={val => {
                                            if (!customAllergies.includes(val) && !selectedAllergies.includes(val))
                                                setCustomAllergies(prev => [...prev, val])
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Antécédents */}
                            <div className="ht-card ht-card-padded">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                                        Antécédents médicaux
                                    </h2>
                                    {allAntecedents.length > 0 && (
                                        <span className="badge badge-tint">
                                            {allAntecedents.length} sélectionné{allAntecedents.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mb-4" style={{ color: 'var(--ht-text-secondary)' }}>Maladies chroniques, chirurgies, antécédents familiaux…</p>

                                {/* Sélections actuelles */}
                                {allAntecedents.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 rounded-xl mb-4 border" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                                        {selectedAntecedents.map(a => (
                                            <span key={a} className="badge badge-tint gap-1">
                                                {a}
                                                <button type="button" onClick={() => toggleAntecedent(a)} className="hover:scale-110 transition-transform ml-0.5">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        {customAntecedents.map(a => (
                                            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
                                                  style={{ borderColor: 'var(--ht-primary)', color: 'var(--ht-primary)' }}>
                                                {a} <span className="text-[10px] font-normal opacity-60">(autre)</span>
                                                <button type="button" onClick={() => removeCustomAntecedent(a)} className="hover:scale-110 transition-transform ml-0.5">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Recherche */}
                                <div className="relative flex items-center mb-3">
                                    <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <input type="text" value={searchAntecedent} onChange={e => setSearchAntecedent(e.target.value)}
                                           placeholder="Rechercher un antécédent..."
                                           className="ht-input pl-9"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 border-b pb-3" style={{ borderColor: 'var(--ht-border)' }}>
                                    {filteredAntecedents.map(a => (
                                        <TagButton key={a} label={a} selected={selectedAntecedents.includes(a)} onClick={() => toggleAntecedent(a)} />
                                    ))}
                                    {filteredAntecedents.length === 0 && (
                                        <p className="text-xs py-2" style={{ color: 'var(--ht-text-muted)' }}>Aucun résultat — utilisez le champ libre ci-dessous</p>
                                    )}
                                </div>

                                {/* Champ libre */}
                                <div className="mt-3">
                                    <p className="text-xs mb-1 font-semibold" style={{ color: 'var(--ht-text-secondary)' }}>Autre antécédent non listé</p>
                                    <AutreInput
                                        placeholder="Ex : Fracture du fémur 2018, Greffe rénale…"
                                        onAdd={val => {
                                            if (!customAntecedents.includes(val) && !selectedAntecedents.includes(val))
                                                setCustomAntecedents(prev => [...prev, val])
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Boutons de navigation pas à pas */}
                            <div className="flex gap-3 justify-between items-center pt-2">
                                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary gap-1.5">
                                    <ChevronLeft size={16} /> Retour
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary gap-1.5"
                                    >
                                        <UserPlus size={16} />
                                        {loading ? 'Enregistrement…' : 'Enregistrer le patient'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </main>
        </div>
    )
}