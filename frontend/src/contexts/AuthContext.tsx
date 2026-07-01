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
    /**
     * À appeler juste après un login réussi (tokens déjà stockés dans le
     * localStorage) pour recharger le profil sans avoir besoin de recharger
     * la page entière.
     */
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    hasRole: () => false,
    logout: () => {},
    refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [loading, setLoading] = useState(true)

    const loadUser = async () => {
        if (!checkAuth()) {
            setUser(null)
            setLoading(false)
            return
        }
        try {
            const me = await getMe()
            setUser(me)
        } catch {
            // Token invalide ou expiré : on nettoie
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadUser()
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

    const refreshUser = async () => {
        setLoading(true)
        await loadUser()
    }

    return (
        <AuthContext.Provider value={{ user, loading, hasRole, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}