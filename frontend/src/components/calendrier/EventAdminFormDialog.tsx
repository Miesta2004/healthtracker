import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getServices } from '../../api/services'
import type { Service, TypeEvenementAdmin, EvenementAdministratif } from '../../types'
import { TYPE_EVENEMENT_CONFIG, toISODate } from './calendrierConfig'

const TYPES_ADMIN: TypeEvenementAdmin[] = ['reunion', 'formation', 'garde', 'autre']

export interface EventAdminFormInitial {
    id?: number
    titre?: string
    type_evenement?: TypeEvenementAdmin
    service?: number | null
    date?: string
    heureDebut?: string
    heureFin?: string
    lieu?: string
    description?: string
    statut?: EvenementAdministratif['statut']
}

interface Props {
    initial: EventAdminFormInitial
    serviceParDefaut: number | null
    peutChoisirService: boolean
    onClose: () => void
    onSubmit: (data: Record<string, unknown>) => void
    onDelete?: () => void
    submitting?: boolean
    erreur?: string
}

export default function EventAdminFormDialog({
                                                 initial, serviceParDefaut, peutChoisirService, onClose, onSubmit, onDelete, submitting, erreur,
                                             }: Props) {
    const estEdition = initial.id !== undefined

    const [titre, setTitre] = useState(initial.titre ?? '')
    const [type, setType] = useState<TypeEvenementAdmin>(initial.type_evenement ?? 'reunion')
    const [service, setService] = useState<number | null>(initial.service ?? serviceParDefaut)
    const [date, setDate] = useState(initial.date ?? toISODate(new Date()))
    const [heureDebut, setHeureDebut] = useState(initial.heureDebut ?? '09:00')
    const [heureFin, setHeureFin] = useState(initial.heureFin ?? '10:00')
    const [lieu, setLieu] = useState(initial.lieu ?? '')
    const [description, setDescription] = useState(initial.description ?? '')
    const [statut, setStatut] = useState<EvenementAdministratif['statut']>(initial.statut ?? 'planifie')

    const [services, setServices] = useState<Service[]>([])
    useEffect(() => {
        if (peutChoisirService) getServices().then(setServices).catch(() => setServices([]))
    }, [peutChoisirService])

    const valide = titre.trim().length > 0 && date && heureDebut && heureFin && heureFin > heureDebut

    const soumettre = () => {
        if (!valide) return
        onSubmit({
            titre: titre.trim(),
            type_evenement: type,
            service,
            date_heure_debut: new Date(`${date}T${heureDebut}`).toISOString(),
            date_heure_fin: new Date(`${date}T${heureFin}`).toISOString(),
            lieu: lieu.trim(),
            description: description.trim(),
            ...(estEdition ? { statut } : {}),
        })
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(17, 24, 39, 0.45)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.15 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-lg rounded-2xl overflow-hidden"
                    style={{ backgroundColor: 'var(--ht-card-bg)', boxShadow: 'var(--ht-shadow-modal)' }}
                >
                    <div className="ht-card-header justify-between">
                        <h3>{estEdition ? "Modifier l'événement administratif" : 'Nouvel événement administratif'}</h3>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        {erreur && (
                            <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                                {erreur}
                            </div>
                        )}

                        <div>
                            <label className="ht-label">Type d'événement *</label>
                            <div className="grid grid-cols-4 gap-2">
                                {TYPES_ADMIN.map(t => {
                                    const cfg = TYPE_EVENEMENT_CONFIG[t]
                                    const actif = type === t
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            className="flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-medium transition-colors"
                                            style={{
                                                borderColor: actif ? cfg.text : 'var(--ht-border-input)',
                                                backgroundColor: actif ? cfg.bg : 'transparent',
                                                color: actif ? cfg.text : 'var(--ht-text-secondary)',
                                            }}
                                        >
                                            <cfg.Icon size={15} />
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="ht-label">Titre *</label>
                            <input className="ht-input" placeholder="Ex. Staff hebdomadaire de service"
                                   value={titre} onChange={e => setTitre(e.target.value)} />
                        </div>

                        <div>
                            <label className="ht-label">Service concerné</label>
                            {peutChoisirService ? (
                                <select className="ht-input" value={service ?? ''} onChange={e => setService(e.target.value ? Number(e.target.value) : null)}>
                                    <option value="">Tout l'hôpital (transversal)</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                </select>
                            ) : (
                                <p className="ht-input flex items-center" style={{ color: 'var(--ht-text-muted)', backgroundColor: 'var(--ht-bg)' }}>
                                    Ton service (non modifiable)
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="ht-label">Date *</label>
                                <input type="date" className="ht-input" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="ht-label">Début *</label>
                                <input type="time" className="ht-input" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
                            </div>
                            <div>
                                <label className="ht-label">Fin *</label>
                                <input type="time" className="ht-input" value={heureFin} onChange={e => setHeureFin(e.target.value)} />
                            </div>
                        </div>
                        {heureFin && heureDebut && heureFin <= heureDebut && (
                            <p className="text-xs" style={{ color: 'var(--ht-danger)' }}>L'heure de fin doit être après l'heure de début.</p>
                        )}

                        <div>
                            <label className="ht-label">Lieu</label>
                            <input className="ht-input" placeholder="Ex. Salle de réunion B" value={lieu} onChange={e => setLieu(e.target.value)} />
                        </div>

                        <div>
                            <label className="ht-label">Description</label>
                            <textarea className="ht-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        {estEdition && (
                            <div>
                                <label className="ht-label">Statut</label>
                                <select className="ht-input" value={statut} onChange={e => setStatut(e.target.value as EvenementAdministratif['statut'])}>
                                    <option value="planifie">Planifié</option>
                                    <option value="termine">Terminé</option>
                                    <option value="annule">Annulé</option>
                                </select>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            {estEdition && onDelete ? (
                                <button type="button" onClick={onDelete} className="btn btn-danger">Supprimer</button>
                            ) : <span />}
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
                                <button type="button" onClick={soumettre} disabled={!valide || submitting} className="btn btn-primary">
                                    {submitting ? 'Enregistrement…' : estEdition ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
