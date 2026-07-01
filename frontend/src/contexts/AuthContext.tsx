import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CurrentUser, RoleEmploye } from '../types'
import { getCurrentRole, isAuthenticated as checkAuth } from '../utils/auth'
import { getMe } from '../api/comptes'

interface AuthContextValue {
    user: CurrentUser | null
    loading: boolean
    /**
     * Vérifie si l'utilisateur connecté a l'un des rôles passés.
     * Exemple : hasRole('admin', 'medecin')
     */
    hasRole: (...roles: RoleEmploye[]) => boolean
    logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    hasRole: () => false,
    logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!checkAuth()) {
            setLoading(false)
            return
        }
        // On charge les infos complètes depuis /employes/me/ une seule fois
        getMe()
            .then(setUser)
            .catch(() => {
                // Token invalide ou expiré : on nettoie
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                setUser(null)
            })
            .finally(() => setLoading(false))
    }, [])

    const hasRole = (...roles: RoleEmploye[]): boolean => {
        if (!user) {
            // Fallback rapide : on décode le JWT sans appel réseau
            const role = getCurrentRole()
            return role ? roles.includes(role) : false
        }
        return roles.includes(user.role)
    }

    const logout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, loading, hasRole, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}
