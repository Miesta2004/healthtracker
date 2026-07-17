import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
})

// Ajoute le token JWT à chaque requête automatiquement
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Gestion du refresh automatique sur 401 ─────────────────────────────────
// Évite que plusieurs requêtes en échec simultané déclenchent chacune leur
// propre appel de refresh : la première déclenche le refresh, les suivantes
// attendent le résultat puis rejouent leur requête avec le nouveau token.
let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function subscribeToRefresh(callback: (token: string | null) => void) {
    refreshQueue.push(callback)
}

function notifyRefreshSubscribers(token: string | null) {
    refreshQueue.forEach((callback) => callback(token))
    refreshQueue = []
}

function logoutAndRedirect() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    if (window.location.pathname !== '/login') {
        window.location.href = '/login'
    }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined

        // Pas de config exploitable, ou erreur autre que 401 : on relaie telle quelle
        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error)
        }

        // L'appel de refresh lui-même a échoué (refresh token expiré/invalide) :
        // pas de boucle, on déconnecte directement.
        if (originalRequest.url?.includes('/auth/refresh/')) {
            logoutAndRedirect()
            return Promise.reject(error)
        }

        // Cette requête a déjà été rejouée une fois : on ne boucle pas indéfiniment.
        if (originalRequest._retry) {
            logoutAndRedirect()
            return Promise.reject(error)
        }

        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
            logoutAndRedirect()
            return Promise.reject(error)
        }

        originalRequest._retry = true

        if (isRefreshing) {
            // Un refresh est déjà en cours : on attend son résultat.
            return new Promise((resolve, reject) => {
                subscribeToRefresh((newToken) => {
                    if (!newToken) {
                        reject(error)
                        return
                    }
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                    resolve(api(originalRequest))
                })
            })
        }

        isRefreshing = true
        try {
            const { data } = await axios.post(
                `${api.defaults.baseURL}/auth/refresh/`,
                { refresh: refreshToken }
            )
            const newAccessToken: string = data.access
            localStorage.setItem('access_token', newAccessToken)
            // SIMPLE_JWT.ROTATE_REFRESH_TOKENS est actif côté back : si un
            // nouveau refresh token est renvoyé, on le persiste aussi.
            if (data.refresh) {
                localStorage.setItem('refresh_token', data.refresh)
            }

            notifyRefreshSubscribers(newAccessToken)
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            return api(originalRequest)
        } catch (refreshError) {
            notifyRefreshSubscribers(null)
            logoutAndRedirect()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    }
)

export default api