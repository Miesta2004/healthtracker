import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TriangleAlert, Users } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { PX_PAR_MINUTE, TYPE_EVENEMENT_CONFIG, minutesDepuisDebutGrille } from './calendrierConfig'

// Pas d'accroche (snap) pour le redimensionnement à la souris — évite d'avoir
// à lâcher pile sur la minute exacte.
const PAS_REDIMENSION_MINUTES = 15

interface Props {
    evenement: EvenementPlanning
    onClick: () => void
    /** Nombre de colonnes qui se chevauchent et index de celle-ci — évite que 2 RDV au même moment se superposent totalement */
    colonnes?: number
    indexColonne?: number
    /** Déplacement (drag & drop) et redimensionnement — désactivés si non fourni ou si `deplacable` est false */
    deplacable?: boolean
    onRedimensionner?: (nouvelleDureeMinutes: number) => void
}

export default function EventBlock({
                                       evenement, onClick, colonnes = 1, indexColonne = 0, deplacable = false, onRedimensionner,
                                   }: Props) {
    const debut = new Date(evenement.start_time)
    const fin = new Date(evenement.end_time)
    const cfg = TYPE_EVENEMENT_CONFIG[evenement.type_evenement]

    const minutesDebut = Math.max(0, minutesDepuisDebutGrille(debut))
    const dureeMin = Math.max(20, (fin.getTime() - debut.getTime()) / 60000)

    const top = minutesDebut * PX_PAR_MINUTE
    const height = dureeMin * PX_PAR_MINUTE
    const largeur = 100 / colonnes
    const gauche = largeur * indexColonne

    const annule = evenement.statut === 'annule'
    const compact = height < 46

    const [hauteurEnCours, setHauteurEnCours] = useState<number | null>(null)
    const dureeRef = useRef(dureeMin)
    const [enGlissement, setEnGlissement] = useState(false)

    const demarrerDeplacement = (e: React.DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.setData('text/plain', String(evenement.id))
        e.dataTransfer.effectAllowed = 'move'
        setEnGlissement(true)
    }

    const demarrerRedimension = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const yDepart = e.clientY
        const dureeDepart = dureeMin
        dureeRef.current = dureeDepart

        const surDeplacement = (ev: MouseEvent) => {
            const deltaMinutesBrut = (ev.clientY - yDepart) / PX_PAR_MINUTE
            const deltaMinutes = Math.round(deltaMinutesBrut / PAS_REDIMENSION_MINUTES) * PAS_REDIMENSION_MINUTES
            const nouvelleDuree = Math.max(PAS_REDIMENSION_MINUTES, dureeDepart + deltaMinutes)
            dureeRef.current = nouvelleDuree
            setHauteurEnCours(nouvelleDuree * PX_PAR_MINUTE)
        }
        const surRelachement = () => {
            window.removeEventListener('mousemove', surDeplacement)
            window.removeEventListener('mouseup', surRelachement)
            setHauteurEnCours(null)
            if (dureeRef.current !== dureeDepart) {
                onRedimensionner?.(dureeRef.current)
            }
        }
        window.addEventListener('mousemove', surDeplacement)
        window.addEventListener('mouseup', surRelachement)
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: enGlissement ? 0.4 : 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute"
            style={{
                top,
                height: Math.max(hauteurEnCours ?? height, 24),
                left: `calc(${gauche}% + 2px)`,
                width: `calc(${largeur}% - 4px)`,
                zIndex: hauteurEnCours !== null ? 5 : 1,
            }}
        >
            <button
                onClick={onClick}
                draggable={deplacable && !annule}
                onDragStart={deplacable ? demarrerDeplacement : undefined}
                onDragEnd={() => setEnGlissement(false)}
                className="relative w-full h-full text-left rounded-lg px-2 py-1.5 overflow-hidden group"
                style={{
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    opacity: annule ? 0.55 : 1,
                    cursor: deplacable ? 'grab' : 'pointer',
                }}
            >
                {cfg.equipe && !compact && (
                    <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cfg.border }}
                    >
                        <Users size={9} style={{ color: cfg.text }} />
                    </div>
                )}

                <div className="flex items-center gap-1 pr-4">
                    <span className="text-[10.5px] font-semibold" style={{ color: cfg.text }}>
                        {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {!compact && ` – ${fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {evenement.a_alerte_critique && (
                        <TriangleAlert size={10} style={{ color: 'var(--ht-danger)', flexShrink: 0 }} />
                    )}
                </div>

                <p
                    className="text-[11.5px] font-semibold truncate leading-tight"
                    style={{ color: cfg.text, textDecoration: annule ? 'line-through' : 'none' }}
                >
                    {cfg.label}
                </p>

                {!compact && (
                    <p className="text-[10.5px] truncate leading-tight" style={{ color: cfg.text, opacity: 0.75 }}>
                        {evenement.patient.nom_complet}
                    </p>
                )}

                {deplacable && !annule && onRedimensionner && (
                    <div
                        onMouseDown={demarrerRedimension}
                        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: cfg.text }}
                    />
                )}
            </button>
        </motion.div>
    )
}
