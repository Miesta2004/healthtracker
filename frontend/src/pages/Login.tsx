import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

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
                style={{backgroundColor: '#003152'}}
            >
                {/* Cercles décoratifs en arrière-plan */}
                <div
                    className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
                    style={{backgroundColor: '#ADDFF1'}}
                />
                <div
                    className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full opacity-10"
                    style={{backgroundColor: '#ADDFF1'}}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
                    style={{backgroundColor: '#ADDFF1'}}
                />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{backgroundColor: '#003152', border: '1.5px solid #ADDFF1'}}
                    >
                        <svg viewBox="0 0 120 120" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
                            <g fill="#ADDFF1">
                                <rect x="25" y="22" width="12" height="12" rx="2"/>
                                <rect x="39" y="22" width="12" height="12" rx="2"/>
                                <rect x="67" y="22" width="12" height="12" rx="2"/>
                                <rect x="81" y="22" width="12" height="12" rx="2"/>
                                <rect x="11" y="36" width="12" height="12" rx="2"/>
                                <rect x="25" y="36" width="12" height="12" rx="2"/>
                                <rect x="39" y="36" width="12" height="12" rx="2"/>
                                <rect x="53" y="36" width="12" height="12" rx="2"/>
                                <rect x="67" y="36" width="12" height="12" rx="2"/>
                                <rect x="81" y="36" width="12" height="12" rx="2"/>
                                <rect x="95" y="36" width="12" height="12" rx="2"/>
                                <rect x="11" y="50" width="12" height="12" rx="2"/>
                                <rect x="25" y="50" width="12" height="12" rx="2"/>
                                <rect x="39" y="50" width="12" height="12" rx="2"/>
                                <rect x="53" y="50" width="12" height="12" rx="2"/>
                                <rect x="67" y="50" width="12" height="12" rx="2"/>
                                <rect x="81" y="50" width="12" height="12" rx="2"/>
                                <rect x="95" y="50" width="12" height="12" rx="2"/>
                                <rect x="25" y="64" width="12" height="12" rx="2"/>
                                <rect x="39" y="64" width="12" height="12" rx="2"/>
                                <rect x="53" y="64" width="12" height="12" rx="2"/>
                                <rect x="67" y="64" width="12" height="12" rx="2"/>
                                <rect x="81" y="64" width="12" height="12" rx="2"/>
                                <rect x="39" y="78" width="12" height="12" rx="2"/>
                                <rect x="53" y="78" width="12" height="12" rx="2"/>
                                <rect x="67" y="78" width="12" height="12" rx="2"/>
                                <rect x="53" y="92" width="12" height="12" rx="2"/>
                            </g>
                            <g fill="#e8f6fc" opacity="0.5">
                                <rect x="25" y="36" width="12" height="12" rx="2"/>
                                <rect x="11" y="50" width="12" height="12" rx="2"/>
                                <rect x="25" y="50" width="12" height="12" rx="2"/>
                            </g>
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg">HealthTracker</span>
                </div>

                {/* Contenu central */}
                <div className="relative z-10 space-y-6">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{backgroundColor: 'rgba(173,223,241,0.15)', color: '#ADDFF1'}}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"/>
                        Plateforme médicale sécurisée
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                        Gérez vos patients<br/>
                        <span style={{color: '#ADDFF1'}}>en toute simplicité</span>
                    </h1>
                    <p className="text-blue-200 text-base leading-relaxed max-w-md">
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
                                style={{backgroundColor: 'rgba(173,223,241,0.08)'}}
                            >
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs mt-1" style={{color: '#ADDFF1'}}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer gauche */}
                <p className="relative z-10 text-blue-300 text-xs">
                    © 2026 HealthTracker · Tous droits réservés
                </p>
            </div>

            {/* ── Côté droit : formulaire ── */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-8 py-12 bg-gray-50">
                <div className="w-full max-w-sm">

                    {/* Logo mobile (visible seulement < lg) */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{backgroundColor: '#003152'}}
                        >
                            🏥
                        </div>
                        <span className="font-semibold text-gray-900 text-lg">HealthTracker</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Connexion</h2>
                        <p className="text-gray-500 text-sm mt-1">Accédez à votre espace médical</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nom d'utilisateur
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                style={{'--tw-ring-color': '#003152'} as React.CSSProperties}
                                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                                placeholder="marietou"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none transition-all"
                                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #003152'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white font-medium py-2.5 rounded-lg text-sm transition-all mt-2"
                            style={{backgroundColor: loading ? '#5a8aaa' : '#003152'}}
                            onMouseEnter={e => {
                                if (!loading) (e.target as HTMLElement).style.backgroundColor = '#004070'
                            }}
                            onMouseLeave={e => {
                                if (!loading) (e.target as HTMLElement).style.backgroundColor = '#003152'
                            }}
                        >
                            {loading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-8">
                        Plateforme réservée au personnel médical autorisé
                    </p>
                </div>
            </div>
        </div>
    )
}