import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'

interface MessageTempsReel {
    type: 'rendez_vous' | 'evenement_administratif' | 'intervention' | 'garde' | 'rappel'
    action: string
    [cle: string]: unknown
}

// Correspondance entre le type de message poussé par le serveur et la ou les
// query keys React Query à invalider — ces clés doivent rester synchronisées
// avec celles définies dans useCalendrier.ts / useBlocOperatoire.ts /
// useGardesPlanning.ts / useRappels.ts.
const CLES_PAR_TYPE: Record<MessageTempsReel['type'], string[]> = {
    rendez_vous: ['calendrier-planning'],
    evenement_administratif: ['calendrier-planning'],
    intervention: ['bloc-operatoire-planning'],
    garde: ['gardes-planning'],
    rappel: ['rappels'],
}

const DELAI_RECONNEXION_MAX_MS = 15_000

/**
 * À monter une seule fois par session (ex. dans Calendrier.tsx et
 * Dashboard.tsx) — se reconnecte automatiquement avec un backoff
 * exponentiel plafonné si la connexion tombe (veille du poste, réseau
 * instable, redéploiement backend...).
 */
export function useRealtimeCalendrier() {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const socketRef = useRef<WebSocket | null>(null)
    const tentativeRef = useRef(0)
    const fermetureVoulueRef = useRef(false)

    useEffect(() => {
        if (!user) return
        fermetureVoulueRef.current = false

        const connecter = () => {
            const protocole = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const socket = new WebSocket(`${protocole}//${window.location.host}/ws/calendrier/`)
            socketRef.current = socket

            socket.onopen = () => {
                tentativeRef.current = 0
            }

            socket.onmessage = (event) => {
                let message: MessageTempsReel
                try {
                    message = JSON.parse(event.data)
                } catch {
                    return
                }
                const cles = CLES_PAR_TYPE[message.type]
                if (!cles) return
                for (const cle of cles) {
                    queryClient.invalidateQueries({ queryKey: [cle] })
                }
            }

            socket.onclose = () => {
                if (fermetureVoulueRef.current) return
                const delai = Math.min(1000 * 2 ** tentativeRef.current, DELAI_RECONNEXION_MAX_MS)
                tentativeRef.current += 1
                setTimeout(connecter, delai)
            }

            // onerror est systématiquement suivi de onclose côté navigateur —
            // la reconnexion est donc déjà gérée ci-dessus, pas besoin de la
            // dupliquer ici.
            socket.onerror = () => {}
        }

        connecter()

        return () => {
            fermetureVoulueRef.current = true
            socketRef.current?.close()
        }
    }, [user, queryClient])
}
