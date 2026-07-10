import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getServices, createService, deleteService, updateService } from "../api/services.ts"
import type { Service } from "../types"
import Sidebar from '../components/Sidebar.tsx'
import { SkeletonCardGrid } from '../components/Skeleton'
import { Building2, Users, UserCheck, ShieldCheck, ShieldAlert, Edit2, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react'
import PageBanner from '../components/PageBanner.tsx'


// ─── Modal création/édition ───────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave} : {
    service: Service | null
    onClose: () => void
    onSave: (data: Partial<Service>) => Promise<void>
}) {
    const [form, setForm] = useState({
        nom: service?.nom || '',
        description: service?.description || '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await onSave(form)
            onClose()
        } catch {
            setError('Erreur lors de la sauvegarde')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ht-text)' }}>
                    {service ? 'Modifier le service' : 'Nouveau service'}
                </h2>

                {error && (
                    <div className="ht-alert ht-alert-danger mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="ht-field">
                        <label className="ht-label">Nom du service *</label>
                        <input
                            type="text" required value={form.nom}
                            onChange={e => setForm({ ...form, nom: e.target.value })}
                            placeholder="Ex: Cardiologie"
                            className="ht-input"
                        />
                    </div>
                    <div className="ht-field">
                        <label className="ht-label">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3} placeholder="Description du service..."
                            className="ht-input ht-textarea"
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Sauvegarde...' : service ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Card service ─────────────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete, onToggle, onViewDetail }: {
    service: Service
    onEdit: () => void
    onDelete: () => void
    onToggle: () => void
    onViewEmployes: () => void
    onViewDetail: () => void
}) {
    return (
        <div className={`ht-card ht-card-padded-sm ${service.actif ? '' : 'opacity-50'}`}>
            <div onClick={onViewDetail} className="flex items-start justify-between mb-4">
                <button onClick={onViewDetail} className="flex items-center gap-3 min-w-0 text-left group" title="Voir le tableau de bord du service">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: 'var(--ht-primary-tint)', color: 'var(--ht-primary)' }}>
                        <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate group-hover:underline" style={{ color: 'var(--ht-text)' }}>{service.nom}</h3>
                        {service.chef_nom && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>Dr. {service.chef_nom}</p>
                        )}
                    </div>
                </button>
                <span className={`badge ${service.actif ? 'badge-tint' : 'badge-muted'} flex items-center gap-1`}>
                    {service.actif ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    {service.actif ? 'Actif' : 'Inactif'}
                </span>
            </div>

            {service.description && (
                <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--ht-text-secondary)' }}>{service.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                    title="Voir les employés de ce service"
                    className="rounded-xl p-2.5 text-center"
                    style={{ backgroundColor: 'var(--ht-muted-bg)' }}
                >
                    <p className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>
                        {service.nb_employes}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Employés</p>
                </button>
                <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--ht-muted-bg)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--ht-text)' }}>
                        {service.nb_patients}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Patients</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button onClick={onEdit} className="btn btn-secondary btn-sm px-2.5" title="Modifier">
                    <Edit2 size={12} />
                </button>
                <button onClick={onToggle} className="btn btn-secondary btn-sm px-2.5" title={service.actif ? 'Désactiver' : 'Activer'}>
                    {service.actif ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                </button>
                <button onClick={onDelete} className="btn btn-danger btn-sm px-2.5" title="Supprimer">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Services(){
    const navigate = useNavigate()
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editService, setEditService] = useState<Service | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getServices().then(setServices).finally(() => setLoading(false))
    }, [])

    const handleSave = async (data: Partial<Service>) => {
        if (editService) {
            const updated = await updateService(editService.id, data)
            setServices(prev => prev.map(s => s.id === editService.id ? updated : s))
        } else {
            const created = await createService(data)
            setServices(prev => [...prev, created])
        }
    }

    const handleDelete = async (service: Service) => {
        if (!confirm(`Supprimer le service "${service.nom}" ?`)) return
        try {
            await deleteService(service.id)
            setServices(prev => prev.filter(s => s.id !== service.id))
        } catch {
            setError('Impossible de supprimer ce service.')
        }
    }

    const handleToggle = async (service: Service) => {
        const updated = await updateService(service.id, { actif: !service.actif })
        setServices(prev => prev.map(s => s.id === service.id ? updated : s))
    }

    const stats = {
        total: services.length,
        actifs: services.filter(s => s.actif).length,
        totalEmployes: services.reduce((a, s) => a + s.nb_employes, 0),
        totalPatients: services.reduce((a, s) => a + s.nb_patients, 0),
    }

    return (
        <div className="ht-page">

            {/* Modal */}
            {modalOpen && (
                <ServiceModal
                    service={editService}
                    onClose={() => { setModalOpen(false); setEditService(null) }}
                    onSave={handleSave}
                />
            )}

            <Sidebar />

            <main className="ht-page-content max-w-7xl space-y-6">

                {/* Header Section */}
                <PageBanner
                    title="Gestion des services"
                    subtitle="Découvrez et gérez les services médicaux disponibles dans votre établissement."
                    icon={Building2}
                    ctaLabel="Nouveau service"
                    onCtaClick={() => setModalOpen(true)}
                    decorIcons={[UserCheck, ShieldCheck]}
                />

                {error && (
                    <div className="ht-alert ht-alert-danger">
                        {error}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Services', value: stats.total, icon: <Building2 size={18} /> },
                        { label: 'Actifs', value: stats.actifs, icon: <ShieldCheck size={18} /> },
                        { label: 'Employés total', value: stats.totalEmployes, icon: <Users size={18} /> },
                        { label: 'Patients total', value: stats.totalPatients, icon: <UserCheck size={18} /> },
                    ].map(s => (
                        <div key={s.label} className="ht-card ht-card-padded-sm flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                 style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{s.label}</p>
                                <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--ht-text)' }}>{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grille services ou Empty State */}
                {loading ? (
                    <SkeletonCardGrid count={6} />
                ) : services.length === 0 ? (
                    <div className="ht-card text-center py-16 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                            <Building2 size={24} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ht-text-secondary)' }}>Aucun service créé</p>
                        <button onClick={() => setModalOpen(true)} className="btn btn-primary mt-4 gap-1.5">
                            <Plus size={16} /> Créer le premier service
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map(service => (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                onEdit={() => { setEditService(service); setModalOpen(true) }}
                                onDelete={() => handleDelete(service)}
                                onToggle={() => handleToggle(service)}
                                onViewEmployes={() => navigate(`/employes?service=${service.id}`)}
                                onViewDetail={() => navigate(`/services/${service.id}`)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}