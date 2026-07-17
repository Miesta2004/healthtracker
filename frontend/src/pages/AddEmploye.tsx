import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    Shield,
    Stethoscope,
    Syringe,
    Folder,
    FlaskConical,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { createEmploye } from "../api/comptes.ts"
import { getServices } from "../api/services.ts"
import { useAuth } from "../contexts/AuthContext"
import type { RoleEmploye, Service } from '../types'

// ─── Rôles disponibles avec icônes Lucide ────────────────────────────────────
const ROLES: { value: RoleEmploye; label: string; icon: React.ComponentType<any> }[] = [
    { value: 'admin', label: 'Administrateur', icon: Shield },
    { value: 'medecin', label: 'Médecin', icon: Stethoscope },
    { value: 'infirmier', label: 'Infirmier(ère)', icon: Syringe },
    { value: 'secretaire', label: 'Secrétaire', icon: Folder },
    { value: 'laborantin', label: 'Laborantin', icon: FlaskConical },
]

// ─── Champ texte réutilisable ─────────────────────────────────────────────────
function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '' }: {
    label: string; name: string; value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    type?: string; required?: boolean; placeholder?: string
}) {
    return (
        <div>
            <label className="block text-xs text-[var(--ht-text-muted)] mb-1">{label}</label>
            <input
                type={type} name={name} value={value} onChange={onChange}
                required={required} placeholder={placeholder}
                className="ht-input w-full px-3 py-2.5 text-sm"
            />
        </div>
    )
}

