import api from './client.ts'
import type { LoginCredentials } from '../types'

export const login = async (credentials: LoginCredentials): Promise<void> => {
    await api.post('/auth/login/', credentials)
}

export const logout = async (): Promise<void> => {
    try {
        await api.post('/auth/logout/')
    } catch {
        // La déconnexion côté UI ne doit jamais rester bloquée par un échec
        // réseau ou un token déjà expiré — AuthContext nettoie son état local
        // dans tous les cas, que cet appel réussisse ou non.
    }
}