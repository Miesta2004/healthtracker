import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patients'
import type {Patient} from '../types'

export default function PatientDetail() {
    const { id } = useParams<{ id:string }>()
    const navigate = useNavigate()
    const [patient,setPatient] = useState<Patient | null>(null)
    const [loading,setLoading] = useState(true)

    useEffect(() => {
        if(!id) return
        getPatient(Number(id))
            .then(setPatient)
            .catch(() => navigate('/dashboard'))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F9FAFB'}}>
            <p style={{color:'#9CA3AF',fontFamily:'system-ui'}}>Chargement...</p>
        </div>
    )

    if(!patient) return null

    const age = new Date().getFullYear() - new Date(patient.date_naissance).getFullYear()

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-2"
                >
                    ← Retour
                </button>
                <span className="text-gray-200">|</span>
                <span className="text-sm font-medium text-gray-900">
                    {patient.prenom} {patient.nom}
                </span>
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-8">

                {/* Header patient */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">
                        {patient.prenom[0]} {patient.nom[0]}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {patient.prenom} {patient.nom}
                        </h1>
                        <p>
                            {age} ans · {patient.sexe === 'M' ? 'Masculin' : 'Féminin'}
                            {patient.groupe_sanguin && ` · Groupe ${patient.groupe_sanguin}`}
                        </p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        patient.actif
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                        {patient.actif ? '● Actif' : '○ Inactif'}
                    </span>
                </div>

                {/* Infos grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">

                    {/* Infos personnelles */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Informations personnelles
                        </h2>
                        <div className="space-y-3">
                            <InfoRow label="Date de naissance" value={
                                new Date(patient.date_naissance).toLocaleDateString('fr-FR', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })
                            } />
                            <InfoRow label="Sexe" value={patient.sexe === 'M' ? 'Masculin' : 'Féminin'} />
                            {patient.telephone && <InfoRow label="Téléphone" value={patient.telephone} />}
                            {patient.adresse && <InfoRow label="Adresse" value={patient.adresse} />}
                        </div>
                    </div>

                    {/* Infos médicales */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Informations médicales
                        </h2>
                        <div className="space-y-3">
                            {patient.groupe_sanguin && (
                                <InfoRow label="Groupe sanguin" value={patient.groupe_sanguin} highlight />
                            )}
                            <InfoRow
                                label="Allergies"
                                value={patient.allergies || 'Aucune allergie renseignée'}
                                muted={!patient.allergies}
                            />
                            <InfoRow
                                label="Antécédents"
                                value={patient.antecedents || 'Aucune allergie renseignée'}
                                muted={!patient.antecedents}
                            />
                        </div>
                    </div>
                </div>

                {/* Métadonnées */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Métadonnées
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <InfoRow label="Dossier crée le" value={
                            new Date(patient.date_creation).toLocaleDateString('fr-FR',{
                                day: 'numeric',month:'long',year:'numeric'
                            })
                        } />
                        <InfoRow label="ID patient" value={`#${patient.id}`} />
                    </div>
                </div>
            </div>
        </div>
    )
}

//Composant helper
function InfoRow ({label,value,highlight,muted} : {
    label:string
    value:string
    highlight?:boolean
    muted?:boolean
}) {
    return (
        <div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${
                highlight ? 'text-blue-600' :
                muted ? 'text-gray-300' :
                'text-gray-900'
            }`}>
                {value}
            </p>
        </div>
    )
}