import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CurrentUser, RoleEmploye } from '../types'
import { getMe } from '../api/comptes'
import { login as loginApi, logout as logoutApi } from '../api/auth'
import type { LoginCredentials } from '../types'

interface AuthContextValue {
    user: CurrentUser | null
    loading: boolean
    hasRole: (...roles: RoleEmploye[]) => boolean
    login: (credentials: LoginCredentials) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    hasRole: () => false,
    login: async () => {},
    logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [loading, setLoading] = useState(true)

    const loadUser = async () => {
        // Avec des cookies httpOnly, le JS ne peut plus savoir s'il existe un
        // token sans demander au serveur — on tente systématiquement getMe()
        // au démarrage plutôt que de vérifier un flag local d'abord (comme
        // avant avec localStorage). Coût : un aller-retour réseau de plus au
        // chargement, y compris pour un visiteur jamais connecté — c'est le
        // compromis standard des cookies httpOnly.
        try {
            const me = await getMe()
            setUser(me)
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadUser()
    }, [])

    const hasRole = (...roles: RoleEmploye[]): boolean => {
        return user ? roles.includes(user.role) : false
    }

    const login = async (credentials: LoginCredentials) => {
        await loginApi(credentials)
        await loadUser()
    }

    const logout = async () => {
        await logoutApi()
        setUser(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, loading, hasRole, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}