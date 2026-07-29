import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPatients } from '../api/patients'
import type { PatientSearchResult, Patient } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import TransfererPatientModal from '../components/TransfererPatientModal.tsx'
import { Search, SearchX, UserRoundSearch, UserPlus2, Contact, AlertTriangle, MapPinned, CheckCircle2 } from 'lucide-react'

export default function RechercheAdmission() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [resultats, setResultats] = useState<PatientSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [aCherche, setACherche] = useState(false)
    const [aTransferer, setATransferer] = useState<PatientSearchResult | null>(null)
    // Confirmation visuelle brève après un transfert réussi, sans quitter la
    // page de recherche — l'agent enchaîne souvent plusieurs patients de suite.
    const [dernierTransfertId, setDernierTransfertId] = useState<number | null>(null)

    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) {
            setResultats([])
            setACherche(false)
            return
        }
        setLoading(true)
        const timeout = setTimeout(() => {
            searchPatients(q)
                .then(res => { setResultats(res); setACherche(true) })
                .catch(() => { setResultats([]); setACherche(true) })
                .finally(() => setLoading(false))
        }, 300)
        return () => clearTimeout(timeout)
    }, [query])

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Recherche & Identitovigilance"
                    subtitle="Vérifiez qu'un patient n'existe pas déjà avant de créer un nouveau dossier"
                    icon={UserRoundSearch}
                />

                <div className="ht-card ht-card-padded">
                    <div className="relative flex items-center">
                        <Search size={16} className="absolute left-3.5" style={{ color: 'var(--ht-text-muted)' }} />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="N° de dossier, nom, prénom, téléphone, date de naissance (AAAA-MM-JJ)…"
                            className="ht-input pl-10 text-sm"
                        />
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                        La recherche couvre aussi les accompagnants (nom, téléphone, n° de pièce d'identité) —
                        utile si le patient est inconscient ou ne peut pas donner ses informations lui-même.
                    </p>
                </div>

                {loading && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--ht-text-muted)' }}>Recherche en cours…</p>
                )}

                {!loading && aCherche && resultats.length === 0 && (
                    <div className="ht-card px-6 py-12 text-center">
                        <SearchX size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                        <p className="text-sm mb-1" style={{ color: 'var(--ht-text)' }}>Aucun patient trouvé</p>
                        <p className="text-xs mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun dossier existant ne correspond — vous pouvez créer une nouvelle admission.
                        </p>
                        <button onClick={() => navigate('/admissions/nouvelle')} className="btn btn-primary gap-1.5 mx-auto">
                            <UserPlus2 size={15} /> Nouvelle admission
                        </button>
                    </div>
                )}

                {!loading && resultats.length > 0 && (
                    <div className="space-y-3">
                        {resultats.map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/patients/${p.id}`)}
                                className="ht-card ht-card-padded cursor-pointer hover:shadow-md transition-shadow flex items-center gap-4"
                            >
                                <div className="ht-avatar ht-avatar-md">{p.prenom[0]}{p.nom[0]}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                                            {p.prenom} {p.nom}
                                        </p>
                                        <span className="badge badge-tint text-[10px]">{p.statut_orientation_label}</span>
                                        {p.identite_provisoire && (
                                            <span className="badge text-[10px] flex items-center gap-1" style={{ backgroundColor: 'var(--ht-warning-bg)', color: 'var(--ht-warning)' }}>
                                                <AlertTriangle size={10} /> Identité provisoire
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                        N° {p.numero_dossier} · {p.age !== undefined ? `${p.age} ans` : ''} · {p.sexe === 'M' ? 'Masculin' : 'Féminin'}
                                        {p.telephone ? ` · ${p.telephone}` : ''}
                                        {p.service_nom ? ` · ${p.service_nom}` : ''}
                                    </p>

                                    {p.accompagnants_correspondants.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                            <Contact size={12} style={{ color: 'var(--ht-text-muted)' }} />
                                            <span className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>
                                                Trouvé via l'accompagnant :
                                            </span>
                                            {p.accompagnants_correspondants.map(a => (
                                                <span key={a.id} className="badge badge-muted text-[10px]">
                                                    {a.prenom} {a.nom}{a.lien_parente ? ` (${a.lien_parente})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {dernierTransfertId === p.id ? (
                                    <span className="badge badge-tint text-[11px] flex items-center gap-1 flex-shrink-0">
                                        <CheckCircle2 size={12} /> Orienté
                                    </span>
                                ) : p.statut_orientation === 'sorti' ? (
                                    <button
                                        onClick={e => { e.stopPropagation(); setATransferer(p) }}
                                        className="btn btn-secondary btn-sm gap-1.5 text-xs flex-shrink-0"
                                        title="Le patient revient pour un nouveau motif : l'orienter vers un service sans recréer de dossier"
                                    >
                                        <MapPinned size={13} /> Nouvelle visite
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {!aCherche && !loading && (
                    <div className="text-center py-16">
                        <UserRoundSearch size={36} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Tapez au moins 2 caractères pour lancer la recherche
                        </p>
                    </div>
                )}
            </main>

            {aTransferer && (
                <TransfererPatientModal
                    patient={aTransferer}
                    onClose={() => setATransferer(null)}
                    onTransfere={(updated: Patient) => {
                        // Reflète le nouveau service/statut directement dans les
                        // résultats affichés, sans relancer toute la recherche.
                        setResultats(prev => prev.map(p => p.id === updated.id ? {
                            ...p,
                            service_nom: updated.service_nom ?? p.service_nom,
                            statut_orientation: updated.statut_orientation ?? p.statut_orientation,
                            statut_orientation_label: updated.statut_orientation_label ?? p.statut_orientation_label,
                        } : p))
                        setDernierTransfertId(updated.id)
                        setATransferer(null)
                    }}
                />
            )}
        </div>
    )
}
