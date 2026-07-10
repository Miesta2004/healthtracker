import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const {refreshUser} = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const tokens = await login({username, password})
            localStorage.setItem('access_token', tokens.access)
            localStorage.setItem('refresh_token', tokens.refresh)
            await refreshUser()
            navigate('/dashboard')
        } catch {
            setError('Identifiants incorrects. Réessaie')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">

            {/* ── Côté gauche : image + branding ── */}
            <div
                className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative overflow-hidden"
                style={{backgroundColor: 'var(--ht-brand-bg)'}}
            >
                {/* Cercles décoratifs en arrière-plan */}
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
                     style={{backgroundColor: 'var(--ht-brand-tint)'}} />
                <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full opacity-10"
                     style={{backgroundColor: 'var(--ht-brand-tint)'}} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
                     style={{backgroundColor: 'var(--ht-brand-tint)'}} />

                {/* Logo */}
                <Logo
                    size={66}
                    iconSize={56}
                    textClassName="font-bold text-4xl"
                    textStyle={{ color: '#ffffff' }}
                />

                {/* Contenu central */}
                <div className="relative z-10 space-y-6">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{backgroundColor: 'var(--ht-brand-tint-bg)', color: 'var(--ht-brand-tint)'}}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"/>
                        Plateforme médicale sécurisée
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                        Gérez vos patients<br/>
                        <span style={{color: 'var(--ht-brand-tint)'}}>en toute simplicité</span>
                    </h1>
                    <p className="text-[rgba(255,255,255,0.75)] text-base leading-relaxed max-w-md">
                        Suivez les dossiers médicaux, les consultations et les alertes de vos patients depuis une seule
                        interface intuitive.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        {[
                            {label: 'Patients suivis', value: '1 200+'},
                            {label: 'Consultations', value: '8 500+'},
                            {label: 'Disponibilité', value: '99,9%'},
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className="rounded-xl p-4"
                                style={{backgroundColor: 'rgba(173, 223, 241, 0.08)'}}
                            >
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs mt-1" style={{color: 'var(--ht-brand-tint)'}}>{stat.label}</p>                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer gauche */}
                <p className="text-stone-200 text-base leading-relaxed max-w-md">
                    © 2026 HealthTracker · Tous droits réservés
                </p>
            </div>

            {/* ── Côté droit : formulaire ── */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-8 py-12" style={{backgroundColor: 'var(--ht-bg)'}}>
                <div className="w-full max-w-sm">

                    {/* Logo mobile (visible seulement < lg) */}
                    <div className="lg:hidden mb-8">
                        <Logo
                            size={52}
                            iconSize={34}
                            textClassName="font-bold text-xl"
                        />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold" style={{color: 'var(--ht-text)'}}>Connexion</h2>
                        <p className="text-sm mt-1" style={{color: 'var(--ht-text-secondary)'}}>Accédez à votre espace médical</p>
                    </div>

                    {error && (
                        <div className="ht-alert ht-alert-danger mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="ht-field">
                            <label className="ht-label">
                                Nom d'utilisateur
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="ht-input"
                                placeholder="marietou"
                                required
                            />
                        </div>
                        <div className="ht-field">
                            <label className="ht-label">
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="ht-input"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-full mt-2"
                        >
                            {loading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                    </form>

                    <p className="relative z-10 text-center text-xs mt-6" style={{ color: 'var(--ht-text-secondary)' }}>
                        Plateforme réservée au personnel médical autorisé
                    </p>
                </div>
            </div>
        </div>
    )
}