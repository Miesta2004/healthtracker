import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { postSignesVitaux } from '../api/patients'

// ─── Types locaux ─────────────────────────────────────────────────────────────
interface ChampConfig {
    key: string
    label: string
    unite: string
    placeholder: string
    min: number
    max: number
    step: number
    icon: string
    description: string
}

const CHAMPS: ChampConfig[] = [
    {
        key: 'tension_systolique',
        label: 'Tension systolique',
        unite: 'mmHg',
        placeholder: 'ex : 120',
        min: 50, max: 250, step: 1,
        icon: '🫀',
        description: 'Pression maximale (chiffre du haut)',
    },
    {
        key: 'tension_diastolique',
        label: 'Tension diastolique',
        unite: 'mmHg',
        placeholder: 'ex : 80',
        min: 30, max: 150, step: 1,
        icon: '🫀',
        description: 'Pression minimale (chiffre du bas)',
    },
    {
        key: 'frequence_cardiaque',
        label: 'Fréquence cardiaque',
        unite: 'bpm',
        placeholder: 'ex : 72',
        min: 20, max: 250, step: 1,
        icon: '💓',
        description: 'Battements par minute au repos',
    },
    {
        key: 'temperature',
        label: 'Température',
        unite: '°C',
        placeholder: 'ex : 37.5',
        min: 34, max: 43, step: 0.1,
        icon: '🌡️',
        description: 'Normale : 36,1 – 37,5 °C',
    },
    {
        key: 'glycemie',
        label: 'Glycémie',
        unite: 'mmol/L',
        placeholder: 'ex : 5.6',
        min: 1, max: 30, step: 0.1,
        icon: '🩸',
        description: 'À jeun : 3,9 – 5,6 mmol/L',
    },
    {
        key: 'poids',
        label: 'Poids',
        unite: 'kg',
        placeholder: 'ex : 70.5',
        min: 1, max: 300, step: 0.1,
        icon: '⚖️',
        description: 'Poids corporel en kilogrammes',
    },
]

// ─── Composant champ de saisie ────────────────────────────────────────────────
function ChampSaisie({
                         champ,
                         value,
                         onChange,
                     }: {
    champ: ChampConfig
    value: string
    onChange: (key: string, val: string) => void
}) {
    const [focused, setFocused] = useState(false)
    const num = parseFloat(value)
    const valide = value === '' || (!isNaN(num) && num >= champ.min && num <= champ.max)

    return (
        <div className="ht-card p-4 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{champ.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{champ.label}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">{champ.unite}</span>
            </div>
            <p className="text-xs text-gray-400">{champ.description}</p>
            <div className="relative">
                <input
                    type="number"
                    step={champ.step}
                    min={champ.min}
                    max={champ.max}
                    placeholder={champ.placeholder}
                    value={value}
                    onChange={e => onChange(champ.key, e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="ht-input w-full px-3 py-2.5 text-sm font-mono"
                    style={{
                        borderColor: !valide
                            ? '#ef4444'
                            : focused
                                ? 'var(--ht-primary)'
                                : 'var(--ht-border-input)',
                        boxShadow: focused
                            ? `0 0 0 2px ${!valide ? 'var(--ht-danger-bg)' : '#e0eaf3'}`
                            : 'none',
                    }}
                />
                {value !== '' && !valide && (
                    <p className="text-xs text-red-500 mt-1">
                        Valeur hors plage ({champ.min} – {champ.max} {champ.unite})
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SaisieSignesVitaux() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = Number(id)

    const [date, setDate] = useState<string>(
        new Date().toISOString().slice(0, 16) // format datetime-local
    )
    const [valeurs, setValeurs] = useState<Record<string, string>>(
        Object.fromEntries(CHAMPS.map(c => [c.key, '']))
    )
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')
    const [succes, setSucces] = useState(false)

    const handleChange = (key: string, val: string) => {
        setValeurs(prev => ({ ...prev, [key]: val }))
        setErreur('')
    }

    // Au moins un champ rempli + date présente
    const formulaireValide =
        date !== '' && CHAMPS.some(c => valeurs[c.key] !== '')

    // Tous les champs remplis sont dans leur plage
    const toutesValeursValides = CHAMPS.every(c => {
        const v = valeurs[c.key]
        if (v === '') return true
        const num = parseFloat(v)
        return !isNaN(num) && num >= c.min && num <= c.max
    })

    const handleSubmit = async () => {
        if (!formulaireValide || !toutesValeursValides) return
        setSubmitting(true)
        setErreur('')

        const payload: Record<string, number | string | null> = { date }
        CHAMPS.forEach(c => {
            payload[c.key] = valeurs[c.key] !== '' ? parseFloat(valeurs[c.key]) : null
        })

        try {
            await postSignesVitaux(patientId, payload as never)
            setSucces(true)
            setTimeout(() => navigate(`/patients/${patientId}`), 1200)
        } catch {
            setErreur('Erreur lors de l\'enregistrement. Vérifiez votre connexion.')
            setSubmitting(false)
        }
    }

    if (succes) {
        return (
            <div className="ht-page flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl mx-auto">
                        ✓
                    </div>
                    <p className="text-sm font-medium text-gray-800">Constantes enregistrées</p>
                    <p className="text-xs text-gray-400">Redirection en cours…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="ht-page">

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={() => navigate(`/patients/${patientId}`)}
                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                    ← Retour au dossier
                </button>
                <span className="text-gray-200">|</span>
                <span className="text-sm font-medium text-gray-900">Saisie des constantes</span>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

                {/* Date de mesure */}
                <div className="ht-card p-5">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Date et heure de la mesure
                    </label>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="ht-input w-full px-3 py-2.5 text-sm"
                        style={{ borderColor: 'var(--ht-border-input)' }}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        Par défaut : maintenant. Modifiez si la mesure a été prise plus tôt.
                    </p>
                </div>

                {/* Champs de saisie */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Constantes — remplissez les champs disponibles
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {CHAMPS.map(c => (
                            <ChampSaisie
                                key={c.key}
                                champ={c}
                                value={valeurs[c.key]}
                                onChange={handleChange}
                            />
                        ))}
                    </div>
                </div>

                {/* Erreur */}
                {erreur && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-sm text-red-600">{erreur}</p>
                    </div>
                )}

                {/* Bouton */}
                <div className="flex gap-3 pb-8">
                    <button
                        onClick={() => navigate(`/patients/${patientId}`)}
                        className="btn btn-ghost flex-1"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formulaireValide || !toutesValeursValides || submitting}
                        className="btn btn-primary flex-1"
                    >
                        {submitting ? 'Enregistrement…' : 'Enregistrer les constantes'}
                    </button>
                </div>
            </div>
        </div>
    )
}