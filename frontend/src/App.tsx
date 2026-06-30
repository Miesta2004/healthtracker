import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'
import AddPatient from './pages/AddPatient'
import ConsultationDetail from './pages/ConsultationDetail'
import Employes from './pages/Employes'
import AddEmploye from './pages/AddEmploye'
import Services from './pages/Services'
import AddSignesVitaux from './pages/AddSignesVitaux.tsx'
import AddHospitalisation from './pages/AddHospitalisation.tsx'
import Urgences from './pages/Urgences.tsx'

function App() {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
                     style={{ borderColor: '#003152', borderTopColor: 'transparent' }} />
            </div>
        )
    }

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            } />

            {/* Accessible à tous les rôles authentifiés */}
            <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/patients/:id" element={
                <ProtectedRoute><PatientDetail /></ProtectedRoute>
            } />
            <Route path="/patients/newPatient" element={
                <ProtectedRoute><AddPatient /></ProtectedRoute>
            } />

            {/* Consultations : lecture pour tous sauf secrétaire/laborantin côté affichage, écriture médecin/admin côté API */}
            <Route path="/patients/:id/consultations/new" element={
                <ProtectedRoute roles={['admin', 'medecin']}><ConsultationDetail /></ProtectedRoute>
            } />
            <Route path="/patients/:id/consultations/:consultId" element={
                <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}><ConsultationDetail /></ProtectedRoute>
            } />

            {/* Signes vitaux : saisie réservée médecin/infirmier/admin */}
            <Route path="/patients/:id/signes_vitaux/newSignes" element={
                <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}><AddSignesVitaux /></ProtectedRoute>
            } />

            {/* Hospitalisations : création réservée médecin/admin */}
            <Route path="/patients/:id/hospitalisations/new" element={
                <ProtectedRoute roles={['admin', 'medecin']}><AddHospitalisation /></ProtectedRoute>
            } />

            {/* Urgences : médecin, infirmier, admin (laborantin et secrétaire exclus) */}
            <Route path="/urgences" element={
                <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}><Urgences /></ProtectedRoute>
            } />

            {/* Gestion RH/organisation : admin uniquement */}
            <Route path="/employes" element={
                <ProtectedRoute roles={['admin']}><Employes /></ProtectedRoute>
            } />
            <Route path="/employes/newEmploye" element={
                <ProtectedRoute roles={['admin']}><AddEmploye /></ProtectedRoute>
            } />
            <Route path="/services" element={
                <ProtectedRoute roles={['admin']}><Services /></ProtectedRoute>
            } />
        </Routes>
    )
}

export default App