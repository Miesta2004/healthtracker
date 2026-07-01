import type { RoleEmploye } from '../types'

interface TokenPayload {
    role?: RoleEmploye
    role_label?: string
    service_id?: number | null
    user_id?: number
    [key: string]: unknown
}

/**
 * Décode la partie payload d'un JWT (base64url) sans vérifier la signature —
 * suffisant côté client pour adapter l'UI, la vérification réelle se fait côté API.
 */
function decodeJwtPayload(token: string): TokenPayload | null {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join('')
        )
        return JSON.parse(json)
    } catch {
        return null
    }
}

export function getCurrentRole(): RoleEmploye | null {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    const payload = decodeJwtPayload(token)
    return payload?.role ?? null
}

export function isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
}
