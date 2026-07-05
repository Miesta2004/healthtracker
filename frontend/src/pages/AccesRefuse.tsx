import { useNavigate } from 'react-router-dom'

export default function AccesRefuse() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--ht-bg)' }}>
            <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto"
                     style={{ backgroundColor: 'var(--ht-danger-bg)' }}>
                    🔒
                </div>
                <h1 className="text-lg font-semibold" style={{ color: 'var(--ht-text)' }}>Accès refusé</h1>
                <p className="text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                    Votre rôle ne vous permet pas d'accéder à cette page.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-primary btn-lg"
                >
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    )
}