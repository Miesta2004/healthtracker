import { useEffect, useState } from 'react'
import { X, Stethoscope, Calendar, DoorOpen, AlertTriangle } from 'lucide-react'
import { getServices, getServiceEmployes } from '../api/services'
import { getSallesDisponibles, createOperation } from '../api/chirurgie'
import type { Service, Employe, SalleBloc, Operation } from '../types'

interface Props {
    patientId: number
    consultationId?: number | null
    onClose: () => void
    onCreated: (operation: Operation) => void
}

export default function PlanifierOperationModal({ patientId, consultationId, onClose, onCreated }: Props) {
    const [services, setServices] = useState<Service[]>([])
    const [serviceId, setServiceId] = useState<number | null>(null)

    const [chirurgiens, setChirurgiens] = useState<Employe[]>([])
    const [loadingChirurgiens, setLoadingChirurgiens] = useState(false)
    const [chirurgienId, setChirurgienId] = useState<number | null>(null)

    const [typeIntervention, setTypeIntervention] = useState('')
    const [date, setDate] = useState('')
    const [heure, setHeure] = useState('08:00')
    const [dureeMin, setDureeMin] = useState(60)

    const [salles, setSalles] = useState<SalleBloc[]>([])
    const [loadingSalles, setLoadingSalles] = useState(false)
    const [salleId, setSalleId] = useState<number | null>(null)

    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    // Étape 1 : charge les services disponibles
    useEffect(() => {
        getServices().then(setServices).catch(() => setServices([]))
    }, [])

    // Étape 2 : charge les médecins du service choisi, ne garde que role='medecin'
    useEffect(() => {
        setChirurgienId(null)
        setChirurgiens([])
        if (!serviceId) return
        setLoadingChirurgiens(true)
        getServiceEmployes(serviceId)
            .then(list => setChirurgiens(list.filter(e => e.role === 'medecin')))
            .catch(() => setChirurgiens([]))
            .finally(() => setLoadingChirurgiens(false))
    }, [serviceId])

    // Étape 5 : dès que service + date + heure + durée sont connus, cherche les salles libres
    useEffect(() => {
        setSalleId(null)
        setSalles([])
        if (!serviceId || !date || !heure) return
        setLoadingSalles(true)
        const dateHeureISO = new Date(`${date}T${heure}`).toISOString()
        getSallesDisponibles(serviceId, dateHeureISO, dureeMin)
            .then(setSalles)
            .catch(() => setSalles([]))
            .finally(() => setLoadingSalles(false))
    }, [serviceId, date, heure, dureeMin])

    const peutSoumettre = !!serviceId && !!chirurgienId && !!typeIntervention.trim() && !!date && !!heure && !!salleId

    const handleSubmit = async () => {
        if (!peutSoumettre || !serviceId || !chirurgienId || !salleId) return
        setSubmitting(true)
        setErreur('')
        try {
            const operation = await createOperation({
                patient: patientId,
                consultation_indication: consultationId ?? null,
                hospitalisation: null,
                service_chirurgie: serviceId,
                salle: salleId,
                chirurgien_principal: chirurgienId,
                equipe: [],
                type_intervention: typeIntervention.trim(),
                date_heure_prevue: new Date(`${date}T${heure}`).toISOString(),
                duree_estimee_min: dureeMin,
            })
            onCreated(operation)
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setErreur(detail || "Erreur lors de la planification de l'opération.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <Stethoscope size={17} /> Planifier une opération
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                        <X size={18} />
                    </button>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Type d'intervention</label>
                    <input
                        type="text" value={typeIntervention} onChange={e => setTypeIntervention(e.target.value)}
                        placeholder="Ex : Cure de hernie inguinale"
                        className="ht-input"
                    />
                </div>

                <div className="ht-field">
                    <label className="ht-label">Service de chirurgie</label>
                    <select value={serviceId ?? ''} onChange={e => setServiceId(e.target.value ? Number(e.target.value) : null)} className="ht-input">
                        <option value="">Choisir un service…</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                </div>

                {serviceId && (
                    <div className="ht-field">
                        <label className="ht-label">Chirurgien</label>
                        {loadingChirurgiens ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                        ) : chirurgiens.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--ht-danger)' }}>
                                Aucun médecin dans ce service.
                            </p>
                        ) : (
                            <select value={chirurgienId ?? ''} onChange={e => setChirurgienId(e.target.value ? Number(e.target.value) : null)} className="ht-input">
                                <option value="">Choisir un médecin…</option>
                                {chirurgiens.map(c => (
                                    <option key={c.id} value={c.id}>
                                        Dr. {c.prenom} {c.nom}{c.specialite ? ` — ${c.specialite}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                    <div className="ht-field">
                        <label className="ht-label">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Heure</label>
                        <input type="time" value={heure} onChange={e => setHeure(e.target.value)} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Durée (min)</label>
                        <input type="number" min={15} step={15} value={dureeMin} onChange={e => setDureeMin(Number(e.target.value))} className="ht-input" />
                    </div>
                </div>

                {serviceId && date && heure && (
                    <div className="ht-field">
                        <label className="ht-label flex items-center gap-1.5"><DoorOpen size={13} /> Salle de bloc</label>
                        {loadingSalles ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Recherche des salles libres…</p>
                        ) : salles.length === 0 ? (
                            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--ht-danger)' }}>
                                <AlertTriangle size={13} /> Aucune salle libre sur ce créneau dans ce service.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {salles.map(s => (
                                    <button
                                        key={s.id} type="button" onClick={() => setSalleId(s.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                                        style={salleId === s.id
                                            ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                                            : { borderColor: 'var(--ht-border-input)', color: 'var(--ht-text)' }}
                                    >
                                        {s.nom}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {erreur && (
                    <div className="ht-alert ht-alert-danger">{erreur}</div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Annuler</button>
                    <button onClick={handleSubmit} disabled={!peutSoumettre || submitting} className="btn btn-primary flex-1 justify-center">
                        {submitting ? 'Planification…' : <span className="flex items-center gap-1.5 justify-center"><Calendar size={14} /> Planifier</span>}
                    </button>
                </div>
            </div>
        </div>
    )
}
