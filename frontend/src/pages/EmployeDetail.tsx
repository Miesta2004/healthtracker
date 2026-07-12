import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmploye, updateEmploye } from '../api/comptes'
import { getServices } from '../api/services'
import { getCreneauxDeEmploye, getExceptionsDeEmploye } from '../api/disponibilites'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonDetailPage } from '../components/Skeleton'
import type { Employe, RoleEmploye, TypeContrat, Service, CreneauDisponibilite, ExceptionDisponibilite, TypeCreneau, StatutException } from '../types'
import { Edit3, User, Lock, FileText, ClipboardList, CalendarClock, Clock, CheckCircle2, XCircle } from 'lucide-react'

// ─── Constantes ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<RoleEmploye, string> = {
    admin: 'Administrateur', medecin: 'Médecin', infirmier: 'Infirmier(ère)',
    secretaire: 'Secrétaire', laborantin: 'Laborantin',
}
const ROLE_COLORS: Record<RoleEmploye, string> = {
    admin: 'var(--ht-primary)', medecin: 'var(--role-medecin)', infirmier: 'var(--role-infirmier)',
    secretaire: 'var(--role-secretaire)', laborantin: 'var(--role-laborantin)',
}
const CONTRAT_LABELS: Record<string, string> = {
    cdi: 'CDI', cdd: 'CDD', stage: 'Stage', vacation: 'Vacation', benevolat: 'Bénévolat',
}
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const TYPE_CRENEAU_COLORS: Record<TypeCreneau, { bg: string; color: string }> = {
    presentiel:       { bg: 'var(--ht-primary-tint-bg)', color: 'var(--ht-primary-tint-text)' },
    garde:            { bg: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' },
    astreinte:        { bg: 'var(--ht-warning-bg)', color: 'var(--ht-warning)' },
    teleconsultation: { bg: 'var(--ht-success-bg)', color: 'var(--ht-success)' },
}
const TYPE_CRENEAU_LABELS: Record<TypeCreneau, string> = {
    presentiel: 'Présentiel', garde: 'Garde', astreinte: 'Astreinte', teleconsultation: 'Téléconsultation',
}
const STATUT_EXCEPTION_CONFIG: Record<StatutException, { label: string; bg: string; color: string; Icon: typeof Clock }> = {
    en_attente: { label: 'En attente', bg: 'var(--ht-warning-bg)', color: 'var(--ht-warning)', Icon: Clock },
    valide:     { label: 'Validé',     bg: 'var(--ht-success-bg)', color: 'var(--ht-success)', Icon: CheckCircle2 },
    rejete:     { label: 'Rejeté',     bg: 'var(--ht-danger-bg)',  color: 'var(--ht-danger)',  Icon: XCircle },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string | null | undefined) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dureeContrat(debut: string | null | undefined, fin: string | null | undefined) {
    if (!debut) return null
    const start = new Date(debut)
    const end   = fin ? new Date(fin) : new Date()
    const mois  = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    if (mois < 12) return `${mois} mois`
    return `${Math.floor(mois / 12)} an${Math.floor(mois / 12) > 1 ? 's' : ''} ${mois % 12 > 0 ? `${mois % 12} mois` : ''}`
}

function statutContrat(fin: string | null | undefined, type: TypeContrat | undefined) {
    if (!fin || type === 'cdi') return { label: 'En cours', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' }
    const reste = Math.ceil((new Date(fin).getTime() - Date.now()) / 86400000)
    if (reste < 0)  return { label: 'Expiré',   color: 'var(--ht-muted)', bg: 'var(--ht-muted-bg)' }
    if (reste < 30) return { label: `Expire dans ${reste} j`, color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' }
    return { label: 'En cours', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' }
}

// ─── Composants UI ────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="ht-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--ht-border)] flex items-center gap-2">
                <Icon size={16} style={{ color: 'var(--ht-text-muted)' }} />
                <h2 className="text-sm font-semibold text-[var(--ht-text)]">{title}</h2>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between py-2.5 border-b border-[var(--ht-border)] last:border-0">
            <span className="text-xs text-[var(--ht-text-muted)] uppercase tracking-wide font-medium min-w-32">{label}</span>
            <span className="text-sm text-[var(--ht-text)] text-right">{value || <span className="text-[var(--ht-text-muted)]">—</span>}</span>
        </div>
    )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wider">{label}</label>
            {children}
        </div>
    )
}

const inputCls = "ht-input"

// ─── Page principale ──────────────────────────────────────────────────────────
export default function EmployeDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user: currentUser, hasRole } = useAuth()

    const [employe, setEmploye] = useState<Employe | null>(null)
    const [services, setServices] = useState<Service[]>([])
    const [creneaux, setCreneaux] = useState<CreneauDisponibilite[]>([])
    const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>([])
    const [loadingPlanning, setLoadingPlanning] = useState(true)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [erreur, setErreur] = useState('')

    // Formulaire d'édition
    const [form, setForm] = useState<Partial<Employe>>({})

    const isAdmin = hasRole('admin')
    const isSelf  = currentUser?.username === employe?.username

    useEffect(() => {
        if (!id) return
        Promise.all([
            getEmploye(Number(id)),
            getServices(),
        ]).then(([emp, svcs]) => {
            setEmploye(emp)
            setServices(svcs)
        }).catch(() => navigate('/employes'))
            .finally(() => setLoading(false))

        setLoadingPlanning(true)
        Promise.all([
            getCreneauxDeEmploye(Number(id)),
            getExceptionsDeEmploye(Number(id)),
        ]).then(([c, e]) => {
            setCreneaux(c)
            setExceptions(e)
        }).catch(() => { setCreneaux([]); setExceptions([]) })
            .finally(() => setLoadingPlanning(false))
    }, [id])

    const startEdit = () => {
        setForm({
            nom: employe?.nom,
            prenom: employe?.prenom,
            date_naissance: employe?.date_naissance,
            sexe: employe?.sexe,
            telephone: employe?.telephone ?? '',
            adresse: employe?.adresse ?? '',
            specialite: employe?.specialite ?? '',
            role: employe?.role,
            service: employe?.service ?? null,
            actif: employe?.actif,
            type_contrat: employe?.type_contrat ?? '',
            date_debut_contrat: employe?.date_debut_contrat ?? '',
            date_fin_contrat: employe?.date_fin_contrat ?? '',
            description_poste: employe?.description_poste ?? '',
        })
        setEditing(true)
        setErreur('')
    }

    const cancelEdit = () => { setEditing(false); setErreur('') }

    const handleSave = async () => {
        setSaving(true)
        setErreur('')
        try {
            const updated = await updateEmploye(Number(id), form)
            setEmploye(updated)
            setEditing(false)
        } catch {
            setErreur('Erreur lors de la sauvegarde. Vérifiez les informations.')
        } finally {
            setSaving(false)
        }
    }

    const set = (key: keyof Employe, value: unknown) =>
        setForm(f => ({ ...f, [key]: value }))

    if (loading) {
        return <SkeletonDetailPage />
    }

    if (!employe) return null

    const contratStatut = statutContrat(employe.date_fin_contrat, employe.type_contrat)
    const duree = dureeContrat(employe.date_debut_contrat, employe.date_fin_contrat)

    return (
        <div className="ht-page">
            <Sidebar />

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* ── En-tête ── */}
                <div className="ht-card p-6 flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                         style={{ backgroundColor: ROLE_COLORS[employe.role] }}>
                        {employe.prenom[0]}{employe.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-semibold text-[var(--ht-text)]">
                                {employe.prenom} {employe.nom}
                            </h1>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: `${ROLE_COLORS[employe.role]}18`, color: ROLE_COLORS[employe.role] }}>
                                {ROLE_LABELS[employe.role]}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={employe.actif
                                      ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                      : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                                {employe.actif ? 'Actif' : 'Inactif'}
                            </span>
                        </div>
                        <p className="text-sm text-[var(--ht-text-muted)] mt-1">
                            {employe.matricule}
                            {employe.service_nom && ` · ${employe.service_nom}`}
                            {employe.specialite && ` · ${employe.specialite}`}
                        </p>
                        <p className="text-xs text-[var(--ht-text-muted)] mt-1">
                            Compte créé le {formatDate(employe.date_creation)} · @{employe.username}
                        </p>
                    </div>
                    {isAdmin && !editing && (
                        <button
                            onClick={startEdit}
                            className="btn btn-primary flex-shrink-0"
                        >
                            <Edit3 size={14} /> Modifier
                        </button>
                    )}
                </div>

                {/* ── Mode lecture ── */}
                {!editing && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <SectionCard title="Informations personnelles" icon={User}>
                                <InfoRow label="Nom complet"    value={`${employe.prenom} ${employe.nom}`} />
                                <InfoRow label="Date naissance" value={formatDate(employe.date_naissance)} />
                                <InfoRow label="Âge"            value={employe.age ? `${employe.age} ans` : null} />
                                <InfoRow label="Sexe"           value={employe.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'} />
                                <InfoRow label="Téléphone"      value={employe.telephone} />
                                <InfoRow label="Adresse"        value={employe.adresse} />
                            </SectionCard>

                            <SectionCard title="Compte & accès" icon={Lock}>
                                <InfoRow label="Identifiant"  value={`@${employe.username}`} />
                                <InfoRow label="Email"        value={employe.email} />
                                <InfoRow label="Rôle"         value={
                                    <span className="font-semibold" style={{ color: ROLE_COLORS[employe.role] }}>
                                    {ROLE_LABELS[employe.role]}
                                </span>
                                } />
                                <InfoRow label="Service"      value={employe.service_nom} />
                                <InfoRow label="Spécialité"   value={employe.specialite} />
                                <InfoRow label="Matricule"    value={<span className="font-mono">{employe.matricule}</span>} />
                            </SectionCard>

                            <SectionCard title="Contrat de travail" icon={FileText}>
                                <div className="mb-3 flex items-center gap-2">
                                    {employe.type_contrat && (
                                        <span className="badge" style={{ backgroundColor: 'var(--ht-primary-light)', color: 'var(--ht-primary)' }}>
                                        {CONTRAT_LABELS[employe.type_contrat] ?? employe.type_contrat}
                                    </span>
                                    )}
                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                          style={{ color: contratStatut.color, backgroundColor: contratStatut.bg }}>
                                    {contratStatut.label}
                                </span>
                                    {duree && (
                                        <span className="text-xs text-[var(--ht-text-muted)]">{duree}</span>
                                    )}
                                </div>
                                <InfoRow label="Début"       value={formatDate(employe.date_debut_contrat)} />
                                <InfoRow label="Fin"         value={employe.type_contrat === 'cdi' ? 'Sans limite (CDI)' : formatDate(employe.date_fin_contrat)} />
                            </SectionCard>

                            <SectionCard title="Description du poste" icon={ClipboardList}>
                                {employe.description_poste ? (
                                    <p className="text-sm text-[var(--ht-text-secondary)] whitespace-pre-line leading-relaxed">
                                        {employe.description_poste}
                                    </p>
                                ) : (
                                    <p className="text-sm text-[var(--ht-text-muted)] italic">Aucune description renseignée.</p>
                                )}
                            </SectionCard>

                        </div>

                        {/* ── Planning & disponibilités (pleine largeur) ── */}
                        <SectionCard title="Planning & disponibilités" icon={CalendarClock}>
                            {loadingPlanning ? (
                                <p className="text-sm text-[var(--ht-text-muted)]">Chargement…</p>
                            ) : (
                                <div className="space-y-6">
                                    {/* Grille hebdomadaire récurrente (lecture seule) */}
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wide mb-3">
                                            Planning hebdomadaire récurrent
                                        </p>
                                        <div className="grid grid-cols-7 gap-2">
                                            {JOURS.map((jour, idx) => {
                                                const creneauxJour = creneaux.filter(c => c.jour === idx && c.actif)
                                                return (
                                                    <div key={jour}>
                                                        <p className="text-xs font-medium text-[var(--ht-text-muted)] text-center mb-2">
                                                            {jour.slice(0, 3)}
                                                        </p>
                                                        <div className="min-h-10 space-y-1.5">
                                                            {creneauxJour.length === 0 ? (
                                                                <div className="h-10 rounded-lg border border-dashed" style={{ backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border-input)' }} />
                                                            ) : (
                                                                creneauxJour.map(c => {
                                                                    const cfg = TYPE_CRENEAU_COLORS[c.type]
                                                                    return (
                                                                        <div key={c.id} className="rounded-lg px-1.5 py-1 text-center" style={{ backgroundColor: cfg.bg }}>
                                                                            <p className="text-xs font-semibold" style={{ color: cfg.color }}>{c.heure_debut.slice(0, 5)}</p>
                                                                            <p className="text-xs" style={{ color: cfg.color }}>{c.heure_fin.slice(0, 5)}</p>
                                                                        </div>
                                                                    )
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {creneaux.length > 0 && (
                                            <div className="flex flex-wrap gap-3 mt-3">
                                                {Object.entries(TYPE_CRENEAU_COLORS).map(([type, cfg]) => (
                                                    <div key={type} className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}` }} />
                                                        <span className="text-xs text-[var(--ht-text-muted)]">{TYPE_CRENEAU_LABELS[type as TypeCreneau]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Congés & absences */}
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--ht-text-muted)] uppercase tracking-wide mb-3">
                                            Congés & absences
                                        </p>
                                        {exceptions.length === 0 ? (
                                            <p className="text-sm text-[var(--ht-text-muted)]">Aucune absence déclarée.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {exceptions.map(ex => {
                                                    const cfg = STATUT_EXCEPTION_CONFIG[ex.statut] ?? STATUT_EXCEPTION_CONFIG.en_attente
                                                    return (
                                                        <div key={ex.id}
                                                             className="flex items-center justify-between px-4 py-3 rounded-xl"
                                                             style={{ border: '1px solid var(--ht-border)' }}>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-[var(--ht-text)]">{ex.type_label}</span>
                                                                    <span className="badge flex items-center gap-1"
                                                                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                                    <cfg.Icon size={11} /> {cfg.label}
                                                                </span>
                                                                </div>
                                                                <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">
                                                                    {new Date(ex.date_debut).toLocaleDateString('fr-FR')} →{' '}
                                                                    {new Date(ex.date_fin).toLocaleDateString('fr-FR')}
                                                                    {ex.motif && ` · ${ex.motif}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    </>
                )}

                {/* ── Mode édition ── */}
                {editing && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Infos personnelles */}
                            <div className="ht-card p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--ht-text)] flex items-center gap-2">
                                    <User size={16} style={{ color: 'var(--ht-text-muted)' }} /> Informations personnelles
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <EditField label="Prénom">
                                        <input className={inputCls} value={form.prenom ?? ''} onChange={e => set('prenom', e.target.value)} />
                                    </EditField>
                                    <EditField label="Nom">
                                        <input className={inputCls} value={form.nom ?? ''} onChange={e => set('nom', e.target.value)} />
                                    </EditField>
                                </div>
                                <EditField label="Date de naissance">
                                    <input type="date" className={inputCls} value={form.date_naissance ?? ''} onChange={e => set('date_naissance', e.target.value)} />
                                </EditField>
                                <EditField label="Sexe">
                                    <select className={inputCls} value={form.sexe ?? ''} onChange={e => set('sexe', e.target.value)}>
                                        <option value="M">♂ Masculin</option>
                                        <option value="F">♀ Féminin</option>
                                    </select>
                                </EditField>
                                <EditField label="Téléphone">
                                    <input className={inputCls} value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value)} placeholder="+221 7X XXX XX XX" />
                                </EditField>
                                <EditField label="Adresse">
                                    <input className={inputCls} value={form.adresse ?? ''} onChange={e => set('adresse', e.target.value)} />
                                </EditField>
                            </div>

                            {/* Compte & rôle */}
                            <div className="ht-card p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--ht-text)] flex items-center gap-2">
                                    <Lock size={16} style={{ color: 'var(--ht-text-muted)' }} /> Compte & accès
                                </h3>
                                <EditField label="Rôle">
                                    <select className={inputCls} value={form.role ?? ''} onChange={e => set('role', e.target.value)}
                                            disabled={isSelf}>
                                        <option value="admin">Administrateur</option>
                                        <option value="medecin">Médecin</option>
                                        <option value="infirmier">Infirmier(ère)</option>
                                        <option value="secretaire">Secrétaire</option>
                                        <option value="laborantin">Laborantin</option>
                                    </select>
                                    {isSelf && <p className="text-xs text-[var(--ht-text-muted)] mt-1">Tu ne peux pas modifier ton propre rôle.</p>}
                                </EditField>
                                <EditField label="Service">
                                    <select className={inputCls} value={form.service ?? ''} onChange={e => set('service', e.target.value ? Number(e.target.value) : null)}>
                                        <option value="">— Aucun service —</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                    </select>
                                </EditField>
                                <EditField label="Spécialité">
                                    <input className={inputCls} value={form.specialite ?? ''} onChange={e => set('specialite', e.target.value)} placeholder="ex : Cardiologie, Pédiatrie…" />
                                </EditField>
                                <EditField label="Statut du compte">
                                    <select className={inputCls} value={form.actif ? '1' : '0'} onChange={e => set('actif', e.target.value === '1')}
                                            disabled={isSelf}>
                                        <option value="1">Actif</option>
                                        <option value="0">Inactif</option>
                                    </select>
                                </EditField>
                            </div>

                            {/* Contrat */}
                            <div className="ht-card p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--ht-text)] flex items-center gap-2">
                                    <FileText size={16} style={{ color: 'var(--ht-text-muted)' }} /> Contrat de travail
                                </h3>
                                <EditField label="Type de contrat">
                                    <select className={inputCls} value={form.type_contrat ?? ''} onChange={e => set('type_contrat', e.target.value)}>
                                        <option value="">— Non renseigné —</option>
                                        <option value="cdi">CDI</option>
                                        <option value="cdd">CDD</option>
                                        <option value="stage">Stage</option>
                                        <option value="vacation">Vacation</option>
                                        <option value="benevolat">Bénévolat</option>
                                    </select>
                                </EditField>
                                <EditField label="Date de début">
                                    <input type="date" className={inputCls} value={form.date_debut_contrat ?? ''} onChange={e => set('date_debut_contrat', e.target.value || null)} />
                                </EditField>
                                <EditField label="Date de fin">
                                    <input type="date" className={inputCls} value={form.date_fin_contrat ?? ''} onChange={e => set('date_fin_contrat', e.target.value || null)}
                                           disabled={form.type_contrat === 'cdi'} />
                                    {form.type_contrat === 'cdi' && (
                                        <p className="text-xs text-[var(--ht-text-muted)] mt-1">CDI — pas de date de fin.</p>
                                    )}
                                </EditField>
                            </div>

                            {/* Description poste */}
                            <div className="ht-card p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--ht-text)] flex items-center gap-2">
                                    <ClipboardList size={16} style={{ color: 'var(--ht-text-muted)' }} /> Description du poste
                                </h3>
                                <EditField label="Missions et responsabilités">
                                    <textarea
                                        className={inputCls}
                                        rows={7}
                                        value={form.description_poste ?? ''}
                                        onChange={e => set('description_poste', e.target.value)}
                                        placeholder="Décrivez les missions principales, les responsabilités, les objectifs du poste…"
                                    />
                                </EditField>
                            </div>
                        </div>

                        {erreur && (
                            <div className="rounded-xl border border-[var(--ht-danger)] bg-[var(--ht-danger-bg)] px-4 py-3">
                                <p className="text-sm text-[var(--ht-danger)]">{erreur}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pb-8">
                            <button onClick={cancelEdit}
                                    className="btn btn-ghost flex-1">
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-colors"
                                style={{ backgroundColor: saving ? 'var(--ht-text-muted)' : 'var(--ht-primary)' }}
                            >
                                {saving ? 'Enregistrement…' : 'Sauvegarder les modifications'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}