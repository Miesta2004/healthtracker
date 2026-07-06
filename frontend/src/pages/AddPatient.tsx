import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient } from '../api/patients'
import Sidebar from '../components/layout/Sidebar.tsx'


// ─── Données médicales de référence ──────────────────────────────────────────
const ALLERGIES_COMMUNES = [
    'Pénicilline', 'Amoxicilline', 'Aspirine', 'Ibuprofène', 'Paracétamol',
    'Sulfamides', 'Codéine', 'Morphine', 'Latex', 'Arachides',
    'Fruits à coque', 'Gluten', 'Lactose', 'Œufs', 'Fruits de mer',
    'Pollen', 'Acariens', 'Poils d\'animaux', 'Moisissures', 'Nickel',
    'Iode (produits de contraste)',
]

const ANTECEDENTS_COMMUNS = [
    // Maladies chroniques
    'Diabète type 1', 'Diabète type 2', 'Hypertension artérielle',
    'Insuffisance cardiaque', 'Coronaropathie', 'Arythmie cardiaque',
    'Asthme', 'BPCO', 'Insuffisance rénale chronique',
    'Cirrhose hépatique', 'Hépatite B', 'Hépatite C',
    'Epilepsie', 'AVC', 'Parkinson', 'Alzheimer',
    'Dépression', 'Anxiété', 'Schizophrénie', 'Trouble bipolaire',
    // Chirurgies
    'Appendicectomie', 'Cholécystectomie', 'Césarienne',
    'Bypass gastrique', 'Amygdalectomie', 'Hernie inguinale opérée',
    // Cancers
    'Cancer du sein', 'Cancer du côlon', 'Cancer de la prostate',
    'Cancer du poumon', 'Cancer du col de l\'utérus',
    // Autres
    'Drépanocytose', 'Paludisme chronique', 'Tuberculose',
    'VIH / SIDA', 'Hypothyroïdie', 'Hyperthyroïdie',
]

