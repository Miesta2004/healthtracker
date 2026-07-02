import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmploye, updateEmploye } from '../api/comptes'
import { getServices } from '../api/services'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/NavBar'
import type { Employe, RoleEmploye, TypeContrat, Service } from '../types'

// ─── Constantes ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<RoleEmploye, string> = {
    admin: 'Administrateur', medecin: 'Médecin', infirmier: 'Infirmier(ère)',
    secretaire: 'Secrétaire', laborantin: 'Laborantin',
}
const ROLE_COLORS: Record<RoleEmploye, string> = {
    admin: '#003152', medecin: '#0e7490', infirmier: '#16a34a',
    secretaire: '#9333ea', laborantin: '#ea580c',
}
const CONTRAT_LABELS: Record<string, string> = {
    cdi: 'CDI', cdd: 'CDD', stage: 'Stage', vacation: 'Vacation', benevolat: 'Bénévolat',
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
    if (!fin || type === 'cdi') return { label: 'En cours', color: '#15803d', bg: '#dcfce7' }
    const reste = Math.ceil((new Date(fin).getTime() - Date.now()) / 86400000)
    if (reste < 0)  return { label: 'Expiré',   color: '#6b7280', bg: '#f3f4f6' }
    if (reste < 30) return { label: `Expire dans ${reste} j`, color: '#b45309', bg: '#fef3c7' }
    return { label: 'En cours', color: '#15803d', bg: '#dcfce7' }
}

// ─── Composants UI ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium min-w-32">{label}</span>
            <span className="text-sm text-gray-800 text-right">{value || <span className="text-gray-300">—</span>}</span>
        </div>
    )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    )
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"

// ─── Page principale ──────────────────────────────────────────────────────────
export default function EmployeDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user: currentUser, hasRole } = useAuth()

    const [employe, setEmploye] = useState<Employe | null>(null)
    const [services, setServices] = useState<Service[]>([])
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
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-white rounded-xl border border-gray-100 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (!employe) return null

    const contratStatut = statutContrat(employe.date_fin_contrat, employe.type_contrat)
    const duree = dureeContrat(employe.date_debut_contrat, employe.date_fin_contrat)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* ── En-tête ── */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                         style={{ backgroundColor: ROLE_COLORS[employe.role] }}>
                        {employe.prenom[0]}{employe.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {employe.prenom} {employe.nom}
                            </h1>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: `${ROLE_COLORS[employe.role]}18`, color: ROLE_COLORS[employe.role] }}>
                                {ROLE_LABELS[employe.role]}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={employe.actif
                                      ? { backgroundColor: '#003152', color: 'white' }
                                      : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                                {employe.actif ? 'Actif' : 'Inactif'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            {employe.matricule}
                            {employe.service_nom && ` · ${employe.service_nom}`}
                            {employe.specialite && ` · ${employe.specialite}`}
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                            Compte créé le {formatDate(employe.date_creation)} · @{employe.username}
                        </p>
                    </div>
                    {isAdmin && !editing && (
                        <button
                            onClick={startEdit}
                            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors flex-shrink-0"
                            style={{ backgroundColor: '#003152' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#004070')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003152')}
                        >
                            ✏️ Modifier
                        </button>
                    )}
                </div>

                {/* ── Mode lecture ── */}
                {!editing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <SectionCard title="Informations personnelles" icon="👤">
                            <InfoRow label="Nom complet"    value={`${employe.prenom} ${employe.nom}`} />
                            <InfoRow label="Date naissance" value={formatDate(employe.date_naissance)} />
                            <InfoRow label="Âge"            value={employe.age ? `${employe.age} ans` : null} />
                            <InfoRow label="Sexe"           value={employe.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'} />
                            <InfoRow label="Téléphone"      value={employe.telephone} />
                            <InfoRow label="Adresse"        value={employe.adresse} />
                        </SectionCard>

                        <SectionCard title="Compte & accès" icon="🔐">
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

                        <SectionCard title="Contrat de travail" icon="📄">
                            <div className="mb-3 flex items-center gap-2">
                                {employe.type_contrat && (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                                        {CONTRAT_LABELS[employe.type_contrat] ?? employe.type_contrat}
                                    </span>
                                )}
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                      style={{ color: contratStatut.color, backgroundColor: contratStatut.bg }}>
                                    {contratStatut.label}
                                </span>
                                {duree && (
                                    <span className="text-xs text-gray-400">{duree}</span>
                                )}
                            </div>
                            <InfoRow label="Début"       value={formatDate(employe.date_debut_contrat)} />
                            <InfoRow label="Fin"         value={employe.type_contrat === 'cdi' ? 'Sans limite (CDI)' : formatDate(employe.date_fin_contrat)} />
                        </SectionCard>

                        <SectionCard title="Description du poste" icon="📋">
                            {employe.description_poste ? (
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                    {employe.description_poste}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-300 italic">Aucune description renseignée.</p>
                            )}
                        </SectionCard>

                    </div>
                )}

                {/* ── Mode édition ── */}
                {editing && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Infos personnelles */}
                            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    👤 Informations personnelles
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
                            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    🔐 Compte & accès
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
                                    {isSelf && <p className="text-xs text-gray-400 mt-1">Tu ne peux pas modifier ton propre rôle.</p>}
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
                            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    📄 Contrat de travail
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
                                        <p className="text-xs text-gray-400 mt-1">CDI — pas de date de fin.</p>
                                    )}
                                </EditField>
                            </div>

                            {/* Description poste */}
                            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    📋 Description du poste
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
                            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                                <p className="text-sm text-red-600">{erreur}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pb-8">
                            <button onClick={cancelEdit}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-colors"
                                style={{ backgroundColor: saving ? '#9ca3af' : '#003152' }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#004070' }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#003152' }}
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
