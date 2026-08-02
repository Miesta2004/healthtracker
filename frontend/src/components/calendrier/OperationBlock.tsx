import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ChevronUp, ChevronDown } from 'lucide-react'
import type { Operation } from '../../types'
import { PX_PAR_MINUTE, minutesDepuisDebutGrille } from './calendrierConfig'
import { STATUT_INTERVENTION_CONFIG } from '../../utils/blocOperatoireConfig.ts'

const PAS_REDIMENSION_MINUTES = 15

interface Props {
    operation: Operation
    onClick: () => void
    colonnes?: number
    indexColonne?: number
    onRedimensionner?: (nouvelleDureeMinutes: number) => void
    /** Segment affiché pour CE jour — voir calendrierConfig.ts:segmenterParJour. */
    debutAffiche?: Date
    finAffiche?: Date
    continueAvant?: boolean
    continueApres?: boolean
}

export default function OperationBlock({
                                           operation, onClick, colonnes = 1, indexColonne = 0, onRedimensionner,
                                           debutAffiche, finAffiche, continueAvant = false, continueApres = false,
                                       }: Props) {
    const debut = debutAffiche ?? new Date(operation.heure_debut)
    const fin = finAffiche ?? new Date(operation.heure_fin)
    const debutReel = new Date(operation.heure_debut)
    const finReelle = new Date(operation.heure_fin)
    const cfg = STATUT_INTERVENTION_CONFIG[operation.statut]

    const minutesDebut = Math.max(0, minutesDepuisDebutGrille(debut))
    const dureeSegmentMin = Math.max(20, (fin.getTime() - debut.getTime()) / 60000)
    const dureeReelleMin = (finReelle.getTime() - debutReel.getTime()) / 60000
    const top = minutesDebut * PX_PAR_MINUTE
    const height = dureeSegmentMin * PX_PAR_MINUTE
    const largeur = 100 / colonnes
    const gauche = largeur * indexColonne
    const compact = height < 52

    const [hauteurEnCours, setHauteurEnCours] = useState<number | null>(null)
    const dureeRef = useRef(dureeReelleMin)
    const [enGlissement, setEnGlissement] = useState(false)

    const demarrerDeplacement = (e: React.DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.setData('text/plain', String(operation.id))
        e.dataTransfer.effectAllowed = 'move'
        setEnGlissement(true)
    }

    const demarrerRedimension = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const yDepart = e.clientY
        const dureeDepart = dureeReelleMin
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
            if (dureeRef.current !== dureeDepart) onRedimensionner?.(dureeRef.current)
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
                draggable={cfg.deplacable && !continueAvant}
                onDragStart={cfg.deplacable && !continueAvant ? demarrerDeplacement : undefined}
                onDragEnd={() => setEnGlissement(false)}
                className="relative w-full h-full text-left px-2 py-1.5 overflow-hidden group"
                style={{
                    backgroundColor: cfg.bg,
                    borderLeft: `1px solid ${cfg.border}`,
                    borderRight: `1px solid ${cfg.border}`,
                    borderTop: continueAvant ? `1px dashed ${cfg.border}` : `1px solid ${cfg.border}`,
                    borderBottom: continueApres ? `1px dashed ${cfg.border}` : `1px solid ${cfg.border}`,
                    borderTopLeftRadius: continueAvant ? 0 : 8,
                    borderTopRightRadius: continueAvant ? 0 : 8,
                    borderBottomLeftRadius: continueApres ? 0 : 8,
                    borderBottomRightRadius: continueApres ? 0 : 8,
                    cursor: cfg.deplacable && !continueAvant ? 'grab' : 'pointer',
                }}
            >
                {continueAvant && (
                    <ChevronUp size={11} className="absolute top-1 left-1/2 -translate-x-1/2" style={{ color: cfg.text, opacity: 0.6 }} />
                )}

                <div
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.border }}
                >
                    <Users size={9} style={{ color: cfg.text }} />
                </div>

                <span className="text-[10.5px] font-semibold pr-4 block" style={{ color: cfg.text }}>
                    {continueAvant ? '⋯' : debutReel.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {!compact && (
                        <> – {continueApres ? '⋯' : finReelle.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                </span>

                <p className="text-[11.5px] font-semibold truncate leading-tight" style={{ color: cfg.text }}>
                    {operation.type_acte}
                </p>

                {!compact && (
                    <p className="text-[10.5px] truncate leading-tight" style={{ color: cfg.text, opacity: 0.8 }}>
                        Dr {operation.chirurgien_prenom} {operation.chirurgien_nom} · {operation.patient_prenom} {operation.patient_nom}
                    </p>
                )}

                {!compact && (
                    <span
                        className="text-[9.5px] font-medium inline-block mt-1 px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.border, color: cfg.text }}
                    >
                        {cfg.label}
                    </span>
                )}

                {continueApres && (
                    <ChevronDown size={11} className="absolute bottom-1 left-1/2 -translate-x-1/2" style={{ color: cfg.text, opacity: 0.6 }} />
                )}

                {cfg.deplacable && !continueApres && onRedimensionner && (
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
