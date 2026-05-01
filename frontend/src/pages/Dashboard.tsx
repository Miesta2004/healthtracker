import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/patients'
import type {Patient} from '../types'

export default function Dashboard() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPatients()
            .then(setPatients)
            .catch(() => navigate('/login'))
            .finally(() => setLoading(false))
    },[])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.remoeItem('refresh_token')
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar*/}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-2xl">🏥</span>
                    </div>
                    <span className="font-semibold text-gray-900">HealthTracker</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    Déconnexion
                </button>
            </nav>
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
                    <p className="text-gray-500 text-sm mt-1">Bienvenue sur votre espace médical</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">Total patients</p>
                        <p className="text-3xl font-semibold text-gray-900 mt-1">{patients.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">Patients actifs</p>
                        <p className="text-3xl font-semibold text-gray-900 mt-1">
                            {patients.filter(p => p.actif).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">Patients inactifs</p>
                        <p className="text-3xl font-semibold text-gray-900 mt-1">
                            {patients.filter(p => !p.actif).length}
                        </p>
                    </div>
                </div>

                {/* Liste patients */}
                <div className="bg-white rounded-xl border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-medium text-gray-900">Patients</h2>
                        <span className="text-sm text-gray-400">{patients.length} au total</span>
                    </div>

                    {loading ? (
                        <div className="px-6 py-12 text-center text-gray-400 text-sm">
                            Chargement...
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-400 text-sm">
                            Aucun patient pour le moment
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {patients.map(patient => (
                                <div key={patient.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                            {patient.prenom[0]}{patient.nom[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {patient.prenom} {patient.nom}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {patient.groupe_sanguin && `Groupe ${patient.groupe_sanguin} · `}
                                                {patient.sexe === 'M' ? 'Masculin' : 'Féminin'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        patient.actif
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                      {patient.actif ? 'Actif' : 'Inactif'}
                    </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}