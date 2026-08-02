import type { GardeOccurrence } from '../../types'
import { PX_PAR_MINUTE, GARDE_COULEUR, minutesDepuisDebutGrille } from './calendrierConfig'

interface Props {
    garde: GardeOccurrence
    onClick: () => void
    /** Décalage horizontal (px) si plusieurs gardes se chevauchent le même jour */
    decalage?: number
    /**
     * Segment affiché pour CE jour — une garde de nuit dépasse presque
     * toujours minuit, donc sans ça le trait s'étirerait indéfiniment dans
     * la colonne de départ au lieu de se couper au bon endroit. Voir
     * calendrierConfig.ts:segmenterParJour.
     */
    debutAffiche?: Date
    finAffiche?: Date
}

export default function GardeStrip({ garde, onClick, decalage = 0, debutAffiche, finAffiche }: Props) {
    const debut = debutAffiche ?? new Date(garde.start_time)
    const fin = finAffiche ?? new Date(garde.end_time)
    const debutReel = new Date(garde.start_time)
    const finReelle = new Date(garde.end_time)

    const minutesDebut = Math.max(0, minutesDepuisDebutGrille(debut))
    const dureeMin = (fin.getTime() - debut.getTime()) / 60000

    const top = minutesDebut * PX_PAR_MINUTE
    const height = dureeMin * PX_PAR_MINUTE

    return (
        <button
            onClick={onClick}
            title={`${garde.type_label} — ${garde.employe_prenom} ${garde.employe_nom} (${debutReel.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}–${finReelle.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`}
            className="absolute w-1.5 hover:w-2.5 transition-all"
            style={{
                top,
                height: Math.max(height, 12),
                left: 2 + decalage,
                backgroundColor: GARDE_COULEUR,
                opacity: garde.source === 'exception' ? 0.55 : 0.9,
                // Coins arrondis seulement du côté qui montre vraiment le
                // début/la fin — un bord droit indique "ça continue hors champ".
                borderTopLeftRadius: debut.getTime() === debutReel.getTime() ? 6 : 0,
                borderTopRightRadius: debut.getTime() === debutReel.getTime() ? 6 : 0,
                borderBottomLeftRadius: fin.getTime() === finReelle.getTime() ? 6 : 0,
                borderBottomRightRadius: fin.getTime() === finReelle.getTime() ? 6 : 0,
                zIndex: 2,
            }}
        />
    )
}
