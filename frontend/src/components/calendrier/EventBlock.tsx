import { motion } from 'framer-motion'
import { TriangleAlert, Users } from 'lucide-react'
import type { EvenementPlanning } from '../../types'
import { PX_PAR_MINUTE, TYPE_EVENEMENT_CONFIG, minutesDepuisDebutGrille } from './calendrierConfig'

interface Props {
    evenement: EvenementPlanning
    onClick: () => void
    /** Nombre de colonnes qui se chevauchent et index de celle-ci — évite que 2 RDV au même moment se superposent totalement */
    colonnes?: number
    indexColonne?: number
}

export default function EventBlock({ evenement, onClick, colonnes = 1, indexColonne = 0 }: Props) {
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

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={onClick}
            className="absolute text-left rounded-lg px-2 py-1.5 overflow-hidden"
            style={{
                top,
                height: Math.max(height, 24),
                left: `calc(${gauche}% + 2px)`,
                width: `calc(${largeur}% - 4px)`,
                backgroundColor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                opacity: annule ? 0.55 : 1,
                zIndex: 1,
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
        </motion.button>
    )
}
