import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'

export default function Login() {
    const navigate = useNavigate()
    const[username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const tokens = await login({ username,password})
            localStorage.setItem('access_token',tokens.access)
            localStorage.setItem('refresh_token', tokens.refresh)
            navigate('/dashboard')
        } catch {
            setError('Identifiants incorrects. Réessaie')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="w-14 h-14 bg-yellow-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                        <span className="text-white text-3xl">🏥</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900">HealthTracker</h1>
                    <p className="text-gray-500 text-sm mt-1">Connectez-vous à votre espace médical</p>
                </div>

                {/* Erreur */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom d'utilisateur
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="marietou"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    )
}