import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { postSignesVitaux } from '../api/patients'
import { getPatient } from '../api/patients'
import type { Patient } from '../types'
import {
    Heart,
    Activity,
    Thermometer,
    Droplet,
    Scale,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    type LucideIcon
} from 'lucide-react'

// ─── Types locaux ─────────────────────────────────────────────────────────────
interface ChampConfig {
    key: string
    label: string
    unite: string
    placeholder: string
    min: number
    max: number
    step: number
    icon: LucideIcon
    description: string
}

const CHAMPS: ChampConfig[] = [
    {
        key: 'tension_systolique',
        label: 'Tension systolique',
        unite: 'mmHg',
        placeholder: 'ex : 120',
        min: 50, max: 250, step: 1,
        icon: Heart,
        description: 'Pression maximale (chiffre du haut)',
    },
    {
        key: 'tension_diastolique',
        label: 'Tension diastolique',
        unite: 'mmHg',
        placeholder: 'ex : 80',
        min: 30, max: 150, step: 1,
        icon: Heart,
        description: 'Pression minimale (chiffre du bas)',
    },
    {
        key: 'frequence_cardiaque',
        label: 'Fréquence cardiaque',
        unite: 'bpm',
        placeholder: 'ex : 72',
        min: 20, max: 250, step: 1,
        icon: Activity,
        description: 'Battements par minute au repos',
    },
    {
        key: 'temperature',
        label: 'Température',
        unite: '°C',
        placeholder: 'ex : 37.5',
        min: 34, max: 43, step: 0.1,
        icon: Thermometer,
        description: 'Normale : 36,1 – 37,5 °C',
    },
    {
        key: 'glycemie',
        label: 'Glycémie',
        unite: 'mmol/L',
        placeholder: 'ex : 5.6',
        min: 1, max: 30, step: 0.1,
        icon: Droplet,
        description: 'À jeun : 3,9 – 5,6 mmol/L',
    },
    {
        key: 'poids',
        label: 'Poids',
        unite: 'kg',
        placeholder: 'ex : 70.5',
        min: 1, max: 300, step: 0.1,
        icon: Scale,
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
    const Icon = champ.icon

    return (
        <div className="ht-card p-4 space-y-2 border transition-all"
             style={{
                 backgroundColor: 'var(--ht-card-bg)',
                 borderColor: !valide ? 'var(--ht-danger)' : focused ? 'var(--ht-primary)' : 'var(--ht-border)'
             }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div style={{ color: !valide ? 'var(--ht-danger)' : 'var(--ht-primary)' }}>
                        <Icon size={16} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>{champ.label}</span>
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--ht-text-muted)' }}>{champ.unite}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{champ.description}</p>
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
                        borderColor: !valide ? 'var(--ht-danger)' : focused ? 'var(--ht-primary)' : 'var(--ht-border)'
                    }}
                />
                {value !== '' && !valide && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--ht-danger)' }}>
                        <AlertCircle size={12} /> Valeur hors plage ({champ.min} – {champ.max} {champ.unite})
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

    const [patient, setPatient] = useState<Patient | null>(null)
    const [date, setDate] = useState<string>(
        new Date().toISOString().slice(0, 16)
    )
    const [valeurs, setValeurs] = useState<Record<string, string>>(
        Object.fromEntries(CHAMPS.map(c => [c.key, '']))
    )
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')
    const [succes, setSucces] = useState(false)

    useEffect(() => {
        if (patientId) getPatient(patientId).then(setPatient).catch(() => {})
    }, [patientId])

    const handleChange = (key: string, val: string) => {
        setValeurs(prev => ({ ...prev, [key]: val }))
        setErreur('')
    }

    const formulaireValide = date !== '' && CHAMPS.some(c => valeurs[c.key] !== '')

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
            <div className="ht-page-standalone flex items-center justify-center" style={{ backgroundColor: 'var(--ht-bg)' }}>
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                         style={{ color: 'var(--ht-success)', backgroundColor: 'var(--ht-success-bg)' }}>
                        <CheckCircle2 size={36} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>Constantes enregistrées avec succès</p>
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Redirection vers le dossier médical...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="ht-page-standalone min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ht-bg)' }}>
            {/* Header / Nav */}
            <nav className="border-b px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-10"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="max-w-6xl mx-auto w-full flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/patients/${patientId}`)}
                        className="text-sm flex items-center gap-1.5 transition-colors"
                        style={{ color: 'var(--ht-text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--ht-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--ht-text-secondary)'}
                    >
                        <ArrowLeft size={16} /> Retour au dossier
                    </button>
                    <span style={{ color: 'var(--ht-border)' }}>|</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--ht-text)' }}>
                        {patient ? `${patient.prenom} ${patient.nom}` : 'Saisie des constantes'}
                    </span>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>Saisie des constantes</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        Enregistrer un relevé de signes vitaux pour ce patient
                    </p>
                </div>

                {erreur && (
                    <div className="ht-alert ht-alert-danger flex items-center gap-2 mb-6">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <p className="text-sm font-medium">{erreur}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* ── Colonne principale (2/3) : constantes cliniques ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                                Constantes cliniques (remplissez uniquement les données disponibles)
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

                        {/* Actions (mobile / repli sous le formulaire) */}
                        <div className="flex gap-3 pb-8 lg:hidden">
                            <button
                                onClick={() => navigate(`/patients/${patientId}`)}
                                className="btn btn-ghost flex-1"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formulaireValide || !toutesValeursValides || submitting}
                                className="btn btn-primary flex-1 font-semibold"
                            >
                                {submitting ? 'Enregistrement en cours…' : 'Valider le relevé'}
                            </button>
                        </div>
                    </div>

                    {/* ── Colonne latérale (1/3) : date du relevé & rappel patient ── */}
                    <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                        {/* Date de mesure */}
                        <div className="ht-card p-5 border" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                            <label className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                <Calendar size={14} /> Date et heure du relevé
                            </label>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="ht-input w-full px-3 py-2.5 text-sm"
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Par défaut positionné à l'heure actuelle. Ajustez si le relevé est rétroactif.
                            </p>
                        </div>

                        {/* Rappel patient */}
                        <div className="ht-card ht-card-padded-sm">
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ht-text-muted)' }}>
                                Patient
                            </h2>
                            {patient ? (
                                <div className="space-y-1.5">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                                        {patient.prenom} {patient.nom}
                                    </p>
                                    {patient.allergies && (
                                        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--ht-danger)' }}>
                                            <AlertTriangle size={14} /> Allergies : {patient.allergies}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                            )}
                        </div>

                        {/* Actions de validation (desktop, sticky) */}
                        <div className="ht-card ht-card-padded-sm hidden lg:flex flex-col gap-2">
                            <button
                                onClick={handleSubmit}
                                disabled={!formulaireValide || !toutesValeursValides || submitting}
                                className="btn btn-primary w-full justify-center font-semibold"
                            >
                                {submitting ? 'Enregistrement en cours…' : 'Valider le relevé'}
                            </button>
                            <button
                                onClick={() => navigate(`/patients/${patientId}`)}
                                className="btn btn-ghost w-full justify-center"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}