import { TriangleAlert, CalendarX, ShieldAlert } from 'lucide-react'
import type { EvenementPlanning, GardeOccurrence } from '../../types'
import { TYPE_EVENEMENT_CONFIG, GARDE_COULEUR, joursDeSemaine, memeJour, toISODate } from './calendrierConfig'
import { AGENDA_JOURS_A_VENIR } from './calendrierConfig'

interface Props {
    evenements: EvenementPlanning[]
    gardes?: GardeOccurrence[]
    onSelectEvenement: (e: EvenementPlanning) => void
    onSelectGarde?: (g: GardeOccurrence) => void
}

// Un item d'agenda est soit un événement (RendezVous/EvenementAdministratif,
// déjà fusionnés côté API), soit une garde (fusionnée côté frontend) — cette
// vue les regroupe tous les deux par jour, pour qu'un jour sans aucun
// événement patient mais avec une garde ait quand même sa section.
type ItemAgenda =
    | { kind: 'evenement'; date: Date; data: EvenementPlanning }
    | { kind: 'garde'; date: Date; data: GardeOccurrence }

interface GroupeJour { date: Date; items: ItemAgenda[] }
interface Section { label: string; groupes: GroupeJour[] }

function grouper(evenements: EvenementPlanning[], gardes: GardeOccurrence[]): Section[] {
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)
    const finSemaine = joursDeSemaine(aujourdhui)[6]
    finSemaine.setHours(23, 59, 59, 999)

    const items: ItemAgenda[] = [
        ...evenements.map(e => ({ kind: 'evenement' as const, date: new Date(e.start_time), data: e })),
        ...gardes.map(g => ({ kind: 'garde' as const, date: new Date(g.start_time), data: g })),
    ]
        .filter(i => i.date >= aujourdhui)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

    const seaux: Record<string, ItemAgenda[]> = {
        "Aujourd'hui": [], 'Demain': [], 'Cette semaine': [], 'À venir': [],
    }
    for (const item of items) {
        if (memeJour(item.date, aujourdhui)) seaux["Aujourd'hui"].push(item)
        else if (memeJour(item.date, demain)) seaux['Demain'].push(item)
        else if (item.date <= finSemaine) seaux['Cette semaine'].push(item)
        else seaux['À venir'].push(item)
    }

    const parJour = (liste: ItemAgenda[]): GroupeJour[] => {
        const map = new Map<string, GroupeJour>()
        for (const item of liste) {
            const cle = toISODate(item.date)
            if (!map.has(cle)) map.set(cle, { date: item.date, items: [] })
            map.get(cle)!.items.push(item)
        }
        return [...map.values()]
    }

    return Object.entries(seaux)
        .filter(([, liste]) => liste.length > 0)
        .map(([label, liste]) => ({ label, groupes: parJour(liste) }))
}

export default function CalendarAgendaView({ evenements, gardes = [], onSelectEvenement, onSelectGarde }: Props) {
    const sections = grouper(evenements, gardes)

    if (sections.length === 0) {
        return (
            <div className="ht-card flex flex-col items-center justify-center gap-2 py-20" style={{ color: 'var(--ht-text-muted)' }}>
                <CalendarX size={28} />
                <p className="text-sm">Aucun événement à venir sur les {AGENDA_JOURS_A_VENIR} prochains jours</p>
            </div>
        )
    }

    return (
        <div className="ht-card divide-y" style={{ borderColor: 'var(--ht-border)' }}>
            {sections.map(section => (
                <div key={section.label} className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        {section.label}
                        <span
                            className="text-xs font-normal px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}
                        >
                            {section.groupes.reduce((n, g) => n + g.items.length, 0)}
                        </span>
                    </h3>

                    <div className="space-y-3">
                        {section.groupes.map(groupe => (
                            <div key={groupe.date.toISOString()}>
                                {section.label !== "Aujourd'hui" && section.label !== 'Demain' && (
                                    <p className="text-xs font-medium mb-1.5 capitalize" style={{ color: 'var(--ht-text-muted)' }}>
                                        {groupe.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {groupe.items.map(item => {
                                        if (item.kind === 'evenement') {
                                            const e = item.data
                                            const cfg = TYPE_EVENEMENT_CONFIG[e.type_evenement]
                                            const debut = new Date(e.start_time)
                                            const annule = e.statut === 'annule'
                                            return (
                                                <button
                                                    key={`e-${e.id}`}
                                                    onClick={() => onSelectEvenement(e)}
                                                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--ht-bg)]"
                                                    style={{ opacity: annule ? 0.55 : 1 }}
                                                >
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.text }} />
                                                    <span className="text-sm font-semibold w-12 flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                                        {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span
                                                        className="text-sm font-medium truncate flex-1"
                                                        style={{ color: 'var(--ht-text)', textDecoration: annule ? 'line-through' : 'none' }}
                                                    >
                                                        {cfg.label} · {e.patient ? e.patient.nom_complet : (e.lieu || e.motif)}
                                                    </span>
                                                    {e.alerte_critique && (
                                                        <TriangleAlert size={14} style={{ color: 'var(--ht-danger)', flexShrink: 0 }} />
                                                    )}
                                                </button>
                                            )
                                        }
                                        const g = item.data
                                        const debut = new Date(g.start_time)
                                        const fin = new Date(g.end_time)
                                        return (
                                            <button
                                                key={`g-${g.id}`}
                                                onClick={() => onSelectGarde?.(g)}
                                                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--ht-bg)]"
                                                style={{ opacity: g.source === 'exception' ? 0.75 : 1 }}
                                            >
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: GARDE_COULEUR }} />
                                                <span className="text-sm font-semibold w-12 flex-shrink-0" style={{ color: 'var(--ht-text)' }}>
                                                    {debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-sm font-medium truncate flex-1" style={{ color: 'var(--ht-text)' }}>
                                                    {g.type_label} · {g.employe_prenom} {g.employe_nom}
                                                    <span style={{ color: 'var(--ht-text-muted)' }}>
                                                        {' '}(jusqu'à {fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                                                    </span>
                                                </span>
                                                {g.source === 'exception' && (
                                                    <ShieldAlert size={14} style={{ color: GARDE_COULEUR, flexShrink: 0 }} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
