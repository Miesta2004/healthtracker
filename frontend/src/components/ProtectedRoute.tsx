import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { RoleEmploye } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
    children: ReactNode
    /** Si fourni, seuls ces rôles peuvent accéder. Si omis, tout employé connecté peut y accéder. */
    roles?: RoleEmploye[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { user, loading, hasRole } = useAuth()

    // Pendant le chargement initial du profil, on ne redirige pas trop vite
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm text-gray-300">Chargement…</div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (roles && roles.length > 0 && !hasRole(...roles)) {
        return <Navigate to="/acces-refuse" replace />
    }

    return <>{children}</>
}
