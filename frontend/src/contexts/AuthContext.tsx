import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe } from '../api/comptes'
import type { CurrentUser, RoleEmploye } from '../types'

interface AuthContextValue {
    user: CurrentUser | null
    loading: boolean
    isAuthenticated: boolean
    hasRole: (...roles: RoleEmploye[]) => boolean
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUser = async () => {
        const token = localStorage.getItem('access_token')
        if (!token) {
            setUser(null)
            setLoading(false)
            return
        }
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
        fetchUser()
    }, [])

    const hasRole = (...roles: RoleEmploye[]) => {
        if (!user) return false
        return roles.includes(user.role)
    }

    const logout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: !!user,
                hasRole,
                logout,
                refreshUser: fetchUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
    return ctx
}