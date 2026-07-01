import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { RoleEmploye } from '../types'

interface Props {
    children: ReactNode
    roles?: RoleEmploye[]
}

export default function ProtectedRoute({ children, roles }: Props) {
    const { user, loading, hasRole } = useAuth()

    // En attente de la vérification du token
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
                         style={{ borderTopColor: '#003152' }} />
                    <p className="text-sm text-gray-400">Chargement...</p>
                </div>
            </div>
        )
    }

    // Non connecté → page de login
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Connecté mais rôle insuffisant → page d'accès refusé
    if (roles && roles.length > 0 && !hasRole(...roles)) {
        return <Navigate to="/acces-refuse" replace />
    }

    return <>{children}</>
}