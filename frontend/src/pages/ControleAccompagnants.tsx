import { useEffect, useState } from 'react'
import { getAccompagnants, marquerSortieAccompagnant, marquerPresentAccompagnant, ajouterAccompagnant } from '../api/patients'
import { searchPatients } from '../api/patients'
import type { Accompagnant, StatutAccompagnant, PatientSearchResult } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { ShieldCheck, Search, LogOut, LogIn, Users, Plus, X } from 'lucide-react'

const ONGLETS: { value: StatutAccompagnant | 'tous'; label: string }[] = [
    { value: 'present', label: 'Présents' },
    { value: 'sorti', label: 'Sortis' },
    { value: 'tous', label: 'Tous' },
]

function AjouterAccompagnantModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: Accompagnant) => void }) {
    const [query, setQuery] = useState('')
    const [resultats, setResultats] = useState<PatientSearchResult[]>([])
    const [patient, setPatient] = useState<PatientSearchResult | null>(null)
    const [form, setForm] = useState({ nom: '', prenom: '', lien_parente: '', cni: '', telephone: '' })
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) { setResultats([]); return }
        const timeout = setTimeout(() => {
            searchPatients(q).then(setResultats).catch(() => setResultats([]))
        }, 300)
        return () => clearTimeout(timeout)
    }, [query])

    const handleSubmit = async () => {
        if (!patient || !form.nom.trim() || !form.prenom.trim()) {
            setErreur('Sélectionnez un patient et renseignez au moins le nom et le prénom.')
            return
        }
        setSubmitting(true)
        setErreur('')
        try {
            const created = await ajouterAccompagnant(patient.id, form)
            onAdded(created)
        } catch {
            setErreur("Erreur lors de l'enregistrement de l'accompagnant.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                        <Users size={17} /> Nouvel accompagnant
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Patient accompagné</label>
                    {patient ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border" style={{ borderColor: 'var(--ht-border)' }}>
                            <span className="text-sm" style={{ color: 'var(--ht-text)' }}>{patient.prenom} {patient.nom} · N° {patient.numero_dossier}</span>
                            <button onClick={() => setPatient(null)} className="text-xs" style={{ color: 'var(--ht-primary-tint-text)' }}>Changer</button>
                        </div>
                    ) : (
                        <>
                            <div className="relative flex items-center">
                                <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                                       placeholder="Rechercher un patient…" className="ht-input pl-9" />
                            </div>
                            {resultats.length > 0 && (
                                <div className="mt-2 divide-y max-h-40 overflow-y-auto" style={{ borderColor: 'var(--ht-border)' }}>
                                    {resultats.map(p => (
                                        <div key={p.id} onClick={() => setPatient(p)}
                                             className="flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-[var(--ht-muted-bg)] rounded-lg">
                                            <div className="ht-avatar ht-avatar-sm">{p.prenom[0]}{p.nom[0]}</div>
                                            <span className="text-sm">{p.prenom} {p.nom} · N° {p.numero_dossier}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="ht-field">
                        <label className="ht-label">Prénom</label>
                        <input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Nom</label>
                        <input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Lien de parenté</label>
                        <input type="text" value={form.lien_parente} onChange={e => setForm({ ...form, lien_parente: e.target.value })} className="ht-input" />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Téléphone</label>
                        <input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="ht-input" />
                    </div>
                    <div className="ht-field col-span-2">
                        <label className="ht-label">N° de pièce d'identité</label>
                        <input type="text" value={form.cni} onChange={e => setForm({ ...form, cni: e.target.value })} className="ht-input" />
                    </div>
                </div>

                {erreur && <div className="ht-alert ht-alert-danger">{erreur}</div>}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Annuler</button>
                    <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary flex-1 justify-center">
                        {submitting ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function ControleAccompagnants() {
    const [onglet, setOnglet] = useState<StatutAccompagnant | 'tous'>('present')
    const [q, setQ] = useState('')
    const [accompagnants, setAccompagnants] = useState<Accompagnant[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState<number | null>(null)
    const [ajoutOuvert, setAjoutOuvert] = useState(false)

    const charger = () => {
        setLoading(true)
        getAccompagnants({ statut: onglet === 'tous' ? undefined : onglet, q: q.trim() || undefined })
            .then(setAccompagnants)
            .catch(() => setAccompagnants([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [onglet])
    useEffect(() => {
        const timeout = setTimeout(charger, 300)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q])

    const toggleStatut = async (a: Accompagnant) => {
        setBusyId(a.id)
        try {
            const updated = a.statut === 'present'
                ? await marquerSortieAccompagnant(a.id)
                : await marquerPresentAccompagnant(a.id)
            setAccompagnants(prev =>
                onglet === 'tous'
                    ? prev.map(x => x.id === updated.id ? updated : x)
                    : prev.filter(x => x.id !== updated.id)
            )
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Contrôle Accompagnants"
                    subtitle="Traçabilité des accompagnants autorisés à circuler dans l'établissement"
                    icon={ShieldCheck}
                    ctaLabel="Nouvel accompagnant"
                    onCtaClick={() => setAjoutOuvert(true)}
                />

                <div className="ht-card">
                    <div className="p-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                        <div className="flex gap-1">
                            {ONGLETS.map(o => (
                                <button
                                    key={o.value}
                                    onClick={() => setOnglet(o.value)}
                                    className={`btn btn-sm ${onglet === o.value ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex items-center flex-1 min-w-[200px] max-w-sm ml-auto">
                            <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <input
                                type="text" value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Nom, téléphone, CNI, patient…"
                                className="ht-input pl-9"
                            />
                        </div>
                    </div>

                    {!loading && accompagnants.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-3">Accompagnant</div>
                            <div className="col-span-2">Lien</div>
                            <div className="col-span-2">CNI</div>
                            <div className="col-span-2">Patient</div>
                            <div className="col-span-2">Entrée</div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={5} />
                    ) : accompagnants.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun accompagnant à afficher</p>
                        </div>
                    ) : (
                        <div>
                            {accompagnants.map(a => (
                                <div key={a.id} className="ht-table-row grid-cols-12">
                                    <div className="col-span-3 flex items-center gap-3">
                                        <div className="ht-avatar ht-avatar-sm">{a.prenom[0]}{a.nom[0]}</div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--ht-text)' }}>
                                                {a.prenom} {a.nom}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{a.telephone || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {a.lien_parente || '—'}
                                    </div>
                                    <div className="col-span-2 text-xs font-mono" style={{ color: 'var(--ht-text-muted)' }}>
                                        {a.cni || '—'}
                                    </div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {a.patient_prenom} {a.patient_nom}
                                        <br />
                                        <span style={{ color: 'var(--ht-text-muted)' }}>N° {a.patient_dossier}</span>
                                    </div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        {new Date(a.date_entree).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={() => toggleStatut(a)}
                                            disabled={busyId === a.id}
                                            className={`btn btn-sm gap-1 text-xs ${a.statut === 'present' ? 'btn-secondary' : 'btn-primary'}`}
                                            title={a.statut === 'present' ? 'Pointer la sortie' : 'Réadmettre'}
                                        >
                                            {a.statut === 'present' ? <LogOut size={13} /> : <LogIn size={13} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setAjoutOuvert(true)}
                    className="btn btn-secondary gap-1.5 sm:hidden w-full justify-center"
                >
                    <Plus size={16} /> Nouvel accompagnant
                </button>
            </main>

            {ajoutOuvert && (
                <AjouterAccompagnantModal
                    onClose={() => setAjoutOuvert(false)}
                    onAdded={(a) => {
                        setAjoutOuvert(false)
                        if (onglet === 'present' || onglet === 'tous') setAccompagnants(prev => [a, ...prev])
                    }}
                />
            )}
        </div>
    )
}
