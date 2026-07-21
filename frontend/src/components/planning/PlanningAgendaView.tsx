import { AlertTriangle, CalendarX2 } from 'lucide-react'
import type { EvenementPlanning, IndisponibilitePlanning } from '../../types'
import { TYPE_EVENEMENT_STYLE } from './typeEvenementConfig'
import { STATUT_BLOCK_BG, STATUT_BLOCK_TEXT } from './PlanningEventBlock'

function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function toISODate(d: Date) {
    return d.toISOString().slice(0, 10)
}

function libelleJour(iso: string): string {
    const aujourdhui = toISODate(new Date())
    const demain = toISODate(new Date(Date.now() + 86400000))
    if (iso === aujourdhui) return "Aujourd'hui"
    if (iso === demain) return 'Demain'
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface Props {
    debut: string
    fin: string
    evenements: EvenementPlanning[]
    indisponibilites: IndisponibilitePlanning[]
    onSelectEvenement: (e: EvenementPlanning) => void
}

export default function PlanningAgendaView({ debut, fin, evenements, indisponibilites, onSelectEvenement }: Props) {
    // Construit la liste des jours de la fenêtre, même ceux sans événement,
    // pour que "Aujourd'hui" / "Demain" restent des repères stables — un
    // agenda qui saute des jours vides désoriente plus qu'il n'aide.
    const jours: string[] = []
    for (let d = new Date(debut); toISODate(d) <= fin; d.setDate(d.getDate() + 1)) {
        jours.push(toISODate(d))
    }

    const parJour = new Map<string, EvenementPlanning[]>()
    for (const e of evenements) {
        const iso = e.start_time.slice(0, 10)
        if (!parJour.has(iso)) parJour.set(iso, [])
        parJour.get(iso)!.push(e)
    }
    parJour.forEach(liste => liste.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()))

    const indispoParJour = (iso: string) => indisponibilites.find(i => i.date_debut <= iso && i.date_fin >= iso)

    const totalEvenements = evenements.length

    if (totalEvenements === 0 && indisponibilites.length === 0) {
        return (
            <div className="ht-card text-center py-16 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                    <CalendarX2 size={20} />
                </div>
                <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                    Aucun événement sur ces 14 prochains jours.
                </p>
            </div>
        )
    }

    return (
        <div className="ht-card divide-y" style={{ borderColor: 'var(--ht-border)' }}>
            {jours.map(iso => {
                const evenementsJour = parJour.get(iso) ?? []
                const indispo = indispoParJour(iso)
                if (evenementsJour.length === 0 && !indispo && libelleJour(iso) !== "Aujourd'hui") return null

                return (
                    <div key={iso} className="flex flex-col sm:flex-row gap-3 sm:gap-6 p-4">
                        {/* Repère jour, sticky pour rester visible pendant le scroll */}
                        <div className="sm:w-36 flex-shrink-0 sm:sticky sm:top-4 self-start">
                            <p className="text-sm font-bold capitalize" style={{ color: iso === toISODate(new Date()) ? 'var(--ht-primary-tint-text)' : 'var(--ht-text)' }}>
                                {libelleJour(iso)}
                            </p>
                            {libelleJour(iso) !== "Aujourd'hui" && libelleJour(iso) !== 'Demain' && (
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                    {new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric' })}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            {indispo && (
                                <div className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg w-fit" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                                    <span className="font-semibold">{indispo.type_label}</span>
                                    {indispo.motif && <span>· {indispo.motif}</span>}
                                </div>
                            )}

                            {evenementsJour.length === 0 ? (
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun événement ce jour-là.</p>
                            ) : (
                                evenementsJour.map(e => {
                                    const style = TYPE_EVENEMENT_STYLE[e.type_evenement] ?? TYPE_EVENEMENT_STYLE.autre
                                    const Icon = style.icon
                                    const annule = e.statut === 'annule'
                                    return (
                                        <button
                                            key={e.id}
                                            onClick={() => onSelectEvenement(e)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:brightness-95"
                                            style={{ backgroundColor: style.bg, opacity: annule ? 0.6 : 1 }}
                                        >
                                            <span className="text-xs font-semibold w-12 flex-shrink-0" style={{ color: style.text }}>
                                                {formatHeure(e.start_time)}
                                            </span>
                                            <Icon size={14} className="flex-shrink-0" style={{ color: style.text }} />
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className="text-sm font-semibold truncate"
                                                    style={{ color: 'var(--ht-text)', textDecoration: annule ? 'line-through' : 'none' }}
                                                >
                                                    {e.type_evenement_label} — {e.patient.nom_complet}
                                                </p>
                                                <p className="text-xs truncate" style={{ color: 'var(--ht-text-muted)' }}>{e.motif}</p>
                                            </div>
                                            {e.a_alerte_critique && (
                                                <AlertTriangle size={14} className="flex-shrink-0" style={{ color: 'var(--ht-danger)' }} />
                                            )}
                                            <span
                                                className="badge flex-shrink-0"
                                                style={{ backgroundColor: STATUT_BLOCK_BG[e.statut], color: STATUT_BLOCK_TEXT[e.statut] }}
                                            >
                                                {e.statut_label}
                                            </span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}