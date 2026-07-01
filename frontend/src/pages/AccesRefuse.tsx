import { useNavigate } from 'react-router-dom'

export default function AccesRefuse() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto"
                     style={{ backgroundColor: '#fee2e2' }}>
                    🔒
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Accès refusé</h1>
                <p className="text-sm text-gray-500">
                    Votre rôle ne vous permet pas d'accéder à cette page.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: '#003152' }}
                >
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    )
}
