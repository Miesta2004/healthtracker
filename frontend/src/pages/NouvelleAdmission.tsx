import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAdmission } from '../api/patients'
import type { AccompagnantAdmissionPayload } from '../api/patients'
import { getServices } from '../api/services'
import type { Service } from '../types'
import { dateNaissanceDepuisAge } from '../utils/dateNaissance'
import Sidebar from '../components/Sidebar.tsx'
import { UserPlus2, ChevronLeft, Users, Plus, Trash2, Search, Siren, Building2 } from 'lucide-react'

const LIENS_CONTACT = ['Conjoint(e)', 'Parent', 'Enfant', 'Frère/Sœur', 'Ami(e)', 'Autre']

export default function NouvelleAdmission() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── Mode urgence ────────────────────────────────────────────────────────
    const [modeUrgence, setModeUrgence] = useState(false)

    // ── Services (pour le sélecteur de destination, hors mode urgence) ──────
    const [services, setServices] = useState<Service[]>([])
    const [serviceId, setServiceId] = useState<number | null>(null)

    useEffect(() => {
        getServices().then(list => {
            const actifs = list.filter(s => s.actif)
            setServices(actifs)
            // Présélection : la majorité des admissions passent par le triage
            // avant d'être affinées — ça évite à l'agent de choisir un service
            // à chaque fois quand le motif n'est pas encore clair. Reste
            // librement modifiable via le sélecteur juste en dessous.
            const triage = actifs.find(s => s.nom === 'Consultation Externe / Triage')
            if (triage) setServiceId(triage.id)
        }).catch(() => setServices([]))
    }, [])

    const [form, setForm] = useState({
        nom: '', prenom: '', date_naissance: '', sexe: '',
        telephone: '', adresse: '',
        contact_urgence_nom: '', contact_urgence_telephone: '', contact_urgence_lien: '',
        mutuelle: '', numero_mutuelle: '',
        groupe_sanguin: '', allergies: '',
    })

    const [modeDateNaissance, setModeDateNaissance] = useState<'date' | 'age'>('date')
    const [ageApprox, setAgeApprox] = useState('')

    const [accompagnants, setAccompagnants] = useState<AccompagnantAdmissionPayload[]>([])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const ajouterAccompagnant = () => {
        setAccompagnants(prev => [...prev, { nom: '', prenom: '', lien_parente: '', cni: '', telephone: '' }])
    }

    const retirerAccompagnant = (index: number) => {
        setAccompagnants(prev => prev.filter((_, i) => i !== index))
    }

    const modifierAccompagnant = (index: number, field: keyof AccompagnantAdmissionPayload, value: string) => {
        setAccompagnants(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
    }

    // En mode urgence : nom/prénom optionnels, mais sexe + âge (même
    // approximatif) toujours requis. Hors urgence : tout l'état civil + le
    // service de destination sont requis.
    const step1Valid = modeUrgence
        ? !!form.sexe && (modeDateNaissance === 'date' ? !!form.date_naissance : !!ageApprox && Number(ageApprox) > 0)
        : form.prenom && form.nom && form.sexe && !!serviceId &&
        (modeDateNaissance === 'date' ? !!form.date_naissance : !!ageApprox && Number(ageApprox) > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!step1Valid) return
        setLoading(true)
        setError('')
        try {
            const dateNaissanceEstimee = modeDateNaissance === 'age'
            const payload = {
                ...form,
                date_naissance: dateNaissanceEstimee ? dateNaissanceDepuisAge(Number(ageApprox)) : form.date_naissance,
                date_naissance_estimee: dateNaissanceEstimee,
                sexe: form.sexe as 'M' | 'F',
                // On n'envoie que les accompagnants réellement renseignés (au
                // moins un nom) — une ligne ajoutée puis laissée vide ne doit
                // pas créer un accompagnant fantôme.
                accompagnants: accompagnants.filter(a => a.nom.trim() || a.prenom.trim()),
                mode_urgence_vitale: modeUrgence,
                ...(modeUrgence ? {} : { service: serviceId! }),
            }
            const patient = await createAdmission(payload)
            // Impression du badge immédiatement après l'admission — c'est
            // l'étape naturelle suivante (identitovigilance dès l'arrivée),
            // que ce soit un dossier normal ou une identité provisoire d'urgence.
            navigate(`/admissions/bracelets?patient=${patient.id}`)
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: object } })?.response?.data
            setError(
                detail && typeof detail === 'object'
                    ? Object.values(detail as Record<string, string>).flat().join(' ')
                    : "Erreur lors de la création du dossier. Vérifiez les informations."
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-2xl mx-auto space-y-6">
                <div className="pb-4" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <button onClick={() => navigate('/admissions')} className="btn btn-ghost btn-sm gap-1 !px-0 mb-2 text-xs">
                        <ChevronLeft size={14} /> Retour aux admissions
                    </button>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--ht-text)' }}>Nouvelle admission</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                        Formulaire unique — identité, contact d'urgence, couverture sociale, accompagnant(s) et
                        orientation vers un service, en une seule fois.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/admissions/recherche')}
                        className="text-xs mt-2 flex items-center gap-1.5 hover:underline"
                        style={{ color: 'var(--ht-primary)' }}
                    >
                        <Search size={12} /> Vérifier d'abord que ce patient n'existe pas déjà
                    </button>
                </div>

                {/* ── Mode urgence ── */}
                <label
                    className="ht-card ht-card-padded flex items-start gap-3 cursor-pointer"
                    style={modeUrgence ? { borderColor: 'var(--ht-danger)', borderWidth: 2 } : undefined}
                >
                    <input
                        type="checkbox"
                        checked={modeUrgence}
                        onChange={e => setModeUrgence(e.target.checked)}
                        className="mt-1"
                    />
                    <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--ht-text)' }}>
                            <Siren size={15} style={{ color: 'var(--ht-danger)' }} />
                            Urgence Vitale / Identité Provisoire
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ht-text-secondary)' }}>
                            Patient inconscient ou seul, sans identité fiable. Seuls le genre et un âge approximatif
                            sont demandés — le patient est orienté automatiquement vers les Urgences, sans attendre
                            de confirmation du service. Un agent d'admission complétera le dossier plus tard via
                            « Régulariser / Compléter le dossier ».
                        </p>
                    </div>
                </label>

                {error && <div className="ht-alert ht-alert-danger">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ── Identité ── */}
                    <div className="ht-card ht-card-padded">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                            Identité
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="ht-field">
                                <label className="ht-label">Prénom {!modeUrgence && '*'}</label>
                                <input
                                    type="text" name="prenom" value={form.prenom} onChange={handleChange}
                                    required={!modeUrgence} placeholder={modeUrgence ? 'Inconnu si non déclaré' : 'Fatou'}
                                    className="ht-input"
                                />
                            </div>
                            <div className="ht-field">
                                <label className="ht-label">Nom {!modeUrgence && '*'}</label>
                                <input
                                    type="text" name="nom" value={form.nom} onChange={handleChange}
                                    required={!modeUrgence} placeholder={modeUrgence ? 'Inconnu si non déclaré' : 'Diallo'}
                                    className="ht-input"
                                />
                            </div>

                            <div className="ht-field sm:col-span-2">
                                <label className="ht-label">Date de naissance {modeUrgence ? '/ âge estimé *' : '*'}</label>
                                <div className="flex items-center gap-4 mb-2">
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--ht-text-secondary)' }}>
                                        <input type="radio" name="mode_date_naissance" checked={modeDateNaissance === 'date'}
                                               onChange={() => setModeDateNaissance('date')} />
                                        Date connue
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--ht-text-secondary)' }}>
                                        <input type="radio" name="mode_date_naissance" checked={modeDateNaissance === 'age'}
                                               onChange={() => setModeDateNaissance('age')} />
                                        Âge approximatif
                                    </label>
                                </div>
                                {modeDateNaissance === 'date' ? (
                                    <input type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange}
                                           required className="ht-input" />
                                ) : (
                                    <input type="number" min={0} max={130} value={ageApprox}
                                           onChange={e => setAgeApprox(e.target.value)}
                                           placeholder="Âge en années" required className="ht-input" />
                                )}
                            </div>

                            <div className="ht-field">
                                <label className="ht-label">Sexe (estimé) *</label>
                                <select name="sexe" value={form.sexe} onChange={handleChange} required className="ht-input">
                                    <option value="">Choisir…</option>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <div className="ht-field">
                                <label className="ht-label">Téléphone</label>
                                <input type="text" name="telephone" value={form.telephone} onChange={handleChange}
                                       placeholder="+221 77 000 00 00" className="ht-input" />
                            </div>

                            {!modeUrgence && (
                                <div className="ht-field sm:col-span-2">
                                    <label className="ht-label">Adresse</label>
                                    <input type="text" name="adresse" value={form.adresse} onChange={handleChange}
                                           placeholder="Quartier, ville" className="ht-input" />
                                </div>
                            )}

                            <div className="ht-field">
                                <label className="ht-label">Groupe sanguin</label>
                                <input type="text" name="groupe_sanguin" value={form.groupe_sanguin} onChange={handleChange}
                                       placeholder="Ex : O+" className="ht-input" />
                            </div>
                            <div className="ht-field">
                                <label className="ht-label">Allergies connues</label>
                                <input type="text" name="allergies" value={form.allergies} onChange={handleChange}
                                       placeholder="Ex : Pénicilline" className="ht-input" />
                            </div>
                        </div>
                    </div>

                    {/* ── Orientation (hors mode urgence) ── */}
                    {!modeUrgence && (
                        <div className="ht-card ht-card-padded">
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                <Building2 size={13} /> Orientation
                            </h2>
                            <div className="ht-field">
                                <label className="ht-label">Service de destination *</label>
                                <select
                                    value={serviceId ?? ''} required
                                    onChange={e => setServiceId(e.target.value ? Number(e.target.value) : null)}
                                    className="ht-input"
                                >
                                    <option value="">Choisir un service…</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                </select>
                                <p className="text-xs mt-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                    Motif pas encore clair ? Choisissez "Consultation Externe / Triage" — le patient
                                    y attendra un premier avis médical avant réorientation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Contact d'urgence ── */}
                    <div className="ht-card ht-card-padded">
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                            Contact d'urgence
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="ht-field">
                                <label className="ht-label">Nom complet</label>
                                <input type="text" name="contact_urgence_nom" value={form.contact_urgence_nom} onChange={handleChange}
                                       placeholder="Aïssatou Diallo" className="ht-input" />
                            </div>
                            <div className="ht-field">
                                <label className="ht-label">Téléphone</label>
                                <input type="text" name="contact_urgence_telephone" value={form.contact_urgence_telephone} onChange={handleChange}
                                       placeholder="+221 77 000 00 00" className="ht-input" />
                            </div>
                            <div className="ht-field sm:col-span-2">
                                <label className="ht-label">Lien avec le patient</label>
                                <select name="contact_urgence_lien" value={form.contact_urgence_lien} onChange={handleChange} className="ht-input">
                                    <option value="">Choisir…</option>
                                    {LIENS_CONTACT.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Accompagnant(s) ── */}
                    <div className="ht-card ht-card-padded">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--ht-text-muted)' }}>
                                <Users size={13} /> Accompagnant(s) présent(s)
                            </h2>
                            <button type="button" onClick={ajouterAccompagnant} className="btn btn-secondary btn-sm gap-1 text-xs">
                                <Plus size={13} /> Ajouter
                            </button>
                        </div>

                        {modeUrgence && (
                            <p className="text-xs mb-3 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}>
                                Un accompagnant présent peut déclarer l'identité du patient ici — utile pour la
                                régularisation ultérieure du dossier.
                            </p>
                        )}

                        {accompagnants.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                Aucun accompagnant enregistré pour le moment.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {accompagnants.map((acc, index) => (
                                    <div key={index} className="p-3 rounded-xl border relative" style={{ borderColor: 'var(--ht-border)' }}>
                                        <button
                                            type="button"
                                            onClick={() => retirerAccompagnant(index)}
                                            className="absolute top-2 right-2 btn btn-ghost btn-sm !p-1.5 text-[var(--ht-danger)]"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                                            <div className="ht-field">
                                                <label className="ht-label">Prénom</label>
                                                <input type="text" value={acc.prenom} className="ht-input"
                                                       onChange={e => modifierAccompagnant(index, 'prenom', e.target.value)} />
                                            </div>
                                            <div className="ht-field">
                                                <label className="ht-label">Nom</label>
                                                <input type="text" value={acc.nom} className="ht-input"
                                                       onChange={e => modifierAccompagnant(index, 'nom', e.target.value)} />
                                            </div>
                                            <div className="ht-field">
                                                <label className="ht-label">Lien de parenté</label>
                                                <select value={acc.lien_parente} className="ht-input"
                                                        onChange={e => modifierAccompagnant(index, 'lien_parente', e.target.value)}>
                                                    <option value="">Choisir…</option>
                                                    {LIENS_CONTACT.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="ht-field">
                                                <label className="ht-label">Téléphone</label>
                                                <input type="text" value={acc.telephone} className="ht-input"
                                                       onChange={e => modifierAccompagnant(index, 'telephone', e.target.value)} />
                                            </div>
                                            <div className="ht-field sm:col-span-2">
                                                <label className="ht-label">N° de pièce d'identité (CNI, passeport…)</label>
                                                <input type="text" value={acc.cni} className="ht-input"
                                                       onChange={e => modifierAccompagnant(index, 'cni', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Couverture sociale / mutuelle ── */}
                    {!modeUrgence && (
                        <div className="ht-card ht-card-padded">
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                                Couverture sociale
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="ht-field">
                                    <label className="ht-label">Mutuelle / assurance</label>
                                    <input type="text" name="mutuelle" value={form.mutuelle} onChange={handleChange}
                                           placeholder="Ex : IPM, CMU, assurance privée" className="ht-input" />
                                </div>
                                <div className="ht-field">
                                    <label className="ht-label">N° d'adhérent</label>
                                    <input type="text" name="numero_mutuelle" value={form.numero_mutuelle} onChange={handleChange}
                                           placeholder="Optionnel" className="ht-input" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={() => navigate('/admissions')} className="btn btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading || !step1Valid} className="btn btn-primary gap-1.5">
                            {modeUrgence ? <Siren size={16} /> : <UserPlus2 size={16} />}
                            {loading ? 'Enregistrement…' : modeUrgence ? "Admettre en urgence" : "Enregistrer l'admission"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}