// ─── Carte de sélection de rôle ───────────────────────────────────────────────
function RoleCard({ role, selected, onClick }: {
    role: { value: RoleEmploye; label: string; icon: React.ComponentType<any> }; selected: boolean; onClick: () => void
}) {
    const IconComponent = role.icon

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all text-center group"
            style={selected
                ? { backgroundColor: 'var(--ht-primary)', borderColor: 'var(--ht-primary)' }
                : { backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border-input)' }
            }
        >
            <IconComponent
                size={20}
                className="transition-colors"
                style={{ color: selected ? 'white' : 'var(--ht-text-muted)' }}
            />
            <span className="text-xs font-medium transition-colors" style={{ color: selected ? 'white' : 'var(--ht-text)' }}>
                {role.label}
            </span>
        </button>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AddEmploye() {
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        nom: '', prenom: '', date_naissance: '', sexe: '',
        telephone: '', adresse: '',
        username: '', email: '', password: '',
        specialite: '',
    })
    const [role, setRole] = useState<RoleEmploye | ''>('')
    const [serviceId, setServiceId] = useState<string>('')
    const [services, setServices] = useState<Service[]>([])

    const isScopedAdmin = !!currentUser?.service
    const lockedServiceId = currentUser?.service ? String(currentUser.service) : ''

    useEffect(() => {
        getServices().then(setServices).catch(() => setServices([]))
    }, [])

    useEffect(() => {
        if (isScopedAdmin) setServiceId(lockedServiceId)
    }, [isScopedAdmin, lockedServiceId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const extractErrorMessage = (err: unknown): string => {
        const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
        if (data && typeof data === 'object') {
            const firstKey = Object.keys(data)[0]
            if (firstKey) {
                const firstVal = data[firstKey]
                const firstMsg = Array.isArray(firstVal) ? firstVal[0] : firstVal
                if (typeof firstMsg === 'string') return firstMsg
            }
        }
        return "Erreur lors de la création de l'employé. Vérifie les informations."
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!role) {
            setError('Sélectionne un rôle pour cet employé.')
            return
        }
        if (!serviceId) {
            setError("Sélectionne un service : sans service, cet employé ne verra aucun patient ni aucune donnée de son établissement.")
            return
        }
        setLoading(true)
        try {
            const payload = { ...form, role, service: serviceId ? Number(serviceId) : undefined }
            await createEmploye(payload)
            navigate('/employes')
        } catch (err) {
            setError(extractErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const formValid = form.prenom && form.nom && form.date_naissance && form.sexe &&
        form.telephone && form.adresse && form.username && form.email && form.password && role &&
        !!serviceId

    return (
        <div className="ht-page-standalone">

            {/* Barre de navigation */}
            <nav className="border-b px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-10"
                 style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <div className="max-w-6xl mx-auto w-full flex items-center gap-4">
                    <button
                        onClick={() => navigate('/employes')}
                        className="flex items-center gap-1.5 text-sm text-[var(--ht-text-muted)] hover:text-[var(--ht-text-secondary)] transition-colors"
                    >
                        <ArrowLeft size={16} /> Retour
                    </button>
                    <span className="text-[var(--ht-text-muted)]">|</span>
                    <span className="text-sm font-medium text-[var(--ht-text)]">Nouvel employé</span>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--ht-text)]">Ajouter un employé</h1>
                    <p className="text-[var(--ht-text-muted)] text-sm mt-1">Crée un compte et une fiche pour un membre du personnel</p>
                </div>

                {error && (
                    <div className="bg-[var(--ht-danger-bg)] border border-[var(--ht-danger)] text-[var(--ht-danger)] text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                        {/* ── Colonne principale (2/3) ── */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Identité */}
                            <div className="ht-card p-6">
                                <h2 className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider mb-4">
                                    Identité
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} required placeholder="Awa" />
                                    <Field label="Nom *" name="nom" value={form.nom} onChange={handleChange} required placeholder="Sow" />
                                    <Field label="Date de naissance *" name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />
                                    <div>
                                        <label className="block text-xs text-[var(--ht-text-muted)] mb-1">Sexe *</label>
                                        <select name="sexe" value={form.sexe} onChange={handleChange} required
                                                className="ht-input w-full px-3 py-2.5 text-sm"
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="ht-card p-6">
                                <h2 className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider mb-4">
                                    Contact
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Téléphone *" name="telephone" value={form.telephone} onChange={handleChange} required placeholder="77 123 45 67" />
                                    <Field label="Adresse *" name="adresse" value={form.adresse} onChange={handleChange} required placeholder="Dakar, Sénégal" />
                                </div>
                            </div>

                            {/* Compte */}
                            <div className="ht-card p-6">
                                <h2 className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider mb-4">
                                    Compte de connexion
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Nom d'utilisateur *" name="username" value={form.username} onChange={handleChange} required placeholder="awa.sow" />
                                    <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="awa.sow@healthtracker.sn" />
                                    <div className="sm:col-span-2">
                                        <Field label="Mot de passe *" name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" />
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--ht-text-muted)] mt-3 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-[var(--ht-primary)]" />
                                    Le matricule de l'employé est généré automatiquement à la création.
                                </p>
                            </div>

                            {/* Actions (mobile) */}
                            <div className="flex justify-end gap-3 lg:hidden">
                                <button type="button" onClick={() => navigate('/employes')}
                                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--ht-text-muted)] hover:bg-[var(--ht-muted-bg)] transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" disabled={!formValid || loading}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                                        style={{ backgroundColor: (!formValid || loading) ? 'var(--ht-muted)' : 'var(--ht-primary)' }}>
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    {loading ? 'Création en cours...' : "Créer l'employé"}
                                </button>
                            </div>
                        </div>

                        {/* ── Colonne latérale (1/3) ── */}
                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                            <div className="ht-card p-6">
                                <h2 className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider mb-4">
                                    Rôle dans l'équipe *
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                                    {ROLES.map(r => (
                                        <RoleCard key={r.value} role={r} selected={role === r.value} onClick={() => setRole(r.value)} />
                                    ))}
                                </div>
                                {(role === 'medecin' || role === 'infirmier' || role === 'laborantin') && (
                                    <div className="mt-4">
                                        <Field label="Spécialité (optionnel)" name="specialite" value={form.specialite} onChange={handleChange} placeholder="Pédiatrie, Cardiologie..." />
                                    </div>
                                )}
                                {role && (
                                    <div className="mt-4">
                                        <label className="block text-xs text-[var(--ht-text-muted)] mb-1">
                                            {role === 'admin' ? 'Service dirigé *' : 'Service *'}
                                        </label>
                                        <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                                                disabled={isScopedAdmin}
                                                className="ht-input w-full px-3 py-2.5 text-sm disabled:opacity-70"
                                        >
                                            <option value="">Sélectionner un service</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.id}>{s.nom}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-[var(--ht-text-muted)] mt-1.5">
                                            {isScopedAdmin
                                                ? `En tant que chef de service, tu ne peux créer des employés que dans ${currentUser?.service_nom ? `« ${currentUser.service_nom} »` : 'ton service'}.`
                                                : role === 'admin'
                                                    ? "Ce chef de service ne verra et ne gérera que les données de ce service."
                                                    : "Sans service assigné, cet employé ne verra aucun patient ni aucune donnée de l'établissement."}
                                        </p>
                                        {services.length === 0 && (
                                            <p className="text-xs mt-1.5" style={{ color: 'var(--ht-warning)' }}>
                                                Aucun service n'existe encore — <button type="button" onClick={() => navigate('/services')} className="underline">crée-en un d'abord</button>.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions de validation (desktop, sticky) */}
                            <div className="ht-card p-6 hidden lg:flex flex-col gap-2">
                                <button type="submit" disabled={!formValid || loading}
                                        className="w-full px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                                        style={{ backgroundColor: (!formValid || loading) ? 'var(--ht-muted)' : 'var(--ht-primary)' }}>
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    {loading ? 'Création en cours...' : "Créer l'employé"}
                                </button>
                                <button type="button" onClick={() => navigate('/employes')}
                                        className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--ht-text-muted)] hover:bg-[var(--ht-muted-bg)] transition-colors">
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}