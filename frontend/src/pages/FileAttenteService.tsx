import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFileAttenteAccueil, confirmerArriveePatient } from '../api/patients'
import type { Patient } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { Inbox, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export default function FileAttenteService() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState<number | null>(null)

    const charger = () => {
        setLoading(true)
        getFileAttenteAccueil()
            .then(setPatients)
            .catch(() => setPatients([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [])

    const handleConfirmerArrivee = async (patient: Patient) => {
        setBusyId(patient.id)
        try {
            await confirmerArriveePatient(patient.id)
            setPatients(prev => prev.filter(p => p.id !== patient.id))
        } catch {
            // silencieux — la ligne reste affichée, l'utilisateur peut réessayer
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Patients orientés en attente d'accueil"
                    subtitle="Confirmez l'arrivée physique des patients orientés vers votre service par les Admissions"
                    icon={Inbox}
                />

                <div className="ht-card">
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--ht-border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--ht-text)' }}>
                            En attente de confirmation
                        </span>
                        <span className="badge badge-tint">{patients.length}</span>
                    </div>

                    {!loading && patients.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-5">Patient</div>
                            <div className="col-span-1 text-center">Âge</div>
                            <div className="col-span-2">Téléphone</div>
                            <div className="col-span-2">N° dossier</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={4} />
                    ) : patients.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--ht-text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                                Aucun patient en attente — la file se remplit dès qu'un agent d'admission oriente
                                un patient vers votre service, ou qu'un autre service vous en transfère un.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {patients.map(patient => (
                                <div key={patient.id} className="ht-table-row grid-cols-12 group">
                                    <div className="col-span-5 flex items-center gap-3 cursor-pointer"
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
                                    <div className="col-span-2 flex justify-end">
                                        <button
                                            onClick={() => handleConfirmerArrivee(patient)}
                                            disabled={busyId === patient.id}
                                            className="btn btn-primary btn-sm gap-1.5 text-xs"
                                        >
                                            <CheckCircle2 size={13} />
                                            {busyId === patient.id ? '…' : "Confirmer l'arrivée"}
                                        </button>
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
