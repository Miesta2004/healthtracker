import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatientsEnAttenteValidation } from '../api/patients'
import type { Patient } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import TransfererPatientModal from '../components/TransfererPatientModal.tsx'
import RegulariserPatientModal from '../components/RegulariserPatientModal.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { RefreshCw, Search, SearchX, MapPinned, UserPlus2, Clock, IdCard, AlertTriangle } from 'lucide-react'

export default function Admissions() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [aTransferer, setATransferer] = useState<Patient | null>(null)
    const [aRegulariser, setARegulariser] = useState<Patient | null>(null)

    const charger = (q?: string) => {
        setLoading(true)
        getPatientsEnAttenteValidation(q)
            .then(setPatients)
            .catch(() => setPatients([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [])

    useEffect(() => {
        const timeout = setTimeout(() => charger(search.trim() || undefined), 300)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const handleTransfere = (updated: Patient) => {
        // Un transfert non-immédiat repasse le patient en attente de
        // validation par le NOUVEAU service — il reste donc dans cette liste,
        // juste avec un service différent. Seul un transfert avec confirmation
        // immédiate le fait sortir d'ici.
        setPatients(prev =>
            updated.statut_orientation === 'en_attente_validation_service'
                ? prev.map(p => p.id === updated.id ? updated : p)
                : prev.filter(p => p.id !== updated.id)
        )
        setATransferer(null)
    }

    const handleRegularise = (updated: Patient) => {
        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p))
        setARegulariser(null)
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Orientations & Transferts"
                    subtitle="Patients admis en attente de validation par leur service de destination"
                    icon={RefreshCw}
                    ctaLabel="Nouvelle admission"
                    onCtaClick={() => navigate('/admissions/nouvelle')}
                />

                <div className="ht-card">
                    <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                        <div className="relative flex items-center flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher un patient (nom, n° dossier, téléphone)…"
                                className="ht-input pl-9"
                            />
                        </div>
                        <span className="badge badge-tint ml-auto">
                            {patients.length} en attente
                        </span>
                    </div>

                    {!loading && patients.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-3">Patient</div>
                            <div className="col-span-1 text-center">Âge</div>
                            <div className="col-span-2">Téléphone</div>
                            <div className="col-span-2">N° dossier</div>
                            <div className="col-span-2">Service visé</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={6} />
                    ) : patients.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            {search ? (
                                <>
                                    <SearchX size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun patient ne correspond à la recherche</p>
                                </>
                            ) : (
                                <>
                                    <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                                    <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun patient en attente de validation</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            {patients.map(patient => (
                                <div key={patient.id} className="ht-table-row grid-cols-12 group">
                                    <div className="col-span-3 flex items-center gap-3 cursor-pointer"
                                         onClick={() => navigate(`/patients/${patient.id}`)}>
                                        <div className="ht-avatar ht-avatar-md">
                                            {patient.prenom[0]}{patient.nom[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-[var(--ht-primary-tint-text)] transition-colors flex items-center gap-1.5" style={{ color: 'var(--ht-text)' }}>
                                                {patient.prenom} {patient.nom}
                                                {patient.identite_provisoire && (
                                                    <AlertTriangle size={12} style={{ color: 'var(--ht-warning)' }} />
                                                )}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                                {patient.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}
                                                {patient.identite_provisoire && ' · Identité provisoire'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-span-1 text-center text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {patient.age ?? '—'}
                                    </div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                                        {patient.telephone || '—'}
                                    </div>
                                    <div className="col-span-2 text-xs font-mono" style={{ color: 'var(--ht-text-muted)' }}>
                                        {patient.numero_dossier ?? '—'}
                                    </div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-secondary)' }}>
                                        {patient.service_nom || '—'}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-1.5">
                                        {patient.identite_provisoire && (
                                            <button
                                                onClick={() => setARegulariser(patient)}
                                                className="btn btn-secondary btn-sm gap-1.5 text-xs"
                                                title="Régulariser / Compléter le dossier"
                                            >
                                                <IdCard size={13} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setATransferer(patient)}
                                            className="btn btn-primary btn-sm gap-1.5 text-xs"
                                        >
                                            <MapPinned size={13} /> Transférer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate('/admissions/nouvelle')}
                    className="btn btn-secondary gap-1.5 sm:hidden w-full justify-center"
                >
                    <UserPlus2 size={16} /> Nouvelle admission
                </button>
            </main>

            {aTransferer && (
                <TransfererPatientModal
                    patient={aTransferer}
                    onClose={() => setATransferer(null)}
                    onTransfere={handleTransfere}
                />
            )}

            {aRegulariser && (
                <RegulariserPatientModal
                    patient={aRegulariser}
                    onClose={() => setARegulariser(null)}
                    onRegularise={handleRegularise}
                />
            )}
        </div>
    )
}