// ─── Composant tag sélectionnable ─────────────────────────────────────────────
function TagButton({
                       label, selected, onClick
                   }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            style={selected
                ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                : { backgroundColor: 'white', color: 'var(--ht-text)', borderColor: 'var(--ht-border-input)' }
            }
        >
            {selected ? '✓ ' : ''}{label}
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
                    if (e.key === 'Enter') { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal('') } }
                }}
                placeholder={placeholder}
                className="ht-input flex-1 px-3 py-1.5 text-xs"
                style={{ boxShadow: 'none' }}
            />
            <button
                type="button"
                onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}
                className="btn btn-primary btn-sm"
            >
                Ajouter
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
        <div>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
                type={type} name={name} value={value} onChange={onChange}
                required={required} placeholder={placeholder}
                className="ht-input w-full px-3 py-2.5 text-sm"
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

    // Allergies : liste sélectionnée + items custom
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
    const [customAllergies, setCustomAllergies] = useState<string[]>([])

    // Antécédents : idem
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

    const filteredAllergies = ALLERGIES_COMMUNES.filter(a =>
        a.toLowerCase().includes(searchAllergie.toLowerCase())
    )
    const filteredAntecedents = ANTECEDENTS_COMMUNS.filter(a =>
        a.toLowerCase().includes(searchAntecedent.toLowerCase())
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

            {/* Sidebar */}
            <Sidebar />

            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Ajouter un patient</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {step === 1 ? 'Informations d\'identité et de contact' : 'Allergies et antécédents médicaux'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    {/* ── ÉTAPE 1 : infos personnelles ── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="ht-card p-6">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                    Identité
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} required placeholder="Fatou" />
                                    <Field label="Nom *" name="nom" value={form.nom} onChange={handleChange} required placeholder="Diallo" />
                                    <Field label="Date de naissance *" name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Sexe *</label>
                                        <select name="sexe" value={form.sexe} onChange={handleChange} required
                                                className="ht-input w-full px-3 py-2.5 text-sm"
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Groupe sanguin</label>
                                        <select name="groupe_sanguin" value={form.groupe_sanguin} onChange={handleChange}
                                                className="ht-input w-full px-3 py-2.5 text-sm"
                                        >
                                            <option value="">Inconnu</option>
                                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} placeholder="+221 77 000 00 00" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-xs text-gray-500 mb-1">Adresse</label>
                                    <input name="adresse" value={form.adresse}
                                           onChange={e => setForm({ ...form, adresse: e.target.value })}
                                           className="ht-input w-full px-3 py-2.5 text-sm"
                                           placeholder="Quartier, Ville"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    disabled={!step1Valid}
                                    onClick={() => setStep(2)}
                                    className="btn btn-primary"
                                >
                                    Suivant : Dossier médical →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 2 : dossier médical ── */}
                    {step === 2 && (
                        <div className="space-y-6">

                            {/* Allergies */}
                            <div className="ht-card p-6">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Allergies connues
                                    </h2>
                                    {allAllergies.length > 0 && (
                                        <span className="badge badge-primary">
                                            {allAllergies.length} sélectionnée{allAllergies.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mb-4">Cliquez pour sélectionner. Utilisez "Autre" si absent de la liste.</p>

                                {/* Sélections actuelles */}
                                {allAllergies.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--ht-primary-light)', border: '1px solid var(--ht-primary-tint)' }}>
                                        {selectedAllergies.map(a => (
                                            <span key={a} className="badge badge-primary gap-1">
                                                {a}
                                                <button type="button" onClick={() => toggleAllergie(a)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                                            </span>
                                        ))}
                                        {customAllergies.map(a => (
                                            <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                                                  style={{ borderColor: 'var(--ht-primary)', color: 'var(--ht-primary)' }}>
                                                {a} <span className="text-xs opacity-50">(autre)</span>
                                                <button type="button" onClick={() => removeCustomAllergie(a)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Recherche */}
                                <input type="text" value={searchAllergie} onChange={e => setSearchAllergie(e.target.value)}
                                       placeholder="🔍 Rechercher une allergie..."
                                       className="ht-input w-full px-3 py-2 text-xs mb-3"
                                />

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                    {filteredAllergies.map(a => (
                                        <TagButton key={a} label={a} selected={selectedAllergies.includes(a)} onClick={() => toggleAllergie(a)} />
                                    ))}
                                    {filteredAllergies.length === 0 && (
                                        <p className="text-xs text-gray-300 py-2">Aucun résultat — utilisez "Autre" ci-dessous</p>
                                    )}
                                </div>

                                {/* Champ libre */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 mb-1">Autre allergie non listée</p>
                                    <AutreInput
                                        placeholder="Ex: Aspirine generique, Latex chirurgical..."
                                        onAdd={val => {
                                            if (!customAllergies.includes(val) && !selectedAllergies.includes(val))
                                                setCustomAllergies(prev => [...prev, val])
                                        }}
                                    />
                                </div>

                                {allAllergies.length === 0 && (
                                    <button type="button"
                                            onClick={() => setSelectedAllergies([])}
                                            className="mt-3 text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        → Aucune allergie connue
                                    </button>
                                )}
                            </div>

                            {/* Antécédents */}
                            <div className="ht-card p-6">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Antécédents médicaux
                                    </h2>
                                    {allAntecedents.length > 0 && (
                                        <span className="badge badge-primary">
                                            {allAntecedents.length} sélectionné{allAntecedents.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mb-4">Maladies chroniques, chirurgies, antécédents familiaux...</p>

                                {/* Sélections actuelles */}
                                {allAntecedents.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--ht-primary-light)', border: '1px solid var(--ht-primary-tint)' }}>
                                        {selectedAntecedents.map(a => (
                                            <span key={a} className="badge badge-primary gap-1">
                                                {a}
                                                <button type="button" onClick={() => toggleAntecedent(a)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                                            </span>
                                        ))}
                                        {customAntecedents.map(a => (
                                            <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                                                  style={{ borderColor: 'var(--ht-primary)', color: 'var(--ht-primary)' }}>
                                                {a} <span className="text-xs opacity-50">(autre)</span>
                                                <button type="button" onClick={() => removeCustomAntecedent(a)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Recherche */}
                                <input type="text" value={searchAntecedent} onChange={e => setSearchAntecedent(e.target.value)}
                                       placeholder="🔍 Rechercher un antécédent..."
                                       className="ht-input w-full px-3 py-2 text-xs mb-3"
                                />

                                {/* Catégories groupées */}
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                                    {filteredAntecedents.map(a => (
                                        <TagButton key={a} label={a} selected={selectedAntecedents.includes(a)} onClick={() => toggleAntecedent(a)} />
                                    ))}
                                    {filteredAntecedents.length === 0 && (
                                        <p className="text-xs text-gray-300 py-2">Aucun résultat — utilisez "Autre" ci-dessous</p>
                                    )}
                                </div>

                                {/* Champ libre */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 mb-1">Autre antécédent non listé</p>
                                    <AutreInput
                                        placeholder="Ex: Fracture du fémur 2018, Greffe rénale..."
                                        onAdd={val => {
                                            if (!customAntecedents.includes(val) && !selectedAntecedents.includes(val))
                                                setCustomAntecedents(prev => [...prev, val])
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Boutons */}
                            <div className="flex gap-3 justify-between">
                                <button type="button" onClick={() => setStep(1)}
                                        className="btn btn-ghost">
                                    ← Retour
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => navigate('/dashboard')}
                                            className="btn btn-ghost">
                                        Annuler
                                    </button>
                                    <button type="submit" disabled={loading}
                                            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all"
                                            style={{ backgroundColor: loading ? '#5a8aaa' : 'var(--ht-primary)' }}
                                    >
                                        {loading ? 'Enregistrement...' : '✓ Enregistrer le patient'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}