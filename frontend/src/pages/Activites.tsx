import { useEffect, useState } from 'react'
import { getActivites } from '../api/activites'
import type { JournalActivite, TypeObjetActivite, ActionActivite } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageBanner from '../components/PageBanner.tsx'
import { SkeletonSimpleList } from '../components/Skeleton'
import { History } from 'lucide-react'

function tempsEcoule(dateIso: string) {
    const mins = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const h = Math.floor(mins / 60)
    if (h < 24) return `il y a ${h}h${(mins % 60).toString().padStart(2, '0')}`
    return `il y a ${Math.floor(h / 24)} j`
}

const TYPES_OBJET: { value: TypeObjetActivite; label: string }[] = [
    { value: 'rendez_vous', label: 'Rendez-vous' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'intervention', label: 'Intervention chirurgicale' },
    { value: 'patient', label: 'Patient' },
    { value: 'hospitalisation', label: 'Hospitalisation' },
    { value: 'urgence', label: 'Urgence' },
    { value: 'employe', label: 'Employé' },
    { value: 'autre', label: 'Autre' },
]

const ACTIONS: { value: ActionActivite; label: string }[] = [
    { value: 'creation', label: 'Création' },
    { value: 'modification', label: 'Modification' },
    { value: 'suppression', label: 'Suppression' },
    { value: 'annulation', label: 'Annulation' },
    { value: 'autre', label: 'Autre' },
]

export default function Activites() {
    const [activites, setActivites] = useState<JournalActivite[] | null>(null)
    const [typeObjet, setTypeObjet] = useState<TypeObjetActivite | ''>('')
    const [action, setAction] = useState<ActionActivite | ''>('')
    const [debut, setDebut] = useState('')
    const [fin, setFin] = useState('')
    const [recherche, setRecherche] = useState('')

    const charger = () => {
        setActivites(null)
        getActivites({
            type_objet: typeObjet || undefined,
            action_type: action || undefined,
            debut: debut || undefined,
            fin: fin || undefined,
        }).then(setActivites).catch(() => setActivites([]))
    }

    useEffect(() => {
        charger()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeObjet, action, debut, fin])

    const resultats = (activites ?? []).filter(a =>
        !recherche.trim() ||
        a.description.toLowerCase().includes(recherche.toLowerCase()) ||
        `${a.employe_prenom ?? ''} ${a.employe_nom ?? ''}`.toLowerCase().includes(recherche.toLowerCase())
    )

    const reinitialiser = () => {
        setTypeObjet('')
        setAction('')
        setDebut('')
        setFin('')
        setRecherche('')
    }

    return (
        <div className="ht-page">
            <Sidebar />
            <main className="ht-page-content space-y-6">
                <PageBanner
                    size="large"
                    icon={History}
                    title="Activité du service"
                    subtitle="Qui a fait quoi, où et quand — journal des actions de votre service"
                />

                <div className="ht-card ht-card-padded-sm flex flex-wrap items-end gap-3">
                    <div className="min-w-[180px]">
                        <label className="ht-label">Type</label>
                        <select className="ht-input" value={typeObjet} onChange={e => setTypeObjet(e.target.value as TypeObjetActivite | '')}>
                            <option value="">Tous les types</option>
                            {TYPES_OBJET.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[160px]">
                        <label className="ht-label">Action</label>
                        <select className="ht-input" value={action} onChange={e => setAction(e.target.value as ActionActivite | '')}>
                            <option value="">Toutes les actions</option>
                            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[150px]">
                        <label className="ht-label">Du</label>
                        <input type="date" className="ht-input" value={debut} onChange={e => setDebut(e.target.value)} />
                    </div>
                    <div className="min-w-[150px]">
                        <label className="ht-label">Au</label>
                        <input type="date" className="ht-input" value={fin} onChange={e => setFin(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="ht-label">Recherche</label>
                        <input
                            type="text" className="ht-input" placeholder="Description, employé…"
                            value={recherche} onChange={e => setRecherche(e.target.value)}
                        />
                    </div>
                    {(typeObjet || action || debut || fin || recherche) && (
                        <button onClick={reinitialiser} className="btn btn-secondary">Réinitialiser</button>
                    )}
                </div>

                <div className="ht-card ht-card-padded-sm">
                    {activites === null ? (
                        <SkeletonSimpleList rows={6} />
                    ) : resultats.length === 0 ? (
                        <div className="ht-empty">Aucune activité ne correspond à ces filtres</div>
                    ) : (
                        <div className="divide-y divide-[var(--ht-border)]">
                            {resultats.map(a => (
                                <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="ht-kpi-icon" style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}>
                                            <History size={16} style={{ color: 'var(--ht-primary-tint-text)' }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{a.description}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">
                                                {a.employe_prenom ? `${a.employe_prenom} ${a.employe_nom}` : 'Système'}
                                                {a.employe_role_label && ` (${a.employe_role_label})`}
                                                {' · '}{new Date(a.date_creation).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                {' · '}{tempsEcoule(a.date_creation)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="badge badge-muted">{a.type_objet_label}</span>
                                        <span className="badge badge-tint">{a.action_label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}