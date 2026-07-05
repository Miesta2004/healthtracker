import { useEffect, useState } from "react"
import { getServices, createService, deleteService, updateService } from "../api/services.ts"
import type { Service } from "../types"
import Navbar from '../components/NavBar'
import { SkeletonCardGrid } from '../components/Skeleton'


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
        <div className="ht-modal-overlay"
             onClick={onClose}>
            <div className="ht-modal ht-modal-md"
                 onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {service ? 'Modifier le service' : 'Nouveau service'}
                </h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Nom du service *</label>
                        <input
                            type="text" required value={form.nom}
                            onChange={e => setForm({ ...form, nom: e.target.value })}
                            placeholder="Ex: Cardiologie"
                            className="ht-input w-full px-3 py-2.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3} placeholder="Description du service..."
                            className="ht-input w-full px-3 py-2.5 text-sm resize-none"
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose}
                                className="btn btn-ghost">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading}
                                className="btn btn-primary">
                            {loading ? 'Sauvegarde...' : service ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Card service ─────────────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete, onToggle }: {
    service: Service
    onEdit: () => void
    onDelete: () => void
    onToggle: () => void
}) {
    return (
        <div className={`ht-card ht-card-padded-sm ${service.actif ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                         style={{ backgroundColor: 'var(--ht-primary-light)' }}>
                        🏥
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">{service.nom}</h3>
                        {service.chef_nom && (
                            <p className="text-xs text-gray-400 mt-0.5">Dr. {service.chef_nom}</p>
                        )}
                    </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    service.actif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
          {service.actif ? 'Actif' : 'Inactif'}
        </span>
            </div>

            {service.description && (
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{service.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>
                        {service.nb_employes}
                    </p>
                    <p className="text-xs text-gray-400">Employés</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-blue-600">{service.nb_patients}</p>
                    <p className="text-xs text-gray-400">Patients</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button onClick={onEdit}
                        className="btn btn-ghost btn-sm flex-1">
                    ✏️ Modifier
                </button>
                <button onClick={onToggle}
                        className="btn btn-ghost btn-sm flex-1">
                    {service.actif ? '⏸ Désactiver' : '▶ Activer'}
                </button>
                <button onClick={onDelete}
                        className="text-xs py-1.5 px-3 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    🗑
                </button>
            </div>
        </div>
    )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Services(){
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

            {/* Navbar */}
            <Navbar />

            <div className="max-w-5xl mx-auto px-6 py-8">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des services</h1>
                    <p className="text-gray-400 text-sm mt-1">Services médicaux de l'établissement</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Services', value: stats.total, icon: '🏥' },
                        { label: 'Actifs', value: stats.actifs, icon: '✅' },
                        { label: 'Employés total', value: stats.totalEmployes, icon: '👥' },
                        { label: 'Patients total', value: stats.totalPatients, icon: '🧑‍⚕️' },
                    ].map(s => (
                        <div key={s.label} className="ht-card p-4 flex items-center gap-3">
                            <span className="text-2xl">{s.icon}</span>
                            <div>
                                <p className="text-xs text-gray-400">{s.label}</p>
                                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grille services */}
                {loading ? (
                    <SkeletonCardGrid count={6} />
                ) : services.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🏥</p>
                        <p className="text-gray-400 text-sm">Aucun service créé</p>
                        <button onClick={() => setModalOpen(true)}
                                className="btn btn-primary mt-4">
                            Créer le premier service
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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}