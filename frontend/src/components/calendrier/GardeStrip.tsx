import type { GardeOccurrence } from '../../types'
import { PX_PAR_MINUTE, GARDE_COULEUR, minutesDepuisDebutGrille } from './calendrierConfig'

interface Props {
    garde: GardeOccurrence
    onClick: () => void
    /** Décalage horizontal (px) si plusieurs gardes se chevauchent le même jour */
    decalage?: number
}

export default function GardeStrip({ garde, onClick, decalage = 0 }: Props) {
    const debut = new Date(garde.start_time)
    const fin = new Date(garde.end_time)

    const minutesDebut = Math.max(0, minutesDepuisDebutGrille(debut))
    const dureeMin = (fin.getTime() - debut.getTime()) / 60000

    const top = minutesDebut * PX_PAR_MINUTE
    const height = dureeMin * PX_PAR_MINUTE

    return (
        <button
            onClick={onClick}
            title={`${garde.type_label} — ${garde.employe_prenom} ${garde.employe_nom} (${debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}–${fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`}
            className="absolute w-1.5 rounded-full hover:w-2.5 transition-all"
            style={{
                top,
                height: Math.max(height, 12),
                left: 2 + decalage,
                backgroundColor: GARDE_COULEUR,
                opacity: garde.source === 'exception' ? 0.55 : 0.9,
                zIndex: 2,
            }}
        />
    )
}
