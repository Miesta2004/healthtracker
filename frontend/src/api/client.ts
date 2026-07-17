import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    // Indispensable pour que le navigateur envoie/reçoive les cookies
    // httpOnly d'auth sur les requêtes cross-origin comme same-origin.
    withCredentials: true,
})

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
}

const METHODES_SURES = ['GET', 'HEAD', 'OPTIONS']

// Ajoute le header CSRF sur toute méthode qui modifie des données. Le cookie
// d'auth étant httpOnly, on ne peut plus l'attacher nous-mêmes en header
// Authorization comme avant — le navigateur s'en charge automatiquement via
// withCredentials, il ne reste que le CSRF à gérer manuellement.
api.interceptors.request.use((config) => {
    const method = (config.method ?? 'get').toUpperCase()
    if (!METHODES_SURES.includes(method)) {
        const csrfToken = getCookie('csrftoken')
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken
        }
    }
    return config
})

// ─── Gestion du refresh automatique sur 401 ─────────────────────────────────
let isRefreshing = false
let refreshQueue: Array<(ok: boolean) => void> = []

function subscribeToRefresh(callback: (ok: boolean) => void) {
    refreshQueue.push(callback)
}

function notifyRefreshSubscribers(ok: boolean) {
    refreshQueue.forEach((callback) => callback(ok))
    refreshQueue = []
}

function logoutAndRedirect() {
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

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error)
        }

        if (originalRequest.url?.includes('/auth/refresh/') || originalRequest.url?.includes('/auth/login/')) {
            logoutAndRedirect()
            return Promise.reject(error)
        }

        if (originalRequest._retry) {
            logoutAndRedirect()
            return Promise.reject(error)
        }

        originalRequest._retry = true

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeToRefresh((ok) => {
                    if (!ok) { reject(error); return }
                    resolve(api(originalRequest))
                })
            })
        }

        isRefreshing = true
        try {
            const csrfToken = getCookie('csrftoken')
            await axios.post(
                `${api.defaults.baseURL}/auth/refresh/`,
                null,
                {
                    withCredentials: true,
                    headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
                }
            )
            // Le nouveau cookie access est posé automatiquement par la réponse
            // du navigateur — rien à stocker ni à rattacher manuellement.
            notifyRefreshSubscribers(true)
            return api(originalRequest)
        } catch (refreshError) {
            notifyRefreshSubscribers(false)
            logoutAndRedirect()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    }
)

export default api