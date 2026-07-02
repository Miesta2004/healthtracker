import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { RoleEmploye } from '../types'
import { SkeletonFullPage } from './Skeleton'

interface Props {
    children: ReactNode
    roles?: RoleEmploye[]
}

export default function ProtectedRoute({ children, roles }: Props) {
    const { user, loading, hasRole } = useAuth()

    // En attente de la vérification du token
    if (loading) {
        return <SkeletonFullPage />
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