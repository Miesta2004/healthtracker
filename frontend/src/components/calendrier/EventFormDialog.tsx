import { useEffect, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { getPatients } from '../../api/patients'
import { getEmployes } from '../../api/comptes'
import type { Patient, Employe, TypeEvenementRdv, StatutRendezVous } from '../../types'
import { TYPE_EVENEMENT_CONFIG, STATUT_LABELS, toISODate } from './calendrierConfig'

const schema = z.object({
    patientId: z.number({ error: 'Sélectionnez un patient' }).nullable().refine(v => v !== null, 'Sélectionnez un patient'),
    medecinId: z.number().nullable(),
    date: z.string().min(1, 'Date requise'),
    heure: z.string().min(1, 'Heure requise'),
    duree_minutes: z.number().min(5, 'Minimum 5 min').max(600, 'Maximum 10h'),
    type_evenement: z.enum(['consultation', 'intervention', 'reunion', 'garde', 'visite_postoperatoire', 'autre']),
    motif: z.string().min(1, 'Motif requis').max(255),
    notes: z.string().optional(),
    statut: z.enum(['planifie', 'confirme', 'termine', 'annule']),
})

// Défini manuellement plutôt que via z.infer<typeof schema> : le .refine()
// sur patientId ne porte pas de type predicate ("arg is number"), donc zod
// ne restreint pas number|null → number au niveau des types, uniquement à
// l'exécution. On le fait donc correspondre ici à la forme réelle du
// formulaire (patientId toujours number|null tant qu'aucun patient n'est
// choisi), et on caste le resolver en conséquence.
interface FormValues {
    patientId: number | null
    medecinId: number | null
    date: string
    heure: string
    duree_minutes: number
    type_evenement: TypeEvenementRdv
    motif: string
    notes?: string
    statut: StatutRendezVous
}

export interface EventFormInitial {
    id?: number
    patientId?: number | null
    patientLabel?: string
    medecinId?: number | null
    medecinLabel?: string
    date?: string
    heure?: string
    duree_minutes?: number
    type_evenement?: TypeEvenementRdv
    motif?: string
    notes?: string
    statut?: StatutRendezVous
}

interface Props {
    initial: EventFormInitial
    onClose: () => void
    onSubmit: (data: Record<string, unknown>) => void
    onDelete?: () => void
    submitting?: boolean
    erreur?: string
}

function PickerPersonne<T extends { id: number; nom: string; prenom: string }>({
    label, valeur, valeurLabel, onChange, rechercher, placeholder, optionnel,
}: {
    label: string
    valeur: number | null
    valeurLabel?: string
    onChange: (id: number | null, label: string) => void
    rechercher: (q: string) => Promise<T[]>
    placeholder: string
    optionnel?: boolean
}) {
    const [ouvert, setOuvert] = useState(false)
    const [terme, setTerme] = useState('')
    const [resultats, setResultats] = useState<T[]>([])
    const [chargement, setChargement] = useState(false)

    useEffect(() => {
        if (!ouvert) return
        setChargement(true)
        const t = setTimeout(() => {
            rechercher(terme).then(setResultats).finally(() => setChargement(false))
        }, 250)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terme, ouvert])

    return (
        <div className="relative">
            <label className="ht-label">{label}{!optionnel && ' *'}</label>
            <button
                type="button"
                onClick={() => setOuvert(o => !o)}
                className="ht-input flex items-center justify-between text-left"
            >
                <span style={{ color: valeur ? 'var(--ht-text)' : 'var(--ht-text-muted)' }}>
                    {valeurLabel || placeholder}
                </span>
                <Search size={14} style={{ color: 'var(--ht-text-muted)' }} />
            </button>
            {ouvert && (
                <div
                    className="absolute z-20 mt-1 w-full rounded-xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border-input)', boxShadow: 'var(--ht-shadow-modal)' }}
                >
                    <input
                        autoFocus
                        value={terme}
                        onChange={e => setTerme(e.target.value)}
                        placeholder="Rechercher..."
                        className="ht-input rounded-none border-0 border-b"
                        style={{ borderColor: 'var(--ht-border-input)' }}
                    />
                    <div className="max-h-48 overflow-y-auto">
                        {optionnel && (
                            <button
                                type="button"
                                onClick={() => { onChange(null, ''); setOuvert(false) }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ht-bg)]"
                                style={{ color: 'var(--ht-text-muted)' }}
                            >
                                Aucun
                            </button>
                        )}
                        {chargement && <p className="px-3 py-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>Recherche…</p>}
                        {!chargement && resultats.length === 0 && (
                            <p className="px-3 py-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun résultat</p>
                        )}
                        {resultats.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => { onChange(r.id, `${r.prenom} ${r.nom}`); setOuvert(false); setTerme('') }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ht-bg)]"
                                style={{ color: 'var(--ht-text)' }}
                            >
                                {r.prenom} {r.nom}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function EventFormDialog({ initial, onClose, onSubmit, onDelete, submitting, erreur }: Props) {
    const estEdition = initial.id !== undefined
    const {
        control, register, handleSubmit, watch, formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
        defaultValues: {
            patientId: initial.patientId ?? null,
            medecinId: initial.medecinId ?? null,
            date: initial.date ?? toISODate(new Date()),
            heure: initial.heure ?? '09:00',
            duree_minutes: initial.duree_minutes ?? 30,
            type_evenement: initial.type_evenement ?? 'consultation',
            motif: initial.motif ?? '',
            notes: initial.notes ?? '',
            statut: initial.statut ?? 'planifie',
        },
    })

    const typeChoisi = watch('type_evenement')

    const soumettre = (values: FormValues) => {
        const dateHeureISO = new Date(`${values.date}T${values.heure}:00`).toISOString()
        onSubmit({
            patient: values.patientId,
            medecin: values.medecinId,
            date_heure: dateHeureISO,
            duree_minutes: values.duree_minutes,
            type_evenement: values.type_evenement,
            motif: values.motif,
            notes: values.notes,
            statut: values.statut,
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
                        <h3>{estEdition ? "Modifier l'événement" : 'Nouvel événement'}</h3>
                        <button onClick={onClose} style={{ color: 'var(--ht-text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(soumettre)} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        {erreur && (
                            <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                                {erreur}
                            </div>
                        )}

                        <div>
                            <label className="ht-label">Type d'événement *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(TYPE_EVENEMENT_CONFIG) as TypeEvenementRdv[]).map(t => {
                                    const cfg = TYPE_EVENEMENT_CONFIG[t]
                                    const actif = typeChoisi === t
                                    return (
                                        <label key={t} className="cursor-pointer">
                                            <input type="radio" value={t} {...register('type_evenement')} className="sr-only" />
                                            <div
                                                className="flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-medium transition-colors"
                                                style={{
                                                    borderColor: actif ? cfg.color : 'var(--ht-border-input)',
                                                    backgroundColor: actif ? cfg.bg : 'transparent',
                                                    color: actif ? cfg.color : 'var(--ht-text-secondary)',
                                                }}
                                            >
                                                <cfg.Icon size={15} />
                                                {cfg.label}
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <Controller
                            control={control}
                            name="patientId"
                            render={({ field }) => (
                                <PickerPersonne<Patient>
                                    label="Patient"
                                    valeur={field.value}
                                    valeurLabel={initial.patientLabel}
                                    onChange={(id) => field.onChange(id)}
                                    rechercher={(q) => getPatients(q)}
                                    placeholder="Rechercher un patient…"
                                />
                            )}
                        />
                        {errors.patientId && <p className="text-xs" style={{ color: 'var(--ht-danger)' }}>{errors.patientId.message}</p>}

                        <Controller
                            control={control}
                            name="medecinId"
                            render={({ field }) => (
                                <PickerPersonne<Employe>
                                    label="Médecin"
                                    optionnel
                                    valeur={field.value}
                                    valeurLabel={initial.medecinLabel}
                                    onChange={(id) => field.onChange(id)}
                                    rechercher={async (q) => {
                                        const employes = await getEmployes()
                                        return employes.filter(e =>
                                            e.role === 'medecin' &&
                                            `${e.prenom} ${e.nom}`.toLowerCase().includes(q.toLowerCase())
                                        )
                                    }}
                                    placeholder="Aucun médecin assigné"
                                />
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="ht-label">Date *</label>
                                <input type="date" className="ht-input" {...register('date')} />
                                {errors.date && <p className="text-xs mt-1" style={{ color: 'var(--ht-danger)' }}>{errors.date.message}</p>}
                            </div>
                            <div>
                                <label className="ht-label">Heure *</label>
                                <input type="time" className="ht-input" {...register('heure')} />
                                {errors.heure && <p className="text-xs mt-1" style={{ color: 'var(--ht-danger)' }}>{errors.heure.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="ht-label">Durée</label>
                            <select className="ht-input" {...register('duree_minutes', { valueAsNumber: true })}>
                                {[15, 30, 45, 60, 90, 120, 240, 480].map(m => (
                                    <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? m % 60 : ''}`}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="ht-label">Motif *</label>
                            <input className="ht-input" placeholder="Ex. contrôle post-opératoire" {...register('motif')} />
                            {errors.motif && <p className="text-xs mt-1" style={{ color: 'var(--ht-danger)' }}>{errors.motif.message}</p>}
                        </div>

                        <div>
                            <label className="ht-label">Notes</label>
                            <textarea className="ht-input" rows={2} {...register('notes')} />
                        </div>

                        {estEdition && (
                            <div>
                                <label className="ht-label">Statut</label>
                                <select className="ht-input" {...register('statut')}>
                                    {Object.entries(STATUT_LABELS).map(([val, lbl]) => (
                                        <option key={val} value={val}>{lbl}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            {estEdition && onDelete ? (
                                <button type="button" onClick={onDelete} className="btn btn-danger">
                                    Supprimer
                                </button>
                            ) : <span />}
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
                                <button type="submit" disabled={submitting} className="btn btn-primary">
                                    {submitting ? 'Enregistrement…' : estEdition ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
