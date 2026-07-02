import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import AddPatient from './pages/AddPatient'
import ConsultationDetail from './pages/ConsultationDetail'
import Employes from './pages/Employes'
import AddEmploye from './pages/AddEmploye'
import Services from './pages/Services'
import AddSignesVitaux from './pages/AddSignesVitaux'
import AddHospitalisation from './pages/AddHospitalisation'
import Urgences from './pages/Urgences'
import AccesRefuse from './pages/AccesRefuse'

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* ── Publique ── */}
                <Route path="/login" element={<Login />} />
                <Route path="/acces-refuse" element={<AccesRefuse />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* ── Tous les employés connectés ── */}
                <Route path="/dashboard" element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/patients" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier', 'secretaire']}>
                        <Patients />
                    </ProtectedRoute>
                } />
                <Route path="/patients/:id" element={
                    <ProtectedRoute><PatientDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/consultations/new" element={
                    <ProtectedRoute><ConsultationDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/consultations/:consultId" element={
                    <ProtectedRoute><ConsultationDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/signes_vitaux/newSignes" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}>
                        <AddSignesVitaux />
                    </ProtectedRoute>
                } />
                <Route path="/patients/:id/hospitalisations/new" element={
                    <ProtectedRoute roles={['admin', 'medecin']}>
                        <AddHospitalisation />
                    </ProtectedRoute>
                } />

                {/* ── Médecin, infirmier, admin ── */}
                <Route path="/urgences" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}>
                        <Urgences />
                    </ProtectedRoute>
                } />

                {/* ── Admin, médecin, secrétaire ── */}
                <Route path="/patients/newPatient" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'secretaire']}>
                        <AddPatient />
                    </ProtectedRoute>
                } />

                {/* ── Admin seulement ── */}
                <Route path="/employes" element={
                    <ProtectedRoute roles={['admin']}>
                        <Employes />
                    </ProtectedRoute>
                } />
                <Route path="/employes/newEmploye" element={
                    <ProtectedRoute roles={['admin']}>
                        <AddEmploye />
                    </ProtectedRoute>
                } />
                <Route path="/services" element={
                    <ProtectedRoute roles={['admin']}>
                        <Services />
                    </ProtectedRoute>
                } />

                {/* ── Fallback ── */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App
