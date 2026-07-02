import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createEmploye } from "../api/comptes.ts"
import { getServices } from "../api/services.ts"
import type { RoleEmploye, Service } from '../types'

// ─── Rôles disponibles ────────────────────────────────────────────────────────
const ROLES: { value: RoleEmploye; label: string; icon: string }[] = [
    { value: 'admin', label: 'Administrateur', icon: '🛡️' },
    { value: 'medecin', label: 'Médecin', icon: '🩺' },
    { value: 'infirmier', label: 'Infirmier(ère)', icon: '💉' },
    { value: 'secretaire', label: 'Secrétaire', icon: '🗂️' },
    { value: 'laborantin', label: 'Laborantin', icon: '🧪' },
]

// ─── Champ texte réutilisable ─────────────────────────────────────────────────
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                onBlur={e => e.target.style.boxShadow = 'none'}
            />
        </div>
    )
}

// ─── Carte de sélection de rôle ───────────────────────────────────────────────
function RoleCard({ role, selected, onClick }: {
    role: { value: RoleEmploye; label: string; icon: string }; selected: boolean; onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all text-center"
            style={selected
                ? { backgroundColor: '#003152', borderColor: '#003152' }
                : { backgroundColor: 'white', borderColor: '#e5e7eb' }
            }
        >
            <span className="text-xl">{role.icon}</span>
            <span className="text-xs font-medium" style={{ color: selected ? 'white' : '#374151' }}>
                {role.label}
            </span>
        </button>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AddEmploye() {
    const navigate = useNavigate()
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

    useEffect(() => {
        getServices().then(setServices).catch(() => setServices([]))
    }, [])

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
        if (role !== 'admin' && !serviceId) {
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
        (role === 'admin' || !!serviceId)

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate('/employes')} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                    ← Retour
                </button>
                <span className="text-gray-200">|</span>
                <span className="text-sm font-medium text-gray-900">Nouvel employé</span>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Ajouter un employé</h1>
                    <p className="text-gray-400 text-sm mt-1">Crée un compte et une fiche pour un membre du personnel</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Identité */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Identité
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} required placeholder="Awa" />
                            <Field label="Nom *" name="nom" value={form.nom} onChange={handleChange} required placeholder="Sow" />
                            <Field label="Date de naissance *" name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Sexe *</label>
                                <select name="sexe" value={form.sexe} onChange={handleChange} required
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                                        onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                        onBlur={e => e.target.style.boxShadow = 'none'}
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Contact
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Téléphone *" name="telephone" value={form.telephone} onChange={handleChange} required placeholder="77 123 45 67" />
                            <Field label="Adresse *" name="adresse" value={form.adresse} onChange={handleChange} required placeholder="Dakar, Sénégal" />
                        </div>
                    </div>

                    {/* Rôle */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Rôle dans l'équipe *
                        </h2>
                        <div className="grid grid-cols-5 gap-3">
                            {ROLES.map(r => (
                                <RoleCard key={r.value} role={r} selected={role === r.value} onClick={() => setRole(r.value)} />
                            ))}
                        </div>
                        {(role === 'medecin' || role === 'infirmier' || role === 'laborantin') && (
                            <div className="mt-4">
                                <Field label="Spécialité (optionnel)" name="specialite" value={form.specialite} onChange={handleChange} placeholder="Pédiatrie, Cardiologie..." />
                            </div>
                        )}
                        {role && role !== 'admin' && (
                            <div className="mt-4">
                                <label className="block text-xs text-gray-500 mb-1">Service *</label>
                                <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                                        onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                        onBlur={e => e.target.style.boxShadow = 'none'}
                                >
                                    <option value="">Sélectionner un service</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.nom}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Sans service assigné, cet employé ne verra aucun patient ni aucune donnée de l'établissement.
                                </p>
                                {services.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1.5">
                                        Aucun service n'existe encore — <button type="button" onClick={() => navigate('/services')} className="underline">crée-en un d'abord</button>.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Compte */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Compte de connexion
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nom d'utilisateur *" name="username" value={form.username} onChange={handleChange} required placeholder="awa.sow" />
                            <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="awa.sow@healthtracker.sn" />
                            <div className="col-span-2">
                                <Field label="Mot de passe *" name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            Le matricule de l'employé est généré automatiquement à la création.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => navigate('/employes')}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={!formValid || loading}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                                style={{ backgroundColor: (!formValid || loading) ? '#5a8aaa' : '#003152' }}>
                            {loading ? 'Création en cours...' : "Créer l'employé"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
