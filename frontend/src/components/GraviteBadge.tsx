import { computeGravite, GRAVITE_LABEL, type Gravite } from '../utils/gravite'
import type { Alerte } from '../types'

export default function GraviteBadge({
                                         gravite, alertes, small = false,
                                     }: { gravite?: Gravite; alertes?: Alerte[]; small?: boolean }) {
    const g = gravite ?? (alertes ? computeGravite(alertes) : 'stable')

    return (
        <span
            className={`badge-gravite badge-gravite-${g}`}
            style={small ? { fontSize: '0.62rem', padding: '0.2rem 0.55rem 0.2rem 0.45rem' } : undefined}
        >
            <span className="badge-gravite-dot" />
            {GRAVITE_LABEL[g]}
        </span>
    )
}
