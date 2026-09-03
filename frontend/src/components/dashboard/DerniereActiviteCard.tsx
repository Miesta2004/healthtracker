import { History, ArrowRight } from 'lucide-react'
import { SkeletonSimpleList } from '../Skeleton'
import type { DerniereActivite } from '../../types'

interface Props {
    activite: DerniereActivite | null
    /** `null` tant que la requête ma_derniere_activite/ n'a pas répondu. */
    loading: boolean
    onReprendre: (route: string) => void
}

function formatDepuis(dateISO: string): string {
    const diffMs = Date.now() - new Date(dateISO).getTime()
    const minutes = Math.max(0, Math.round(diffMs / 60000))
    if (minutes < 1) return "moins d'une minute"
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`
    const heures = Math.round(minutes / 60)
    if (heures < 24) return `${heures} heure${heures > 1 ? 's' : ''}`
    const jours = Math.round(heures / 24)
    return `${jours} jour${jours > 1 ? 's' : ''}`
}

/**
 * Bloc "Dernière activité" — reprise de navigation après reconnexion.
 *
 * À ne pas confondre avec ContinuerMonTravailCard (tâches en attente) ni
 * avec le journal "Activités" du service (audit) : ceci ne représente que
 * l'endroit où l'utilisateur travaillait personnellement avant de partir.
 *
 * Par sécurité/confidentialité (cf. exigences produit), n'affiche jamais de
 * contenu médical — seulement une indication de where/who/when — et ne
 * rend rien du tout tant qu'il n'y a pas de dernière activité valide :
 * pas d'état vide façon "rien à afficher", contrairement à
 * ContinuerMonTravailCard.
 */
export default function DerniereActiviteCard({ activite, loading, onReprendre }: Props) {
    if (loading) {
        return (
            <div className="ht-card ht-card-padded">
                <SkeletonSimpleList rows={1} />
            </div>
        )
    }

    if (!activite) return null

    return (
        <div className="ht-card ht-card-padded">
            <div className="flex items-start gap-3">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--ht-bg)' }}
                >
                    <History size={16} style={{ color: 'var(--ht-primary-tint-text)' }} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>
                        Dernière activité
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--ht-text)' }}>
                        {activite.patient_nom
                            ? <>Vous étiez sur le dossier de <span>{activite.patient_nom}</span></>
                            : 'Vous aviez une session de travail en cours'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        {activite.section_label && <>Section : {activite.section_label} · </>}
                        Il y a {formatDepuis(activite.date_activite)}
                    </p>
                    <button
                        onClick={() => onReprendre(activite.route)}
                        className="text-xs font-semibold self-start mt-2 flex items-center gap-1"
                        style={{ color: 'var(--ht-primary-tint-text)' }}
                    >
                        Reprendre <ArrowRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    )
}