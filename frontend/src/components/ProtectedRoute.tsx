import { Navigate } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContext"
import type { RoleEmploye } from "../types"
import { useState, useEffect } from 'react'


interface Props {
    children: React.ReactNode
    roles?: RoleEmploye[]
}

// ─── Page d'accès refusé ──────────────────────────────────────────────────────
function AccesRefuse() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl mx-auto mb-4">
                    🔒
                </div>
                <h1 className="text-lg font-semibold text-gray-900 mb-2">Accès refusé</h1>
                <p className="text-sm text-gray-500">
                    Votre rôle ne vous permet pas d'accéder à cette page. Redirection en cours…
                </p>
            </div>
        </div>
    )
}

export default function ProtectedRoute({ children, roles }: Props) {
    const { isAuthenticated, loading, hasRole } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
                     style={{ borderColor: '#003152', borderTopColor: 'transparent' }} />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Route sans contrainte de rôle → accessible à tout utilisateur connecté
    if (!roles || roles.length === 0) {
        return <>{children}</>
    }

    if (!hasRole(...roles)) {
        return (
            <>
                <AccesRefuse />
                <RedirectAfterDelay />
            </>
        )
    }

    return <>{children}</>
}

// Petit composant pour rediriger après affichage bref du message
function RedirectAfterDelay() {
    const [redirect, setRedirect] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setRedirect(true), 1500)
        return () => clearTimeout(t)
    }, [])
    if (redirect) return <Navigate to="/dashboard" replace />
    return null
}
